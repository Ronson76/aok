# aok

## Overview
aok is a personal safety check-in application designed to provide peace of mind by connecting users with loved ones. It features configurable check-in frequencies, automated alerts to emergency contacts via email and voice calls upon missed check-ins, and an emergency alert button with GPS sharing. The application also includes a comprehensive dashboard for managing check-ins, contacts, history, and settings, alongside optional wellness features like mood tracking, pet protection profiles, secure digital document storage, and built-in GPS fitness tracking with AI integration. The project aims to deliver a robust, reliable, and user-friendly personal safety solution.

## User Preferences
Preferred communication style: Simple, everyday language.
Update policy: Always update the public How-to Guide (`/guide`) and Organisation Help Centre with every feature change or update.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode, Admin slate, Org indigo)
- **UI Components**: shadcn/ui built on Radix UI
- **Build Tool**: Vite
- **Design Principles**: Mobile-first, card-based layout, consistent spacing, bottom navigation.
- **Native App Support**: Capacitor 8 for iOS and Android app build capability with native plugins.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **API Design**: RESTful JSON API (`/api/` prefix)
- **Build Process**: esbuild for production, tsx for development

### Data Layer
- **ORM**: Drizzle ORM for PostgreSQL
- **Schema Definition**: Shared TypeScript schemas with Zod validation.
- **Storage**: Fully persistent PostgreSQL via Drizzle ORM.

### Core Features
- **Check-in System**: User-defined frequency, automated alerts on missed check-ins.
- **Alert System**: Email and voice calls to emergency contacts.
- **Emergency Features**: Emergency alert button with GPS, shake-to-SOS, offline emergency overlay, optional emergency recording.
- **Wellness Features**: Mood/Wellness Tracking, Pet Protection, Digital Will Storage, GPS Fitness Tracking, Route Planning, Activities Tracker.
- **Compliance**: Non-skippable onboarding with legal disclaimers and consent logging.
- **Admin Dashboard**: Role-based access for user/organization management, license agreements, revenue tracking, feature permissions, and security audit logging.
- **Organization Features**: Client and staff management (including bulk import), monitoring, dynamic feature control per client, safeguarding hub, comprehensive audit trail with tamper-evident hash chains, PDF/CSV exports, integrity verification, and configurable retention policies.
- **AI Integration**: In-app AI chat for wellbeing with mood pattern detection, streaming responses, and voice chat mode.

### Legal / Licence Agreements
- Comprehensive suite of legal documents including EULA, Enterprise Licence, DPA, SLA, Lone Worker Addendum, IP Ownership, NDA, Privacy Policy, and Terms and Conditions.

## External Dependencies

### Database
- PostgreSQL
- Drizzle Kit

### APIs & Services
- **Resend**: Primary email provider.
- **SendGrid**, **Gmail**, **Outlook**: Email fallback providers.
- **Twilio**: SMS and voice call alerts.
- **what3words**: Precise location sharing.
- **OSRM**: Routing engine.
- **Open-Meteo**: Weather forecast API.
- **Stripe**: Payment processing and subscription management.
- **Ecologi**: Environmental impact tracking.
- **OpenAI**: AI chat features (GPT-4o, TTS, Whisper API).
- **Leaflet/OpenStreetMap**: Map rendering.

### Service Resilience
- **Retry Mechanisms**: Exponential backoff for critical notifications.
- **Email Fallback Chain**: Sequential fallback across multiple email providers.
- **Circuit Breaker**: Isolates failing services to prevent cascading failures.
- **Health Tracking**: Real-time monitoring of external service status.