/*
  # Fix seat management and booking issues

  1. Changes
    - Fix manage_seat_locks function to handle null locked_seats
    - Add foreign key reference for booked_by to profiles
    - Add index for booked_by lookups
*/

-- Fix manage_seat_locks function
CREATE OR REPLACE FUNCTION manage_seat_locks(
  p_bus_id uuid,
  p_route_id uuid,
  p_seats integer[],
  p_action text
)
RETURNS void AS $$
DECLARE
  current_locks jsonb;
BEGIN
  -- Get current locked seats
  SELECT COALESCE(locked_seats, '[]'::jsonb) INTO current_locks
  FROM bus_routes
  WHERE bus_id = p_bus_id AND route_id = p_route_id;

  IF p_action = 'lock' THEN
    -- Add new seats to locked seats
    UPDATE bus_routes
    SET locked_seats = (
      SELECT jsonb_agg(DISTINCT value)
      FROM (
        SELECT jsonb_array_elements(current_locks) as value
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
      SELECT COALESCE(
        jsonb_agg(value),
        '[]'::jsonb
      )
      FROM (
        SELECT value
        FROM jsonb_array_elements(current_locks) value
        WHERE value::text NOT IN (
          SELECT to_json(s::text)::text
          FROM unnest(p_seats) s
        )
      ) sub
    )
    WHERE bus_id = p_bus_id AND route_id = p_route_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add index for booked_by lookups
CREATE INDEX IF NOT EXISTS idx_bookings_booked_by ON bookings (booked_by);

-- Add foreign key reference for booked_by to profiles
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_booked_by_fkey,
ADD CONSTRAINT bookings_booked_by_fkey
  FOREIGN KEY (booked_by)
  REFERENCES profiles(id)
  ON DELETE RESTRICT;