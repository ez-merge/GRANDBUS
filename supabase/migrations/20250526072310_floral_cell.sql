/*
  # Modify cancellation history foreign key constraint

  1. Changes
    - Modify the foreign key constraint on cancellation_history table
    - Change from RESTRICT to CASCADE on delete
    - This allows automatic deletion of cancellation history records when a booking is deleted

  2. Impact
    - When a booking is deleted, related cancellation history records will be automatically deleted
    - Prevents foreign key constraint violations during booking cancellations
    - Maintains referential integrity while allowing proper cleanup of related records
*/

DO $$ BEGIN
  -- Drop the existing foreign key constraint
  ALTER TABLE cancellation_history 
  DROP CONSTRAINT IF EXISTS cancellation_history_booking_id_fkey;

  -- Add the new foreign key constraint with CASCADE on delete
  ALTER TABLE cancellation_history 
  ADD CONSTRAINT cancellation_history_booking_id_fkey 
  FOREIGN KEY (booking_id) 
  REFERENCES bookings(id) 
  ON DELETE CASCADE;
END $$;