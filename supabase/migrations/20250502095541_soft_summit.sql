/*
  # Add destination and cancellation tracking

  1. Changes
    - Add destination column to store actual passenger destination
    - Add cancellation tracking columns
    - Add indexes for better query performance
*/

-- Add destination column to store actual destination
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS destination text;

-- Add cancellation columns to bookings table if they don't exist
DO $$ 
BEGIN
  -- Add is_cancelled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'is_cancelled'
  ) THEN
    ALTER TABLE bookings ADD COLUMN is_cancelled boolean DEFAULT false;
  END IF;

  -- Add cancellation_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancellation_reason text;
  END IF;

  -- Add cancelled_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancelled_by uuid;
  END IF;

  -- Add cancelled_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancelled_at timestamptz;
  END IF;
END $$;

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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled ON bookings (is_cancelled);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at ON bookings (cancelled_at) WHERE is_cancelled = true;