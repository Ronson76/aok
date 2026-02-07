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
  Smartphone, Settings, AlertTriangle, ChevronRight
} from "lucide-react";

export default function Guide() {
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
            Everything you need to know about staying safe with aok.
          </p>
        </div>

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
