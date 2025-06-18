/* # Fix cancellation history and parcel management
Changes - Add parcel cancellation history table - Update cancellation history to be date-specific - Add stored_date column to parcels - Fix RLS policies for cancellation history */
-- Create parcel cancellation history table
CREATE TABLE IF NOT EXISTS parcel_cancellation_history (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
parcel_id uuid REFERENCES parcels(id) ON DELETE CASCADE,
parcel_ref text NOT NULL,
route text NOT NULL,
bus text NOT NULL,
sender_name text NOT NULL,
receiver_name text NOT NULL,
item_name text NOT NULL,
departure_date date NOT NULL,
departure_time time NOT NULL,
price numeric NOT NULL,
currency text NOT NULL,
cancelled_by uuid REFERENCES profiles(id),
cancelled_at timestamptz DEFAULT now(),
reason text NOT NULL
);

-- Add stored_date column to parcels
ALTER TABLE parcels
ADD COLUMN IF NOT EXISTS stored_date timestamptz DEFAULT now();

-- Enable RLS
ALTER TABLE parcel_cancellation_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view parcel cancellation history" ON parcel_cancellation_history;
DROP POLICY IF EXISTS "Users can create parcel cancellation history records" ON parcel_cancellation_history;

-- Create policies for parcel cancellation history
CREATE POLICY "Users can view parcel cancellation history"
ON parcel_cancellation_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create parcel cancellation history records"
ON parcel_cancellation_history
FOR INSERT
TO authenticated
WITH CHECK (cancelled_by = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parcel_cancellation_history_parcel_id ON parcel_cancellation_history(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcel_cancellation_history_cancelled_at ON parcel_cancellation_history(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_parcel_cancellation_history_departure_date ON parcel_cancellation_history(departure_date);

-- Function to handle parcel cancellation
CREATE OR REPLACE FUNCTION handle_parcel_cancellation()
RETURNS trigger AS $$
DECLARE
route_info text;
bus_info text;
BEGIN
-- Only proceed if parcel is being cancelled
IF NEW.is_cancelled = true AND OLD.is_cancelled = false THEN
-- Get route and bus info
SELECT origin || ' - ' || destination INTO route_info
FROM routes
WHERE id = NEW.route_id;


SELECT COALESCE(name, 'Store') INTO bus_info
FROM buses
WHERE id = NEW.bus_id;

-- Insert into parcel cancellation history
INSERT INTO parcel_cancellation_history (
  parcel_id,
  parcel_ref,
  route,
  bus,
  sender_name,
  receiver_name,
  item_name,
  departure_date,
  departure_time,
  price,
  currency,
  cancelled_by,
  reason
) VALUES (
  NEW.id,
  NEW.parcel_ref,
  route_info,
  COALESCE(bus_info, 'Store'),
  NEW.sender_name,
  NEW.receiver_name,
  NEW.item_name,
  NEW.departure_date,
  NEW.departure_time,
  NEW.price,
  NEW.currency,
  NEW.cancelled_by,
  NEW.cancellation_reason
);
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for parcel cancellations
DROP TRIGGER IF EXISTS on_parcel_cancelled ON parcels;
CREATE TRIGGER on_parcel_cancelled
AFTER UPDATE OF is_cancelled ON parcels
FOR EACH ROW
EXECUTE FUNCTION handle_parcel_cancellation();