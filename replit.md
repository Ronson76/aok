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
- **Internationalisation (i18n)**: i18next with English, Welsh (Cymraeg), and Spanish (Español) translations; browser language detection; inline resources from `client/src/locales/`.
- **Accessibility**: Skip-to-content links, ARIA navigation roles, `aria-current="page"` on active nav items, `role="alert"` on form errors, `aria-labels` on icon-only buttons, 44px touch targets.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **API Design**: RESTful JSON API (`/api/` prefix)
- **Build Process**: esbuild for production, tsx for development

### Security & Resilience
- **Two-Factor Authentication (2FA)**: TOTP-based using OTPAuth library; 6-digit codes, 30-second period, 1-window validation tolerance. Available for user, organisation, and admin accounts. QR code setup flow. Secrets excluded from all API responses.
- **Rate Limiting**: express-rate-limit on login (10/15min) and password reset (5/hour) endpoints, plus global API rate limiting (120/min).
- **CSRF Protection**: Double-submit cookie pattern with x-csrf-token header validation; excludes webhook endpoints.
- **Service Resilience**: Retry with exponential backoff, circuit breakers (5 failures threshold, 60s cooldown), multi-provider fallback for notifications.
- **Structured Logging**: pino-based JSON logging with module-specific child loggers (auth, notifications, resilience, analytics, scheduler); PII redaction.
- **Database Indexes**: 12 performance indexes created automatically on startup via `server/performanceIndexes.ts` (using `CREATE INDEX IF NOT EXISTS` for idempotency) covering active_emergency_alerts (activated_at, user_id, location, is_active), check_ins (user_id, timestamp), organization_clients (organization_id, client_id), sessions, mood_entries, contacts, and audit_logs.
- **Notification Health Checks**: `/api/admin/notifications/health` endpoint monitoring external service status (Resend, SendGrid, Gmail, Outlook, Twilio).

### PWA & Offline Support
- **Service Worker**: `client/public/sw.js` (v3) with app shell caching, API response caching with offline fallback, and dedicated `offline.html` fallback page.
- **Offline Emergency Overlay**: Quick-dial buttons for primary contact and 999 when connection is lost.
- **Safe Area Insets**: `viewport-fit=cover` meta tag for notch devices; safe-area-inset padding applied.
- **Install Prompt**: PWA installable on iOS (Safari) and Android (Chrome).

### Native App (Capacitor)
- **Framework**: Capacitor 8 with `capacitor.config.ts`.
- **Plugins**: Geolocation (background/foreground), Haptics, Status Bar, Keyboard.
- **Theme**: Dark theme backgrounds (`#0f172a`), status bar overlay.
- **Permissions**: Location (always/when-in-use), camera, microphone.

### Data Layer
- **ORM**: Drizzle ORM for PostgreSQL
- **Schema Definition**: Shared TypeScript schemas with Zod validation.
- **Storage**: Fully persistent PostgreSQL via Drizzle ORM.

### Core Features
- **Check-in System**: User-defined frequency, automated alerts on missed check-ins.
- **Alert System**: Email and voice calls to emergency contacts.
- **Emergency Features**: Emergency alert button with GPS, shake-to-SOS, offline emergency overlay, optional emergency recording.
- **Wellness Features**: Mood/Wellness Tracking, Pet Protection, Important Document Storage, GPS Fitness Tracking, Route Planning, Activities Tracker.
- **Compliance**: Non-skippable onboarding with legal disclaimers and consent logging.
- **Admin Dashboard**: Role-based access for user/organization management, license agreements, revenue tracking, feature permissions, and security audit logging.
- **Organization Features**: Client and staff management (including bulk import), monitoring, dynamic feature control per client, safeguarding hub, analytics dashboard (peak times, alert heatmap, active SOS alerts), comprehensive audit trail with tamper-evident hash chains, PDF/CSV exports, integrity verification, and configurable retention policies.
- **AI Integration**: In-app AI chat for wellbeing with mood pattern detection, streaming responses, and voice chat mode.
- **Two-Factor Authentication**: TOTP-based 2FA for all account types (user, organisation, admin) with QR code setup, authenticator app verification, and password-protected disable flow.
- **Multi-Language Support**: English, Welsh (Cymraeg), and Spanish (Español) with automatic browser language detection and persistent preference.

### Legal / Licence Agreements
- Comprehensive suite of legal documents including EULA, Enterprise Licence, DPA, SLA, Lone Worker Addendum, IP Ownership, NDA, Privacy Policy, and Terms and Conditions.

## Key Files
- `server/routes.ts` — Main API routes (auth, check-ins, contacts, emergencies, settings, 2FA)
- `server/adminRoutes.ts` — Admin dashboard API routes
- `server/organizationRoutes.ts` — Organisation management API routes
- `server/storage.ts` — Database storage layer (Drizzle ORM)
- `server/performanceIndexes.ts` — Database performance indexes (auto-created on startup)
- `shared/schema.ts` — Shared TypeScript/Zod schemas and Drizzle table definitions
- `client/src/pages/login.tsx` — Login page with 2FA support
- `client/src/pages/settings.tsx` — Settings page with 2FA setup, language switcher
- `client/src/pages/guide.tsx` — Public How-to Guide (A-Z searchable)
- `client/src/components/org-help-center.tsx` — Organisation Help Centre (categorised, searchable)
- `client/src/components/two-factor-setup.tsx` — 2FA QR code setup component
- `client/src/lib/i18n.ts` — i18next configuration and initialisation
- `client/src/locales/en.json`, `cy.json`, `es.json` — Translation files
- `client/public/sw.js` — Service worker for offline PWA support
- `client/public/offline.html` — Offline fallback page
- `capacitor.config.ts` — Capacitor native app configuration

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
- **Health Tracking**: Real-time monitoring of external service status via `/api/admin/notifications/health`.

## Recent Changes
- **Supervisor Emergency Cancellation**: Supervisors can cancel emergencies for unresponsive/panic lone workers from the Live Monitor. Requires checkbox confirmation that they've spoken to the worker and entry of the worker's cancellation password. Failed attempts are audit-logged. `cancellationPinHash` stored on staff invites, set during registration. API: `POST /api/org/lone-worker/:sessionId/supervisor-cancel`. `cancellationPinHash` stripped from all API responses (GET `/api/org/staff/invites`).
- **Cancellation Password on Registration**: Staff members must set a cancellation password (min 4 chars) when accepting an invite. Hashed with bcrypt, stored on the staff invite record.
- **Lone Worker Supervisor System**: Supervisor designated as primary contact for missed check-ins and emergencies; emergency contacts are secondary. Supervisor fields (name, phone, email) stored on staff invites. Edit dialog in Lone Worker Hub staff tab with SMS phone verification.
- **International Phone Handling**: Country code selector (UK +44 default, plus IE, DE, FR, US) on all phone fields. Auto-strips leading zeros for correct E.164 formatting.
- **Live Location Map**: Location button per worker in Live Monitor expands inline Leaflet/OSM map with pulsing status-coloured marker, coordinates, last-updated time, and Google Maps link. Marker colour updates live with status changes. GPS sent immediately on shift start, then every 60 seconds.
- **SMS Supervisor Verification**: POST `/api/org/supervisor/send-verification` and `/verify-sms` endpoints. 6-digit code sent via Twilio, verified before saving supervisor phone.
- **Staff Detail Editing**: PATCH `/api/org/staff/invite/:inviteId/details` endpoint for updating staff name, phone, email, supervisor details. Edit dialog in Lone Worker Hub staff tab.
- **Documentation**: Guide and Help Centre updated with staff registration (including cancellation password), supervisor emergency cancellation, live location tracking, supervisor details, SMS verification, and international phone number entries.
- **2FA Security Hardening**: `twoFactorSecret` excluded from all user profile API responses across routes, admin, org, and storage layers. 2FA TOTP verification added to organisation login flow.
- **Multi-Language Support**: i18next with EN/CY/ES translations, browser detection, language switcher component.
- **Offline PWA**: Service worker v3, offline.html fallback, app shell caching, API response caching.
- **Performance Indexes**: 12 database indexes auto-created on startup for critical query paths.
- **Accessibility**: Skip links, ARIA roles, keyboard navigation, 44px touch targets.
- **Capacitor Polish**: Dark theme backgrounds, geolocation/haptics/status bar/keyboard plugins configured.
- **Notification Health**: Admin endpoint for monitoring external notification service status.