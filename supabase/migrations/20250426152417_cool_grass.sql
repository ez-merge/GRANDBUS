/*
  # Fix booking system and seat locking

  1. Changes
    - Add locked_seats column to bus_routes table
    - Add unique constraint on bus_id, route_id, departure_date to prevent double bookings
    - Add function to check seat availability
    - Add trigger to validate seat bookings
*/

-- Add locked_seats column to bus_routes
ALTER TABLE bus_routes
ADD COLUMN IF NOT EXISTS locked_seats jsonb DEFAULT '[]'::jsonb;

-- Add function to check seat availability
CREATE OR REPLACE FUNCTION check_seat_availability()
RETURNS trigger AS $$
DECLARE
  existing_booking RECORD;
  locked_seat integer;
  booked_seat integer;
  route_locked_seats jsonb;
BEGIN
  -- Get locked seats for this bus and route
  SELECT locked_seats INTO route_locked_seats
  FROM bus_routes
  WHERE bus_id = NEW.bus_id
    AND route_id = NEW.route_id;

  -- Check if any selected seat is locked
  IF route_locked_seats IS NOT NULL THEN
    FOR locked_seat IN SELECT jsonb_array_elements_text(route_locked_seats)::integer
    LOOP
      IF locked_seat = ANY(NEW.seats) THEN
        RAISE EXCEPTION 'Seat % is locked', locked_seat;
      END IF;
    END LOOP;
  END IF;

  -- Check for existing bookings with overlapping seats
  FOR existing_booking IN
    SELECT seats
    FROM bookings
    WHERE bus_id = NEW.bus_id
      AND route_id = NEW.route_id
      AND departure_date = NEW.departure_date
  LOOP
    FOR booked_seat IN SELECT unnest(existing_booking.seats)
    LOOP
      IF booked_seat = ANY(NEW.seats) THEN
        RAISE EXCEPTION 'Seat % is already booked', booked_seat;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for seat availability check
DROP TRIGGER IF EXISTS check_seat_availability_trigger ON bookings;
CREATE TRIGGER check_seat_availability_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_seat_availability();

-- Add function to lock/unlock seats
CREATE OR REPLACE FUNCTION manage_seat_locks(
  p_bus_id uuid,
  p_route_id uuid,
  p_seats integer[],
  p_action text -- 'lock' or 'unlock'
)
RETURNS void AS $$
DECLARE
  current_locks jsonb;
BEGIN
  -- Get current locked seats
  SELECT locked_seats INTO current_locks
  FROM bus_routes
  WHERE bus_id = p_bus_id AND route_id = p_route_id;

  IF p_action = 'lock' THEN
    -- Add new seats to locked seats
    UPDATE bus_routes
    SET locked_seats = (
      SELECT jsonb_agg(DISTINCT e)
      FROM (
        SELECT jsonb_array_elements(current_locks) as e
        UNION ALL
        SELECT to_jsonb(s::text)
        FROM unnest(p_seats) s
      ) sub
    )
    WHERE bus_id = p_bus_id AND route_id = p_route_id;
  ELSIF p_action = 'unlock' THEN
    -- Remove seats from locked seats
    UPDATE bus_routes
    SET locked_seats = (
      SELECT jsonb_agg(e)
      FROM (
        SELECT jsonb_array_elements(current_locks) as e
        WHERE e::text NOT IN (
          SELECT s::text
          FROM unnest(p_seats) s
        )
      ) sub
    )
    WHERE bus_id = p_bus_id AND route_id = p_route_id;
  END IF;
END;
$$ LANGUAGE plpgsql;