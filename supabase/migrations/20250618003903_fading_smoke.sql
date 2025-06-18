/*
  # Add office management system

  1. New Tables
    - `offices`
      - `id` (uuid, primary key)
      - `name` (text)
      - `city` (text)
      - `address` (text)
      - `phone` (text)
      - `is_pickup_point` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add office_id to profiles table
    - Add office_id to parcels table
    - Add RLS policies for office management

  3. Security
    - Enable RLS on offices table
    - Add policies for office access control
*/

-- Create offices table
CREATE TABLE IF NOT EXISTS offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  is_pickup_point boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add office_id to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES offices(id) ON DELETE SET NULL;

-- Add office_id to parcels table
ALTER TABLE parcels
ADD COLUMN IF NOT EXISTS office_id uuid REFERENCES offices(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;

-- Create policies for offices
CREATE POLICY "Staff and admins can view offices"
  ON offices FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  ));

CREATE POLICY "Admins can manage offices"
  ON offices FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_offices_updated_at
  BEFORE UPDATE ON offices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default offices
INSERT INTO offices (name, city, address, phone, is_pickup_point) VALUES
  ('Nairobi Central Office', 'Nairobi', 'Tom Mboya Street, Nairobi CBD', '+254700000001', true),
  ('Kampala Main Office', 'Kampala', 'Kampala Road, Central Division', '+256700000001', true),
  ('Mombasa Branch', 'Mombasa', 'Digo Road, Mombasa Island', '+254700000002', true),
  ('Entebbe Office', 'Entebbe', 'Church Road, Entebbe Municipality', '+256700000002', true)
ON CONFLICT DO NOTHING;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_offices_city ON offices(city);
CREATE INDEX IF NOT EXISTS idx_profiles_office_id ON profiles(office_id);
CREATE INDEX IF NOT EXISTS idx_parcels_office_id ON parcels(office_id);