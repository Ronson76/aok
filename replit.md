# CheckMate

## Overview

CheckMate is a personal safety check-in application that helps users stay connected with their loved ones through regular check-ins. Users set a check-in frequency, and if they miss a check-in, their emergency contacts can be automatically alerted. The app provides a dashboard showing check-in status, streak tracking, contact management, history viewing, and settings configuration.

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
- **Contact**: Emergency contacts with name, email, optional phone, relationship, and isPrimary flag
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
- **Contact Added Notification**: When a user adds an emergency contact, the contact receives an email explaining their role
- **Successful Check-in Notification**: Primary contact receives notification for each successful check-in
- **Missed Check-in Alerts**: When a check-in is missed, all emergency contacts receive alert emails with the user's registered address
- **Password Reset**: Password reset links are sent via email
- The Resend connector is configured via Replit's integration system (credentials managed automatically)

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