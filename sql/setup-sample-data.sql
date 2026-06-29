-- Step 1: Run this AFTER you've run the main supabase-schema.sql
-- Step 2: Create a sample tenant and some initial data

-- Insert a sample tenant
INSERT INTO tenants (name, slug) VALUES ('Demo Restaurant', 'demo-restaurant');

-- Get the tenant ID (you'll need this for the next steps)
-- Copy the ID from the output and use it below
SELECT id, name, slug FROM tenants WHERE slug = 'demo-restaurant';

-- Step 3: Create a staff user in Supabase Auth first!
-- Go to Authentication > Users in your Supabase dashboard
-- Click "Add user" and create a user with:
-- Email: admin@demo-restaurant.com
-- Password: (choose a secure password)
-- Auto Confirm User: YES

-- Step 4: After creating the auth user, get their ID and run this:
-- Replace 'USER_ID_FROM_AUTH' with the actual user ID from the auth.users table
-- Replace 'TENANT_ID_FROM_ABOVE' with the tenant ID from step 2

-- INSERT INTO staff (tenant_id, email, name, role) 
-- VALUES (
--     'TENANT_ID_FROM_ABOVE',
--     'admin@demo-restaurant.com',
--     'Demo Admin',
--     'manager'
-- );

-- Step 5: Create some sample reservations (optional)
-- Replace 'TENANT_ID_FROM_ABOVE' and 'USER_ID_FROM_AUTH' with actual values

-- INSERT INTO reservations (tenant_id, customer_name, customer_phone, table_number, date, time, party_size, status, notes, created_by)
-- VALUES 
--     (
--         'TENANT_ID_FROM_ABOVE',
--         'John Smith',
--         '(555) 123-4567',
--         1,
--         CURRENT_DATE,
--         '18:00',
--         4,
--         'confirmed',
--         'Birthday celebration',
--         'USER_ID_FROM_AUTH'
--     ),
--     (
--         'TENANT_ID_FROM_ABOVE',
--         'Sarah Johnson',
--         '(555) 987-6543',
--         3,
--         CURRENT_DATE,
--         '19:30',
--         2,
--         'confirmed',
--         'Anniversary dinner',
--         'USER_ID_FROM_AUTH'
--     );