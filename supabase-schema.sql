-- Restaurant Reservation System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table
CREATE TABLE tenants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff table
CREATE TABLE staff (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reservations table
CREATE TABLE reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    table_number INTEGER NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    party_size INTEGER NOT NULL CHECK (party_size > 0),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_reservations_tenant_id ON reservations(tenant_id);
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX idx_staff_email ON staff(email);

-- Enable Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

-- RLS Policies for staff
CREATE POLICY "Staff can view their own record" ON staff
    FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Staff can update their own record" ON staff
    FOR UPDATE USING (email = auth.jwt() ->> 'email');

-- RLS Policies for reservations
CREATE POLICY "Staff can view reservations for their tenant" ON reservations
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Staff can insert reservations for their tenant" ON reservations
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Staff can update reservations for their tenant" ON reservations
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Staff can delete reservations for their tenant" ON reservations
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Public access for embeddable views (read-only)
CREATE POLICY "Public can view confirmed reservations" ON reservations
    FOR SELECT USING (status = 'confirmed');

CREATE POLICY "Public can view tenant info" ON tenants
    FOR SELECT USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
-- Sample tenant
INSERT INTO tenants (name, slug) VALUES ('The Gourmet Bistro', 'gourmet-bistro');

-- Get the tenant ID for the sample data
-- Note: Replace with actual tenant ID after running the above insert
-- Sample staff member (you'll need to create this user in Supabase Auth first)
-- INSERT INTO staff (tenant_id, email, name, role) 
-- VALUES (
--     (SELECT id FROM tenants WHERE slug = 'gourmet-bistro'),
--     'manager@gourmetbistro.com',
--     'Restaurant Manager',
--     'manager'
-- );

-- Sample reservations
-- INSERT INTO reservations (tenant_id, customer_name, customer_phone, table_number, date, time, party_size, status, notes)
-- VALUES 
--     (
--         (SELECT id FROM tenants WHERE slug = 'gourmet-bistro'),
--         'John Smith',
--         '(555) 123-4567',
--         1,
--         CURRENT_DATE,
--         '18:00',
--         4,
--         'confirmed',
--         'Birthday celebration'
--     ),
--     (
--         (SELECT id FROM tenants WHERE slug = 'gourmet-bistro'),
--         'Sarah Johnson',
--         '(555) 987-6543',
--         3,
--         CURRENT_DATE,
--         '19:30',
--         2,
--         'confirmed',
--         'Anniversary dinner'
--     );