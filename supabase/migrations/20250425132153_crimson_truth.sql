/*
  # Add admin user

  1. Changes
    - Creates an admin user with email "Admin@miguel.com"
    - Sets up the corresponding profile with admin role
*/

-- First, create the user in auth.users
-- Note: The password will be 'miguelcapalot2004'
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_current,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'Admin@miguel.com',
  crypt('miguelcapalot2004', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Then ensure the profile is created with admin role
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Get the user ID for the admin
  SELECT id INTO user_id FROM auth.users WHERE email = 'Admin@miguel.com' LIMIT 1;
  
  -- Insert or update the profile
  INSERT INTO public.profiles (id, name, role, created_at, last_active)
  VALUES (
    user_id,
    'Admin',
    'admin',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin',
      name = EXCLUDED.name,
      last_active = EXCLUDED.last_active;
END
$$;