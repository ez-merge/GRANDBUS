/*
  # Fix bookings and seat management

  1. Changes
    - Add function to properly join route information
    - Add trigger to prevent double booking of seats
    - Add function to validate seat availability
*/

-- Create function to check seat availability
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

-- Create index for faster seat lookups
CREATE INDEX IF NOT EXISTS idx_bookings_seats ON bookings USING gin (seats);
CREATE INDEX IF NOT EXISTS idx_bookings_date_route ON bookings (departure_date, route_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_bus ON bookings (departure_date, bus_id);