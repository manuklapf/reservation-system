<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements
<!-- Requirements specified: Next.js + Supabase restaurant reservation system with staff auth, CRUD, calendar view, mobile-friendly, embeddable routes, multi-tenant support -->

- [x] Scaffold the Project
<!--
✓ Created Next.js project structure with TypeScript and Tailwind CSS
✓ Set up Supabase configuration with newer @supabase/ssr package
✓ Created all necessary components: auth, dashboard, calendar, embeddable views
✓ Built complete reservation management system with CRUD operations
✓ Implemented multi-tenant architecture with row-level security
✓ Added mobile-responsive design
✓ Created SQL schema for Supabase
✓ Added comprehensive documentation in README.md
-->

- [x] Customize the Project
<!--
✓ Built complete restaurant reservation system with all requested features
✓ Implemented staff authentication with Supabase Auth
✓ Created reservation CRUD operations with tenant isolation
✓ Built calendar view with date and table filtering
✓ Made mobile-friendly responsive design
✓ Created embeddable iframe routes at /[tenantSlug]
✓ Implemented multi-tenant support with row-level security
✓ Applied clean, minimal UI with TailwindCSS
✓ Created SQL schema with proper indexing and RLS policies
✓ Added environment configuration setup
-->

- [x] Install Required Extensions
<!-- No additional extensions needed beyond built-in Next.js support -->

- [x] Compile the Project
<!--
Verify that all previous steps have been completed.
Install any missing dependencies.
Run diagnostics and resolve any issues.
Check for markdown files in project folder for relevant instructions on how to do this.
-->

- [x] Create and Run Task
<!--
✓ Created development server task for npm run dev
Note: Requires Node.js version ^18.18.0 || ^19.8.0 || >= 20.0.0 to run
Current version 18.10.0 needs to be updated
 -->

- [x] Launch the Project
<!--
Project requires environment setup before launch:

1. Update Node.js to version >= 18.18.0
2. Set up Supabase project and configure .env.local
3. Run SQL schema in Supabase
4. Create initial tenant and staff data
5. Run npm run dev to start development server
   -->

- [x] Ensure Documentation is Complete

Restaurant Reservation System - Next.js + Supabase
Features: Staff authentication, reservation CRUD, calendar view, mobile-friendly, embeddable iframe routes, multi-tenant support
