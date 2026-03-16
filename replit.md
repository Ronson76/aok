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
- **Frameworks**: React 18 with TypeScript, Wouter for routing, TanStack React Query.
- **Styling**: Tailwind CSS with custom properties for theming (light/dark, Admin slate, Org indigo), shadcn/ui.
- **Build & Design**: Vite, mobile-first, card-based layout, bottom navigation.
- **Entry Flow**: Role-selection entry screen (Individual / Organisation / Lone Worker) with tailored landing pages.
- **Native Support**: Capacitor 8 for iOS, Android, and Mac Catalyst.
- **Internationalization**: i18next with English, Welsh, Spanish, browser language detection.
- **Accessibility**: Skip-to-content, ARIA roles, 44px touch targets.
- **PWA & Offline**: Service Worker for caching, `offline.html` fallback, offline emergency overlay, PWA install prompts.

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
- **Authentication**: TOTP-based 2FA.
- **Rate Limiting**: `express-rate-limit`.
- **CSRF Protection**: Double-submit cookie pattern.
- **Service Resilience**: Retry with exponential backoff, circuit breakers, multi-provider fallback for notifications.
- **Logging**: `pino`-based structured JSON logging.
- **Database Indexes**: 12 performance indexes.

### Core Features
- **Check-in & Alert System**: User-defined frequency, automated email, SMS, WhatsApp, and voice call alerts.
- **Emergency Features**: Emergency button with GPS, shake-to-SOS, offline overlay, optional recording. WhatsApp for all alert types.
- **WhatsApp Integration**: Twilio WhatsApp Business API with webhook endpoints.
- **Wellness Features**: Mood/Wellness Tracking, Pet Protection, Document Storage, GPS Fitness Tracking, AI chat.
- **Compliance**: Non-skippable onboarding with legal disclaimers and consent logging.
- **Admin Dashboard**: Role-based access, user/org management, license agreements, revenue tracking, feature permissions, security audit logging, enterprise toggles.
- **Organization Features**: Client/staff management, monitoring, dynamic feature control, safeguarding hub, analytics, audit trail, exports. Age-based seat types (safeguarding/check_in). Kiosk Check-in Mode, Data Capture tool.
- **Frontline Support**: Dedicated section for frontline services with Home Dashboard, Residents List, Quick Log, Unified Timeline, Manager Dashboard.
- **Support Signal**: Resident-initiated support request system with "I'm OK", "Need Support", "Urgent Help" options, staff alerts, and escalation timers.
- **RentScore Landing Page**: Proof-of-concept for digital trust and reward system for tenants.
- **Enterprise Add-ons**: Organisation Dashboard, Funding Assurance, Assurance Dashboard, API Access.
- **GRC**: 8-tier RBAC, tamper-evident audit trails, security audit logging, UK GDPR-compliant, TOTP 2FA, 5-minute inactivity auto-logout.
- **Funder Ready**: Exportable PDF/CSV compliance reports, measurable outcomes.
- **Legal Agreements**: EULA, DPA, Privacy Policy, Terms.
- **Organisation Pricing**: Contact-based.
- **Individual Plan Gating**: Three-tier subscription pricing (Basic, Essential, Complete) with plan-aware feature gating and upgrade flow.

### Native App (Capacitor)
- **Configuration**: Capacitor 8.
- **Plugins**: Geolocation, Haptics, Status Bar, Keyboard.
- **Theme**: Dark theme backgrounds, status bar overlay.
- **Permissions**: Location, camera, microphone.
- **Mac Catalyst**: Specific configuration for Mac build.

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
- **OpenAI**: AI chat features.
- **Leaflet/OpenStreetMap**: Map rendering.