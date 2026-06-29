#!/usr/bin/env node

/**
 * Setup Tables Schema in Supabase
 *
 * This script helps you set up the tables management system.
 * You need to run the SQL manually in Supabase SQL Editor.
 */

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          TABLE MANAGEMENT SETUP INSTRUCTIONS                  ║
╚═══════════════════════════════════════════════════════════════╝

You're seeing errors because the 'tables' table doesn't exist yet.

📋 SETUP STEPS:

1. Go to your Supabase Dashboard:
   https://app.supabase.com/project/gvgsndjcwqbrzfvgxxdy/editor

2. Click on "SQL Editor" in the left sidebar

3. Click "New Query"

4. Copy the entire contents of this file:
   📄 supabase-tables-schema.sql

5. Paste it into the SQL Editor

6. Click "Run" (or press Cmd/Ctrl + Enter)

7. You should see: "Success. No rows returned"

8. Refresh your app at /dashboard/setup

✅ VERIFICATION:

After running the SQL, you can verify it worked by:

- Check the "Table Editor" in Supabase - you should see a new "tables" table
- Refresh /dashboard/setup - the errors should be gone
- Try adding a test table (e.g., "Table 1", capacity: 4)

📁 SQL FILE LOCATION:
   ${process.cwd()}/supabase-tables-schema.sql

🔗 DIRECT LINK TO SQL EDITOR:
   https://app.supabase.com/project/gvgsndjcwqbrzfvgxxdy/sql/new

════════════════════════════════════════════════════════════════

💡 TIP: After setup, you can add tables at /dashboard/setup

`)

// Check if we can read the SQL file
const fs = require('fs')
const path = require('path')

const sqlFilePath = path.join(process.cwd(), 'supabase-tables-schema.sql')

if (fs.existsSync(sqlFilePath)) {
  console.log('✅ SQL file found at:', sqlFilePath)
  console.log('\n📝 SQL Preview (first 10 lines):\n')
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')
  const lines = sqlContent.split('\n').slice(0, 10)
  lines.forEach((line, i) => {
    console.log(`   ${(i + 1).toString().padStart(2, ' ')} | ${line}`)
  })
  console.log('   ...\n')
} else {
  console.log('❌ SQL file not found at:', sqlFilePath)
}
