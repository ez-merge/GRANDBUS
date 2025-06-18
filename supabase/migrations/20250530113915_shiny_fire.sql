-- Add staff assignment tables
CREATE TABLE IF NOT EXISTS staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('driver', 'conductor')),
  license_number text,
  phone_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add bus staff assignments
CREATE TABLE IF NOT EXISTS bus_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid REFERENCES buses ON DELETE CASCADE,
  staff_id uuid REFERENCES staff_members ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bus_id, staff_id, start_date)
);

-- Add expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Add expenses table
CREATE TABLE IF NOT EXISTS expenses (
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

-- Enable RLS
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Add indexes
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_bus_id ON expenses(bus_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_bus_staff_assignments_dates ON bus_staff_assignments(start_date, end_date);

-- Insert default expense categories
INSERT INTO expense_categories (name, description) VALUES
  ('Fuel', 'Fuel expenses for buses'),
  ('Maintenance', 'Bus maintenance and repairs'),
  ('Office Supplies', 'General office supplies and equipment'),
  ('Salaries', 'Staff salaries and wages'),
  ('Insurance', 'Vehicle and business insurance'),
  ('Utilities', 'Office utilities like electricity and water'),
  ('Other', 'Miscellaneous expenses')
ON CONFLICT (name) DO NOTHING;