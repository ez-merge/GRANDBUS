/*
  # Fix booking cancellation functionality

  1. Changes
    - Drop existing function to avoid parameter name conflicts
    - Recreate function with proper parameter handling
    - Add proper error handling and validation
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS cancel_booking(uuid, text, uuid);

-- Create the updated function
CREATE OR REPLACE FUNCTION cancel_booking(
  booking_id uuid,
  cancellation_reason text,
  cancelled_by_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record bookings;
  route_info text;
  bus_info text;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM bookings
  WHERE id = booking_id;

  IF booking_record IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Get route and bus info
  SELECT origin || ' - ' || destination INTO route_info
  FROM routes
  WHERE id = booking_record.route_id;

  SELECT name INTO bus_info
  FROM buses
  WHERE id = booking_record.bus_id;

  -- Insert into cancellation history
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
  ) VALUES (
    booking_record.id,
    booking_record.booking_ref,
    route_info,
    bus_info,
    ARRAY(SELECT seat::text FROM unnest(booking_record.seats) seat),
    booking_record.passengers,
    booking_record.departure_date,
    booking_record.departure_time,
    booking_record.price,
    booking_record.currency,
    cancelled_by_id,
    cancellation_reason
  );

  -- Update the booking instead of deleting it
  UPDATE bookings
  SET 
    is_cancelled = true,
    cancellation_reason = cancellation_reason,
    cancelled_by = cancelled_by_id,
    cancelled_at = now()
  WHERE id = booking_id;
END;
$$;