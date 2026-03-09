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
- **Entry Flow**: Role-selection entry screen (Individual / Organisation / Lone Worker) with tailored landing pages per audience. Selection stored in localStorage (`aok_landing_type`). Routes: `/individual`, `/organisations`, `/lone-worker`. Each landing page has a **Home** button (top-left header) that clears the stored preference and returns to the entry screen, allowing users to switch category.
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
- **Admin Dashboard**: Role-based access, user/organization management, license agreements, revenue tracking, feature permissions, security audit logging. Enterprise feature toggles (Organisation Dashboard, Assurance Dashboard, API Access) with optional expiry dates per organisation. Organisation-level subscription expiry date with 28-day warning alerts on the org dashboard.
- **Organization Features**: Client and staff management, monitoring, dynamic feature control, safeguarding hub, analytics dashboard, comprehensive audit trail with tamper-evident hash chains, PDF/CSV exports. Age-based seat types: under-16 clients get "safeguarding" seats (dashboard-only, no SMS/app access), 16+ get "check_in" seats (full SMS flow). Birthday transition prompts upgrade when safeguarding seat holders turn 16. Kiosk Check-in Mode (/org/kiosk) for physical attendance verification - clients identify by reference code or name+DOB, optional photo capture, records check-in with photo stored in object storage. Data Capture tool (/org/data-capture) for structured safeguarding interaction logging with role-based access control. Team members with `data_capture:write` permission (owner, admin, safeguarding_lead, service_manager, manager, staff) can log interactions, register clients, complete follow-ups, and archive records. Team members with `data_capture:read` only (trustee, viewer) get read-only access to recent interactions, overdue follow-ups, lost contacts, and stats - the Log tab is hidden and write buttons are removed. The tool auto-detects whether the user is an org owner or a team member and uses the appropriate API endpoints (`/api/org/interactions/*` for owners, `/api/org-member/interactions/*` for members). Member interactions are tagged with `loggedByMemberId` for audit. Staff name is auto-filled from team account. Features include: risk tier, risk indicators, contact type, programme, action taken, and follow-up requirements. Automatic escalation logging for safeguarding referrals/DSL notifications. When an escalation is triggered (safeguarding referral, DSL informed, or high risk tier on public DC), a welfare concern is automatically created in the Safeguarding Hub with all interaction data pre-filled (risk tier, risk indicators, action taken, referral agency). These auto-generated concerns are tagged "From Data Capture" in the Safeguarding Hub UI. Lost contact flagging based on risk tier (high=2 days, medium=7, low=14). Overdue follow-up tracking. Tamper-evident records (no deletion, archive only). GPS auto-capture during field use. CSV export (download all interactions) and CSV import (bulk upload interactions by reference code) available for both org owners and team members via toolbar buttons. "Send Data Capture Link" dialog on org dashboard sends the Data Capture URL to staff via SMS or email with a mandatory access password. Public Data Capture links (`/data-capture/:token`) are password-protected with HMAC-signed session cookies (24h expiry). After authentication, users select a mode: Staff Assisted (full structured interaction logging) or Self Check-In (simplified tablet mode for service users at shelters/drop-ins). Self Check-In creates minimal "contact logged" entries by name/reference code with optional "request to see worker" flag - risk tiers are not updated by self check-in (staff-only). Legal disclaimers on all screens state this is not emergency monitoring and escalation responsibility sits with the organisation. All records are tamper-evident (archive only, no deletion).
- **RentScore Landing Page**: Proof-of-concept showcase at `/rentscore` for the RentScore digital trust and reward system for tenants. Features tenant dashboard demo (score, rewards, payment history), housing provider GRC view (trust scores, payment reliability, engagement metrics), safeguarding intelligence (auto-triggers on missed rent + inactivity), funding opportunity section, and commercial pricing model (£3/tenant/month add-on). Card on organisation landing page links to it. Register Interest CTAs email help@aok.care.
- **Enterprise Add-ons**: Organisation Dashboard (main org management view), Funding Assurance (GRC-grade funding audit trail with sources, transactions, allocations, activity/incident logging, risk flags, compliance scoring, CSV audit export, and simulated bank integration), Assurance Dashboard (real-time safeguarding position, risk heatmaps, board governance reports) and API Access (read-only external integration) — toggled on/off per organisation by admin with optional expiry dates.
- **GRC (Governance, Risk & Compliance)**: 8-tier RBAC, tamper-evident audit trails with hash-chain verification, security audit logging with PII redaction, UK GDPR-compliant data handling, TOTP 2FA for all accounts. 5-minute inactivity auto-logout on all org pages via shared `useInactivityLogout` hook (`client/src/hooks/use-inactivity-logout.ts`) - listens for mousedown/keydown/touchstart, clears org-member session, query cache, and redirects to staff-login with sessionExpired flag.
- **Funder Ready**: Exportable PDF/CSV compliance reports, measurable outcomes with quantifiable metrics, board-level RAG status indicators and trend analysis.
- **Enterprise RBAC**: 8 tiers of organization member roles with granular permission-based middleware.
- **Legal Agreements**: Comprehensive suite of legal documents including EULA, DPA, Privacy Policy, and Terms.
- **Organisation Pricing**: Contact-based (no self-serve). Pricing card includes Core Platform, Funder Ready, Assurance Dashboard, GRC, and Infrastructure sections.
- **Individual Plan Gating**: Three-tier subscription pricing (Basic £2.99, Essential £9.99, Complete £16.99) with plan-aware feature gating. Plan detection via `stripeService.getUserPlanFeatures(email)` which maps Stripe `unit_amount` to tier. `/api/plan` returns tier and feature map. `/api/features` returns plan-gated feature flags using `=== true` checks (not `!== false`) to prevent features leaking when data is loading. **Basic**: 2 contacts, email-only check-in alerts, no shake/GPS-tracking/recording/mood/pets/docs/activities/AI. **Essential**: 5 contacts, all alert channels, shake-to-SOS, continuous location sharing, push notifications, offline SMS — but no emergency recording, mood, pets, documents, activities, or AI. **Complete**: everything enabled. SOS emergency alerts always use all channels (email+SMS+voice) regardless of plan. Contact limits enforced server-side in `setPrimaryContact()` using plan's `maxActiveContacts`. Settings page shows locked feature cards (Location Sharing, Shake-to-SOS, Emergency Recording) with `UpgradeBanner` compact prompts when user's plan doesn't support the feature — cards are visually dimmed with `opacity-75`. Guards use `features && features.featureX !== true` to avoid flash before features load. Bottom nav Wellbeing menu only shown when user has at least one wellness feature enabled. Upgrade flow: `POST /api/stripe/upgrade-subscription` updates existing Stripe subscription with `proration_behavior: 'none'`. `UpgradeBanner` component (`client/src/components/upgrade-banner.tsx`) supports compact and full modes. All users complete identical onboarding regardless of plan.

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