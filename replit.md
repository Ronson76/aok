# aok

## Overview

aok is a personal safety check-in application that helps users stay connected with their loved ones through regular check-ins. Users set a check-in frequency (1-48 hours), and if they miss a check-in, their emergency contacts can be automatically alerted via email and voice calls. The app provides a dashboard showing check-in status, streak tracking, contact management, history viewing, and settings configuration. It includes an emergency alert button with GPS location sharing and an alarm system that beeps every 2 minutes when overdue.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Build Tool**: Vite with React plugin

The frontend follows a mobile-first design approach with a bottom navigation pattern. Pages include Dashboard, Contacts, History, and Settings. The app uses a card-based layout with consistent spacing primitives.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **API Design**: RESTful JSON API with endpoints prefixed `/api/`
- **Build Process**: esbuild bundles server code for production with selective dependency bundling to optimize cold start times

The server handles API routes through a central `registerRoutes` function. In development, Vite middleware serves the frontend with hot module replacement. In production, static files are served from the built `dist/public` directory.

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Definition**: Shared TypeScript schemas in `/shared/schema.ts` using Zod for validation
- **Current Storage**: In-memory storage implementation (`MemStorage` class) for development
- **Database Ready**: Drizzle configuration exists for PostgreSQL migration when DATABASE_URL is provided

The storage interface defines operations for contacts, check-ins, and settings. This abstraction allows swapping between in-memory storage and database-backed storage.

### Data Models
- **Contact**: Emergency contacts with name, email, optional phone, phoneType (mobile/landline), relationship, and isPrimary flag
- **CheckIn**: Timestamped records with success/missed status
- **Settings**: Check-in frequency (daily/every_two_days), last check-in time, next due time, alerts toggle
- **AlertLog**: Records of alerts sent to contacts when check-ins are missed

### Alert System
The app implements missed check-in detection and email notifications:
- When status is checked via `/api/status`, the system evaluates if the check-in is overdue
- If overdue and not yet processed, a "missed" check-in record is created
- Email alerts are sent to all emergency contacts via Resend integration
- An alert log is generated listing which contacts were notified
- Each overdue period is only processed once to prevent duplicate alerts

### Primary Contact Feature
Users can designate one contact as their "primary" contact:
- Primary contact receives notifications for EVERY successful check-in
- All contacts receive notifications only when check-ins are missed
- Only one contact can be primary at a time (enforced at storage layer)
- Setting a new primary contact automatically demotes the previous one
- Managed through dedicated `/api/contacts/:id/primary` endpoint

### Email Notifications (Resend Integration)
The app uses Resend for all email notifications:
- **Contact Confirmation**: When a user adds an emergency contact, the contact receives a confirmation email with accept/decline links. Contacts must confirm within 10 minutes or they are automatically removed. Tokens are hashed with SHA-256 before storage and nulled after use.
- **Successful Check-in Notification**: Primary contact receives notification for each successful check-in
- **Missed Check-in Alerts**: When a check-in is missed, all confirmed emergency contacts receive alert emails with the user's registered address
- **Password Reset**: Password reset links are sent via email
- The Resend connector is configured via Replit's integration system (credentials managed automatically)

### Contact Confirmation Flow
Emergency contacts must confirm their role before receiving alerts:
- **Confirmation Email**: Contains accept/decline buttons with secure tokens
- **10-Minute Expiry**: Unconfirmed contacts are automatically deleted after 10 minutes
- **Security**: Tokens are hashed with SHA-256 before storage; nulled after confirmation/decline
- **UI Indicator**: Pending contacts show amber "Pending" badge; primary toggle disabled until confirmed
- **Cleanup Scheduler**: Runs every minute to remove expired unconfirmed contacts
- **API Endpoints**: `/api/contacts/confirm?token=X&action=accept|decline`

### Twilio Integration (SMS and Voice Calls)
The app supports SMS and automated voice calls via Twilio:
- **Phone Type**: Contacts can be marked as "mobile" or "landline" when adding a phone number
- **SMS Alerts**: Mobile contacts (and contacts without a specified phone type) receive SMS alerts for emergency alerts
- **Voice Calls**: Landline contacts receive automated phone calls for emergencies and missed check-ins
- **Text-to-Speech**: Voice calls use Twilio's TTS to announce the alert message including the user's name or reference ID
- **Emergency Priority**: Emergency alerts trigger immediate SMS to mobile contacts and voice calls to landlines
- **Configuration**: Uses Twilio Auth Token authentication (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)

### what3words Integration
Emergency alerts include precise location information using what3words:
- **GPS Conversion**: Converts latitude/longitude to three-word addresses (e.g., ///filled.count.soap)
- **Location Sharing**: Emergency alert emails and SMS include both the what3words address and a link to its map
- **Fallback**: If what3words conversion fails, alerts still include Google Maps coordinates link
- **API Key**: Requires WHAT3WORDS_API_KEY secret

### Admin Dashboard
The app includes a separate admin system for platform management:
- **Separate Authentication**: Admin users have their own login system at `/admin/login` with 12-hour session TTL
- **Role-Based Access**: Two roles - `super_admin` (full access) and `analyst` (read-only)
- **Dashboard Statistics**: Overview of total users, organizations, individuals, check-ins, missed check-ins, and active bundles
- **User Management**: View all registered users, delete users (super_admin only)
- **Organization Bundles**: Create subscription bundles to allocate seats to organizations for monitoring users
- **Organization Client Overview**: View all organizations with client summaries, total/active/paused client counts, and aggregated alert counts
- **Privacy-Limited Client View**: Super admins can view organization clients with limited information (ordinal number, email, mobile) to protect privacy while allowing oversight
- **Client Status Controls**: Super admins can pause/resume or remove clients from organizations
- **Audit Logging**: All admin actions are logged for security and accountability

Admin API endpoints are prefixed with `/api/admin/` and use separate cookies for session management.

### Organization Bundles
Organizations can receive subscription bundles that allocate a specific number of seats:
- **Bundle Creation**: Super admins can create bundles for any organization user
- **Seat Tracking**: Each bundle has a seat limit and tracks seats used
- **Status Management**: Bundles can be active, expired, or cancelled
- **Expiry Support**: Optional expiry date can be set for time-limited subscriptions

### Organization Dashboard
Organizations with bundles can monitor their clients' check-in status:
- **Client Management**: Add individual users as clients by email, assign to bundles
- **Status Monitoring**: View real-time status (Safe/Pending/Overdue) for each client
- **Dashboard Stats**: Overview of total clients, seat usage, and status distribution
- **Emergency Alerts**: Track emergency alerts from monitored clients
- **Emergency Contact Management**: Organizations can view, add, edit, and delete emergency contacts for their clients via the Contacts tab in client details
- **Client Password Reset**: Organizations can reset client passwords through the dashboard (requires org password verification)
- **Security**: Bundle ownership verification prevents cross-organization access; password-protected actions for timer changes, contact deletion, and client password resets
- **Separate Navigation**: Organization users have distinct navigation from individual users

Organization API endpoints are prefixed with `/api/org/` and require organization account type.

API endpoints for client contact management:
- `GET /api/org/clients/:orgClientId/contacts` - List client's emergency contacts
- `POST /api/org/clients/:orgClientId/contacts` - Add emergency contact
- `PATCH /api/org/clients/:orgClientId/contacts/:contactId` - Update contact
- `DELETE /api/org/clients/:orgClientId/contacts/:contactId` - Delete contact

### Key Design Decisions

**Monorepo Structure**: Client, server, and shared code coexist in one repository with path aliases (`@/` for client, `@shared/` for shared code).

**Shared Schema**: Zod schemas in `/shared/schema.ts` provide runtime validation on both client and server, ensuring type safety across the stack.

**Component Library**: shadcn/ui provides accessible, customizable components. Components are copied into the project rather than imported from a package, allowing full customization.

**Theme System**: CSS custom properties enable light/dark mode switching without JavaScript overhead. The theme is persisted in localStorage.

## External Dependencies

### Database
- **PostgreSQL**: Primary database when DATABASE_URL environment variable is set
- **Drizzle Kit**: Database migration tool (`db:push` script)

### Frontend Libraries
- **@tanstack/react-query**: Server state management
- **Radix UI**: Accessible component primitives (dialog, dropdown, toast, etc.)
- **date-fns**: Date formatting and manipulation
- **react-hook-form**: Form handling with Zod resolver
- **wouter**: Client-side routing
- **lucide-react**: Icon library

### Backend Libraries
- **express**: HTTP server framework
- **drizzle-orm**: Database ORM
- **zod**: Schema validation
- **connect-pg-simple**: PostgreSQL session store (available for future auth)

### Build Tools
- **Vite**: Frontend bundler with HMR
- **esbuild**: Server bundler for production
- **tsx**: TypeScript execution for development
- **Tailwind CSS**: Utility-first CSS framework