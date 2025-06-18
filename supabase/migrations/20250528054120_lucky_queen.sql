/*
  # Fix Parcels RLS Policies

  1. Changes
    - Drop existing restrictive RLS policies
    - Add new policies that allow:
      - Authenticated users to create parcels (with booked_by = their uid)
      - Users to view their own parcels
      - Staff and admins to view all parcels
      - Staff and admins to manage parcels

  2. Security
    - Maintains RLS enabled on parcels table
    - Ensures users can only create parcels with their own ID
    - Staff and admins retain full access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create parcels" ON parcels;
DROP POLICY IF EXISTS "Users can view all parcels" ON parcels;

-- Create new policies
CREATE POLICY "Users can create parcels"
ON parcels
FOR INSERT
TO authenticated
WITH CHECK (
  booked_by = auth.uid()
);

CREATE POLICY "Users can view their own parcels"
ON parcels
FOR SELECT
TO authenticated
USING (
  booked_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);

CREATE POLICY "Staff and admins can manage parcels"
ON parcels
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);