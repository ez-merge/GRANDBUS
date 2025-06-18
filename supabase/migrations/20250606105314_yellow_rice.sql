/*
  # Add bus cargo type support

  1. Changes
    - Update bus type constraint to include 'bus cargo'
    - Add support for 25-seat cargo bus layout
*/

-- Update the bus type constraint to include 'bus cargo'
ALTER TABLE buses 
DROP CONSTRAINT IF EXISTS buses_type_check;

ALTER TABLE buses 
ADD CONSTRAINT buses_type_check 
CHECK (type IN ('49 seater', '56 seater', 'bus cargo'));