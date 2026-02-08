# aok

## Overview
aok is a personal safety check-in application designed to keep users connected with loved ones. It enables users to set a check-in frequency (1-48 hours), and if a check-in is missed, automated alerts are sent to emergency contacts via email and voice calls. The application features a comprehensive dashboard for managing check-in status, tracking streaks, managing contacts, viewing history, and configuring settings. It also includes an emergency alert button with GPS sharing, an alarm system, and optional wellness features such as mood tracking, pet protection profiles, and secure digital document storage. The project aims to provide a robust, reliable, and user-friendly solution for personal safety and peace of mind.

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
- **SMS Check-in Reminders**: Automatic SMS fallback for overdue check-ins with a secure tokenised check-in link.
- **Offline Emergency Overlay**: Displays primary contact quick-dial button and 999 emergency button if connection is lost.
- **Subscription Management**: Displays subscription status, allows cancellation/reactivation.
- **Forgot Password**: Complete password reset flow via email.
- **Password Policy**: Minimum 8 characters, special characters allowed.
- **Shake to SOS**: Enabled by default, can be disabled in settings.

### Legal / Licence Agreements
- **EULA** (`/eula`): Individual user licence agreement.
- **Enterprise Licence** (`/enterprise-licence`): Organisation multi-user licence.
- **Data Processing Addendum** (`/data-processing-addendum`): GDPR DPA for organisations.
- **SLA** (`/sla`): Service level agreement (paid tiers only, 99.9% uptime target).
- **Lone Worker Addendum** (`/lone-worker-addendum`): Additional terms for lone worker use.
- **Privacy Policy** (`/privacy`): Data privacy policy for all users.
- **Terms and Conditions** (`/terms`): General terms of service.
- **Deployment Matrix**: Individuals get EULA + Privacy Policy; Organisations get Enterprise Licence + DPA; Lone Workers get Enterprise Licence + Lone Worker Addendum + SLA; Paid tiers only get SLA.

### Admin Dashboard
- **Access**: Separate login (`/admin/login`) with role-based access (`super_admin`, `analyst`).
- **Management**: User management, organization bundle creation, client oversight (viewing, pausing, resuming, removing clients), client safeguarding hub, full client management including check-in schedule and feature toggles.
- **Licence Agreements Tab** (`/admin/licence-agreements`): Deployment matrix, document cards grouped by customer type, quick links to all legal documents (super_admin only).
- **Security**: Audit logging for admin actions.

### Organization Features
- **Bundles**: Organizations can purchase bundles of seats for their clients.
- **Client Management**: Organizations add/manage clients (individual users) by email, assign to bundles, manage emergency contacts, reset passwords, archive/restore clients. Supports bulk import via Excel spreadsheet upload (POST /api/org/clients/bulk-import).
- **Monitoring**: Dashboard to view client check-in status (Safe/Pending/Overdue), seat usage, and emergency alerts.
- **Dynamic Feature Control**: Organizations can enable/disable specific wellness features for individual clients.
- **Safeguarding Hub**: Comprehensive system for incident reporting, welfare concerns, case files, and escalation rules.
- **Staff Invitation System**: Workflow for inviting and managing staff with role-based access.
- **Organisation Help Centre**: In-dashboard A-Z searchable help system with 40+ topics across 6 categories, alphabet quick-navigation bar. Floating indigo help button on all authenticated org pages.

### Documentation & Guides (KEEP UPDATED)
- **Public How-to Guide** (`client/src/pages/guide.tsx`): A-Z individual user guide at `/guide` with 30+ topics, alphabet navigation, search. Covers account creation, check-ins, emergency features, wellbeing, settings, troubleshooting. **Must be updated when any user-facing feature changes.**
- **Organisation Help Centre** (`client/src/components/org-help-center.tsx`): A-Z org management guide with 40+ topics covering clients, staff, lone worker, safeguarding, reports, account settings. **Must be updated when any org-facing feature changes.**

### Key Design Decisions
- **Monorepo**: Client, server, and shared code in one repository.
- **Shared Schema**: Zod for type-safe validation across client and server.
- **Component Library**: shadcn/ui for accessible, customizable UI components.
- **Theme System**: CSS custom properties for light/dark mode with separate themes for Admin (slate) and Org (indigo) portals.
- **Native App Support**: Capacitor for iOS and Android app build capability with native plugins.
- **AI Integration**: In-app AI chat for wellbeing with mood pattern detection, streaming responses, and voice chat mode (OpenAI GPT-4o, TTS, Whisper API).

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
- **Twilio**: For SMS alerts and automated voice calls for emergencies and missed check-ins.
- **what3words**: Integrates precise location sharing (three-word addresses) into emergency alerts.
- **Stripe**: Payment processing with subscription management, 7-day free trial, Apple Pay/Google Pay support.
- **Ecologi**: Environmental impact tracking and automatic tree planting for new subscribers.
- **OpenAI**: For AI chat features (GPT-4o for responses, TTS for voice output, Whisper API for speech-to-text).