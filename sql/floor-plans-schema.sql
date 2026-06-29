-- Floor Plans Schema
-- Run this SQL in your Supabase SQL Editor after running the main schema

-- Create floor_plans table to persist floor plan layouts
CREATE TABLE IF NOT EXISTS floor_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'Floor',
    layout JSONB NOT NULL DEFAULT '[]',
    obstacles JSONB NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_floor_plans_tenant_id ON floor_plans(tenant_id);
CREATE INDEX idx_floor_plans_sort_order ON floor_plans(tenant_id, sort_order);

-- RLS
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view floor plans for their tenant" ON floor_plans
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Staff can insert floor plans for their tenant" ON floor_plans
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Staff can update floor plans for their tenant" ON floor_plans
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Staff can delete floor plans for their tenant" ON floor_plans
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM staff WHERE email = auth.jwt() ->> 'email'
        )
    );

-- updated_at trigger
CREATE TRIGGER update_floor_plans_updated_at BEFORE UPDATE ON floor_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
