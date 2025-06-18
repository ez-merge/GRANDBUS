/*
  # Fix booking cancellation functionality

  1. Changes
    - Add stored procedure for handling booking cancellations
    - Ensure atomic transaction for cancellation process
    - Update booking status and create history record in single transaction
*/

-- Create stored procedure for booking cancellation
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id uuid,
  p_reason text,
  p_cancelled_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the booking to mark it as cancelled
  UPDATE bookings
  SET 
    is_cancelled = true,
    cancellation_reason = p_reason,
    cancelled_by = p_cancelled_by,
    cancelled_at = now()
  WHERE id = p_booking_id;

  -- The cancellation history will be automatically created by the trigger
END;
$$;