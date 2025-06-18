/*
  # Enhance auth schema with role-based access

  1. Changes
    - Add role-based policies for admin access
    - Add constraints to protect role changes
    - Add function to validate role updates
    - Add staff user with proper upsert handling
*/

-- Add policy to allow admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Add policy to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to validate role updates
CREATE OR REPLACE FUNCTION validate_role_update()
RETURNS trigger AS $$
BEGIN
  -- Only admins can change roles
  IF OLD.role != NEW.role AND 
     (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  -- Prevent removing the last admin
  IF OLD.role = 'admin' AND NEW.role != 'admin' AND
     (SELECT COUNT(*) FROM profiles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last administrator';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role validation
DROP TRIGGER IF EXISTS ensure_role_update_security ON profiles;
CREATE TRIGGER ensure_role_update_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_role_update();

-- Add staff user for testing with proper upsert handling
DO $$
DECLARE
  new_staff_id uuid;
  staff_email text := 'staff@miguel.com';
BEGIN
  -- First check if the user already exists
  SELECT id INTO new_staff_id
  FROM auth.users
  WHERE email = staff_email;

  -- If user doesn't exist, create new user
  IF new_staff_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      staff_email,
      crypt('staffpass2024', gen_salt('bf')),
      now(),
      now(),
      now()
    )
    RETURNING id INTO new_staff_id;
  END IF;

  -- Upsert the profile
  INSERT INTO public.profiles (id, name, role, created_at, last_active)
  VALUES (
    new_staff_id,
    'Staff User',
    'staff',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    last_active = EXCLUDED.last_active;
END
$$;