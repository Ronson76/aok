import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShieldCheck, ArrowLeft, CheckCircle, Users, Heart,
  Smartphone, Building2, UserPlus, Shield, Settings,
  Radio, FileText, AlertTriangle, ChevronRight
} from "lucide-react";

type Section = "individual" | "organisation";

export default function Guide() {
  const [section, setSection] = useState<Section>("individual");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="font-bold text-green-600">aok</span>
          </div>
          <span className="text-sm text-muted-foreground">How-to Guide</span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-guide-title">How to Use aok</h1>
          <p className="text-muted-foreground">
            Everything you need to know about staying safe with aok, whether you're an individual user or managing an organisation.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={section === "individual" ? "default" : "outline"}
            onClick={() => setSection("individual")}
            className="flex-1"
            data-testid="button-section-individual"
          >
            <Smartphone className="w-4 h-4 mr-2" /> For Individuals
          </Button>
          <Button
            variant={section === "organisation" ? "default" : "outline"}
            onClick={() => setSection("organisation")}
            className="flex-1"
            data-testid="button-section-organisation"
          >
            <Building2 className="w-4 h-4 mr-2" /> For Organisations
          </Button>
        </div>

        {section === "individual" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Getting Started
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="signup">
                    <AccordionTrigger data-testid="accordion-signup">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Creating your account</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>1. Tap <strong>Create Account</strong> on the home page.</p>
                        <p>2. You'll be guided through a short onboarding flow where you'll set your name, date of birth, and phone number.</p>
                        <p>3. Choose your check-in frequency (how often you want to check in, from every 1 to 48 hours).</p>
                        <p>4. Add at least one emergency contact — someone you'd like notified if you miss a check-in.</p>
                        <p>5. Complete payment (7-day free trial, then just £6.99/month). Apple Pay and Google Pay are supported.</p>
                        <p>6. You must be 16 or over to use aok.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="checkin">
                    <AccordionTrigger data-testid="accordion-checkin">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> How check-ins work</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Check-ins are the heart of aok. You set a schedule (e.g. every 24 hours starting at 10am), and when it's time, you simply open the app and tap the <strong>Check In</strong> button.</p>
                        <p>If you miss your check-in, aok will:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Send you an SMS reminder with a link to check in (even without the app open)</li>
                          <li>Wait a short while, then alert your emergency contacts by email and phone call</li>
                        </ul>
                        <p>Your check-in streak tracks how many consecutive check-ins you've completed on time.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="sms-checkin">
                    <AccordionTrigger data-testid="accordion-sms-checkin">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> SMS check-in (no data needed)</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>If your check-in is overdue and you don't have the app open, aok sends you a text message with a secure link.</p>
                        <p>Simply tap the link in the text and it will check you in automatically — no need to log in or even have a data connection at that moment. The page will wait for signal and check you in as soon as it connects.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Emergency Contacts
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="add-contact">
                    <AccordionTrigger data-testid="accordion-add-contact">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Adding emergency contacts</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Go to the <strong>Contacts</strong> tab and tap <strong>Add Contact</strong>.</p>
                        <p>Enter their name, phone number, email address, and relationship to you.</p>
                        <p>Choose the contact type:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li><strong>Mobile</strong> — alerts sent via SMS and email</li>
                          <li><strong>Landline</strong> — alerts sent via automated voice call and email</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="confirm-contact">
                    <AccordionTrigger data-testid="accordion-confirm-contact">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Contact confirmation</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>For your safety, each contact must confirm they agree to be your emergency contact. They'll receive an email with a confirmation link.</p>
                        <p>They have <strong>10 minutes</strong> to confirm. If it expires, you can resend the confirmation from the Contacts page.</p>
                        <p>Contacts won't receive any alerts until they've confirmed.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="primary-contact">
                    <AccordionTrigger data-testid="accordion-primary-contact">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Primary contact</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>You can mark one contact as your <strong>primary contact</strong>. This person receives a notification every time you successfully check in — so they always know you're safe.</p>
                        <p>All other contacts are only notified when you miss a check-in.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Emergency Features
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="emergency-alert">
                    <AccordionTrigger data-testid="accordion-emergency-alert">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Emergency alert button</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>On your dashboard, there's a red <strong>Emergency Alert</strong> button. Tap it if you need immediate help.</p>
                        <p>This will:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Share your GPS location with your emergency contacts</li>
                          <li>Send your location as a what3words address for precise positioning</li>
                          <li>Alert all confirmed contacts via email, SMS, and phone calls</li>
                          <li>Sound an alarm on your device</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="shake-sos">
                    <AccordionTrigger data-testid="accordion-shake-sos">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Shake to SOS</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Shake your phone firmly to trigger an SOS alert — no need to unlock or find the button.</p>
                        <p>This is enabled by default but can be turned off in <strong>Settings</strong> if you prefer.</p>
                        <p>When triggered, a confirmation screen appears for a few seconds so you can cancel if it was accidental.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="offline">
                    <AccordionTrigger data-testid="accordion-offline">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Offline safety</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>If your phone loses internet connection, aok displays an emergency overlay with quick-dial buttons for your primary contact and 999.</p>
                        <p>The overlay disappears automatically when your connection is restored.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-600" />
                  Wellbeing Features
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="mood">
                    <AccordionTrigger data-testid="accordion-mood">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Mood tracking</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Track how you're feeling each day. Go to <strong>Wellbeing &gt; Mood Tracking</strong> from the bottom menu.</p>
                        <p>Rate your mood, add notes, and view your patterns over time. This is completely private to you.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="wellbeing-ai">
                    <AccordionTrigger data-testid="accordion-wellbeing-ai">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Wellbeing AI chat</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Chat with our AI companion for emotional support and wellbeing advice. Find it under <strong>Wellbeing &gt; AI Chat</strong>.</p>
                        <p>Key features:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Completely private — no conversations are stored (GDPR compliant)</li>
                          <li>Detects mood patterns from your tracking and offers proactive support</li>
                          <li>Voice chat mode — speak instead of typing, and hear responses read aloud</li>
                          <li>Signposts to crisis helplines when appropriate</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="pets">
                    <AccordionTrigger data-testid="accordion-pets">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Pet protection</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Store details about your pets so emergency contacts know who needs looking after if something happens to you.</p>
                        <p>Go to <strong>Wellbeing &gt; Pet Protection</strong> to add your pets' names, species, vet details, and care instructions.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="will">
                    <AccordionTrigger data-testid="accordion-will">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Digital will</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Securely store important documents like your will, insurance details, or other vital information.</p>
                        <p>Go to <strong>Wellbeing &gt; Digital Will</strong> to upload and manage your documents.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  Settings & Account
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="schedule">
                    <AccordionTrigger data-testid="accordion-schedule">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Changing your check-in schedule</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Go to <strong>Settings</strong> to update how often you check in and what time your schedule starts.</p>
                        <p>You can set any interval from 1 to 48 hours. For example, daily at 10am, or every 12 hours.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="subscription">
                    <AccordionTrigger data-testid="accordion-subscription">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Managing your subscription</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>View your subscription status in <strong>Settings</strong>. You can see whether you're on a free trial, active subscription, or if your plan is set to cancel.</p>
                        <p>Cancel or reactivate your subscription at any time. You'll need to confirm with your password for security.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="password">
                    <AccordionTrigger data-testid="accordion-password">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Changing or resetting your password</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Change your password in <strong>Settings</strong>. Passwords must be at least 8 characters — special characters are allowed.</p>
                        <p>If you've forgotten your password, use the <strong>Forgot Password</strong> link on the login page. You'll receive an email with a reset link.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        )}

        {section === "organisation" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Getting Started as an Organisation
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="org-signup">
                    <AccordionTrigger data-testid="accordion-org-signup">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Creating an organisation account</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Organisation accounts are set up by the aok team. Contact us to get started.</p>
                        <p>Once your account is created, you'll receive login credentials and can access the Organisation Portal at the dedicated login page.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="org-bundles">
                    <AccordionTrigger data-testid="accordion-org-bundles">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Bundles and seats</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Your organisation purchases <strong>bundles</strong> of seats. Each seat allows one client or staff member to use aok at no cost to them.</p>
                        <p>You can view your bundle usage on the organisation dashboard — how many seats are used, how many are available.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="org-login">
                    <AccordionTrigger data-testid="accordion-org-login">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Organisation portal login options</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>The organisation portal has three login options:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li><strong>I'm a Client</strong> — for people being looked after by the organisation. Log in with your reference number.</li>
                          <li><strong>I'm from an Organisation</strong> — for staff and managers. Log in with email and password.</li>
                          <li><strong>I'm a Team Member</strong> — for team members invited to help manage the organisation.</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Managing Clients
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="add-client">
                    <AccordionTrigger data-testid="accordion-add-client">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Adding clients</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>From your organisation dashboard, tap <strong>Add Client</strong>.</p>
                        <p>Enter the client's email address and select which bundle to assign them to. They'll receive an SMS with a login link and reference number.</p>
                        <p>Clients log in using their reference number — no email or complex password needed.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="monitor-clients">
                    <AccordionTrigger data-testid="accordion-monitor-clients">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Monitoring client status</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Your dashboard shows each client's status at a glance:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li><strong>Safe</strong> (green) — checked in on time</li>
                          <li><strong>Pending</strong> (yellow) — check-in is due but not yet overdue</li>
                          <li><strong>Overdue</strong> (red) — missed their check-in window</li>
                        </ul>
                        <p>You can also manage their emergency contacts, pause/resume monitoring, and adjust their check-in schedule.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="client-features">
                    <AccordionTrigger data-testid="accordion-client-features">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Controlling client features</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>You can enable or disable specific features for each client:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Wellbeing AI chat</li>
                          <li>Shake to SOS</li>
                          <li>Mood tracking</li>
                          <li>Pet protection</li>
                          <li>Digital will storage</li>
                        </ul>
                        <p>This lets you tailor the experience to each client's needs and your organisation's policies.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-green-600" />
                  Staff Management
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="invite-staff">
                    <AccordionTrigger data-testid="accordion-invite-staff">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Inviting staff members</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Go to the <strong>Lone Worker Hub</strong> and tap <strong>Invite Staff</strong>.</p>
                        <p>Enter their name and phone number. They'll receive an SMS with a unique invite link to register.</p>
                        <p>Staff registration is free — their seat is covered by your organisation's bundle.</p>
                        <p>You can resend, revoke, or delete invitations at any time.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="team-roles">
                    <AccordionTrigger data-testid="accordion-team-roles">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Team roles and permissions</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Your organisation has four team roles:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li><strong>Owner</strong> — full control over everything, including billing and team management</li>
                          <li><strong>Manager</strong> — can manage clients, staff, and view reports</li>
                          <li><strong>Staff</strong> — can view clients and use the lone worker features</li>
                          <li><strong>Viewer</strong> — read-only access to dashboards and reports</li>
                        </ul>
                        <p>Invite team members from the <strong>Team</strong> page in your organisation dashboard.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-orange-600" />
                  Lone Worker System
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="lone-worker-sessions">
                    <AccordionTrigger data-testid="accordion-lone-worker-sessions">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> How lone worker sessions work</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Staff members can start a lone worker session before heading out on a job (home visit, inspection, patrol, etc.).</p>
                        <p>During a session, they set a check-in interval and must check in regularly. If they don't:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Status changes to <strong>Check-in Due</strong></li>
                          <li>If still no response, status changes to <strong>Unresponsive</strong></li>
                          <li>They can trigger a <strong>Panic</strong> alert which shares their live GPS location</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="lone-worker-monitor">
                    <AccordionTrigger data-testid="accordion-lone-worker-monitor">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Live monitoring</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>The <strong>Live Monitor</strong> tab in the Lone Worker Hub shows all active sessions in real time.</p>
                        <p>Sessions are colour-coded by urgency — panic alerts appear at the top with a red border and flashing badge.</p>
                        <p>You can see each worker's job type, last check-in time, check-in interval, and phone number for direct contact.</p>
                        <p>The history section groups completed sessions by worker name so you can review each person's activity.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="audit-trail">
                    <AccordionTrigger data-testid="accordion-audit-trail">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Audit trail</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Every action in the lone worker system is logged in the <strong>Audit Trail</strong> tab.</p>
                        <p>Records are grouped by person — tap a name to expand and see their full activity history, including session starts, check-ins, panic alerts, and resolutions.</p>
                        <p>Filter by <strong>All</strong>, <strong>Sessions</strong>, or <strong>Invites</strong> to find what you need.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Safeguarding
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="safeguarding-incidents">
                    <AccordionTrigger data-testid="accordion-safeguarding-incidents">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Reporting incidents</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>The <strong>Safeguarding Hub</strong> lets you log safety incidents with full details including type (abuse, neglect, self-harm risk, etc.), severity level, and precise location using what3words.</p>
                        <p>You can also log welfare concerns from third parties, with the option to report anonymously.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="safeguarding-cases">
                    <AccordionTrigger data-testid="accordion-safeguarding-cases">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Case files and risk levels</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Each client has a safeguarding case file where you can track their risk level (red, amber, green), add case notes, and review their history.</p>
                        <p>Automated escalation rules can trigger alerts based on missed check-ins, SOS alerts, or incident counts.</p>
                        <p>All safeguarding actions are fully audited for compliance.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  Reports
                </h2>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="org-reports">
                    <AccordionTrigger data-testid="accordion-org-reports">
                      <span className="flex items-center gap-2"><ChevronRight className="w-4 h-4" /> Available reports</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>Your organisation dashboard includes reports for:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li><strong>Missed Check-ins</strong> — see which clients missed their check-ins and when</li>
                          <li><strong>Emergency Alerts</strong> — review all emergency alerts triggered by your clients</li>
                        </ul>
                        <p>Reports can be exported as PDF for your records and compliance requirements.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            Need more help? Get in touch with us.
          </p>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-to-home">
              Back to Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
