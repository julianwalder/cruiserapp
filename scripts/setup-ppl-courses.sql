-- Create PPL Course Tranches table
CREATE TABLE IF NOT EXISTS ppl_course_tranches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  tranche_number INTEGER NOT NULL,
  total_tranches INTEGER NOT NULL,
  hours_allocated DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_course_hours DECIMAL(5,2) NOT NULL DEFAULT 45,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RON',
  description TEXT,
  purchase_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  used_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  remaining_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique tranche per invoice
  UNIQUE(invoice_id, tranche_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_user_id ON ppl_course_tranches(user_id);
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_invoice_id ON ppl_course_tranches(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_status ON ppl_course_tranches(status);
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_purchase_date ON ppl_course_tranches(purchase_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ppl_course_tranches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_ppl_course_tranches_updated_at
  BEFORE UPDATE ON ppl_course_tranches
  FOR EACH ROW
  EXECUTE FUNCTION update_ppl_course_tranches_updated_at();

-- Add RLS policies
ALTER TABLE ppl_course_tranches ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own PPL course tranches
CREATE POLICY "Users can view their own PPL course tranches" ON ppl_course_tranches
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for admins to see all PPL course tranches
CREATE POLICY "Admins can view all PPL course tranches" ON ppl_course_tranches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      WHERE u.id = auth.uid() 
      AND r.name IN ('SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER')
    )
  );

-- Policy for instructors to see PPL course tranches of their students
CREATE POLICY "Instructors can view PPL course tranches of their students" ON ppl_course_tranches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      JOIN flight_logs fl ON fl.instructorId = u.id AND fl.pilotId = ppl_course_tranches.user_id
      WHERE u.id = auth.uid() 
      AND r.name = 'INSTRUCTOR'
    )
  );

-- Insert policy for admins
CREATE POLICY "Admins can insert PPL course tranches" ON ppl_course_tranches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      WHERE u.id = auth.uid() 
      AND r.name IN ('SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER')
    )
  );

-- Update policy for admins
CREATE POLICY "Admins can update PPL course tranches" ON ppl_course_tranches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      WHERE u.id = auth.uid() 
      AND r.name IN ('SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER')
    )
  );

-- Delete policy for admins
CREATE POLICY "Admins can delete PPL course tranches" ON ppl_course_tranches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.userId
      JOIN roles r ON ur.roleId = r.id
      WHERE u.id = auth.uid() 
      AND r.name IN ('SUPER_ADMIN', 'ADMIN', 'BASE_MANAGER')
    )
  );

-- Add comment to table
COMMENT ON TABLE ppl_course_tranches IS 'Stores PPL course tranches with allocated hours for students';
COMMENT ON COLUMN ppl_course_tranches.invoice_id IS 'SmartBill invoice ID (e.g., CA0766)';
COMMENT ON COLUMN ppl_course_tranches.tranche_number IS 'Tranche number (1, 2, 3, etc.)';
COMMENT ON COLUMN ppl_course_tranches.total_tranches IS 'Total number of tranches in the course';
COMMENT ON COLUMN ppl_course_tranches.hours_allocated IS 'Hours allocated for this specific tranche';
COMMENT ON COLUMN ppl_course_tranches.total_course_hours IS 'Total hours for the complete PPL course (typically 45)';
COMMENT ON COLUMN ppl_course_tranches.used_hours IS 'Hours used from this tranche';
COMMENT ON COLUMN ppl_course_tranches.remaining_hours IS 'Remaining hours in this tranche'; 