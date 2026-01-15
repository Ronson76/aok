# CheckMate Design Guidelines

## Design Approach
**System-Based Design** using Material Design principles for trust, clarity, and strong visual feedback. This utility-focused safety app prioritizes reliability and ease of use over decorative elements.

## Core Design Elements

### Typography
- **Primary Font**: Inter or Roboto via Google Fonts
- **Heading Scale**: text-4xl (hero status), text-2xl (section headers), text-xl (card titles)
- **Body Text**: text-base for primary content, text-sm for secondary info
- **Weight Distribution**: font-semibold for headers, font-medium for emphasis, font-normal for body

### Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card gaps: gap-4
- Button padding: px-6 py-3

**Container Strategy**:
- Mobile-first: Full-width with px-4 padding
- Desktop: max-w-4xl centered for main content
- Dashboard cards: max-w-sm to max-w-md

### Component Library

**Status Display (Hero)**
- Large check-in status card showing: current streak, time until next check-in required, last check-in timestamp
- Prominent "Check In Now" button (primary CTA)
- Visual status indicator (icon-based: checkmark for safe, clock for pending, alert for overdue)

**Navigation**
- Bottom tab bar (mobile): Home, Contacts, History, Settings
- Top header with app name and notification badge

**Contact Management**
- Card-based contact list with avatar placeholders, name, relationship tag, contact method icons
- Add contact button (floating action button pattern)

**Check-In History**
- Timeline view with date markers
- Status badges for each entry (successful/missed)
- Expandable details on tap

**Forms**
- Clear labels above inputs
- Single-column layout for all form fields
- Generous input padding (p-3)
- Validation feedback inline

**Modals/Overlays**
- Confirmation dialogs for critical actions
- Success animations for check-in completion (subtle scale + fade)
- Alert modals for missed check-ins

### Visual Hierarchy
- **Primary Actions**: Elevated cards with strong shadows (shadow-lg)
- **Secondary Content**: Flat cards with subtle borders (border-2)
- **Status Communication**: Icon + text + color coding via border treatments
- **Information Density**: Comfortable spacing with clear section breaks

### Interaction Patterns
- Tap targets minimum 44px height
- Immediate visual feedback on check-in button press
- Pull-to-refresh for history view
- Swipe actions for contact management
- Loading states for all async operations

### Images
**No hero image required** - the status display card serves as the functional hero. Use:
- Avatar placeholders for emergency contacts (initials on solid backgrounds)
- Icon-based status indicators throughout
- Optional: Friendly illustration for empty states (no contacts added, no history yet)

This design prioritizes trust through clarity, ensuring users can check in quickly and confidently know their status at a glance.