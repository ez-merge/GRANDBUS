/*
  # Add locked seat users tracking

  1. Changes
    - Add locked_seat_users column to bus_routes table to track who locked each seat
  
  2. Security
    - No RLS changes needed as this extends existing functionality
*/

-- Add locked_seat_users column to bus_routes
ALTER TABLE bus_routes
ADD COLUMN IF NOT EXISTS locked_seat_users jsonb DEFAULT '{}'::jsonb;