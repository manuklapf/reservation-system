# Restaurant Reservation System

A modern, multi-tenant restaurant reservation management system built with Next.js and Supabase. Features staff authentication, reservation CRUD operations, calendar view, mobile-friendly design, and embeddable iframe support.

## Features

- 🔐 **Staff Authentication** - Secure login with Supabase Auth
- 📝 **Reservation Management** - Create, edit, delete, and view reservations
- 📅 **Calendar View** - Visual timeline of reservations with filtering
- 📱 **Mobile Friendly** - Responsive design for servers on phones
- 🖼️ **Embeddable Widget** - iframe-friendly tenant routes
- 🏢 **Multi-tenant** - Row-level security with tenant isolation
- ⚡ **Real-time** - Live updates with Supabase
- 🎨 **Clean UI** - Built with TailwindCSS

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd reservation-system
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API and copy your URL and anon key
3. In the SQL Editor, run the schema from `supabase-schema.sql`

### 3. Environment Setup

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### 4. Create Initial Data

In your Supabase SQL Editor, create a tenant and staff member:

```sql
-- Create a tenant
INSERT INTO tenants (name, slug) VALUES ('Your Restaurant', 'your-restaurant');

-- Create a staff member (first create the user in Supabase Auth UI)
INSERT INTO staff (tenant_id, email, name, role) 
VALUES (
    (SELECT id FROM tenants WHERE slug = 'your-restaurant'),
    'your-email@example.com',
    'Your Name',
    'manager'
);
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### Staff Dashboard

1. Go to `/auth/login` and sign in with your staff credentials
2. Access the dashboard to manage reservations
3. Use the calendar view for a timeline perspective
4. Create, edit, and delete reservations as needed

### Embeddable Widget

The system supports embeddable reservation views at `/{tenant-slug}`:

```html
<!-- Embed in any website -->
<iframe 
  src="https://your-domain.com/your-restaurant" 
  width="100%" 
  height="600"
  frameborder="0">
</iframe>
```

## Database Schema

The system uses three main tables:

- **tenants** - Restaurant/organization information
- **staff** - Staff members with tenant association
- **reservations** - Reservation data with tenant isolation

All tables use Row Level Security (RLS) for data protection.

## API Routes

The application uses Supabase's auto-generated APIs with RLS policies:

- Authenticated staff can manage reservations for their tenant
- Public access is read-only for confirmed reservations (embeddable views)
- All data is isolated by tenant_id

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The application is configured for seamless Vercel deployment with:
- Automatic builds
- Environment variable support
- Edge runtime compatibility

### Production Considerations

- Set up proper domain and SSL
- Configure Supabase for production
- Set up monitoring and logging
- Consider implementing rate limiting
- Add backup strategies for your database

## Mobile Optimization

The application is fully responsive and optimized for mobile devices:

- Touch-friendly interface
- Optimized layouts for small screens
- Fast loading with Next.js optimization
- PWA-ready structure

## Security Features

- Row Level Security (RLS) with Supabase
- Tenant data isolation
- Secure authentication with JWT
- Input validation and sanitization
- CSRF protection with Next.js

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

1. Check the GitHub issues
2. Review Supabase documentation
3. Check Next.js documentation
4. Create a new issue with detailed information

## Roadmap

- [ ] Email notifications for reservations
- [ ] SMS integration
- [ ] Advanced reporting and analytics
- [ ] Table management system
- [ ] Customer booking portal
- [ ] Integration with POS systems
- [ ] Multi-language support