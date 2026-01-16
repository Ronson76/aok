import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Bell, Users, Clock, CheckCircle, Heart } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex flex-col items-center">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-sm font-semibold text-primary">aok</span>
          </div>
          <Link href="/login">
            <Button data-testid="button-open-app">Sign In</Button>
          </Link>
        </div>
      </header>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Your Personal Safety Check-In
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stay connected with your loved ones. Check in daily, and if you ever miss one, 
            your emergency contacts are automatically notified.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/app">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-get-started">
                Get Started
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-learn-more">
                Learn More
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Why CheckMate24?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Simple Check-Ins</h3>
                <p className="text-muted-foreground">
                  One tap to confirm you're safe. Set your schedule to daily or every two days.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Automatic Alerts</h3>
                <p className="text-muted-foreground">
                  If you miss a check-in, your emergency contacts are notified immediately.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multiple Contacts</h3>
                <p className="text-muted-foreground">
                  Add family, friends, or neighbors. Everyone you trust can be alerted.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Add Your Emergency Contacts</h3>
                <p className="text-muted-foreground">
                  Enter the people you want notified if something happens. Include their name, email, and phone number.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Set Your Check-In Schedule</h3>
                <p className="text-muted-foreground">
                  Choose to check in daily or every two days. The app reminds you when it's time.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Check In Regularly</h3>
                <p className="text-muted-foreground">
                  Open the app and tap the check-in button. It takes just one second to let your loved ones know you're okay.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Peace of Mind</h3>
                <p className="text-muted-foreground">
                  If you ever miss a check-in, your contacts receive an alert. They can then reach out to make sure you're safe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Perfect For</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Seniors living independently",
              "People living alone",
              "Solo travelers",
              "Remote workers in isolated areas",
              "People with health conditions",
              "Anyone who wants peace of mind"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-background">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <Heart className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Start Protecting Yourself Today</h2>
          <p className="text-muted-foreground mb-8">
            It takes less than a minute to set up. Give your loved ones peace of mind.
          </p>
          <Link href="/app">
            <Button size="lg" data-testid="button-start-now">
              Start Now
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <div className="flex flex-col items-center justify-center mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold">aok</span>
          </div>
          <p className="text-sm mb-4">Your personal safety check-in companion</p>
          <Link href="/admin/login">
            <span className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer" data-testid="link-admin">
              Admin
            </span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
