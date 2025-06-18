/*
  # Fix manifest and cancellation functionality

  1. Changes
    - Add destination column to bookings table
    - Add cancellation columns to bookings table
    - Add indexes for better query performance
*/

-- Add destination column to store actual destination
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS destination text;

-- Add cancellation columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled ON bookings (is_cancelled);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings (cancelled_at) WHERE is_cancelled = true;