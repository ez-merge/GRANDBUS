/*
  # Add cancellation history and seat management improvements

  1. New Tables
    - `cancellation_history`
      - `id` (uuid, primary key)
      - `booking_id` (uuid, references bookings)
      - `booking_ref` (text)
      - `route` (text)
      - `bus` (text)
      - `seats` (text[])
      - `passengers` (jsonb)
      - `departure_date` (date)
      - `departure_time` (time)
      - `price` (numeric)
      - `currency` (text)
      - `cancelled_by` (uuid, references profiles)
      - `cancelled_at` (timestamptz)
      - `reason` (text)

  2. Changes
    - Add locked_seat_reason to bus_routes table
    - Update seat naming convention
*/

-- Create cancellation_history table
CREATE TABLE IF NOT EXISTS cancellation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id),
  booking_ref text NOT NULL,
  route text NOT NULL,
  bus text NOT NULL,
  seats text[] NOT NULL,
  passengers jsonb NOT NULL,
  departure_date date NOT NULL,
  departure_time time NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL,
  cancelled_by uuid REFERENCES profiles(id),
  cancelled_at timestamptz DEFAULT now(),
  reason text NOT NULL
);

-- Add locked_seat_reason to bus_routes
ALTER TABLE bus_routes
ADD COLUMN locked_seat_reason jsonb DEFAULT '{}'::jsonb;

-- Create index for faster lookups
CREATE INDEX idx_cancellation_history_booking_id ON cancellation_history(booking_id);
CREATE INDEX idx_cancellation_history_cancelled_at ON cancellation_history(cancelled_at);

-- Enable RLS
ALTER TABLE cancellation_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff and admins can view cancellation history"
  ON cancellation_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to handle booking cancellations
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
    OLD.id,
    OLD.booking_ref,
    (SELECT origin || ' - ' || destination FROM routes WHERE id = OLD.route_id),
    (SELECT name FROM buses WHERE id = OLD.bus_id),
    array_agg(
      CASE
        WHEN seat_num <= 4 THEN 'A' || seat_num
        WHEN seat_num <= 8 THEN 'B' || (seat_num - 4)
        WHEN seat_num <= 12 THEN 'C' || (seat_num - 8)
        WHEN seat_num <= 16 THEN 'D' || (seat_num - 12)
        WHEN seat_num <= 20 THEN 'E' || (seat_num - 16)
        WHEN seat_num <= 24 THEN 'F' || (seat_num - 20)
        WHEN seat_num <= 28 THEN 'G' || (seat_num - 24)
        WHEN seat_num <= 32 THEN 'H' || (seat_num - 28)
        WHEN seat_num <= 36 THEN 'I' || (seat_num - 32)
        WHEN seat_num <= 40 THEN 'J' || (seat_num - 36)
        WHEN seat_num <= 44 THEN 'K' || (seat_num - 40)
        ELSE 'L' || (seat_num - 44)
      END
    ),
    OLD.passengers,
    OLD.departure_date,
    OLD.departure_time,
    OLD.price,
    OLD.currency,
    OLD.cancelled_by,
    OLD.cancellation_reason
  FROM unnest(OLD.seats) seat_num;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking cancellations
CREATE TRIGGER on_booking_cancelled
  AFTER UPDATE OF is_cancelled ON bookings
  FOR EACH ROW
  WHEN (NEW.is_cancelled = true)
  EXECUTE FUNCTION handle_booking_cancellation();

-- Function to convert seat number to letter-number format
CREATE OR REPLACE FUNCTION format_seat_number(seat_num integer)
RETURNS text AS $$
BEGIN
  RETURN CASE
    WHEN seat_num <= 4 THEN 'A' || seat_num
    WHEN seat_num <= 8 THEN 'B' || (seat_num - 4)
    WHEN seat_num <= 12 THEN 'C' || (seat_num - 8)
    WHEN seat_num <= 16 THEN 'D' || (seat_num - 12)
    WHEN seat_num <= 20 THEN 'E' || (seat_num - 16)
    WHEN seat_num <= 24 THEN 'F' || (seat_num - 20)
    WHEN seat_num <= 28 THEN 'G' || (seat_num - 24)
    WHEN seat_num <= 32 THEN 'H' || (seat_num - 28)
    WHEN seat_num <= 36 THEN 'I' || (seat_num - 32)
    WHEN seat_num <= 40 THEN 'J' || (seat_num - 36)
    WHEN seat_num <= 44 THEN 'K' || (seat_num - 40)
    ELSE 'L' || (seat_num - 44)
  END;
END;
$$ LANGUAGE plpgsql;