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
- **Contact**: Emergency contacts with name, email, optional phone, and relationship
- **CheckIn**: Timestamped records with success/missed status
- **Settings**: Check-in frequency (daily/every_two_days), last check-in time, next due time, alerts toggle
- **AlertLog**: Records of alerts sent to contacts when check-ins are missed

### Alert System
The app implements missed check-in detection and alert simulation:
- When status is checked via `/api/status`, the system evaluates if the check-in is overdue
- If overdue and not yet processed, a "missed" check-in record is created
- An alert log is generated listing which contacts would be notified
- Console logs simulate email notifications (real email/SMS can be added via SendGrid/Twilio integrations)
- Each overdue period is only processed once to prevent duplicate alerts

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