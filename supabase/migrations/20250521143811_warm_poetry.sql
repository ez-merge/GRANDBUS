/*
  # Fix cancellation functionality

  1. Changes
    - Update trigger function to properly handle cancellations
    - Fix seat formatting in cancellation history
    - Ensure proper data transfer to history table
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_booking_cancelled ON bookings;
DROP FUNCTION IF EXISTS handle_booking_cancellation();

-- Create improved booking cancellation handler
CREATE OR REPLACE FUNCTION handle_booking_cancellation()
RETURNS trigger AS $$
DECLARE
  route_origin text;
  route_destination text;
  bus_name text;
BEGIN
  -- Get route and bus information
  SELECT origin, destination INTO route_origin, route_destination
  FROM routes
  WHERE id = NEW.route_id;

  SELECT name INTO bus_name
  FROM buses
  WHERE id = NEW.bus_id;

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
  VALUES (
    NEW.id,
    NEW.booking_ref,
    CASE 
      WHEN NEW.destination IS NOT NULL THEN route_origin || ' - ' || NEW.destination
      ELSE route_origin || ' - ' || route_destination
    END,
    bus_name,
    (
      SELECT array_agg(
        CASE
          WHEN seat_num <= 4 THEN 'A' || seat_num
          WHEN seat_num <= 8 THEN 'B' || (seat_num - 4)
          WHEN seat_num <= 12 THEN 'C' || (seat_num - 8)
          WHEN seat_num <= 16 THEN 'D' || (seat_num - 12)
          WHEN seat_num <= 20 THEN 'E' || (seat_num - 16)
          WHEN seat_num <= 24 THEN 'F' || (seat_num - 20)
          ELSE 'G' || (seat_num - 24)
        END
      )
      FROM unnest(NEW.seats) seat_num
    ),
    NEW.passengers,
    NEW.departure_date,
    NEW.departure_time,
    NEW.price,
    NEW.currency,
    NEW.cancelled_by,
    NEW.cancellation_reason
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger for booking cancellations
CREATE TRIGGER on_booking_cancelled
  AFTER UPDATE OF is_cancelled ON bookings
  FOR EACH ROW
  WHEN (NEW.is_cancelled = true)
  EXECUTE FUNCTION handle_booking_cancellation();