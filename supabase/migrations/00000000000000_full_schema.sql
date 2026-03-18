/*
  GRANDBUS - Complete Database Schema (Consolidated)
  ==================================================
  This single migration creates the entire database schema from scratch.
  
  Structure:
    1. Utility functions
    2. All tables (no RLS policies yet)
    3. All indexes
    4. Enable RLS on all tables
    5. All RLS policies (after all tables exist)
    6. All triggers
    7. Business logic functions
    8. Seed data
*/

-- ============================================================================
-- 1. UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION format_seat_number(seat_num integer)
RETURNS text AS $$
BEGIN
  RETURN CASE
    WHEN seat_num <= 4  THEN 'A' || seat_num
    WHEN seat_num <= 8  THEN 'B' || (seat_num - 4)
    WHEN seat_num <= 12 THEN 'C' || (seat_num - 8)
    WHEN seat_num <= 16 THEN 'D' || (seat_num - 12)
    WHEN seat_num <= 20 THEN 'E' || (seat_num - 16)
    WHEN seat_num <= 24 THEN 'F' || (seat_num - 20)
    WHEN seat_num <= 28 THEN 'G' || (seat_num - 24)
    WHEN seat_num <= 32 THEN 'H' || (seat_num - 28)
    WHEN seat_num <= 36 THEN 'I' || (seat_num - 32)
    WHEN seat_num <= 40 THEN 'J' || (seat_num - 36)
    WHEN seat_num <= 44 THEN 'K' || (seat_num - 40)
    ELSE 'L' || (seat_num - 44)
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. CREATE ALL TABLES
-- ============================================================================

-- offices (created first because profiles references it)
CREATE TABLE offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  is_pickup_point boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text,
  role text CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
  office_id uuid REFERENCES offices(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

-- buses
CREATE TABLE buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  registration_number text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('49 seater', '56 seater', 'bus cargo')),
  image text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- routes
CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  destination text NOT NULL,
  intermediate_stops jsonb DEFAULT '[]'::jsonb,
  base_price numeric NOT NULL CHECK (base_price > 0),
  currency text NOT NULL CHECK (currency IN ('KES', 'UGX')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- staff_members
CREATE TABLE staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('driver', 'conductor')),
  license_number text,
  phone_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- expense_categories
CREATE TABLE expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- bus_routes
CREATE TABLE bus_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES buses ON DELETE CASCADE,
  route_id uuid REFERENCES routes ON DELETE CASCADE,
  departure_time time NOT NULL,
  locked_seats jsonb DEFAULT '[]'::jsonb,
  locked_seat_reason jsonb DEFAULT '{}'::jsonb,
  locked_dates jsonb DEFAULT '{}'::jsonb,
  locked_seat_users jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bus_id, route_id)
);

-- bookings
CREATE TABLE bookings (
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
  booked_by uuid REFERENCES profiles(id) ON DELETE RESTRICT,
  destination text,
  is_cancelled boolean DEFAULT false,
  cancellation_reason text,
  cancelled_by uuid REFERENCES profiles(id),
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- cancellation_history
CREATE TABLE cancellation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  booking_ref text NOT NULL,
  route text NOT NULL,
  bus text NOT NULL,
  seats text[] NOT NULL,
  passengers jsonb NOT NULL,
  departure_date date NOT NULL,
  departure_time time NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL,
  cancelled_by uuid REFERENCES profiles(id),
  cancelled_at timestamptz DEFAULT now(),
  reason text NOT NULL
);

-- parcels
CREATE TABLE parcels (
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
  office_id uuid REFERENCES offices(id) ON DELETE SET NULL,
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
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  stored_date timestamptz DEFAULT now()
);

-- parcel_cancellation_history
CREATE TABLE parcel_cancellation_history (
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

-- bus_staff_assignments
CREATE TABLE bus_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES buses ON DELETE CASCADE,
  staff_id uuid REFERENCES staff_members ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bus_id, staff_id, start_date)
);

-- expenses
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES expense_categories ON DELETE RESTRICT,
  bus_id uuid REFERENCES buses ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('KES', 'UGX')),
  description text NOT NULL,
  date date NOT NULL,
  created_by uuid REFERENCES profiles ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX idx_offices_city ON offices(city);
CREATE INDEX idx_profiles_office_id ON profiles(office_id);
CREATE INDEX idx_bus_routes_composite ON bus_routes (bus_id, route_id);
CREATE INDEX idx_bookings_seats ON bookings USING gin (seats);
CREATE INDEX idx_bookings_date_route ON bookings (departure_date, route_id);
CREATE INDEX idx_bookings_date_bus ON bookings (departure_date, bus_id);
CREATE INDEX idx_bookings_booked_by ON bookings (booked_by);
CREATE INDEX idx_bookings_route_bus ON bookings (route_id, bus_id);
CREATE INDEX idx_bookings_cancelled ON bookings (is_cancelled);
CREATE INDEX idx_bookings_cancelled_at ON bookings (cancelled_at) WHERE is_cancelled = true;
CREATE INDEX idx_cancellation_history_booking_id ON cancellation_history(booking_id);
CREATE INDEX idx_cancellation_history_cancelled_at ON cancellation_history(cancelled_at);
CREATE INDEX idx_parcels_route_bus ON parcels (route_id, bus_id);
CREATE INDEX idx_parcels_departure_date ON parcels (departure_date);
CREATE INDEX idx_parcels_booked_by ON parcels (booked_by);
CREATE INDEX idx_parcels_cancelled ON parcels (is_cancelled);
CREATE INDEX idx_parcels_cancelled_at ON parcels (cancelled_at) WHERE is_cancelled = true;
CREATE INDEX idx_parcels_office_id ON parcels(office_id);
CREATE INDEX idx_parcel_cancellation_history_parcel_id ON parcel_cancellation_history(parcel_id);
CREATE INDEX idx_parcel_cancellation_history_cancelled_at ON parcel_cancellation_history(cancelled_at);
CREATE INDEX idx_parcel_cancellation_history_departure_date ON parcel_cancellation_history(departure_date);
CREATE INDEX idx_bus_staff_assignments_dates ON bus_staff_assignments(start_date, end_date);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_bus_id ON expenses(bus_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);

-- ============================================================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcel_cancellation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES (all tables exist now, so cross-table references are safe)
-- ============================================================================

-- offices policies
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

-- profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- buses policies
CREATE POLICY "Staff and admins can view buses"
  ON buses FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert buses"
  ON buses FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update buses"
  ON buses FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete buses"
  ON buses FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- routes policies
CREATE POLICY "Staff and admins can view routes"
  ON routes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert routes"
  ON routes FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update routes"
  ON routes FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete routes"
  ON routes FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- staff_members policies
CREATE POLICY "Staff and admins can view staff_members"
  ON staff_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  ));

CREATE POLICY "Admins can manage staff_members"
  ON staff_members FOR ALL TO authenticated
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

-- expense_categories policies
CREATE POLICY "Staff and admins can view expense_categories"
  ON expense_categories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  ));

CREATE POLICY "Admins can manage expense_categories"
  ON expense_categories FOR ALL TO authenticated
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

-- bus_routes policies
CREATE POLICY "Staff and admins can view bus_routes"
  ON bus_routes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage bus_routes"
  ON bus_routes FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- bookings policies
CREATE POLICY "Users can view all bookings"
  ON bookings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (
    booked_by = auth.uid()
  );

-- cancellation_history policies
CREATE POLICY "Staff and admins can view cancellation history"
  ON cancellation_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create cancellation history records"
  ON cancellation_history FOR INSERT TO authenticated
  WITH CHECK (
    cancelled_by = auth.uid()
  );

-- parcels policies
CREATE POLICY "Users can create parcels"
  ON parcels FOR INSERT TO authenticated
  WITH CHECK (
    booked_by = auth.uid()
  );

CREATE POLICY "Users can view their own parcels"
  ON parcels FOR SELECT TO authenticated
  USING (
    booked_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Staff and admins can manage parcels"
  ON parcels FOR ALL TO authenticated
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

-- parcel_cancellation_history policies
CREATE POLICY "Users can view parcel cancellation history"
  ON parcel_cancellation_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create parcel cancellation history records"
  ON parcel_cancellation_history FOR INSERT TO authenticated
  WITH CHECK (cancelled_by = auth.uid());

-- bus_staff_assignments policies
CREATE POLICY "Staff and admins can view bus_staff_assignments"
  ON bus_staff_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  ));

CREATE POLICY "Admins can manage bus_staff_assignments"
  ON bus_staff_assignments FOR ALL TO authenticated
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

-- expenses policies
CREATE POLICY "Staff and admins can view expenses"
  ON expenses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  ));

CREATE POLICY "Admins can manage expenses"
  ON expenses FOR ALL TO authenticated
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

-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- updated_at triggers
CREATE TRIGGER update_offices_updated_at
  BEFORE UPDATE ON offices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buses_updated_at
  BEFORE UPDATE ON buses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auth trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'staff')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Role update validation trigger
CREATE OR REPLACE FUNCTION validate_role_update()
RETURNS trigger AS $$
BEGIN
  IF OLD.role != NEW.role AND
     (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  IF OLD.role = 'admin' AND NEW.role != 'admin' AND
     (SELECT COUNT(*) FROM profiles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last administrator';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_role_update_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION validate_role_update();

-- ============================================================================
-- 7. BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Seat lock management (per date)
CREATE OR REPLACE FUNCTION manage_seat_locks(
  p_bus_id uuid,
  p_route_id uuid,
  p_seats integer[],
  p_action text,
  p_date date,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_locks jsonb;
  current_reasons jsonb;
  date_key text;
  seat_num text;
BEGIN
  SELECT
    COALESCE(locked_dates, '{}'::jsonb),
    COALESCE(locked_seat_reason, '{}'::jsonb)
  INTO current_locks, current_reasons
  FROM bus_routes
  WHERE bus_id = p_bus_id AND route_id = p_route_id;

  date_key := p_date::text;

  IF p_action = 'lock' THEN
    IF NOT (current_locks ? date_key) THEN
      current_locks := jsonb_set(current_locks, array[date_key], '[]'::jsonb);
    END IF;

    current_locks := jsonb_set(
      current_locks,
      array[date_key],
      (
        SELECT jsonb_agg(DISTINCT value)
        FROM (
          SELECT jsonb_array_elements(current_locks->date_key) AS value
          UNION ALL
          SELECT to_jsonb(s::text)
          FROM unnest(p_seats) s
        ) sub
      )
    );

    IF p_reason IS NOT NULL THEN
      FOR seat_num IN
        SELECT unnest(array_to_string(p_seats, ',')::text[])
      LOOP
        current_reasons := jsonb_set(
          current_reasons,
          array[date_key, seat_num],
          to_jsonb(p_reason)
        );
      END LOOP;
    END IF;

  ELSIF p_action = 'unlock' THEN
    IF current_locks ? date_key THEN
      current_locks := jsonb_set(
        current_locks,
        array[date_key],
        (
          SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
          FROM (
            SELECT value
            FROM jsonb_array_elements(current_locks->date_key) value
            WHERE value::text NOT IN (
              SELECT to_json(s::text)::text
              FROM unnest(p_seats) s
            )
          ) sub
        )
      );

      FOR seat_num IN
        SELECT unnest(array_to_string(p_seats, ',')::text[])
      LOOP
        current_reasons := current_reasons #- array[date_key, seat_num];
      END LOOP;
    END IF;
  END IF;

  UPDATE bus_routes
  SET
    locked_dates = current_locks,
    locked_seat_reason = current_reasons
  WHERE bus_id = p_bus_id AND route_id = p_route_id;
END;
$$ LANGUAGE plpgsql;

-- Seat availability check (trigger function)
CREATE OR REPLACE FUNCTION check_seat_availability()
RETURNS trigger AS $$
DECLARE
  existing_booking RECORD;
  locked_seat integer;
  booked_seat integer;
  date_locks jsonb;
BEGIN
  SELECT locked_dates->NEW.departure_date::text INTO date_locks
  FROM bus_routes
  WHERE bus_id = NEW.bus_id
    AND route_id = NEW.route_id;

  IF date_locks IS NOT NULL THEN
    FOR locked_seat IN
      SELECT jsonb_array_elements_text(date_locks)::integer
    LOOP
      IF locked_seat = ANY(NEW.seats) THEN
        RAISE EXCEPTION 'Seat % is locked for date %', locked_seat, NEW.departure_date;
      END IF;
    END LOOP;
  END IF;

  FOR existing_booking IN
    SELECT seats
    FROM bookings
    WHERE bus_id = NEW.bus_id
      AND route_id = NEW.route_id
      AND departure_date = NEW.departure_date
      AND NOT is_cancelled
  LOOP
    FOR booked_seat IN
      SELECT unnest(existing_booking.seats)
    LOOP
      IF booked_seat = ANY(NEW.seats) THEN
        RAISE EXCEPTION 'Seat % is already booked for date %', booked_seat, NEW.departure_date;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_seat_availability_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_seat_availability();

-- Booking cancellation history (trigger function)
CREATE OR REPLACE FUNCTION handle_booking_cancellation()
RETURNS trigger AS $$
DECLARE
  route_origin text;
  route_destination text;
  bus_name text;
BEGIN
  SELECT origin, destination INTO route_origin, route_destination
  FROM routes WHERE id = NEW.route_id;

  SELECT name INTO bus_name
  FROM buses WHERE id = NEW.bus_id;

  INSERT INTO cancellation_history (
    booking_id, booking_ref, route, bus, seats, passengers,
    departure_date, departure_time, price, currency, cancelled_by, reason
  ) VALUES (
    NEW.id,
    NEW.booking_ref,
    CASE
      WHEN NEW.destination IS NOT NULL THEN route_origin || ' - ' || NEW.destination
      ELSE route_origin || ' - ' || route_destination
    END,
    bus_name,
    (SELECT array_agg(format_seat_number(seat_num)) FROM unnest(NEW.seats) seat_num),
    NEW.passengers,
    NEW.departure_date,
    NEW.departure_time,
    NEW.price,
    NEW.currency,
    NEW.cancelled_by,
    NEW.cancellation_reason
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_cancelled
  AFTER UPDATE OF is_cancelled ON bookings
  FOR EACH ROW
  WHEN (NEW.is_cancelled = true AND OLD.is_cancelled = false)
  EXECUTE FUNCTION handle_booking_cancellation();

-- Stored procedure to cancel a booking
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id uuid,
  p_cancellation_reason text,
  p_cancelled_by_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record bookings;
BEGIN
  SELECT * INTO booking_record
  FROM bookings WHERE id = p_booking_id;

  IF booking_record IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  UPDATE bookings
  SET
    is_cancelled = true,
    cancellation_reason = p_cancellation_reason,
    cancelled_by = p_cancelled_by_id,
    cancelled_at = now()
  WHERE id = p_booking_id;
END;
$$;

-- Parcel cancellation history (trigger function)
CREATE OR REPLACE FUNCTION handle_parcel_cancellation()
RETURNS trigger AS $$
DECLARE
  route_info text;
  bus_info text;
BEGIN
  IF NEW.is_cancelled = true AND OLD.is_cancelled = false THEN
    SELECT origin || ' - ' || destination INTO route_info
    FROM routes WHERE id = NEW.route_id;

    SELECT COALESCE(name, 'Store') INTO bus_info
    FROM buses WHERE id = NEW.bus_id;

    INSERT INTO parcel_cancellation_history (
      parcel_id, parcel_ref, route, bus, sender_name, receiver_name,
      item_name, departure_date, departure_time, price, currency,
      cancelled_by, reason
    ) VALUES (
      NEW.id, NEW.parcel_ref, route_info, COALESCE(bus_info, 'Store'),
      NEW.sender_name, NEW.receiver_name, NEW.item_name,
      NEW.departure_date, NEW.departure_time, NEW.price, NEW.currency,
      NEW.cancelled_by, NEW.cancellation_reason
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_parcel_cancelled
  AFTER UPDATE OF is_cancelled ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION handle_parcel_cancellation();

-- ============================================================================
-- 8. SEED DATA
-- ============================================================================

INSERT INTO expense_categories (name, description) VALUES
  ('Fuel', 'Fuel expenses for buses'),
  ('Maintenance', 'Bus maintenance and repairs'),
  ('Office Supplies', 'General office supplies and equipment'),
  ('Salaries', 'Staff salaries and wages'),
  ('Insurance', 'Vehicle and business insurance'),
  ('Utilities', 'Office utilities like electricity and water'),
  ('Other', 'Miscellaneous expenses')
ON CONFLICT (name) DO NOTHING;

INSERT INTO offices (name, city, address, phone, is_pickup_point) VALUES
  ('Nairobi Central Office', 'Nairobi', 'Tom Mboya Street, Nairobi CBD', '+254700000001', true),
  ('Kampala Main Office', 'Kampala', 'Kampala Road, Central Division', '+256700000001', true),
  ('Mombasa Branch', 'Mombasa', 'Digo Road, Mombasa Island', '+254700000002', true),
  ('Entebbe Office', 'Entebbe', 'Church Road, Entebbe Municipality', '+256700000002', true)
ON CONFLICT DO NOTHING;
