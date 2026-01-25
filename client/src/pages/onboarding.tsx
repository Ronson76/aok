import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, Check, Lock, CreditCard, GraduationCap, Home, Building2, 
  Users, Heart, Baby, Plane, TreePine, MapPin, Car, Globe, Smile, 
  AlertTriangle, Activity, Scissors, Accessibility, Calendar,
  Clock, RefreshCw, Sun, Sunset, Settings, Search, Bot, Smartphone,
  Mail, Star, Phone, X, Loader2, Wallet, ShieldCheck
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SiApple, SiGooglepay } from "react-icons/si";

interface OnboardingData {
  name: string;
  ageGroup: string;
  livingSituation: string;
  whoWorries: string;
  contactName: string;
  contactDistance: string;
  whatMatters: string[];
  healthConditions: string[];
  checkInFrequency: string;
  checkInTime: string;
  referralSource: string;
  planType: string;
  billingCycle: string;
  email: string;
}

const TOTAL_STEPS = 16;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    ageGroup: "",
    livingSituation: "",
    whoWorries: "",
    contactName: "",
    contactDistance: "",
    whatMatters: [],
    healthConditions: [],
    checkInFrequency: "daily",
    checkInTime: "morning",
    referralSource: "",
    planType: "base",
    billingCycle: "monthly",
    email: "",
  });

  const progress = Math.round((currentStep / TOTAL_STEPS) * 100);

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("onboardingData", JSON.stringify(data));
    setLocation("/register?onboarded=true");
  };

  const [termsAccepted, setTermsAccepted] = useState(false);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return termsAccepted;
      case 2: return data.name.trim().length > 0;
      case 3: return data.ageGroup !== "";
      case 4: return data.livingSituation !== "";
      case 5: return data.whoWorries !== "";
      case 6: return data.contactName.trim().length > 0;
      case 7: return data.contactDistance !== "";
      case 8: return true;
      case 9: return data.whatMatters.length > 0;
      case 10: return true;
      case 11: return true;
      case 12: return data.checkInFrequency !== "";
      case 13: return data.checkInTime !== "";
      case 14: return data.referralSource !== "";
      case 15: return true;
      case 16: return true;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1Terms accepted={termsAccepted} setAccepted={setTermsAccepted} />;
      case 2: return <Step2Welcome data={data} setData={setData} />;
      case 3: return <Step3AgeGroup data={data} setData={setData} />;
      case 4: return <Step4LivingSituation data={data} setData={setData} />;
      case 5: return <Step5WhoWorries data={data} setData={setData} />;
      case 6: return <Step6ContactName data={data} setData={setData} />;
      case 7: return <Step7ContactDistance data={data} setData={setData} />;
      case 8: return <Step8Summary data={data} />;
      case 9: return <Step9WhatMatters data={data} setData={setData} />;
      case 10: return <Step10HealthConditions data={data} setData={setData} onSkip={handleNext} />;
      case 11: return <Step11ScheduleSummary data={data} />;
      case 12: return <Step12Frequency data={data} setData={setData} />;
      case 13: return <Step13Time data={data} setData={setData} />;
      case 14: return <Step14Referral data={data} setData={setData} />;
      case 15: return <Step15Plan data={data} setData={setData} />;
      case 16: return <Step16Payment data={data} onComplete={handleComplete} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <span className="text-xl font-bold text-green-600">aok</span>
          </div>
        </div>
      </header>

      <div className="px-4 py-3 bg-background">
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
          <span data-testid="text-step-indicator">Step {currentStep} of {TOTAL_STEPS}</span>
          <span data-testid="text-progress-percent">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" data-testid="progress-bar" />
      </div>

      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {renderStep()}
        </div>
      </div>

      <div className="px-4 py-4 border-t bg-background">
        <div className="max-w-md mx-auto flex gap-3">
          {currentStep > 1 && (
            <Button 
              variant="outline" 
              onClick={handleBack}
              className="flex-shrink-0"
              data-testid="button-back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {currentStep < TOTAL_STEPS ? (
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
              data-testid="button-continue"
            >
              Continue
            </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              className="flex-1"
              data-testid="button-start-trial"
            >
              Start Free Trial
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 text-center text-xs text-muted-foreground" data-testid="text-footer-note">
        You can update these settings anytime from your dashboard.
      </div>
    </div>
  );
}

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description?: string;
  testId: string;
}

function OptionButton({ selected, onClick, icon, label, description, testId }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-lg border text-left transition-all ${
        selected ? "border-primary bg-primary/5" : "border-border hover-elevate"
      }`}
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        <div className="text-primary mt-0.5">{icon}</div>
        <div className="flex-1">
          <div className="font-medium" data-testid={`${testId}-label`}>{label}</div>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
        {selected && <Check className="h-5 w-5 text-primary" />}
      </div>
    </button>
  );
}

function Step1Terms({ accepted, setAccepted }: { accepted: boolean; setAccepted: (v: boolean) => void }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-2" data-testid="text-terms-title">Terms and Conditions</h1>
        <p className="text-muted-foreground mb-6" data-testid="text-terms-subtitle">
          Please review and accept our terms before continuing.
        </p>
        
        <div className="bg-muted/50 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto text-sm text-muted-foreground space-y-4">
          <section>
            <h3 className="font-semibold text-foreground mb-2">1. Service Overview</h3>
            <p>aok is a personal safety check-in application. We send reminders at intervals you choose, and alert your emergency contacts if you miss a check-in.</p>
          </section>
          
          <section>
            <h3 className="font-semibold text-foreground mb-2">2. Age Requirement</h3>
            <p>You must be at least 16 years of age to use aok. By continuing, you confirm that you meet this requirement.</p>
          </section>
          
          <section>
            <h3 className="font-semibold text-foreground mb-2">3. Emergency Contacts</h3>
            <p>Your emergency contacts will receive notifications when you miss a check-in or trigger an emergency alert. They must confirm their consent via email within 10 minutes.</p>
          </section>
          
          <section>
            <h3 className="font-semibold text-foreground mb-2">4. Not a Substitute for Emergency Services</h3>
            <p>aok is not a replacement for emergency services. In life-threatening situations, always call 999 (UK) or your local emergency number directly.</p>
          </section>
          
          <section>
            <h3 className="font-semibold text-foreground mb-2">5. Subscription</h3>
            <p>After your 7-day free trial, your subscription will automatically renew unless cancelled. You can cancel anytime in your settings.</p>
          </section>
          
          <section>
            <h3 className="font-semibold text-foreground mb-2">6. Privacy</h3>
            <p>We take your privacy seriously. Your data is encrypted and never sold to third parties. Location data is only shared during emergencies with your consent.</p>
          </section>
        </div>
        
        <div className="flex items-start gap-3 p-4 border rounded-lg bg-background">
          <Checkbox
            id="terms-accept"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            data-testid="checkbox-terms"
          />
          <label htmlFor="terms-accept" className="text-sm cursor-pointer leading-relaxed">
            I am at least 16 years old and I agree to the{" "}
            <a href="/terms" target="_blank" className="text-primary underline">Terms and Conditions</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</a>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function Step2Welcome({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-2" data-testid="text-welcome-title">Let's get to know you</h1>
        <p className="text-muted-foreground mb-6" data-testid="text-welcome-subtitle">
          Let's build your personal protection plan. It only takes 2 minutes.
        </p>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">What should we call you?</label>
          <Input
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            placeholder="Sarah"
            className="text-lg"
            data-testid="input-name"
          />
          <p className="text-xs text-muted-foreground">
            This name will appear on alerts to your contacts.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Step3AgeGroup({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "16-24", label: "16-24", description: "23% of young adults living alone have no local emergency contact", icon: <GraduationCap className="h-6 w-6" /> },
    { value: "25-34", label: "25-34", description: "First-time solo dwellers are 2.4x more likely to delay seeking help", icon: <Home className="h-6 w-6" /> },
    { value: "35-49", label: "35-49", description: "38% of adults in this age group report safety concerns when alone", icon: <Building2 className="h-6 w-6" /> },
    { value: "50-64", label: "50-64", description: "47% of adults 55+ live alone. Early detection saves lives", icon: <Star className="h-6 w-6" /> },
    { value: "65+", label: "65+", description: "Every 11 seconds an older adult visits the ER for a fall injury", icon: <Heart className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-2" data-testid="text-age-title">What's your age group?</h1>
        <p className="text-muted-foreground mb-6">This helps us personalise your safety experience</p>
        
        <div className="space-y-3">
          {options.map((option) => (
            <OptionButton
              key={option.value}
              selected={data.ageGroup === option.value}
              onClick={() => setData({ ...data, ageGroup: option.value })}
              icon={option.icon}
              label={option.label}
              description={option.description}
              testId={`option-age-${option.value}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Step4LivingSituation({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "alone", label: "I live alone", icon: <Home className="h-6 w-6" /> },
    { value: "alone-pets", label: "I live alone with pets", icon: <Heart className="h-6 w-6" /> },
    { value: "single-parent", label: "Single parent with children", icon: <Baby className="h-6 w-6" /> },
    { value: "partner-travels", label: "My partner travels often", icon: <Plane className="h-6 w-6" /> },
    { value: "rural", label: "I live in a rural area", icon: <TreePine className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-6" data-testid="text-living-title">Which best describes you?</h1>
        
        <div className="space-y-3">
          {options.map((option) => (
            <OptionButton
              key={option.value}
              selected={data.livingSituation === option.value}
              onClick={() => setData({ ...data, livingSituation: option.value })}
              icon={option.icon}
              label={option.label}
              testId={`option-living-${option.value}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Step5WhoWorries({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "adult-children", label: "My adult children", icon: <Users className="h-6 w-6" /> },
    { value: "parents", label: "My parents", icon: <Users className="h-6 w-6" /> },
    { value: "siblings", label: "My siblings", icon: <Users className="h-6 w-6" /> },
    { value: "spouse", label: "My spouse/partner", icon: <Heart className="h-6 w-6" /> },
    { value: "friends", label: "Close friends", icon: <Users className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-6" data-testid="text-worries-title">Who worries about you most?</h1>
        
        <div className="space-y-3">
          {options.map((option) => (
            <OptionButton
              key={option.value}
              selected={data.whoWorries === option.value}
              onClick={() => setData({ ...data, whoWorries: option.value })}
              icon={option.icon}
              label={option.label}
              testId={`option-worries-${option.value}`}
            />
          ))}
        </div>

        <div className="mt-6 p-3 bg-zinc-900 text-white rounded-full text-sm text-center" data-testid="text-peace-of-mind">
          Living alone means peace of mind matters even more.
        </div>
      </CardContent>
    </Card>
  );
}

function Step6ContactName({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const relationshipLabel = {
    "adult-children": "child",
    "parents": "parent",
    "siblings": "sibling",
    "spouse": "partner",
    "friends": "friend",
  }[data.whoWorries] || "contact";

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-2" data-testid="text-contact-title">What's your {relationshipLabel}'s name?</h1>
        <p className="text-muted-foreground mb-6">We'll use this to personalise your plan.</p>
        
        <Input
          value={data.contactName}
          onChange={(e) => setData({ ...data, contactName: e.target.value })}
          placeholder="Jessica"
          className="text-lg"
          data-testid="input-contact-name"
        />
      </CardContent>
    </Card>
  );
}

function Step7ContactDistance({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "lives-with", label: "Lives with me", icon: <Home className="h-6 w-6" /> },
    { value: "same-city", label: "Same city (under 30 min)", icon: <MapPin className="h-6 w-6" /> },
    { value: "few-hours", label: "A few hours away", icon: <Car className="h-6 w-6" /> },
    { value: "different-state", label: "Different state", icon: <Plane className="h-6 w-6" /> },
    { value: "different-country", label: "Different country", icon: <Globe className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-6" data-testid="text-distance-title">How far away does {data.contactName || "your contact"} live?</h1>
        
        <div className="space-y-3">
          {options.map((option) => (
            <OptionButton
              key={option.value}
              selected={data.contactDistance === option.value}
              onClick={() => setData({ ...data, contactDistance: option.value })}
              icon={option.icon}
              label={option.label}
              testId={`option-distance-${option.value}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Step8Summary({ data }: { data: OnboardingData }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" data-testid="text-summary-title">Here's what we've built for you, {data.name}</h1>
      <p className="text-muted-foreground">23% of young adults living alone have no local emergency contact</p>

      <Card className="border-0 overflow-hidden">
        <div className="bg-primary text-primary-foreground p-3">
          <span className="font-medium">Imagine this...</span>
        </div>
        <CardContent className="p-4">
          <p className="mb-4" data-testid="text-scenario">
            It's Wednesday morning. You have a fall and can't easily reach your phone.
          </p>
          
          <div className="space-y-4">
            <div className="bg-destructive/10 p-3 rounded-lg">
              <div className="font-semibold text-destructive mb-2 flex items-center gap-2">
                <X className="h-4 w-4" />
                WITHOUT AOK
              </div>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-destructive" />
                  6-12 hours before {data.contactName || "anyone"} realizes you need help
                </li>
                <li className="flex items-center gap-2">
                  <X className="h-4 w-4 text-destructive" />
                  Hours pass with no one knowing
                </li>
              </ul>
            </div>
            
            <div className="bg-emerald-500/10 p-3 rounded-lg">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                <Check className="h-4 w-4" />
                WITH AOK
              </div>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  You miss your scheduled check-in
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  {data.contactName || "Your contact"} gets an instant alert
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Timely support within hours
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 text-center">
          <div className="flex justify-center gap-1 text-amber-400 mb-2">
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
          </div>
          <p className="italic text-muted-foreground mb-2" data-testid="text-testimonial">
            "Living alone for the first time after college. My parents feel better knowing I'm okay."
          </p>
          <p className="font-medium">Jordan</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Step9WhatMatters({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "peace-myself", label: "Peace of mind for myself", description: "Know someone will notice if I need help", icon: <Smile className="h-6 w-6" /> },
    { value: "peace-contact", label: `Peace of mind for ${data.contactName || "my contact"}`, description: "They won't have to worry from afar", icon: <Heart className="h-6 w-6" /> },
    { value: "independence", label: "Stay independent", description: "Live on my terms, stay safe", icon: <Home className="h-6 w-6" /> },
  ];

  const toggleOption = (value: string) => {
    const current = data.whatMatters;
    if (current.includes(value)) {
      setData({ ...data, whatMatters: current.filter(v => v !== value) });
    } else if (current.length < 3) {
      setData({ ...data, whatMatters: [...current, value] });
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-2" data-testid="text-matters-title">What matters most to you?</h1>
        <p className="text-muted-foreground mb-6">Pick up to 3.</p>
        
        <div className="space-y-3">
          {options.map((option) => (
            <OptionButton
              key={option.value}
              selected={data.whatMatters.includes(option.value)}
              onClick={() => toggleOption(option.value)}
              icon={option.icon}
              label={option.label}
              description={option.description}
              testId={`option-matters-${option.value}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Step10HealthConditions({ data, setData, onSkip }: { data: OnboardingData; setData: (d: OnboardingData) => void; onSkip: () => void }) {
  const options = [
    { value: "fall-concerns", label: "Fall concerns", icon: <AlertTriangle className="h-6 w-6" /> },
    { value: "chronic-condition", label: "Chronic health condition", icon: <Activity className="h-6 w-6" /> },
    { value: "surgery", label: "Recent surgery or recovery", icon: <Scissors className="h-6 w-6" /> },
    { value: "mobility", label: "Limited mobility", icon: <Accessibility className="h-6 w-6" /> },
  ];

  const toggleOption = (value: string) => {
    const current = data.healthConditions;
    if (current.includes(value)) {
      setData({ ...data, healthConditions: current.filter(v => v !== value) });
    } else {
      setData({ ...data, healthConditions: [...current, value] });
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-2" data-testid="text-health-title">Do any of these apply to you?</h1>
        <p className="text-muted-foreground mb-6">Helps us suggest the right settings.</p>
        
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleOption(option.value)}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                data.healthConditions.includes(option.value) ? "border-primary bg-primary/5" : "border-border hover-elevate"
              }`}
              data-testid={`option-health-${option.value}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-primary">{option.icon}</div>
                  <span className="font-medium">{option.label}</span>
                </div>
                <Checkbox 
                  checked={data.healthConditions.includes(option.value)}
                  className="pointer-events-none"
                />
              </div>
            </button>
          ))}
        </div>

        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={onSkip}
          data-testid="button-skip"
        >
          Skip - none apply
        </Button>
      </CardContent>
    </Card>
  );
}

function Step11ScheduleSummary({ data }: { data: OnboardingData }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-2" data-testid="text-schedule-title">Now let's set up your check-in schedule</h1>
        <p className="text-muted-foreground mb-6">Based on your situation, we suggest:</p>
        
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold">Daily check-ins</div>
              <div className="text-sm text-muted-foreground">Perfect for peace of mind</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold">Morning (10:00 AM)</div>
              <div className="text-sm text-muted-foreground">We'll pick a time next</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold">60-minute grace period</div>
              <div className="text-sm text-muted-foreground">Gives you time without false alarms</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Step12Frequency({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "daily", label: "Daily", recommended: true, icon: <Calendar className="h-6 w-6" /> },
    { value: "twice-daily", label: "Twice a day", icon: <RefreshCw className="h-6 w-6" /> },
    { value: "few-times-week", label: "A few times per week", icon: <Calendar className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-6" data-testid="text-frequency-title">How often should we check in?</h1>
        
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setData({ ...data, checkInFrequency: option.value })}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                data.checkInFrequency === option.value ? "border-primary bg-primary/5" : "border-border hover-elevate"
              }`}
              data-testid={`option-frequency-${option.value}`}
            >
              <div className="flex items-center gap-3">
                <div className="text-primary">{option.icon}</div>
                <div>
                  <span className="font-medium">{option.label}</span>
                  {option.recommended && (
                    <span className="ml-2 text-xs text-primary font-medium">Recommended</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Step13Time({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "morning", label: "Morning (10:00 AM)", icon: <Sun className="h-6 w-6" /> },
    { value: "midday", label: "Midday (12:00 PM)", icon: <Sun className="h-6 w-6" /> },
    { value: "evening", label: "Evening (6:00 PM)", icon: <Sunset className="h-6 w-6" /> },
    { value: "custom", label: "Custom time...", icon: <Settings className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-4" data-testid="text-time-title">What time works best?</h1>
        <p className="text-sm text-muted-foreground mb-6">Timezone: Europe/London</p>
        
        <div className="space-y-3">
          {options.map((option) => (
            <OptionButton
              key={option.value}
              selected={data.checkInTime === option.value}
              onClick={() => setData({ ...data, checkInTime: option.value })}
              icon={option.icon}
              label={option.label}
              testId={`option-time-${option.value}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Step14Referral({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "google", label: "Google search", icon: <Search className="h-6 w-6" /> },
    { value: "ai", label: "ChatGPT / AI assistant", icon: <Bot className="h-6 w-6" /> },
    { value: "social", label: "Social media", icon: <Smartphone className="h-6 w-6" /> },
    { value: "friend", label: "Friend or family recommendation", icon: <Users className="h-6 w-6" /> },
    { value: "email", label: "Email or newsletter", icon: <Mail className="h-6 w-6" /> },
    { value: "other", label: "Other", icon: <Star className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <h1 className="text-2xl font-bold mb-6" data-testid="text-referral-title">One quick question - how did you find us?</h1>
        
        <div className="space-y-3">
          {options.map((option) => (
            <OptionButton
              key={option.value}
              selected={data.referralSource === option.value}
              onClick={() => setData({ ...data, referralSource: option.value })}
              icon={option.icon}
              label={option.label}
              testId={`option-referral-${option.value}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Step15Plan({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-2" data-testid="text-plan-title">Give {data.contactName || "your loved one"} peace of mind</h1>
          <p className="text-muted-foreground mb-6">
            {data.contactName || "They"} will be alerted if you ever need help.
          </p>
          
          <div className="p-4 border rounded-lg bg-muted/30 mb-6">
            <div className="font-semibold mb-3">Your protection plan includes:</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span data-testid="text-plan-feature-1">Daily 10:00 check-in reminders</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span data-testid="text-plan-feature-2">Automatic alerts to {data.contactName || "your contact"} if you miss</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span data-testid="text-plan-feature-3">24/7 monitoring</span>
              </li>
            </ul>
          </div>

          <button 
            className="w-full p-3 border rounded-lg flex items-center justify-between hover-elevate transition-colors"
            data-testid="button-upgrade-plus"
          >
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium text-sm">Want AI phone check-ins?</div>
                <div className="text-xs text-muted-foreground">Upgrade to Plus for £8.99/mo</div>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
          </button>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => setData({ ...data, billingCycle: "monthly" })}
              className={`p-4 rounded-lg border text-center transition-all ${
                data.billingCycle === "monthly" ? "border-primary bg-primary/5" : "border-border hover-elevate"
              }`}
              data-testid="option-billing-monthly"
            >
              <div className="text-sm text-muted-foreground">Monthly</div>
              <div className="text-xl font-bold">£4.99<span className="text-sm font-normal">/mo</span></div>
            </button>
            <button
              onClick={() => setData({ ...data, billingCycle: "yearly" })}
              className={`p-4 rounded-lg border text-center transition-all relative ${
                data.billingCycle === "yearly" ? "border-primary bg-primary/5" : "border-border hover-elevate"
              }`}
              data-testid="option-billing-yearly"
            >
              <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                2 months free
              </span>
              <div className="text-sm text-muted-foreground">Yearly</div>
              <div className="text-xl font-bold">£4.17<span className="text-sm font-normal">/mo</span></div>
              <div className="text-xs text-muted-foreground">billed £49.99/year</div>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-emerald-500 text-white rounded-xl p-6 text-center">
        <h2 className="text-2xl font-bold mb-1" data-testid="text-trial-title">Try free for 7 days</h2>
        <p className="text-emerald-100 mb-3">Cancel anytime</p>
        <p className="text-sm">
          You won't be charged until <strong>{getTrialEndDate()}</strong>
        </p>
        <p className="text-sm text-emerald-100">Then £4.99/month</p>
      </div>
    </div>
  );
}

function Step16Payment({ data, onComplete }: { data: OnboardingData; onComplete: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState(data.email || "");
  const { toast } = useToast();

  const handleStartTrial = async () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/stripe/create-subscription-checkout", {
        email,
        priceId: data.billingCycle === "yearly" ? "price_1StV4qPFr1sLOzVcfhR3xxWe" : "price_1StV4pPFr1sLOzVc1gw1I4Kt",
        successUrl: `${window.location.origin}/register?onboarded=true&email=${encodeURIComponent(email)}`,
        cancelUrl: `${window.location.origin}/onboarding`,
        trialDays: 7,
      });

      const result = await response.json();
      
      if (result.url) {
        localStorage.setItem("onboardingData", JSON.stringify({ ...data, email }));
        window.location.href = result.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Payment setup failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSkipPayment = () => {
    if (!email || !email.includes("@")) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address to continue",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem("onboardingData", JSON.stringify({ ...data, email }));
    onComplete();
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-500 text-white rounded-xl p-6 text-center">
        <h2 className="text-2xl font-bold mb-1" data-testid="text-payment-trial-title">Try free for 7 days</h2>
        <p className="text-emerald-100 mb-3">Cancel anytime</p>
        <p className="text-sm">
          You won't be charged until <strong>{getTrialEndDate()}</strong>
        </p>
        <p className="text-sm text-emerald-100">Then £4.99/month</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground mt-1">
                We'll send your check-in reminders here
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Payment method</span>
              </div>
              
              <div className="flex items-center justify-center gap-4 p-4 bg-muted/30 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-5 w-5" />
                  <span>Card</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <SiApple className="h-5 w-5" />
                  <span>Apple Pay</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <SiGooglepay className="h-6 w-6" />
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Secure checkout
                </div>
                <div className="flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Cancel anytime
                </div>
              </div>
            </div>

            <Button 
              onClick={handleStartTrial}
              disabled={isLoading || !email}
              className="w-full text-lg py-6"
              data-testid="button-complete-trial"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirecting to checkout...
                </>
              ) : (
                "Start Free Trial"
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkipPayment}
              className="w-full"
              data-testid="button-skip-payment"
            >
              Continue without payment
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3" data-testid="text-after-trial-title">What happens after the trial?</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2" data-testid="text-after-trial-1">
              <span className="text-primary mt-0.5">•</span>
              We'll email you 24 hours before your trial ends
            </li>
            <li className="flex items-start gap-2" data-testid="text-after-trial-2">
              <span className="text-primary mt-0.5">•</span>
              Cancel anytime from your settings - no questions asked
            </li>
            <li className="flex items-start gap-2" data-testid="text-after-trial-3">
              <span className="text-primary mt-0.5">•</span>
              Your protection continues seamlessly if you stay
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 text-center">
          <div className="flex justify-center gap-1 text-amber-400 mb-2">
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
          </div>
          <p className="italic text-muted-foreground mb-2" data-testid="text-final-testimonial">
            "Finally, my daughter stopped worrying."
          </p>
          <p className="text-sm">- M.K., 68</p>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground" data-testid="text-terms-link">
        By continuing, you agree to our <a href="/terms" className="underline">Terms</a> & <a href="/privacy" className="underline">Privacy Policy</a>
      </p>
    </div>
  );
}

function getTrialEndDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}
