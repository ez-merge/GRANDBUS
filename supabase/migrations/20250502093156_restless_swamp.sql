/*
  # Add booking cancellation support and destination tracking

  1. Changes
    - Add destination column to store actual passenger destination
    - Add cancellation tracking columns
    - Add performance indexes
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

-- Drop existing foreign key if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_cancelled_by_fkey'
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_cancelled_by_fkey;
  END IF;
END $$;

-- Add foreign key for cancelled_by
ALTER TABLE bookings
ADD CONSTRAINT bookings_cancelled_by_fkey
FOREIGN KEY (cancelled_by)
REFERENCES profiles(id);