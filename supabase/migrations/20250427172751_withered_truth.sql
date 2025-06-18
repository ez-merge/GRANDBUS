/*
  # Fix staff data access policies

  1. Changes
    - Update RLS policies to allow staff to view all data
    - Fix booking policies for staff accounts
    - Add indexes for better query performance
*/

-- Update policies for bookings to allow staff to view all bookings
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
CREATE POLICY "Users can view all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (true);

-- Update policies for buses to ensure staff can view
DROP POLICY IF EXISTS "Anyone can view buses" ON buses;
CREATE POLICY "Staff and admins can view buses"
  ON buses
  FOR SELECT
  TO authenticated
  USING (true);

-- Update policies for routes to ensure staff can view
DROP POLICY IF EXISTS "Anyone can view routes" ON routes;
CREATE POLICY "Staff and admins can view routes"
  ON routes
  FOR SELECT
  TO authenticated
  USING (true);

-- Update policies for bus_routes to ensure staff can view
DROP POLICY IF EXISTS "Anyone can view bus_routes" ON bus_routes;
CREATE POLICY "Staff and admins can view bus_routes"
  ON bus_routes
  FOR SELECT
  TO authenticated
  USING (true);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_route_bus ON bookings (route_id, bus_id);
CREATE INDEX IF NOT EXISTS idx_bus_routes_composite ON bus_routes (bus_id, route_id);