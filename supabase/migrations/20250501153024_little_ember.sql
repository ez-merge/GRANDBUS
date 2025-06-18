/*
  # Add cancellation support to bookings

  1. Changes
    - Add cancellation-related columns to bookings table
    - Add indexes for cancelled bookings
*/

-- Add cancellation columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Add index for cancelled bookings
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled ON bookings (is_cancelled);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings (cancelled_at) WHERE is_cancelled = true;