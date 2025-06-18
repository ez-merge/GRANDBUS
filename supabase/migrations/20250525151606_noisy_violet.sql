/*
  # Update booking cancellation functionality

  1. Changes
    - Drop existing cancel_booking function
    - Recreate function with proper parameter handling
    - Add proper error handling and validation
*/

-- First drop the existing function if it exists
DROP FUNCTION IF EXISTS cancel_booking(uuid, text, uuid);

-- Create the updated function
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id uuid,
  p_cancellation_reason text,
  p_cancelled_by_id uuid
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
  -- Get booking details before deletion
  SELECT * INTO booking_record
  FROM bookings
  WHERE id = p_booking_id;

  IF booking_record IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Get route and bus info for history
  SELECT origin || ' - ' || COALESCE(booking_record.destination, destination) INTO route_info
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
    ARRAY(
      SELECT 
        CASE
          WHEN seat <= 4 THEN 'A' || seat
          WHEN seat <= 8 THEN 'B' || (seat - 4)
          WHEN seat <= 12 THEN 'C' || (seat - 8)
          WHEN seat <= 16 THEN 'D' || (seat - 12)
          WHEN seat <= 20 THEN 'E' || (seat - 16)
          WHEN seat <= 24 THEN 'F' || (seat - 20)
          ELSE 'G' || (seat - 24)
        END
      FROM unnest(booking_record.seats) seat
    ),
    booking_record.passengers,
    booking_record.departure_date,
    booking_record.departure_time,
    booking_record.price,
    booking_record.currency,
    p_cancelled_by_id,
    p_cancellation_reason
  );

  -- Delete the booking
  DELETE FROM bookings
  WHERE id = p_booking_id;
END;
$$;