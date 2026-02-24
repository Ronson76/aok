# aok

## Overview
aok is a personal safety check-in application designed to connect users with loved ones, offering peace of mind through configurable check-in frequencies and automated alerts to emergency contacts via email and voice calls upon missed check-ins. It includes an emergency alert button with GPS sharing and a comprehensive dashboard for managing check-ins, contacts, history, and settings. The application also incorporates optional wellness features such as mood tracking, pet protection profiles, secure digital document storage, and built-in GPS fitness tracking with AI integration. The project's vision is to provide a robust, reliable, and user-friendly personal safety solution with significant market potential.

## User Preferences
Preferred communication style: Simple, everyday language.
Update policy: Always update the public How-to Guide (`/guide`) and Organisation Help Centre with every feature change or update.
Primary environment: The user ONLY uses the published/production site. All changes, database operations, and verifications MUST target the production environment. Development-only changes are insufficient — always verify on the published site. The development and production databases are SEPARATE instances.
Database rule: When clearing or modifying data, it must be done via the application's own API endpoints (which work on both dev and production) rather than via direct SQL (which only affects development). Any data cleanup features must be built into the app itself so they work on the published site.

## System Architecture

### Frontend
- **Framework & Libraries**: React 18 with TypeScript, Wouter for routing, TanStack React Query for state management.
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode, Admin slate, Org indigo), shadcn/ui built on Radix UI for UI components.
- **Build & Design**: Vite build tool, mobile-first design, card-based layout, consistent spacing, bottom navigation.
- **Native Support**: Capacitor 8 for iOS, Android, and Mac Catalyst app builds with native plugins.
- **Internationalization**: i18next with English, Welsh, and Spanish translations, browser language detection.
- **Accessibility**: Skip-to-content links, ARIA roles, `aria-current="page"`, `role="alert"`, `aria-labels` on icon-only buttons, 44px touch targets.
- **PWA & Offline**: Service Worker (v3) for app shell and API response caching, `offline.html` fallback, offline emergency overlay, PWA install prompts.

### Backend
- **Runtime**: Node.js with Express.
- **Language**: TypeScript.
- **API Design**: RESTful JSON API (`/api/` prefix).
- **Build Process**: esbuild for production, tsx for development.

### Data Layer
- **ORM**: Drizzle ORM for PostgreSQL.
- **Schema**: Shared TypeScript schemas with Zod validation.
- **Storage**: Persistent PostgreSQL database.

### Security & Resilience
- **Authentication**: TOTP-based Two-Factor Authentication (2FA) for user, organization, and admin accounts.
- **Rate Limiting**: `express-rate-limit` on critical endpoints and global API.
- **CSRF Protection**: Double-submit cookie pattern.
- **Service Resilience**: Retry with exponential backoff, circuit breakers, multi-provider fallback for notifications.
- **Logging**: `pino`-based structured JSON logging with PII redaction.
- **Database Indexes**: 12 performance indexes created automatically on startup.
- **Notification Health Checks**: `/api/admin/notifications/health` endpoint for monitoring external service status.

### Core Features
- **Check-in & Alert System**: User-defined check-in frequency, automated email and voice call alerts to emergency contacts.
- **Emergency Features**: Emergency alert button with GPS, shake-to-SOS, offline emergency overlay, optional emergency recording.
- **Wellness Features**: Mood/Wellness Tracking, Pet Protection profiles, Important Document Storage, GPS Fitness Tracking, Route Planning, Activities Tracker, AI chat for wellbeing.
- **Compliance**: Non-skippable onboarding with legal disclaimers and consent logging.
- **Admin Dashboard**: Role-based access, user/organization management, license agreements, revenue tracking, feature permissions, security audit logging.
- **Organization Features**: Client and staff management, monitoring, dynamic feature control, safeguarding hub, analytics dashboard, comprehensive audit trail with tamper-evident hash chains, PDF/CSV exports.
- **Enterprise RBAC**: 8 tiers of organization member roles with granular permission-based middleware.
- **Legal Agreements**: Comprehensive suite of legal documents including EULA, DPA, Privacy Policy, and Terms.

### Native App (Capacitor)
- **Configuration**: Capacitor 8 with `capacitor.config.ts`.
- **Plugins**: Geolocation (background/foreground), Haptics, Status Bar, Keyboard.
- **Theme**: Dark theme backgrounds, status bar overlay.
- **Permissions**: Location, camera, microphone.
- **Mac Catalyst**: Specific configuration for Mac build, including plugin fallbacks and window sizing constraints.

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