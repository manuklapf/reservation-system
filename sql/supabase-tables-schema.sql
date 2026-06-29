-- Add Tables Management to Reservation System
-- Run this SQL in your Supabase SQL Editor after running the main schema

-- Create tables table (for restaurant table management)
CREATE TABLE IF NOT EXISTS tables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    table_identifier VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, table_identifier)
);

-- Create index for better performance
CREATE INDEX idx_tables_tenant_id ON tables(tenant_id);
CREATE INDEX idx_tables_active ON tables(is_active);

-- Update reservations table to reference tables
-- Note: This assumes you want to keep backward compatibility
-- If starting fresh, you can modify the original reservations table instead

-- Make table_number nullable since we're now using table_id
ALTER TABLE reservations 
ALTER COLUMN table_number DROP NOT NULL;

-- Add the new table_id column
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON reservations(table_id);

-- RLS Policies for tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Staff can view tables for their tenant
CREATE POLICY "Staff can view tables for their tenant" ON tables
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Staff can insert tables for their tenant
CREATE POLICY "Staff can insert tables for their tenant" ON tables
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Staff can update tables for their tenant
CREATE POLICY "Staff can update tables for their tenant" ON tables
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Staff can delete tables for their tenant
CREATE POLICY "Staff can delete tables for their tenant" ON tables
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Apply updated_at trigger to tables
CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
