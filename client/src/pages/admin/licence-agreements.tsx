import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  FileText,
  Users,
  Building2,
  HardHat,
  CreditCard,
  ExternalLink,
  CheckCircle,
  XCircle,
  Scale,
  Shield,
  ScrollText,
  Clock,
  AlertTriangle,
  Lock,
  KeyRound,
  Download,
  PenLine,
  History,
  TrendingUp,
  Activity,
} from "lucide-react";
import jsPDF from "jspdf";

const documentContentMap: Record<string, { title: string; sections: Array<{ heading: string; content: string }> }> = {
  eula: {
    title: "End User Licence Agreement (EULA)",
    sections: [
      { heading: "1. Licence Grant", content: "Naiyatech Ltd grants a non-exclusive, non-transferable licence to use the software. This licence is personal to you and may not be assigned, sublicensed, or otherwise transferred to any third party without prior written consent." },
      { heading: "2. Restrictions", content: "No resale, reverse engineering, or misuse. You agree not to modify, adapt, translate, reverse engineer, decompile, disassemble, or create derivative works based on the software." },
      { heading: "3. Intellectual Property", content: "All rights, title, and interest in the software remain with Naiyatech Ltd. The software is protected by copyright laws and international treaty provisions." },
      { heading: "4. Termination", content: "This licence is effective until terminated. It will terminate automatically if you fail to comply with any term. Upon termination, you must destroy all copies of the software." },
      { heading: "5. Disclaimer of Warranties", content: "The software is provided 'as is' without warranty of any kind. Naiyatech Ltd disclaims all warranties, express or implied, including merchantability and fitness for a particular purpose." },
      { heading: "6. Limitation of Liability", content: "In no event shall Naiyatech Ltd be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the software." },
      { heading: "7. Changes to Agreement", content: "Naiyatech Ltd reserves the right to modify this agreement at any time. Continued use of the software after changes constitutes acceptance of the modified terms." },
      { heading: "8. Governing Law", content: "This agreement shall be governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      { heading: "1. Introduction", content: "At aok, we take your privacy seriously. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our personal safety check-in application." },
      { heading: "2. Information We Collect", content: "We collect account information (name, email, mobile number, date of birth), emergency contact details, check-in data, location data when shared during emergencies, and device information." },
      { heading: "3. How We Use Your Information", content: "We use your information to provide safety check-in services, send alerts to emergency contacts, improve our services, and comply with legal obligations." },
      { heading: "4. Data Storage and Security", content: "Your data is stored securely using industry-standard encryption. We implement appropriate technical and organisational measures to protect your personal data against unauthorised access." },
      { heading: "5. Data Sharing", content: "We do not sell your personal data. We may share data with emergency contacts you designate, service providers who assist in operating our platform, and law enforcement when legally required." },
      { heading: "6. Your Rights (GDPR)", content: "You have the right to access, rectify, erase, restrict processing, data portability, and object to processing of your personal data. You may also withdraw consent at any time." },
      { heading: "7. Data Retention", content: "We retain your personal data only for as long as necessary to provide our services and fulfil legal obligations. Check-in history is retained for 12 months." },
      { heading: "8. Contact Us", content: "For privacy-related enquiries, contact us at help@aok.care. Our Data Protection Officer can be reached at the same address." },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    sections: [
      { heading: "1. Introduction", content: "These Terms and Conditions govern your use of the aok personal safety check-in application and related services. By accessing or using aok, you agree to be bound by these terms." },
      { heading: "2. Eligibility", content: "You must be at least 16 years of age to use aok. If you are under 18, you confirm that you have obtained consent from a parent or guardian." },
      { heading: "3. Service Description", content: "aok provides personal safety check-in services, emergency contact alerts, location sharing, and wellbeing monitoring tools." },
      { heading: "4. Account Registration", content: "You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your account credentials." },
      { heading: "5. User Responsibilities", content: "You agree to use aok only for lawful purposes. You must not misuse the emergency alert features or provide false information." },
      { heading: "6. Emergency Services Disclaimer", content: "aok is not a replacement for emergency services (999/112). In a life-threatening emergency, always contact emergency services directly." },
      { heading: "7. Subscription and Payments", content: "Premium features require a paid subscription. Prices are displayed in GBP and include VAT where applicable. Subscriptions auto-renew unless cancelled." },
      { heading: "8. Cancellation and Refunds", content: "You may cancel your subscription at any time. Refunds are provided in accordance with UK consumer protection laws and our refund policy." },
      { heading: "9. Intellectual Property", content: "All content, features, and functionality of aok are owned by Naiyatech Ltd and protected by copyright, trademark, and other intellectual property laws." },
      { heading: "10. Privacy", content: "Your use of aok is also governed by our Privacy Policy. Please review our Privacy Policy to understand how we collect and use your information." },
      { heading: "11. Limitation of Liability", content: "Naiyatech Ltd shall not be liable for any indirect, incidental, or consequential damages arising from your use of aok." },
      { heading: "12. Indemnification", content: "You agree to indemnify and hold harmless Naiyatech Ltd from any claims, damages, or expenses arising from your use of aok or violation of these terms." },
      { heading: "13. Changes to Terms", content: "We may update these terms from time to time. We will notify you of material changes via email or in-app notification." },
      { heading: "14. Governing Law", content: "These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales." },
      { heading: "15. Contact Us", content: "For questions about these terms, contact us at help@aok.care or write to Naiyatech Ltd." },
    ],
  },
  "enterprise-licence": {
    title: "Enterprise Software Licence Agreement",
    sections: [
      { heading: "1. Licence Scope", content: "Naiyatech Ltd grants the organisation a non-exclusive, non-transferable licence to use the A-OK software for its authorised users. The licence scope is determined by the number of seats purchased and the specific bundle terms agreed upon." },
      { heading: "2. User Management", content: "The organisation is responsible for managing user accounts, access permissions, and ensuring compliance with the licence terms across all authorised users." },
      { heading: "3. Data Ownership", content: "The organisation retains ownership of all data entered into the system by its users. Naiyatech Ltd processes this data solely for the purpose of providing the A-OK services." },
      { heading: "4. Support and Maintenance", content: "Naiyatech Ltd will provide technical support and software updates during the licence period. Support response times are defined in the Service Level Agreement." },
      { heading: "5. Confidentiality", content: "Both parties agree to maintain the confidentiality of any proprietary or sensitive information exchanged during the course of the licence agreement." },
      { heading: "6. Termination", content: "Either party may terminate this agreement with 30 days written notice. Upon termination, the organisation's data will be exported and securely deleted within 90 days." },
      { heading: "7. Governing Law", content: "This agreement is governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales." },
    ],
  },
  "data-processing-addendum": {
    title: "Data Processing Addendum (GDPR)",
    sections: [
      { heading: "1. Roles", content: "Customer: Data Controller. Naiyatech Ltd: Data Processor. The Customer determines the purposes and means of processing personal data. Naiyatech Ltd processes data solely on behalf of the Customer." },
      { heading: "2. Processing Scope", content: "Processing includes user account data, emergency contact information, check-in records, location data, and any other data entered by users within the A-OK platform." },
      { heading: "3. Security Measures", content: "Naiyatech Ltd implements appropriate technical and organisational measures including encryption at rest and in transit, access controls, regular security audits, and incident response procedures." },
      { heading: "4. Sub-processors", content: "Naiyatech Ltd may engage sub-processors with prior written consent of the Customer. Current sub-processors include cloud hosting and communication service providers." },
      { heading: "5. Data Subject Rights", content: "Naiyatech Ltd will assist the Customer in responding to data subject requests including access, rectification, erasure, and portability requests within the required timeframes." },
      { heading: "6. Data Breach Notification", content: "Naiyatech Ltd will notify the Customer of any personal data breach without undue delay and in any event within 72 hours of becoming aware of such breach." },
      { heading: "7. Data Transfers", content: "Personal data shall not be transferred outside the UK/EEA without appropriate safeguards in place, such as Standard Contractual Clauses or adequacy decisions." },
      { heading: "8. Governing Law", content: "This addendum is governed by the laws of England and Wales and is supplementary to the Enterprise Software Licence Agreement." },
    ],
  },
  sla: {
    title: "Service Level Agreement (SLA)",
    sections: [
      { heading: "1. Availability", content: "Target uptime: 99.9% monthly. Uptime is calculated as the percentage of time the A-OK platform is operational and accessible during a calendar month, excluding scheduled maintenance windows." },
      { heading: "2. Exclusions", content: "Planned maintenance and force majeure events are excluded from uptime calculations. This includes scheduled updates, third-party service outages, and events beyond reasonable control." },
      { heading: "3. Incident Response", content: "Critical incidents: 1-hour response time. High priority: 4-hour response. Medium priority: 8-hour response. Low priority: next business day response." },
      { heading: "4. Service Credits", content: "If monthly uptime falls below 99.9%, customers are entitled to service credits. Below 99.5%: 10% credit. Below 99.0%: 25% credit. Below 95%: 50% credit of monthly fees." },
      { heading: "5. Reporting", content: "Monthly uptime reports are provided to all SLA customers. Incident reports are provided within 5 business days of resolution for any P1 or P2 incidents." },
      { heading: "6. Governing Law", content: "This SLA is governed by the laws of England and Wales and forms part of the Enterprise Software Licence Agreement. It applies to paid subscription tiers only." },
    ],
  },
  "lone-worker-addendum": {
    title: "Lone Worker Licence Addendum",
    sections: [
      { heading: "1. Safety Disclaimer", content: "A-OK is a support tool, not an emergency service. It does not replace emergency services (999/112), proper lone worker risk assessments, physical safety equipment, or direct human supervision where required by law." },
      { heading: "2. Employer Responsibilities", content: "The employer remains responsible for conducting risk assessments, providing appropriate training, maintaining safety equipment, and ensuring compliance with Health and Safety at Work Act 1974." },
      { heading: "3. GPS and Location Features", content: "GPS tracking is provided as an additional safety layer. Accuracy depends on device capabilities and environmental conditions. GPS data is processed in accordance with the Data Processing Addendum." },
      { heading: "4. Escalation Procedures", content: "Missed check-in alerts are automatically escalated according to configured rules. The organisation must designate responsible persons to receive and act upon escalation alerts." },
      { heading: "5. Data Retention", content: "Lone worker session data, GPS tracks, and check-in records are retained for the period specified in the Data Processing Addendum. Data may be retained longer where required for regulatory compliance." },
      { heading: "6. Governing Law", content: "This addendum is governed by the laws of England and Wales and supplements the Enterprise Software Licence Agreement. It should be read in conjunction with all applicable health and safety legislation." },
    ],
  },
  "ip-ownership": {
    title: "Intellectual Property & Ownership Agreement",
    sections: [
      { heading: "1. Ownership", content: "All Intellectual Property relating to the A-OK platform, including software, workflows, UI/UX, logic, data structures, analytics, reports, trademarks, and branding, is and shall remain the exclusive property of Naiyatech Ltd." },
      { heading: "2. Licence", content: "The Licensee is granted a limited, non-exclusive, non-transferable, revocable licence solely to use A-OK in accordance with the terms of the Enterprise Software Licence Agreement." },
      { heading: "3. Restrictions", content: "The Licensee shall not copy, modify, reverse engineer, decompile, or create derivative works based on any part of the A-OK platform without prior written consent from Naiyatech Ltd." },
      { heading: "4. Feedback and Suggestions", content: "Any feedback, suggestions, or ideas provided by the Licensee regarding the A-OK platform may be used by Naiyatech Ltd without obligation or compensation." },
      { heading: "5. Custom Development", content: "Any custom features or modifications developed by Naiyatech Ltd for the Licensee shall remain the intellectual property of Naiyatech Ltd unless otherwise agreed in writing." },
      { heading: "6. Branding", content: "The Licensee shall not use the A-OK name, logo, or branding in any marketing materials without prior written approval from Naiyatech Ltd." },
      { heading: "7. Enforcement", content: "Naiyatech Ltd reserves the right to enforce its intellectual property rights through all available legal remedies, including injunctive relief and damages." },
      { heading: "8. Governing Law", content: "This agreement is governed by the laws of England and Wales. Intellectual property disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales." },
    ],
  },
  nda: {
    title: "Mutual Non-Disclosure Agreement (NDA)",
    sections: [
      { heading: "1. Purpose", content: "This Agreement governs disclosure of confidential information relating to the A-OK platform for evaluation, pilot use, licensing, or ongoing commercial use." },
      { heading: "2. Confidential Information", content: "Includes all non-public information whether written, verbal, visual, or electronic including software, source code concepts, system architecture, workflows, safeguarding logic, and data models." },
      { heading: "3. Obligations", content: "Each party agrees to protect confidential information using the same degree of care as it uses for its own confidential information, but no less than reasonable care." },
      { heading: "4. Permitted Disclosures", content: "Confidential information may be disclosed to employees and contractors who have a need to know and are bound by confidentiality obligations at least as protective as those in this agreement." },
      { heading: "5. Exclusions", content: "Information is not confidential if it is publicly available, already known to the receiving party, independently developed, or disclosed with prior written consent." },
      { heading: "6. Term", content: "This agreement remains in effect for the duration of the commercial relationship and for a period of 3 years following termination. Obligations regarding trade secrets survive indefinitely." },
      { heading: "7. Governing Law", content: "This agreement is governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales." },
    ],
  },
  "pricing-justification": {
    title: "A-OK Safeguarding Platform \u2013 \u00A314.99 Per Person Pricing Justification",
    sections: [
      { heading: "Context: UK Safeguarding Costs", content: "Adult safeguarding referrals typically cost between \u00A3198 and \u00A31,250 per person. High-risk interventions such as domestic abuse refuge placement can exceed \u00A38,850 for six months, and specialist residential placements for children can exceed \u00A34,000 per week." },
      { heading: "A-OK Cost Comparison", content: "At \u00A314.99 per person per month (\u00A3179.88 per year), A-OK costs less than a single safeguarding referral while operating continuously throughout the year to reduce escalation, repeat incidents, and emergency response." },
      { heading: "Operational Value", content: "A-OK provides time-bound check-ins, automated escalation, audit trails, and demonstrable monitoring. It complements\u2014rather than replaces\u2014statutory safeguarding services and supports proactive risk management." },
      { heading: "Key Statement", content: "\u201CAt \u00A314.99 per person, A-OK costs less than a single safeguarding referral, yet operates continuously to prevent escalation into the very high-cost interventions local authorities are forced to fund.\u201D" },
      { heading: "Regulatory Alignment", content: "A-OK supports organisations operating under Ofsted, CQC, and local-authority frameworks by evidencing reasonable steps to safeguard children and vulnerable adults. The platform provides documented oversight, escalation records, and monitoring logs that align with expectations under the Children\u2019s Homes Regulations 2015, Working Together to Safeguard Children, and adult safeguarding duties under the Care Act 2014. A-OK is a risk-mitigation and compliance support tool and does not replace statutory safeguarding responsibilities." },
    ],
  },
  "housing-pitch": {
    title: "A-OK \u2014 YMCA / Housing Association Pitch",
    sections: [
      { heading: "A-OK: Safeguarding for People, Not Just Policies", content: "A-OK supports housing providers and charities in meeting their safeguarding and duty-of-care obligations without positioning itself as an emergency or medical service." },
      { heading: "Designed For", content: "Vulnerable adults and young people. Outreach workers and lone staff. Residents living independently. Supported and transitional accommodation." },
      { heading: "Key Safeguarding Benefits", content: "Ensures missed check-ins are never ignored. Forces real human contact before alerts are closed. Shares live location automatically until safety is confirmed. Creates a clear, auditable safeguarding record." },
      { heading: "Why This Works for Housing Providers", content: "No call centre costs. No emergency service liability. Simple deployment across staff and residents. Clear boundaries between safeguarding and emergency response." },
      { heading: "Outcome", content: "A-OK provides early intervention, accountability, and proof of reasonable action \u2014 protecting both residents and organisations." },
    ],
  },
  "investor-snapshot": {
    title: "A-OK \u2014 Investor Snapshot (5 USPs)",
    sections: [
      { heading: "A-OK: A Scalable Safeguarding Platform", content: "A-OK operates in the gap between \u201CI\u2019m fine\u201D and \u201Ccall emergency services.\u201D" },
      { heading: "1. Contact-Verified Emergency Resolution (Industry First)", content: "Alerts can only be cancelled once a trusted contact confirms a real conversation with the user." },
      { heading: "2. Persistent Live Location Until Safety Is Proven", content: "Continuous location sharing remains active until confirmation occurs." },
      { heading: "3. No Call Centre = Scalable, Low-Liability Model", content: "No human operators, no emergency impersonation, no false authority." },
      { heading: "4. Consent-First by Design", content: "Every action is explicitly agreed, configurable, and logged \u2014 GDPR-aligned from day one." },
      { heading: "5. Built for Accountability, Not Just Alerts", content: "Full audit trails provide defensibility for organisations, insurers, and regulators." },
    ],
  },
  "general-pitch": {
    title: "A-OK \u2014 One-Page Pitch (General)",
    sections: [
      { heading: "A-OK: Safeguarding Without False Promises", content: "A-OK is a consent-driven safeguarding and check-in platform designed to ensure people are never ignored when something goes wrong. It does not pretend to be an emergency service and does not rely on call centres or automated assumptions of safety." },
      { heading: "How A-OK Works", content: "When a user triggers an alert or misses a check-in, their pre-nominated trusted contacts are notified immediately. The alert cannot be cancelled digitally. The emergency remains active until a trusted contact confirms they have spoken directly to the user, and the user\u2019s safety is verbally verified. Until that confirmation occurs, live location tracking is automatically shared with all contacts and location updates refresh at regular intervals. No acknowledgement buttons. No silent cancellations. No assumed safety." },
      { heading: "Why This Matters", content: "Most safety apps rely on clicks, timers, or automation. A-OK enforces real human confirmation, creating accountability, urgency, and a clear safeguarding trail." },
      { heading: "What A-OK Is", content: "A safeguarding and welfare escalation platform. A check-in and accountability system. A duty-of-care support tool." },
      { heading: "What A-OK Is Not", content: "Not an emergency service. Not a medical device. Not a call centre." },
      { heading: "Core Value Proposition", content: "A-OK proves that people were not ignored. That proof protects users, organisations, and decision-makers." },
    ],
  },
  "load-test-report": {
    title: "A-OK Platform Load Testing Report",
    sections: [
      { heading: "1. Executive Summary", content: "This report presents the results of comprehensive load testing conducted on the A-OK safeguarding platform. Testing validated the platform's ability to handle concurrent users under progressive stress levels, from baseline (10 users) through to extreme load (10,000 users). The platform demonstrated excellent performance up to 1,000 concurrent users with zero errors and sub-15ms average response times." },
      { heading: "2. Test Methodology", content: "Load tests were conducted using k6, an industry-standard performance testing tool. Tests simulate realistic user journeys including login, dashboard access, contacts management, check-in operations, settings retrieval, mood tracking, feature access, contact creation, and logout. Each test level provisions dedicated test user accounts and handles CSRF token management and session cookies authentically." },
      { heading: "3. Test Levels", content: "Baseline: 10 virtual users (~30 seconds). Small: 100 virtual users (~1 minute). Medium: 500 virtual users (~1.5 minutes). Large: 1,000 virtual users (~1.5 minutes). Stress: 5,000 virtual users (~1.5 minutes). Extreme: 10,000 virtual users (~1.5 minutes). Up to 200 unique test user accounts are provisioned per test run to ensure realistic distribution." },
      { heading: "4. Results — Baseline (10 Users)", content: "Average response time: 7.3ms. P95 response time: 18.2ms. Error rate: 0%. Throughput: 15.4 requests/second. All thresholds passed. The platform handles light load effortlessly with excellent response times." },
      { heading: "5. Results — Small (100 Users)", content: "Average response time: 3.6ms. P95 response time: 11.5ms. Error rate: 0%. Throughput: 24.4 requests/second. All thresholds passed. Response times actually improved due to connection pooling and warm caches." },
      { heading: "6. Results — Medium (500 Users)", content: "Average response time: 2.8ms. P95 response time: 8.9ms. Error rate: 0%. Throughput: 114.8 requests/second. All thresholds passed. The platform scales linearly with no degradation under medium load." },
      { heading: "7. Results — Large (1,000 Users)", content: "Average response time: 11ms. P95 response time: 32.4ms. Error rate: 0%. Throughput: 227.4 requests/second. All thresholds passed. This is the recommended maximum concurrent user level for the current hosting configuration." },
      { heading: "8. Results — Stress (5,000 Users)", content: "Average response time: 3,456ms. P95 response time: 8,120ms. Error rate: 26%. Throughput: 320.8 requests/second. Thresholds failed. Connection limits on the hosting environment became the bottleneck. The application itself remained stable throughout — errors were connection timeouts and resets, not application crashes." },
      { heading: "9. Results — Extreme (10,000 Users)", content: "The setup phase was rate-limited (HTTP 429 responses) preventing meaningful test execution. This is expected behaviour — the login rate limiter correctly protects the platform from brute-force attempts. Production-scale tests at this level should use distributed test runners across multiple IPs." },
      { heading: "10. Security Observations", content: "Rate limiting correctly throttled concurrent login attempts from the same IP (10 requests per 15 minutes). CSRF protection functioned correctly throughout all test levels. Session management remained consistent under load. No security degradation observed at any test level." },
      { heading: "11. Recommendations", content: "The platform comfortably supports up to 1,000 concurrent users on current infrastructure. For deployments exceeding 1,000 concurrent users, consider horizontal scaling, connection pooling optimisation, and load balancer configuration. The 5,000-user bottleneck is infrastructure-related, not application-related, and can be resolved with appropriate hosting upgrades." },
      { heading: "12. Conclusion", content: "The A-OK platform demonstrates robust performance characteristics suitable for production deployment. Response times remain excellent (sub-15ms average) up to 1,000 concurrent users with zero errors. The application's security measures (rate limiting, CSRF protection, session management) function correctly under load without compromising performance. The platform is production-ready for its target user base." },
    ],
  },
  "safeguarding-compliance-framework": {
    title: "AOK Board-Level Safeguarding, Audit & Compliance Framework",
    sections: [
      { heading: "Introduction", content: "This document outlines the structural safeguarding architecture underpinning AOK. It consolidates audit integrity, escalation controls, governance oversight, data retention standards and compliance positioning into a single framework suitable for executive leadership, compliance committees, insurers and board-level scrutiny." },
      { heading: "1. Strategic Safeguarding Positioning", content: "AOK is designed as a compliance-enabling safeguarding infrastructure, not simply a notification tool. Every user action, activity lifecycle and escalation event is time-stamped and recorded server-side. The platform provides demonstrable duty-of-care evidence. The architecture supports litigation defensibility and regulatory transparency." },
      { heading: "2. Audit Architecture & Record Integrity", content: "Server-side UTC timestamping for all system events. Append-only audit log structure (no silent editing). Tamper-evident event hashing to detect unauthorised alterations. Full traceability of users, roles, devices and session history. Administrative action logging for governance accountability." },
      { heading: "3. Activity Monitoring & Escalation Controls", content: "Structured activity lifecycle tracking (start, duration, extension, grace period, completion). GPS location capture at activity commencement and escalation. Automated escalation triggers upon missed check-ins. Continuous 5-minute tracking pings during active alerts. Clear resolution recording including confirmation of contact verification." },
      { heading: "4. Governance & Organisational Oversight", content: "Dashboard-level visibility across all safeguarding activities. Export logging and audit trail transparency. Role-based access controls to prevent unauthorised data exposure. Optional safeguarding note module with immutable version history. Organisation-wide reporting for board and compliance review." },
      { heading: "5. Reporting & Evidential Documentation", content: "Individual safeguarding timelines (PDF and CSV exportable). Full incident reports suitable for legal, insurer or regulatory submission. Monthly safeguarding performance summaries. Organisation-wide escalation metrics and response time analysis. Date-range filtered audit extraction for investigations." },
      { heading: "6. Data Security & Compliance Controls", content: "Encryption in transit and at rest. Controlled export permissions with logged access. Integrity verification capability for audit chains. GDPR-aligned data processing and lifecycle management." },
      { heading: "7. Data Retention Framework", content: "Standard retention period: minimum 6 years (aligned with Limitation Act 1980). Extended retention options for regulated or children\u2019s service environments. Configurable organisational retention policies. Structured anonymisation and deletion controls where legally appropriate." },
      { heading: "8. Organisational Risk Mitigation Impact", content: "Clear evidential safeguarding trail in the event of incident investigation. Strengthened insurer confidence and positioning. Enhanced board-level reporting capability. Reduced exposure to negligence claims. Transparent, accountable safeguarding governance." },
    ],
  },
  "grc-rollout-plan": {
    title: "GRC / Safeguarding Assurance \u2014 Commercial Roll Out Plan",
    sections: [
      { heading: "1. Who You Pilot First", content: "Start where safeguarding pressure is high, governance is weak, inspection risk is real, and the decision chain is short. Do not start with the biggest names." },
      { heading: "Tier 1 \u2014 Fastest Wins (Ideal First 5 Pilots)", content: "Supported housing providers (mid-size): CQC pressure (if regulated activity), local authority contract monitoring, weak assurance tooling, CEO accessible. Typical size: 50\u2013300 units, 40\u2013250 staff.\n\nChildren\u2019s homes (small groups with 2\u20136 homes): Ofsted \u201Cleadership & management\u201D is everything, need oversight across multiple homes, manual processes everywhere. Your dashboard = instant value.\n\nHomelessness / outreach charities: Lone working risk, funder scrutiny, incident defensibility issues. You give them funder leverage." },
      { heading: "Who NOT to Start With", content: "Too slow for pilot cycle: Local authorities (procurement delay), NHS trusts, huge housing associations. They come after case studies exist." },
      { heading: "2. The Buyer (You Are NOT Selling to Ops)", content: "Primary targets inside the organisation: Director of Governance, Head of Safeguarding, CEO (in smaller orgs).\n\nSecondary: Responsible Individual (children\u2019s homes), CQC Registered Manager (supported living).\n\nAvoid starting with: IT, frontline managers. They don\u2019t own the problem." },
      { heading: "3. The Pitch \u2014 Door Opener", content: "You are not selling software. You are selling: \u201CInspection & Funder Readiness in 60 Days.\u201D\n\nOpening line: \u201CIf Ofsted/CQC inspected today, could you evidence safeguarding oversight in real time \u2014 at board level?\u201D Pause. Then: \u201CWe don\u2019t replace your systems. We give leadership live assurance and an exportable audit trail.\u201D\n\nThat lands instantly." },
      { heading: "4-Slide Pilot Pitch", content: "Slide 1 \u2014 The Risk: Safeguarding judged on evidence, not policy. Governance gap between frontline & board.\n\nSlide 2 \u2014 The Shift: From manual reporting to live control monitoring.\n\nSlide 3 \u2014 The Outcome (In 60 days): Safeguarding assurance score, service risk heatmap, inspection-ready board report, funder-ready audit pack.\n\nSlide 4 \u2014 The Pilot Structure: 1 service, 8 weeks, fixed fee, no system replacement. Close." },
      { heading: "4. Pilot Commercial Model", content: "You do NOT pilot for free. That kills perceived value.\n\nPilot pricing: \u00A35k \u2013 \u00A315k (depending on org size).\n\nIncludes: onboarding, configuration, weekly governance report, final board pack.\n\nThis is cheap compared to: failed inspection, lost funding, serious incident review." },
      { heading: "5. Case Study Output", content: "Every pilot must produce: \u201CBefore vs After Safeguarding Assurance\u201D\n\nBefore AOK: No measurable oversight, spreadsheet reporting, no response time visibility.\n\nAfter AOK: 93% welfare check compliance, 8 min average response time, real-time board dashboard, inspection-ready in 8 weeks.\n\nThat document sells the next 10 clients." },
      { heading: "6. Pricing Model \u2014 GRC Layer (Separate from Per-Seat)", content: "Two revenue lines: (1) AOK operational platform (per user / per service), (2) Safeguarding Assurance & GRC layer (per organisation).\n\nTier 1 \u2014 Core Assurance (small providers): \u00A3750 \u2013 \u00A31,500/month. Includes KPI dashboard, control effectiveness, board report export.\n\nTier 2 \u2014 Governance & Inspection (mid-size orgs): \u00A31,500 \u2013 \u00A33,000/month. Adds service-level heatmaps, serious incident chronology, funder pack exports, SSO.\n\nTier 3 \u2014 Enterprise GRC Data Feed (large orgs / groups): \u00A33,000 \u2013 \u00A37,000+/month. Adds API access for their GRC platform, automated control feed, custom reporting, multi-entity oversight." },
      { heading: "7. Why This Pricing Works", content: "You\u2019re not positioned as a feature. You\u2019re positioned as governance infrastructure, inspection protection, and a funding enabler. That lives in a different budget." },
      { heading: "8. 12-Month Land Grab Strategy", content: "Months 1\u20133: 5 pilots (children\u2019s + supported housing).\n\nMonths 4\u20136: Turn pilots \u2192 contracts. Publish case studies. Target groups with multiple services.\n\nMonths 7\u201312: Framework conversations. National charities. Housing groups.\n\nNow you\u2019re a recognised category." },
      { heading: "9. The Category You Claim Publicly", content: "You are: \u201CThe Safeguarding Assurance Platform.\u201D Not a check-in app. Not a wellbeing app.\n\nThat changes: who buys, how much they pay, how investors value you." },
      { heading: "10. The Blunt Commercial Reality", content: "If you execute this: You are no longer selling \u00A34.50/user/month. You are selling \u00A312k \u2013 \u00A360k/year organisational contracts. That is a completely different company." },
      { heading: "Next Steps", content: "Exact first 20 target organisations in the UK. Actual outreach message that gets meetings with governance leads. Landing page structure for the GRC product line. That\u2019s the move from strategy \u2192 pipeline." },
    ],
  },
  "final-pitch": {
    title: "A-OK \u2014 Final Pitch (Full)",
    sections: [
      { heading: "Safeguarding, Done Properly", content: "Because safety isn\u2019t about buttons \u2014 it\u2019s about people not being ignored." },
      { heading: "The Problem Everyone Is Quietly Avoiding", content: "There are hundreds of \u201Csafety\u201D, \u201Ccheck-in\u201D, and \u201Clone worker\u201D apps on the market. Most of them do the same thing: a panic button, a timer, an automated escalation, a false sense of reassurance. And almost all of them fail at the moment it actually matters. They assume safety based on a click, a timer expiring, or an automated process. A-OK starts from a different principle: Safety is only confirmed when a real human confirms it." },
      { heading: "What A-OK Is", content: "A-OK is a consent-driven safeguarding and check-in platform designed to ensure that no alert is ignored and no situation is quietly closed without real confirmation. It does not pretend to be an emergency service, a medical device, or a call centre. Instead, it creates accountability, visibility, and proof \u2014 the things organisations actually need when something goes wrong." },
      { heading: "How A-OK Works", content: "When a user misses a check-in, triggers an alert, or enters a risk scenario, A-OK immediately notifies their pre-nominated trusted contacts. From that moment: the alert cannot be cancelled digitally, no buttons can dismiss it, and no automation can assume safety. The alert only ends when a trusted contact confirms they have spoken directly to the user and verified their safety. Until that happens, live location is shared with all contacts, location updates refresh automatically, and the safeguarding process remains active and visible. No clicks. No assumptions. No silent failures." },
      { heading: "Why This Is an Industry First", content: "Most apps answer the question: \u201CDid the system do something?\u201D A-OK answers the only question that actually matters: \u201CDid a human check that this person is okay?\u201D That single design decision changes everything." },
      { heading: "1. It Forces Real Human Intervention", content: "A-OK removes the biggest weakness in safeguarding systems: passive acknowledgement. No manager clicking \u201Cresolved\u201D. No system quietly timing out. No risk disappearing on a dashboard. If safety isn\u2019t confirmed, the alert stays alive." },
      { heading: "2. It\u2019s Legally Clean by Design", content: "A-OK is consent-first, transparent, and fully auditable. Every action is agreed in advance, configurable, and logged. This aligns directly with safeguarding frameworks, GDPR principles, and duty-of-care expectations. No medical claims. No emergency impersonation. No regulatory grey zones." },
      { heading: "3. It Creates Proof, Not Just Alerts", content: "A-OK automatically records check-ins and missed check-ins, alert triggers, location updates, contact confirmations, and resolution timestamps. When scrutiny comes \u2014 from regulators, insurers, families, or courts \u2014 organisations can show clear, reasonable action. That\u2019s not reassurance. That\u2019s protection." },
      { heading: "YMCA, Housing Associations & Supported Living", content: "Ensures residents are not silently ignored. Supports safeguarding without intrusive monitoring. Provides clear evidence of duty-of-care actions." },
      { heading: "Local Authorities & Care Providers", content: "Scales across vulnerable adults, children, and staff. Reduces risk exposure without increasing liability. Creates audit-ready safeguarding records." },
      { heading: "Care Homes & Outreach Services", content: "Supports lone staff and off-site visits. Enforces escalation that can\u2019t be bypassed. Simple, consistent safeguarding logic across teams." },
      { heading: "Students & Universities", content: "Protects students living independently. Supports welfare without surveillance. Works for nights out, travel, and wellbeing checks." },
      { heading: "Lone Workers", content: "No reliance on managers being available. Trusted contacts stay informed in real time. Safety can\u2019t be \u201Cclosed\u201D unless confirmed." },
      { heading: "Solo Travellers", content: "Family or friends see live location if something goes wrong. No panic-button theatrics. Just accountability and visibility until safety is confirmed." },
      { heading: "Why Users Trust A-OK", content: "It doesn\u2019t overpromise. It doesn\u2019t track secretly. It doesn\u2019t pretend to \u201Crescue\u201D. Users know exactly who is notified, what is shared, and when escalation happens. And they know one crucial thing: if something goes wrong, they won\u2019t be quietly forgotten." },
      { heading: "Why Investors Get Excited", content: "A-OK isn\u2019t another feature app. It\u2019s safeguarding infrastructure. No call centres, no emergency response liability, extremely scalable, low operational cost per user, high institutional demand. The moat: contact-verified resolution logic, consent-driven architecture, audit and compliance positioning. The buyers: housing providers, local authorities, universities, care groups, insurers, large employers. A-OK sits in the gap between reassurance apps and emergency services \u2014 a space no one owns cleanly." },
      { heading: "The Core Truth", content: "A-OK doesn\u2019t promise to save people. It promises something more realistic \u2014 and more powerful: that when someone needs help, they are not ignored. And that organisations can prove they did the right thing. That\u2019s why it works. That\u2019s why it scales. That\u2019s why it matters." },
    ],
  },
};

const documentIdTitleMap: Record<string, string> = {
  eula: "EULA",
  privacy: "Privacy Policy",
  terms: "Terms and Conditions",
  "enterprise-licence": "Enterprise Licence",
  "data-processing-addendum": "Data Processing Addendum",
  sla: "SLA",
  "lone-worker-addendum": "Lone Worker Addendum",
  "ip-ownership": "IP Ownership Agreement",
  nda: "NDA",
  "pricing-justification": "Pricing Justification",
  "housing-pitch": "Housing Association Pitch",
  "investor-snapshot": "Investor Snapshot",
  "general-pitch": "General Pitch",
  "final-pitch": "Final Pitch",
  "safeguarding-compliance-framework": "Safeguarding Compliance Framework",
  "load-test-report": "Load Testing Report",
  "grc-rollout-plan": "GRC Roll Out Plan",
};

function exportDocumentPdf(documentId: string, title: string) {
  const doc = new jsPDF({ format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 30;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Naiyatech Ltd", margin, 15);

  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text(title, margin, y);
  y += 12;

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const content = documentContentMap[documentId];
  if (content) {
    for (const section of content.sections) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(section.heading, margin, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(section.content, maxWidth);
      for (const line of lines) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 5;
      }
      y += 6;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Generated from aok - Naiyatech Ltd", margin, 290);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 25, 290);
  }

  const filename = `aok-${documentId}.pdf`;
  doc.save(filename);
}

function DocumentCard({ icon: Icon, title, description, route, color, badges, documentId, onSign }: {
  icon: typeof FileText;
  title: string;
  description: string;
  route: string;
  color: string;
  badges: string[];
  documentId: string;
  onSign: (documentId: string, documentTitle: string) => void;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    green: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600" },
    blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600" },
    purple: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600" },
    amber: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600" },
    indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600" },
    teal: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600" },
    red: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600" },
    rose: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600" },
  };
  const c = colorMap[color] || colorMap.green;

  return (
    <Card data-testid={`document-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center justify-center w-10 h-10 rounded-md ${c.bg}`}>
            <Icon className={`w-6 h-6 ${c.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              data-testid={`button-export-pdf-${documentId}`}
              onClick={() => exportDocumentPdf(documentId, title)}
            >
              <Download className="w-4 h-4 mr-1" />
              Export PDF
            </Button>
            <Button
              variant="default"
              size="sm"
              data-testid={`button-sign-${documentId}`}
              onClick={() => onSign(documentId, title)}
            >
              <PenLine className="w-4 h-4 mr-1" />
              Sign
            </Button>
            <Link href={route}>
              <Button variant="outline" size="sm" data-testid={`link-view-${title.toLowerCase().replace(/\s+/g, "-")}`}>
                <ExternalLink className="w-4 h-4 mr-1" />
                View
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          {badges.map((badge) => (
            <Badge key={badge} variant="secondary" className="text-xs">{badge}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Check() {
  return <CheckCircle className="w-5 h-5 text-green-600" />;
}

function Cross() {
  return <XCircle className="w-5 h-5 text-muted-foreground/40" />;
}

interface DocumentSignature {
  id: string;
  documentId: string;
  signerName: string;
  signerEmail: string;
  signerRole: string;
  signedAt: string;
  ipAddress?: string;
}

export default function AdminLicenceAgreements() {
  const { toast } = useToast();
  const [viewDocOpen, setViewDocOpen] = useState(false);
  const [viewDocId, setViewDocId] = useState("");
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signDocumentId, setSignDocumentId] = useState("");
  const [signDocumentTitle, setSignDocumentTitle] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [consent, setConsent] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");

  const { data: signatures = [] } = useQuery<DocumentSignature[]>({
    queryKey: ["/api/admin/document-signatures"],
  });

  const signMutation = useMutation({
    mutationFn: async (data: { documentId: string; signerName: string; signerEmail: string; signerRole: string }) => {
      const res = await apiRequest("POST", "/api/admin/document-signatures", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/document-signatures"] });
      toast({ title: "Document Signed", description: `${signDocumentTitle} has been signed successfully.` });
      closeSignModal();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openSignModal(documentId: string, documentTitle: string) {
    setSignDocumentId(documentId);
    setSignDocumentTitle(documentTitle);
    setSignerName("");
    setSignerEmail("");
    setSignerRole("");
    setConsent(false);
    setTypedSignature("");
    setSignModalOpen(true);
  }

  function closeSignModal() {
    setSignModalOpen(false);
    setSignDocumentId("");
    setSignDocumentTitle("");
  }

  function handleSignSubmit() {
    if (!signerName || !signerEmail || !signerRole || !consent || !typedSignature) return;
    signMutation.mutate({
      documentId: signDocumentId,
      signerName,
      signerEmail,
      signerRole,
    });
  }

  const canSign = signerName.trim() && signerEmail.trim() && signerRole.trim() && consent && typedSignature.trim();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin" data-testid="link-back-admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-green-600" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">Licence Agreements</h1>
          </div>
          <Badge variant="outline" className="ml-auto" data-testid="badge-legal">Legal</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">

        <Card data-testid="card-deployment-matrix">
          <CardHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Deployment Matrix</CardTitle>
                <CardDescription>Which legal documents apply to each customer type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-deployment-matrix">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Document</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Individuals</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        <span>Organisations</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <HardHat className="w-4 h-4" />
                        <span>Lone Workers</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex flex-col items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        <span>Paid Only</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b" data-testid="row-eula">
                    <td className="py-3 pr-4 font-medium">EULA</td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-privacy-policy">
                    <td className="py-3 pr-4 font-medium">Privacy Policy</td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-enterprise-licence">
                    <td className="py-3 pr-4 font-medium">Enterprise Licence</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-dpa">
                    <td className="py-3 pr-4 font-medium">Data Processing Addendum</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-lone-worker-addendum">
                    <td className="py-3 pr-4 font-medium">Lone Worker Addendum</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-sla">
                    <td className="py-3 pr-4 font-medium">SLA</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                  </tr>
                  <tr className="border-b" data-testid="row-ip-ownership">
                    <td className="py-3 pr-4 font-medium">IP Ownership Agreement</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                  <tr data-testid="row-nda">
                    <td className="py-3 pr-4 font-medium">NDA</td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Check /></td>
                    <td className="text-center py-3 px-4"><Cross /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-individuals">
            <Users className="w-5 h-5 text-green-600" />
            Individual Users
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Individual users must accept the EULA and can access the Privacy Policy. These documents are presented during registration and linked from the site footer.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCard
              icon={ScrollText}
              title="EULA"
              description="End User Licence Agreement for individuals"
              route="/eula"
              color="green"
              badges={["Individuals", "Registration"]}
              documentId="eula"
              onSign={openSignModal}
            />
            <DocumentCard
              icon={Shield}
              title="Privacy Policy"
              description="How we collect, use and protect personal data"
              route="/privacy"
              color="blue"
              badges={["All Users", "GDPR"]}
              documentId="privacy"
              onSign={openSignModal}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-organisations">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Organisations
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Organisations licensing A-OK for multiple users must accept the Enterprise Licence, Data Processing Addendum, IP Ownership Agreement, and NDA.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCard
              icon={FileText}
              title="Enterprise Licence"
              description="Software licence for organisations with multiple users"
              route="/enterprise-licence"
              color="indigo"
              badges={["Organisations", "Multi-user"]}
              documentId="enterprise-licence"
              onSign={openSignModal}
            />
            <DocumentCard
              icon={Shield}
              title="Data Processing Addendum"
              description="GDPR data processing agreement"
              route="/data-processing-addendum"
              color="purple"
              badges={["Organisations", "GDPR", "DPA"]}
              documentId="data-processing-addendum"
              onSign={openSignModal}
            />
            <DocumentCard
              icon={KeyRound}
              title="IP Ownership Agreement"
              description="Intellectual property rights and ownership terms"
              route="/ip-ownership"
              color="red"
              badges={["Organisations", "IP Protection"]}
              documentId="ip-ownership"
              onSign={openSignModal}
            />
            <DocumentCard
              icon={Lock}
              title="NDA"
              description="Mutual non-disclosure and confidentiality agreement"
              route="/nda"
              color="rose"
              badges={["Organisations", "Confidentiality"]}
              documentId="nda"
              onSign={openSignModal}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-lone-workers">
            <HardHat className="w-5 h-5 text-teal-600" />
            Lone Worker Customers
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Organisations using A-OK for lone worker monitoring require the Enterprise Licence, Lone Worker Addendum, SLA, IP Ownership Agreement, and NDA.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DocumentCard
              icon={FileText}
              title="Enterprise Licence"
              description="Base licence for the organisation"
              route="/enterprise-licence"
              color="indigo"
              badges={["Required"]}
              documentId="enterprise-licence"
              onSign={openSignModal}
            />
            <DocumentCard
              icon={HardHat}
              title="Lone Worker Addendum"
              description="Additional terms for lone worker use"
              route="/lone-worker-addendum"
              color="teal"
              badges={["Safety", "H&S"]}
              documentId="lone-worker-addendum"
              onSign={openSignModal}
            />
            <DocumentCard
              icon={Clock}
              title="SLA"
              description="Service level commitments for lone worker"
              route="/sla"
              color="amber"
              badges={["99.9% Uptime"]}
              documentId="sla"
              onSign={openSignModal}
            />
            <DocumentCard
              icon={KeyRound}
              title="IP Ownership Agreement"
              description="IP rights and ownership terms"
              route="/ip-ownership"
              color="red"
              badges={["IP Protection"]}
              documentId="ip-ownership"
              onSign={openSignModal}
            />
            <DocumentCard
              icon={Lock}
              title="NDA"
              description="Non-disclosure and confidentiality"
              route="/nda"
              color="rose"
              badges={["Confidentiality"]}
              documentId="nda"
              onSign={openSignModal}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-paid">
            <CreditCard className="w-5 h-5 text-amber-600" />
            Paid Tiers Only
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            The SLA applies to paid subscription tiers only. No uptime guarantees are provided on free plans or during free trial periods.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCard
              icon={Clock}
              title="SLA"
              description="Service Level Agreement with 99.9% uptime target"
              route="/sla"
              color="amber"
              badges={["Paid Only", "No Free Plans"]}
              documentId="sla"
              onSign={openSignModal}
            />
          </div>
          <Card className="border-amber-200 dark:border-amber-800 mt-3" data-testid="card-sla-warning">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Important: Never promise uptime on free plans</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The SLA with 99.9% uptime target and service credits only applies to paying customers. Free tier users and users within their 7-day trial period are explicitly excluded from any uptime guarantees or service credit remedies.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-commercial">
            <Lock className="w-5 h-5 text-red-600" />
            Commercial &amp; Confidentiality
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            These agreements protect Naiyatech Ltd's intellectual property and confidential information. They apply to organisations and pilot participants accessing the A-OK platform.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocumentCard
              icon={KeyRound}
              title="IP Ownership Agreement"
              description="Intellectual property rights and ownership terms"
              route="/ip-ownership"
              color="red"
              badges={["Organisations", "IP Protection"]}
              documentId="ip-ownership"
              onSign={openSignModal}
            />
            <DocumentCard
              icon={Lock}
              title="NDA"
              description="Mutual non-disclosure and confidentiality agreement"
              route="/nda"
              color="rose"
              badges={["Organisations", "Pilots", "Confidentiality"]}
              documentId="nda"
              onSign={openSignModal}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-compliance">
            <Shield className="w-5 h-5 text-purple-600" />
            Board-Level Compliance
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Prepared for Supported Housing Providers, Housing Associations, Charitable Organisations, Universities, Local Authorities and Regulated Care Environments.
          </p>
          <div className="grid gap-3 sm:grid-cols-1">
            <Card data-testid="document-safeguarding-compliance-framework">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-purple-100 dark:bg-purple-900/30">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">Safeguarding, Audit & Compliance Framework</CardTitle>
                    <CardDescription className="text-sm">Board-level safeguarding architecture covering audit integrity, escalation controls, governance oversight, data retention and compliance</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="button-export-pdf-safeguarding-compliance-framework"
                      onClick={() => exportDocumentPdf("safeguarding-compliance-framework", "AOK Board-Level Safeguarding, Audit & Compliance Framework")}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="button-view-safeguarding-compliance-framework"
                      onClick={() => { setViewDocId("safeguarding-compliance-framework"); setViewDocOpen(true); }}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">Board-Level</Badge>
                  <Badge variant="secondary" className="text-xs">Safeguarding</Badge>
                  <Badge variant="secondary" className="text-xs">Audit</Badge>
                  <Badge variant="secondary" className="text-xs">Compliance</Badge>
                  <Badge variant="secondary" className="text-xs">Governance</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-section-performance">
            <Activity className="w-5 h-5 text-cyan-600" />
            Performance &amp; Technical Reports
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Technical reports documenting platform performance, load testing results, and infrastructure capacity assessments.
          </p>
          <div className="grid gap-3 sm:grid-cols-1">
            <Card data-testid="document-load-test-report">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-cyan-100 dark:bg-cyan-900/30">
                    <Activity className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">Load Testing Report</CardTitle>
                    <CardDescription className="text-sm">Comprehensive performance validation across progressive stress levels from 10 to 10,000 concurrent users</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="button-export-pdf-load-test-report"
                      onClick={() => exportDocumentPdf("load-test-report", "A-OK Platform Load Testing Report")}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid="button-view-load-test-report"
                      onClick={() => { setViewDocId("load-test-report"); setViewDocOpen(true); }}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">Performance</Badge>
                  <Badge variant="secondary" className="text-xs">Load Testing</Badge>
                  <Badge variant="secondary" className="text-xs">1,000 Users</Badge>
                  <Badge variant="secondary" className="text-xs">0% Errors</Badge>
                  <Badge variant="secondary" className="text-xs">Sub-15ms</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card data-testid="card-all-documents">
          <CardHeader>
            <CardTitle className="text-lg">All Legal Documents</CardTitle>
            <CardDescription>Quick access to all licence agreements and policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {[
                { title: "End User Licence Agreement (EULA)", route: "/eula", icon: ScrollText, docId: "eula" },
                { title: "Privacy Policy", route: "/privacy", icon: Shield, docId: "privacy" },
                { title: "Terms and Conditions", route: "/terms", icon: FileText, docId: "terms" },
                { title: "Enterprise Software Licence", route: "/enterprise-licence", icon: Building2, docId: "enterprise-licence" },
                { title: "Data Processing Addendum (GDPR)", route: "/data-processing-addendum", icon: Shield, docId: "data-processing-addendum" },
                { title: "Service Level Agreement (SLA)", route: "/sla", icon: Clock, docId: "sla" },
                { title: "Lone Worker Licence Addendum", route: "/lone-worker-addendum", icon: HardHat, docId: "lone-worker-addendum" },
                { title: "IP Ownership Agreement", route: "/ip-ownership", icon: KeyRound, docId: "ip-ownership" },
                { title: "NDA (Confidentiality)", route: "/nda", icon: Lock, docId: "nda" },
                { title: "Pricing Justification (Ofsted/CQC)", route: "#", icon: CreditCard, docId: "pricing-justification", exportOnly: true },
                { title: "Housing Association Pitch (YMCA)", route: "#", icon: Building2, docId: "housing-pitch", exportOnly: true },
                { title: "Investor Snapshot (5 USPs)", route: "#", icon: TrendingUp, docId: "investor-snapshot", exportOnly: true },
                { title: "General Pitch (One-Page)", route: "#", icon: FileText, docId: "general-pitch", exportOnly: true },
                { title: "Final Pitch (Full)", route: "#", icon: FileText, docId: "final-pitch", exportOnly: true },
                { title: "Safeguarding Compliance Framework", route: "#", icon: Shield, docId: "safeguarding-compliance-framework", exportOnly: true },
                { title: "Load Testing Report", route: "#", icon: Activity, docId: "load-test-report", exportOnly: true },
                { title: "GRC Roll Out Plan", route: "#", icon: TrendingUp, docId: "grc-rollout-plan", exportOnly: true },
              ].map((doc) => (
                <div key={doc.docId} className="flex items-center gap-3 p-3 border rounded-md" data-testid={`quicklink-${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                  <doc.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 min-w-0">{doc.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`quicklink-export-${doc.docId}`}
                      onClick={() => exportDocumentPdf(doc.docId, doc.title)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                    {!("exportOnly" in doc && doc.exportOnly) && (
                      <Button
                        variant="default"
                        size="sm"
                        data-testid={`quicklink-sign-${doc.docId}`}
                        onClick={() => openSignModal(doc.docId, doc.title)}
                      >
                        <PenLine className="w-3 h-3 mr-1" />
                        Sign
                      </Button>
                    )}
                    {doc.route !== "#" ? (
                      <Link href={doc.route}>
                        <Button variant="outline" size="sm" data-testid={`quicklink-view-${doc.docId}`}>
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </Link>
                    ) : documentContentMap[doc.docId] ? (
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`quicklink-view-${doc.docId}`}
                        onClick={() => { setViewDocId(doc.docId); setViewDocOpen(true); }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-signed-documents">
          <CardHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-green-100 dark:bg-green-900/30">
                <History className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Signed Documents</CardTitle>
                <CardDescription>Electronic signature history</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {signatures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-signatures">No signatures yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-signatures">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Document</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Signer</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date Signed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signatures.map((sig) => (
                      <tr key={sig.id} className="border-b" data-testid={`row-signature-${sig.id}`}>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary" className="text-xs">{documentIdTitleMap[sig.documentId] || sig.documentId}</Badge>
                        </td>
                        <td className="py-3 px-4">{sig.signerName}</td>
                        <td className="py-3 px-4 text-muted-foreground">{sig.signerEmail}</td>
                        <td className="py-3 px-4">{sig.signerRole}</td>
                        <td className="py-3 px-4 text-muted-foreground">{new Date(sig.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="py-6 text-center text-xs text-muted-foreground">
          Naiyatech Ltd - Licence Agreements Overview
        </div>
      </div>

      <Dialog open={viewDocOpen} onOpenChange={setViewDocOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-view-document">
          <DialogHeader>
            <DialogTitle data-testid="text-view-dialog-title">
              {documentContentMap[viewDocId]?.title || "Document"}
            </DialogTitle>
            <DialogDescription>Internal document preview</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {documentContentMap[viewDocId]?.sections.map((section, idx) => (
              <div key={idx}>
                <h3 className="font-semibold text-sm mb-1">{section.heading}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { exportDocumentPdf(viewDocId, documentContentMap[viewDocId]?.title || "Document"); }}
              data-testid="button-view-export-pdf"
            >
              <Download className="w-3 h-3 mr-1" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={() => setViewDocOpen(false)} data-testid="button-close-view">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-sign-document">
          <DialogHeader>
            <DialogTitle data-testid="text-sign-dialog-title">Sign Document</DialogTitle>
            <DialogDescription>{signDocumentTitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="signer-name">Full Name</Label>
              <Input
                id="signer-name"
                data-testid="input-signer-name"
                placeholder="Enter your full name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signer-email">Email</Label>
              <Input
                id="signer-email"
                data-testid="input-signer-email"
                type="email"
                placeholder="Enter your email address"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signer-role">Role / Title</Label>
              <Input
                id="signer-role"
                data-testid="input-signer-role"
                placeholder="e.g. Director, CEO, Operations Manager"
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value)}
              />
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                data-testid="checkbox-consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
              />
              <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                I confirm that I have read and understood this document and agree to be bound by its terms.
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="typed-signature">Signature</Label>
              <Input
                id="typed-signature"
                data-testid="input-typed-signature"
                placeholder="Type your full name as signature"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                className="text-lg italic border-b-2"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              />
            </div>
            <div className="text-sm text-muted-foreground" data-testid="text-sign-date">
              Date: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeSignModal} data-testid="button-cancel-sign">
              Cancel
            </Button>
            <Button
              onClick={handleSignSubmit}
              disabled={!canSign || signMutation.isPending}
              data-testid="button-submit-sign"
            >
              <PenLine className="w-4 h-4 mr-1" />
              {signMutation.isPending ? "Signing..." : "Sign Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
