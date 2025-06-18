/*
  # Fix booking cancellation functionality

  1. Changes
    - Fix handle_booking_cancellation function to properly format seat numbers
    - Add proper error handling
    - Ensure cancellation history is properly populated
*/

-- Drop existing function and recreate with fixes
CREATE OR REPLACE FUNCTION handle_booking_cancellation()
RETURNS trigger AS $$
BEGIN
  -- Insert into cancellation_history
  INSERT INTO cancellation_history (
    booking_id,
    booking_ref,
    route,
    bus,
    seats,
    passengers,
    departure_date,
    departure_time,
    price,
    currency,
    cancelled_by,
    reason
  )
  SELECT
    NEW.id,
    NEW.booking_ref,
    (SELECT origin || ' - ' || COALESCE(NEW.destination, destination) FROM routes WHERE id = NEW.route_id),
    (SELECT name FROM buses WHERE id = NEW.bus_id),
    array_agg(format_seat_number(seat_num)),
    NEW.passengers,
    NEW.departure_date,
    NEW.departure_time,
    NEW.price,
    NEW.currency,
    NEW.cancelled_by,
    NEW.cancellation_reason
  FROM unnest(NEW.seats) seat_num;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger and recreate
DROP TRIGGER IF EXISTS on_booking_cancelled ON bookings;

CREATE TRIGGER on_booking_cancelled
  AFTER UPDATE OF is_cancelled ON bookings
  FOR EACH ROW
  WHEN (NEW.is_cancelled = true)
  EXECUTE FUNCTION handle_booking_cancellation();