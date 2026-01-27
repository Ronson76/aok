# aok

## Overview
aok is a personal safety check-in application designed to keep users connected with loved ones. It enables users to set a check-in frequency (1-48 hours), and if a check-in is missed, automated alerts are sent to emergency contacts via email and voice calls. The application features a comprehensive dashboard for managing check-in status, tracking streaks, managing contacts, viewing history, and configuring settings. It also includes an emergency alert button with GPS sharing, an alarm system, and optional wellness features such as mood tracking, pet protection profiles, and secure digital document storage (e.g., wills). The project aims to provide a robust, reliable, and user-friendly solution for personal safety and peace of mind.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode)
- **UI Components**: shadcn/ui built on Radix UI
- **Build Tool**: Vite
- **Design Principles**: Mobile-first, card-based layout, consistent spacing, bottom navigation.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **API Design**: RESTful JSON API (`/api/` prefix)
- **Build Process**: esbuild for production, tsx for development
- **Deployment**: Static files served from `dist/public` in production; Vite middleware for development.

### Data Layer
- **ORM**: Drizzle ORM for PostgreSQL
- **Schema Definition**: Shared TypeScript schemas with Zod validation (`/shared/schema.ts`)
- **Storage Abstraction**: Uses an in-memory storage implementation for development, designed to be swappable with a PostgreSQL database.

### Data Models
- **Core**: Contact, CheckIn, Settings, AlertLog
- **Wellness**: MoodEntry, Pet, DigitalDocument

### Core Features
- **Check-in System**: Users set frequency; missed check-ins trigger alerts.
- **Alert System**: Detects overdue check-ins, creates "missed" records, and sends email/voice alerts.
- **Primary Contact**: Designate one contact to receive notifications for every successful check-in.
- **Contact Confirmation**: Emergency contacts must confirm via email within 10 minutes to be active.
- **Wellness Features**: Optional Mood/Wellness Tracking, Pet Protection, and Digital Will Storage.

### Admin Dashboard
- **Access**: Separate login (`/admin/login`) with role-based access (`super_admin`, `analyst`).
- **Management**: User management, organization bundle creation, client oversight (viewing, pausing, resuming, removing clients).
- **Security**: Audit logging for admin actions.

### Organization Features
- **Bundles**: Organizations can purchase bundles of seats for their clients.
- **Client Management**: Organizations add/manage clients (individual users) by email, assign to bundles.
- **Monitoring**: Dashboard to view client check-in status (Safe/Pending/Overdue), seat usage, and emergency alerts.
- **Client Control**: Organizations can manage client emergency contacts and reset client passwords.
- **Dynamic Feature Control**: Organizations can enable/disable specific wellness features for individual clients.

### Key Design Decisions
- **Monorepo**: Client, server, and shared code in one repository.
- **Shared Schema**: Zod for type-safe validation across client and server.
- **Component Library**: shadcn/ui for accessible, customizable UI components.
- **Theme System**: CSS custom properties for light/dark mode.

## External Dependencies

### Database
- PostgreSQL (via DATABASE_URL)
- Drizzle Kit

### Frontend Libraries
- @tanstack/react-query
- Radix UI
- date-fns
- react-hook-form
- wouter
- lucide-react

### Backend Libraries
- express
- drizzle-orm
- zod
- connect-pg-simple

### APIs & Services
- **Resend**: For all email notifications (contact confirmation, successful check-in, missed check-in alerts, password reset).
- **Twilio**: For SMS alerts (mobile contacts) and automated voice calls (landline contacts) for emergencies and missed check-ins.
- **what3words**: Integrates precise location sharing (three-word addresses) into emergency alerts.
- **Stripe**: Payment processing with subscription management, 7-day free trial, Apple Pay/Google Pay support.

### Recent Changes (Jan 2026)
- **Subscription Management**: Settings page displays subscription status (Active/Trial/Cancelling) with plan details, cancel/reactivate buttons with password confirmation
- **Forgot Password**: Complete password reset flow via email (`/forgot-password`, `/reset-password?token=xxx`)
- **Auth Improvements**: Subscription endpoints protected with authMiddleware
- **Org/Admin Password Management**: Both org dashboard and admin dashboard now have forgot password flows and change password functionality
- **Feature Toggle Propagation**: Org dashboard feature restrictions now apply to client apps via merged feature flags in `/api/auth/me` endpoint (AND logic - features only enabled if both org allows AND user has enabled)
- **Shake to SOS Default**: Enabled by default for all users (can be disabled in user settings)
- **Check-in Timing Fix**: Next check-in now calculates based on scheduleStartTime + intervalHours instead of last check-in time (e.g., scheduled 10am daily, check in at 2pm, next due is still 10am next day)

### Build Tools
- Vite
- esbuild
- tsx
- Tailwind CSS