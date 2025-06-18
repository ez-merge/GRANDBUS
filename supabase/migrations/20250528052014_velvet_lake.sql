/*
  # Add parcel booking functionality

  1. New Tables
    - `parcels`
      - `id` (uuid, primary key)
      - `parcel_ref` (text, unique)
      - `sender_name` (text)
      - `sender_phone` (text)
      - `receiver_name` (text)
      - `receiver_phone` (text)
      - `item_type` (text)
      - `item_name` (text)
      - `weight` (numeric, nullable)
      - `description` (text)
      - `route_id` (uuid, references routes)
      - `bus_id` (uuid, references buses)
      - `departure_date` (date)
      - `departure_time` (time)
      - `price` (numeric)
      - `currency` (text)
      - `payment_method` (text)
      - `booked_by` (uuid, references profiles)
      - `created_at` (timestamp)
      - `is_cancelled` (boolean)
      - `cancellation_reason` (text)
      - `cancelled_by` (uuid, references profiles)
      - `cancelled_at` (timestamp)
*/

-- Create parcels table
CREATE TABLE IF NOT EXISTS parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_ref text UNIQUE NOT NULL,
  sender_name text NOT NULL,
  sender_phone text NOT NULL,
  receiver_name text NOT NULL,
  receiver_phone text NOT NULL,
  item_type text NOT NULL,
  item_name text NOT NULL,
  weight numeric,
  description text,
  route_id uuid REFERENCES routes ON DELETE RESTRICT,
  bus_id uuid REFERENCES buses ON DELETE RESTRICT,
  departure_date date NOT NULL,
  departure_time time NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  currency text NOT NULL CHECK (currency IN ('KES', 'UGX')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'mpesa')),
  booked_by uuid REFERENCES profiles ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  is_cancelled boolean DEFAULT false,
  cancellation_reason text,
  cancelled_by uuid REFERENCES profiles(id),
  cancelled_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled'))
);

-- Enable RLS
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all parcels" ON parcels;
DROP POLICY IF EXISTS "Users can create parcels" ON parcels;

-- Create updated policies
CREATE POLICY "Users can view all parcels"
  ON parcels
  FOR SELECT
  TO authenticated
  USING (
    booked_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Users can create parcels"
  ON parcels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    booked_by = auth.uid() AND
    auth.uid() IS NOT NULL
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parcels_route_bus ON parcels (route_id, bus_id);
CREATE INDEX IF NOT EXISTS idx_parcels_departure_date ON parcels (departure_date);
CREATE INDEX IF NOT EXISTS idx_parcels_booked_by ON parcels (booked_by);
CREATE INDEX IF NOT EXISTS idx_parcels_cancelled ON parcels (is_cancelled);
CREATE INDEX IF NOT EXISTS idx_parcels_cancelled_at ON parcels (cancelled_at) WHERE is_cancelled = true;