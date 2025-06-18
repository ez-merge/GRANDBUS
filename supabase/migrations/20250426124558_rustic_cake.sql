/*
  # Create tables and policies for bus booking system

  1. New Tables
    - buses (bus details)
    - routes (route information)
    - bus_routes (bus-route assignments)
    - bookings (booking records)

  2. Security
    - Enable RLS on all tables
    - Add policies for access control
*/

-- Create buses table if it doesn't exist
CREATE TABLE IF NOT EXISTS buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  registration_number text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('49 seater', '56 seater')),
  image text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create routes table if it doesn't exist
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  destination text NOT NULL,
  intermediate_stops jsonb DEFAULT '[]'::jsonb,
  base_price numeric NOT NULL CHECK (base_price > 0),
  currency text NOT NULL CHECK (currency IN ('KES', 'UGX')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bus_routes table if it doesn't exist
CREATE TABLE IF NOT EXISTS bus_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES buses ON DELETE CASCADE,
  route_id uuid REFERENCES routes ON DELETE CASCADE,
  departure_time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bus_id, route_id)
);

-- Create bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text UNIQUE NOT NULL,
  route_id uuid REFERENCES routes ON DELETE RESTRICT,
  bus_id uuid REFERENCES buses ON DELETE RESTRICT,
  seats integer[] NOT NULL,
  passengers jsonb NOT NULL,
  departure_date date NOT NULL,
  departure_time time NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  currency text NOT NULL CHECK (currency IN ('KES', 'UGX')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'mpesa')),
  booked_by uuid REFERENCES auth.users ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
DO $$ 
BEGIN
  ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE bus_routes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
EXCEPTION 
  WHEN others THEN NULL;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view buses" ON buses;
  DROP POLICY IF EXISTS "Admins can insert buses" ON buses;
  DROP POLICY IF EXISTS "Admins can update buses" ON buses;
  DROP POLICY IF EXISTS "Admins can delete buses" ON buses;
  
  DROP POLICY IF EXISTS "Anyone can view routes" ON routes;
  DROP POLICY IF EXISTS "Admins can insert routes" ON routes;
  DROP POLICY IF EXISTS "Admins can update routes" ON routes;
  DROP POLICY IF EXISTS "Admins can delete routes" ON routes;
  
  DROP POLICY IF EXISTS "Anyone can view bus_routes" ON bus_routes;
  DROP POLICY IF EXISTS "Admins can manage bus_routes" ON bus_routes;
  
  DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
  DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
EXCEPTION 
  WHEN others THEN NULL;
END $$;

-- Create policies for buses
CREATE POLICY "Anyone can view buses"
  ON buses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert buses"
  ON buses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update buses"
  ON buses
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete buses"
  ON buses
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create policies for routes
CREATE POLICY "Anyone can view routes"
  ON routes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert routes"
  ON routes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update routes"
  ON routes
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete routes"
  ON routes
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create policies for bus_routes
CREATE POLICY "Anyone can view bus_routes"
  ON bus_routes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage bus_routes"
  ON bus_routes
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    booked_by = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can create bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    booked_by = auth.uid()
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_buses_updated_at ON buses;
DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;

-- Create triggers for updated_at
CREATE TRIGGER update_buses_updated_at
  BEFORE UPDATE ON buses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();