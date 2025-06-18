/*
  # Add RLS policies for cancellation history table

  1. Changes
    - Add INSERT policy for authenticated users to create cancellation history records
    - Add SELECT policy for authenticated users to view cancellation history records

  2. Security
    - Enable RLS on cancellation_history table (already enabled)
    - Add policy for authenticated users to insert records when they are the one cancelling
    - Add policy for authenticated users to view cancellation history records
*/

-- Add INSERT policy for authenticated users
CREATE POLICY "Users can create cancellation history records"
  ON cancellation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be the one cancelling the booking
    cancelled_by = auth.uid()
  );

-- Add SELECT policy for authenticated users
CREATE POLICY "Users can view cancellation history records"
  ON cancellation_history
  FOR SELECT
  TO authenticated
  USING (true);