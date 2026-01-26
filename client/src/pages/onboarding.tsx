import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronLeft, Check, Lock, CreditCard, GraduationCap, Home, Building2, 
  Users, Heart, Baby, Plane, TreePine, MapPin, Car, Globe, Smile, 
  AlertTriangle, Activity, Scissors, Accessibility, Calendar,
  Clock, RefreshCw, Sun, Sunset, Settings, Search, Bot, Smartphone,
  Mail, Star, Phone, X, Loader2, Wallet, ShieldCheck, Info, Plus,
  Eye, EyeOff, MessageSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SiApple, SiGooglepay } from "react-icons/si";

const countryCodes = [
  { code: "+44", country: "UK", flag: "🇬🇧", mobileLength: 10 },
  { code: "+1", country: "US/CA", flag: "🇺🇸", mobileLength: 10 },
  { code: "+353", country: "IE", flag: "🇮🇪", mobileLength: 9 },
  { code: "+61", country: "AU", flag: "🇦🇺", mobileLength: 9 },
  { code: "+33", country: "FR", flag: "🇫🇷", mobileLength: 9 },
  { code: "+49", country: "DE", flag: "🇩🇪", mobileLength: 10 },
  { code: "+34", country: "ES", flag: "🇪🇸", mobileLength: 9 },
  { code: "+39", country: "IT", flag: "🇮🇹", mobileLength: 10 },
];

function isValidMobileNumber(phone: string, countryCode: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  const country = countryCodes.find(c => c.code === countryCode);
  if (!country) return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  
  if (countryCode === "+44") {
    return digitsOnly.length === 10 && digitsOnly.startsWith('7');
  }
  return digitsOnly.length === country.mobileLength;
}

interface ContactData {
  name: string;
  email: string;
  phone: string;
  phoneCountry: string;
  landline: string;
  landlineCountry: string;
}

interface PetData {
  name: string;
  type: string;
  nutrition: string;
  vetName: string;
  vetPhone: string;
  emergencyInfo: string;
}

interface ChildrenData {
  numberOfChildren: string;
  ageRange: string;
  emergencyDetails: string;
}

interface PartnerTravelData {
  destinations: string;
  address: string;
  localPhone: string;
}

interface RuralData {
  accessInstructions: string;
  lockedGates: string;
  specialNotes: string;
}

interface SoloTravelData {
  destinations: string;
  localAddress: string;
  localPhone: string;
}

interface LoneWorkerData {
  companyName: string;
  supervisorName: string;
  supervisorPhone: string;
  emergencyContact: string;
}

// Helper function to format multiple contact names
function formatContactNames(contacts: ContactData[], fallback: string = "your contacts"): string {
  const names = contacts.filter(c => c.name.trim()).map(c => c.name.trim());
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

interface OnboardingData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  userPhone: string;
  userPhoneCountry: string;
  locationSharingEnabled: boolean;
  ageGroup: string;
  livingSituation: string;
  whoWorries: string;
  contactName: string;
  contactDistance: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneCountry: string;
  contactLandline: string;
  contactLandlineCountry: string;
  contacts: ContactData[];
  pets: PetData[];
  childrenData: ChildrenData;
  partnerTravelData: PartnerTravelData;
  ruralData: RuralData;
  soloTravelData: SoloTravelData;
  loneWorkerData: LoneWorkerData;
  whatMatters: string[];
  healthConditions: string[];
  healthConditionsOther?: string;
  checkInFrequency: string;
  checkInTime: string;
  scheduleStartTime: string;
  scheduleEnabled: boolean;
  intervalHours: number;
  planType: string;
  billingCycle: string;
  testMode?: boolean;
}

const TOTAL_STEPS = 16;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    userPhone: "",
    userPhoneCountry: "+44",
    locationSharingEnabled: false,
    ageGroup: "",
    livingSituation: "",
    whoWorries: "",
    contactName: "",
    contactDistance: "",
    contactEmail: "",
    contactPhone: "",
    contactPhoneCountry: "+44",
    contactLandline: "",
    contactLandlineCountry: "+44",
    contacts: [
      { name: "", email: "", phone: "", phoneCountry: "+44", landline: "", landlineCountry: "+44" },
      { name: "", email: "", phone: "", phoneCountry: "+44", landline: "", landlineCountry: "+44" },
    ],
    pets: [
      { name: "", type: "", nutrition: "", vetName: "", vetPhone: "", emergencyInfo: "" },
    ],
    childrenData: { numberOfChildren: "", ageRange: "", emergencyDetails: "" },
    partnerTravelData: { destinations: "", address: "", localPhone: "" },
    ruralData: { accessInstructions: "", lockedGates: "", specialNotes: "" },
    soloTravelData: { destinations: "", localAddress: "", localPhone: "" },
    loneWorkerData: { companyName: "", supervisorName: "", supervisorPhone: "", emergencyContact: "" },
    whatMatters: [],
    healthConditions: [],
    healthConditionsOther: "",
    checkInFrequency: "daily",
    checkInTime: "morning",
    scheduleStartTime: "10:00",
    scheduleEnabled: true,
    intervalHours: 24,
    planType: "base",
    billingCycle: "monthly",
  });

  const progress = Math.round((currentStep / TOTAL_STEPS) * 100);

  // Persist onboarding data to localStorage whenever it changes
  useEffect(() => {
    // Only save if user has started filling in data (has a name or email)
    if (data.name || data.email) {
      localStorage.setItem("onboardingData", JSON.stringify(data));
    }
  }, [data]);

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
    // Save termsAcceptedAt timestamp when completing onboarding
    const dataWithTerms = {
      ...data,
      termsAcceptedAt: new Date().toISOString(),
    };
    localStorage.setItem("onboardingData", JSON.stringify(dataWithTerms));
    setLocation("/register?onboarded=true");
  };

  const [termsAccepted, setTermsAccepted] = useState(false);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1: {
        // Require name, valid email, password (min 8 chars), matching passwords, valid phone
        // Location is optional - users can enable later in Settings
        const hasName = data.name.trim().length > 0;
        const hasEmail = data.email.includes("@") && data.email.includes(".");
        const hasPassword = data.password.length >= 8;
        const passwordsMatch = data.password === data.confirmPassword;
        const hasPhone = isValidMobileNumber(data.userPhone, data.userPhoneCountry);
        return hasName && hasEmail && hasPassword && passwordsMatch && hasPhone;
      }
      case 2: return data.ageGroup !== "";
      case 3: return data.livingSituation !== "";
      case 4: return data.whoWorries !== "";
      case 5: {
        // Require at least 1 contact with a name (2nd is optional)
        const contactsWithNames = data.contacts.filter(c => c.name.trim().length > 0);
        return contactsWithNames.length >= 1;
      }
      case 6: return data.contactDistance !== "";
      case 7: return true;
      case 8: return data.whatMatters.length > 0;
      case 9: return true;
      case 10: return true;
      case 11: return data.checkInFrequency !== "";
      case 12: return !data.scheduleEnabled || data.scheduleStartTime !== "";
      case 13: {
        // Validate all contacts with names have valid email and phone
        const contactsWithNames = data.contacts.filter(c => c.name.trim().length > 0);
        return contactsWithNames.every(c => 
          c.email.includes("@") && 
          c.phone.trim().length > 0 && 
          isValidMobileNumber(c.phone, c.phoneCountry)
        );
      }
      case 14: return true;
      case 15: return true;
      case 16: return termsAccepted;
      default: return true;
    }
  }, [currentStep, data, termsAccepted]);

  // Handle Enter key to proceed to next step
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        // Don't trigger if user is in a textarea
        const target = event.target as HTMLElement;
        if (target.tagName === 'TEXTAREA') return;
        
        // Check if we can proceed and not on payment or terms step
        if (currentStep < 15 && canProceed()) {
          event.preventDefault();
          handleNext();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentStep, canProceed]);

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step2Welcome data={data} setData={setData} />;
      case 2: return <Step3AgeGroup data={data} setData={setData} />;
      case 3: return <Step4LivingSituation data={data} setData={setData} />;
      case 4: return <Step5WhoWorries data={data} setData={setData} />;
      case 5: return <Step6ContactName data={data} setData={setData} />;
      case 6: return <Step7ContactDistance data={data} setData={setData} />;
      case 7: return <Step8Summary data={data} />;
      case 8: return <Step9WhatMatters data={data} setData={setData} />;
      case 9: return <Step10HealthConditions data={data} setData={setData} onSkip={handleNext} />;
      case 10: return <Step11ScheduleSummary data={data} />;
      case 11: return <Step12Frequency data={data} setData={setData} />;
      case 12: return <Step13Time data={data} setData={setData} />;
      case 13: return <Step14ContactDetails data={data} setData={setData} />;
      case 14: return <Step15Plan data={data} setData={setData} />;
      case 15: return <Step16Payment data={data} setData={setData} onNext={handleNext} />;
      case 16: return <Step1Terms accepted={termsAccepted} setAccepted={setTermsAccepted} onComplete={handleComplete} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <header className="container mx-auto px-4 py-3 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2 md:gap-3" data-testid="link-logo-home">
            <ShieldCheck className="h-7 w-7 md:h-10 md:w-10 text-green-600" />
            <span className="text-lg md:text-2xl font-bold text-green-600">aok</span>
          </Link>
        </header>

        <div className="px-4 pb-3">
          <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
            <span data-testid="text-step-indicator">Step {currentStep} of {TOTAL_STEPS}</span>
            <span data-testid="text-progress-percent">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
        </div>
      </div>

      <div className="flex-1 px-4 py-4 overflow-y-scroll [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="max-w-md mx-auto">
          {renderStep()}
        </div>
      </div>

      <div className="px-4 py-4 border-t bg-background">
        <div className="max-w-md mx-auto flex justify-center gap-3">
          {currentStep > 1 && (
            <Button 
              variant="outline" 
              onClick={handleBack}
              size="sm"
              data-testid="button-back"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {currentStep < TOTAL_STEPS && (
            <Button 
              onClick={handleNext}
              disabled={!canProceed()}
              size="sm"
              className="px-8"
              data-testid="button-continue"
            >
              Continue
            </Button>
          )}
        </div>
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
      className={`w-full p-3 sm:p-4 rounded-lg border text-left transition-all ${
        selected ? "border-primary bg-primary/5" : "border-border hover-elevate"
      }`}
      data-testid={testId}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="text-primary mt-0.5 flex-shrink-0 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm sm:text-base" data-testid={`${testId}-label`}>{label}</div>
          {description && <div className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{description}</div>}
        </div>
        {selected && <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />}
      </div>
    </button>
  );
}

function Step1Terms({ accepted, setAccepted, onComplete }: { accepted: boolean; setAccepted: (v: boolean) => void; onComplete: () => void }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-terms-title">Terms and Conditions</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6" data-testid="text-terms-subtitle">
          Please review and accept our terms to complete your registration.
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
            <p>Your emergency contacts will receive notifications when you miss a check-in or trigger an emergency alert. They must confirm their consent via email within 24 hours.</p>
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
        
        <div className="flex items-start gap-3 p-4 border rounded-lg bg-background mb-6">
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
        
        <Button 
          onClick={onComplete}
          disabled={!accepted}
          className="w-full"
          data-testid="button-complete-signup"
        >
          Confirm
        </Button>
      </CardContent>
    </Card>
  );
}

function Step2Welcome({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-welcome-title">Let's get to know you</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6" data-testid="text-welcome-subtitle">
          Let's build your personal protection plan. It only takes 2 minutes.
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">What's your full name?</label>
            <Input
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              placeholder="Enter your full name"
              className="text-lg"
              data-testid="input-name"
            />
            <p className="text-xs text-muted-foreground">
              This name will appear on alerts to your contacts.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email address</label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              placeholder="you@example.com"
              data-testid="input-email"
            />
            <p className="text-xs text-muted-foreground">
              We'll send your check-in reminders here.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Create password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                placeholder="At least 8 characters"
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {data.password.length > 0 && data.password.length < 8 
                ? `${8 - data.password.length} more characters needed`
                : "Used to secure your account."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={data.confirmPassword}
                onChange={(e) => setData({ ...data, confirmPassword: e.target.value })}
                placeholder="Re-enter your password"
                data-testid="input-confirm-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-toggle-confirm-password"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className={`text-xs ${data.confirmPassword.length > 0 ? (data.password === data.confirmPassword ? "text-green-600" : "text-red-500") : "text-muted-foreground"}`}>
              {data.confirmPassword.length > 0 
                ? (data.password === data.confirmPassword ? "Passwords match" : "Passwords don't match")
                : "Enter the same password again."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mobile number</label>
            <div className="flex gap-2">
              <select
                value={data.userPhoneCountry}
                onChange={(e) => setData({ ...data, userPhoneCountry: e.target.value })}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="select-user-phone-country"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <Input
                type="tel"
                value={data.userPhone}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  // Auto-remove leading zero when country code is present
                  if (value.startsWith('0') && data.userPhoneCountry) {
                    value = value.substring(1);
                  }
                  setData({ ...data, userPhone: value });
                }}
                placeholder="7700900123"
                className="flex-1"
                data-testid="input-user-phone"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For check-in reminders and emergency alerts.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className={`h-5 w-5 ${data.locationSharingEnabled ? "text-emerald-500" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium">Location sharing</p>
                  <p className="text-xs text-muted-foreground">Share your location in emergencies</p>
                </div>
              </div>
              <Switch
                checked={data.locationSharingEnabled}
                onCheckedChange={(checked) => setData({ ...data, locationSharingEnabled: checked })}
                data-testid="switch-location-sharing"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You can adjust this later in Settings.
            </p>
          </div>
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
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-age-title">What's your age group?</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">This helps us personalise your safety experience</p>
        
        <div className="space-y-2 sm:space-y-3">
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
    { value: "solo-traveller", label: "Solo traveller", icon: <Globe className="h-6 w-6" /> },
    { value: "lone-worker", label: "Lone worker", icon: <Building2 className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" data-testid="text-living-title">Which best describes you?</h1>
        
        <div className="space-y-2 sm:space-y-3">
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
    { value: "adult-children", label: "My children", icon: <Users className="h-6 w-6" /> },
    { value: "parents", label: "My parents", icon: <Users className="h-6 w-6" /> },
    { value: "siblings", label: "My siblings", icon: <Users className="h-6 w-6" /> },
    { value: "spouse", label: "My spouse/partner", icon: <Heart className="h-6 w-6" /> },
    { value: "friends", label: "Close friends", icon: <Users className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" data-testid="text-worries-title">Who worries about you most?</h1>
        
        <div className="space-y-2 sm:space-y-3">
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
      </CardContent>
    </Card>
  );
}

function Step6ContactName({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const relationshipLabels: Record<string, { singular: string; plural: string }> = {
    "adult-children": { singular: "child", plural: "children" },
    "parents": { singular: "parent", plural: "parents" },
    "siblings": { singular: "sibling", plural: "siblings" },
    "spouse": { singular: "partner", plural: "partners" },
    "friends": { singular: "friend", plural: "friends" },
  };
  
  const labels = relationshipLabels[data.whoWorries] || { singular: "contact", plural: "contacts" };
  const hasPets = data.livingSituation === "alone-pets";

  const updateContactName = (index: number, name: string) => {
    const newContacts = [...data.contacts];
    newContacts[index] = { ...newContacts[index], name };
    setData({ ...data, contacts: newContacts, contactName: newContacts[0]?.name || "" });
  };

  const addContact = () => {
    if (data.contacts.length < 5) {
      setData({
        ...data,
        contacts: [...data.contacts, { name: "", email: "", phone: "", phoneCountry: "+44", landline: "", landlineCountry: "+44" }]
      });
    }
  };

  const removeContact = (index: number) => {
    if (data.contacts.length > 2) {
      const newContacts = data.contacts.filter((_, i) => i !== index);
      setData({ ...data, contacts: newContacts, contactName: newContacts[0]?.name || "" });
    }
  };

  const updatePet = (index: number, field: keyof PetData, value: string) => {
    const newPets = [...data.pets];
    newPets[index] = { ...newPets[index], [field]: value };
    setData({ ...data, pets: newPets });
  };

  const addPet = () => {
    if (data.pets.length < 5) {
      setData({
        ...data,
        pets: [...data.pets, { name: "", type: "", nutrition: "", vetName: "", vetPhone: "", emergencyInfo: "" }]
      });
    }
  };

  const removePet = (index: number) => {
    if (data.pets.length > 1) {
      const newPets = data.pets.filter((_, i) => i !== index);
      setData({ ...data, pets: newPets });
    }
  };

  const petTypes = [
    { value: "dog", label: "Dog" },
    { value: "cat", label: "Cat" },
    { value: "bird", label: "Bird" },
    { value: "rabbit", label: "Rabbit" },
    { value: "fish", label: "Fish" },
    { value: "hamster", label: "Hamster" },
    { value: "guinea-pig", label: "Guinea Pig" },
    { value: "reptile", label: "Reptile" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-contact-title">Who are your {labels.plural}?</h1>
          <p className="text-muted-foreground mb-6">Enter their names. You can add a second contact if you wish.</p>
          
          <div className="space-y-3">
            {data.contacts.map((contact, index) => (
              <div key={index} className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">
                    {index === 0 ? "Primary contact" : `Contact ${index + 1}`}
                  </label>
                  <Input
                    value={contact.name}
                    onChange={(e) => updateContactName(index, e.target.value)}
                    placeholder={index === 0 ? "Jessica" : "Name"}
                    className="text-lg"
                    data-testid={`input-contact-name-${index}`}
                  />
                </div>
                {index >= 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeContact(index)}
                    className="mt-5"
                    data-testid={`button-remove-contact-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {data.contacts.length < 5 && (
            <Button
              variant="outline"
              onClick={addContact}
              className="w-full mt-4"
              data-testid="button-add-contact"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add another contact
            </Button>
          )}
        </CardContent>
      </Card>

      {hasPets && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold" data-testid="text-pet-title">Pet Protection Details (Optional)</h2>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              If something happens to you, we'll include your pet's care information in emergency alerts.
            </p>
            
            {data.pets.map((pet, index) => (
              <div key={index} className="space-y-4 pb-4 mb-4 border-b last:border-b-0 last:mb-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Pet {index + 1}</span>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePet(index)}
                      data-testid={`button-remove-pet-${index}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Pet's name</label>
                    <Input
                      value={pet.name}
                      onChange={(e) => updatePet(index, "name", e.target.value)}
                      placeholder="Bella"
                      data-testid={`input-pet-name-${index}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Type of pet</label>
                    <select
                      value={pet.type}
                      onChange={(e) => updatePet(index, "type", e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      data-testid={`select-pet-type-${index}`}
                    >
                      <option value="">Select type</option>
                      {petTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Nutrition / Feeding details</label>
                  <Input
                    value={pet.nutrition}
                    onChange={(e) => updatePet(index, "nutrition", e.target.value)}
                    placeholder="e.g., Dry food twice daily, morning and evening"
                    data-testid={`input-pet-nutrition-${index}`}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Vet name / Practice</label>
                    <Input
                      value={pet.vetName}
                      onChange={(e) => updatePet(index, "vetName", e.target.value)}
                      placeholder="e.g., Greenfield Vets"
                      data-testid={`input-pet-vet-name-${index}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Vet phone number</label>
                    <Input
                      value={pet.vetPhone}
                      onChange={(e) => updatePet(index, "vetPhone", e.target.value)}
                      placeholder="01onal234 567890"
                      data-testid={`input-pet-vet-phone-${index}`}
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Emergency / Special care information</label>
                  <Input
                    value={pet.emergencyInfo}
                    onChange={(e) => updatePet(index, "emergencyInfo", e.target.value)}
                    placeholder="e.g., On daily medication, allergic to chicken"
                    data-testid={`input-pet-emergency-${index}`}
                  />
                </div>
              </div>
            ))}
            
            {data.pets.length < 5 && (
              <Button
                variant="outline"
                onClick={addPet}
                className="w-full mt-2"
                data-testid="button-add-pet"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another pet
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {data.livingSituation === "single-parent" && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Baby className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold" data-testid="text-children-title">Children Details (Optional)</h2>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              This information helps emergency responders understand your situation.
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Number of children</label>
                  <Input
                    value={data.childrenData.numberOfChildren}
                    onChange={(e) => setData({ ...data, childrenData: { ...data.childrenData, numberOfChildren: e.target.value } })}
                    placeholder="e.g., 2"
                    data-testid="input-children-number"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Age range</label>
                  <Input
                    value={data.childrenData.ageRange}
                    onChange={(e) => setData({ ...data, childrenData: { ...data.childrenData, ageRange: e.target.value } })}
                    placeholder="e.g., 5-12 years"
                    data-testid="input-children-age"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Emergency details</label>
                <Input
                  value={data.childrenData.emergencyDetails}
                  onChange={(e) => setData({ ...data, childrenData: { ...data.childrenData, emergencyDetails: e.target.value } })}
                  placeholder="e.g., School pickup at 3pm, allergies, special needs"
                  data-testid="input-children-emergency"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.livingSituation === "partner-travels" && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Plane className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold" data-testid="text-partner-title">Partner Travel Details (Optional)</h2>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              Details about where your partner travels can help in emergencies.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Common destinations</label>
                <Input
                  value={data.partnerTravelData.destinations}
                  onChange={(e) => setData({ ...data, partnerTravelData: { ...data.partnerTravelData, destinations: e.target.value } })}
                  placeholder="e.g., New York, Dubai, Singapore"
                  data-testid="input-partner-destinations"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Address when travelling</label>
                <Input
                  value={data.partnerTravelData.address}
                  onChange={(e) => setData({ ...data, partnerTravelData: { ...data.partnerTravelData, address: e.target.value } })}
                  placeholder="e.g., Hotel or office address"
                  data-testid="input-partner-address"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Local phone number</label>
                <Input
                  value={data.partnerTravelData.localPhone}
                  onChange={(e) => setData({ ...data, partnerTravelData: { ...data.partnerTravelData, localPhone: e.target.value } })}
                  placeholder="e.g., +1 555 123 4567"
                  data-testid="input-partner-phone"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.livingSituation === "rural" && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <TreePine className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold" data-testid="text-rural-title">Rural Access Details (Optional)</h2>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              Help emergency services find and access your property.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Vehicular access instructions</label>
                <Input
                  value={data.ruralData.accessInstructions}
                  onChange={(e) => setData({ ...data, ruralData: { ...data.ruralData, accessInstructions: e.target.value } })}
                  placeholder="e.g., Turn left at the oak tree, gravel track for 500m"
                  data-testid="input-rural-access"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Locked gates / Entry codes</label>
                <Input
                  value={data.ruralData.lockedGates}
                  onChange={(e) => setData({ ...data, ruralData: { ...data.ruralData, lockedGates: e.target.value } })}
                  placeholder="e.g., Gate code 1234, key under flowerpot"
                  data-testid="input-rural-gates"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Special notes</label>
                <Input
                  value={data.ruralData.specialNotes}
                  onChange={(e) => setData({ ...data, ruralData: { ...data.ruralData, specialNotes: e.target.value } })}
                  placeholder="e.g., Dogs on property, uneven ground"
                  data-testid="input-rural-notes"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.livingSituation === "solo-traveller" && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold" data-testid="text-travel-title">Travel Details (Optional)</h2>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              Keep your contacts informed about your travel plans.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Current / Planned destinations</label>
                <Input
                  value={data.soloTravelData.destinations}
                  onChange={(e) => setData({ ...data, soloTravelData: { ...data.soloTravelData, destinations: e.target.value } })}
                  placeholder="e.g., Thailand, Vietnam, Japan"
                  data-testid="input-travel-destinations"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Local address</label>
                <Input
                  value={data.soloTravelData.localAddress}
                  onChange={(e) => setData({ ...data, soloTravelData: { ...data.soloTravelData, localAddress: e.target.value } })}
                  placeholder="e.g., Hostel or hotel address"
                  data-testid="input-travel-address"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Local phone number</label>
                <Input
                  value={data.soloTravelData.localPhone}
                  onChange={(e) => setData({ ...data, soloTravelData: { ...data.soloTravelData, localPhone: e.target.value } })}
                  placeholder="e.g., +66 81 234 5678"
                  data-testid="input-travel-phone"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.livingSituation === "lone-worker" && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold" data-testid="text-worker-title">Work Details (Optional)</h2>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              Your workplace details can be shared in emergency alerts.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Company name</label>
                <Input
                  value={data.loneWorkerData.companyName}
                  onChange={(e) => setData({ ...data, loneWorkerData: { ...data.loneWorkerData, companyName: e.target.value } })}
                  placeholder="e.g., ABC Services Ltd"
                  data-testid="input-worker-company"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Supervisor name</label>
                  <Input
                    value={data.loneWorkerData.supervisorName}
                    onChange={(e) => setData({ ...data, loneWorkerData: { ...data.loneWorkerData, supervisorName: e.target.value } })}
                    placeholder="e.g., John Smith"
                    data-testid="input-worker-supervisor"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Supervisor phone</label>
                  <Input
                    value={data.loneWorkerData.supervisorPhone}
                    onChange={(e) => setData({ ...data, loneWorkerData: { ...data.loneWorkerData, supervisorPhone: e.target.value } })}
                    placeholder="e.g., 07700 123456"
                    data-testid="input-worker-supervisor-phone"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Work emergency contact</label>
                <Input
                  value={data.loneWorkerData.emergencyContact}
                  onChange={(e) => setData({ ...data, loneWorkerData: { ...data.loneWorkerData, emergencyContact: e.target.value } })}
                  placeholder="e.g., HR department: 0800 123 456"
                  data-testid="input-worker-emergency"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Step7ContactDistance({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "lives-with", label: "Lives with me", icon: <Home className="h-6 w-6" /> },
    { value: "same-city", label: "Same city (under 30 min)", icon: <MapPin className="h-6 w-6" /> },
    { value: "few-hours", label: "A few hours away", icon: <Car className="h-6 w-6" /> },
    { value: "different-country", label: "Different country", icon: <Globe className="h-6 w-6" /> },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" data-testid="text-distance-title">How far away does {formatContactNames(data.contacts, "your contact")} live?</h1>
        
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
  // Get scenario content based on contact distance
  const getScenarioContent = () => {
    const contactName = formatContactNames(data.contacts, "your contact");
    const contactNameCapitalized = formatContactNames(data.contacts, "Your contact");
    
    switch (data.contactDistance) {
      case "lives-with":
        return {
          stat: "Even people living together can go hours without checking on each other",
          scenario: "It's a weekday morning. Your housemate has left for work. You have a fall and can't easily reach your phone.",
          withoutDelay: `Hours before ${contactName} returns home and realises you need help`,
          withoutDetail: "You're alone all day with no way to call for help",
          withAokDetail: `${contactNameCapitalized} ${data.contacts.filter(c => c.name).length === 1 ? "gets" : "get"} an instant alert - even while at work`
        };
      case "same-city":
        return {
          stat: "43% of emergencies at home happen when we're alone",
          scenario: "It's Wednesday morning. You have a fall and can't easily reach your phone.",
          withoutDelay: `3-6 hours before ${contactName} realises something is wrong`,
          withoutDetail: "Hours pass with no one knowing you need help",
          withAokDetail: `${contactNameCapitalized} ${data.contacts.filter(c => c.name).length === 1 ? "is" : "are"} alerted and can reach you within 30 minutes`
        };
      case "few-hours":
        return {
          stat: "When contacts live hours away, delays in getting help can be critical",
          scenario: "It's Wednesday morning. You have a fall and can't easily reach your phone.",
          withoutDelay: `6-12 hours before ${contactName} starts to worry`,
          withoutDetail: "By the time they realise, precious time has been lost",
          withAokDetail: `${contactNameCapitalized} ${data.contacts.filter(c => c.name).length === 1 ? "gets" : "get"} an instant alert and can arrange local help`
        };
      case "different-country":
        return {
          stat: "When loved ones are overseas, missed calls can go unnoticed for days",
          scenario: "It's Wednesday morning. You have a fall and can't easily reach your phone.",
          withoutDelay: `24-48 hours before ${contactName} realises you're not responding`,
          withoutDetail: "Time zone differences mean delayed concern",
          withAokDetail: `${contactNameCapitalized} ${data.contacts.filter(c => c.name).length === 1 ? "gets" : "get"} an instant alert regardless of time zone`
        };
      default:
        return {
          stat: "23% of young adults living alone have no local emergency contact",
          scenario: "It's Wednesday morning. You have a fall and can't easily reach your phone.",
          withoutDelay: `6-12 hours before ${contactName} realises you need help`,
          withoutDetail: "Hours pass with no one knowing",
          withAokDetail: `${contactNameCapitalized} ${data.contacts.filter(c => c.name).length === 1 ? "gets" : "get"} an instant alert`
        };
    }
  };

  const content = getScenarioContent();

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-summary-title">Here's what we've built for you, {data.name}</h1>
      <p className="text-muted-foreground">{content.stat}</p>

      <Card className="border-0 overflow-hidden">
        <div className="bg-primary text-primary-foreground p-3">
          <span className="font-medium">Imagine this...</span>
        </div>
        <CardContent className="p-4">
          <p className="mb-4" data-testid="text-scenario">
            {content.scenario}
          </p>
          
          <div className="space-y-4">
            <div className="bg-destructive/10 p-4 rounded-lg">
              <div className="font-semibold text-destructive mb-3 flex items-center gap-2">
                <X className="h-5 w-5 flex-shrink-0" />
                WITHOUT AOK
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-3">
                  <X className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span>{content.withoutDelay}</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <span>{content.withoutDetail}</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-emerald-500/10 p-4 rounded-lg">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                <Check className="h-5 w-5 flex-shrink-0" />
                WITH AOK
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>You miss your scheduled check-in</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{content.withAokDetail}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Timely support when it matters most</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Step9WhatMatters({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "peace-myself", label: "Peace of mind for myself", description: "Know someone will notice if I need help", icon: <Smile className="h-6 w-6" /> },
    { value: "peace-contact", label: `Peace of mind for ${formatContactNames(data.contacts, "my contacts")}`, description: "They won't have to worry from afar", icon: <Heart className="h-6 w-6" /> },
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
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-matters-title">What matters most to you?</h1>
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
  const [otherText, setOtherText] = useState(data.healthConditionsOther || "");
  
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

  const toggleOther = () => {
    const current = data.healthConditions;
    if (current.includes("other")) {
      setData({ ...data, healthConditions: current.filter(v => v !== "other"), healthConditionsOther: "" });
      setOtherText("");
    } else {
      setData({ ...data, healthConditions: [...current, "other"] });
    }
  };

  const handleOtherTextChange = (value: string) => {
    setOtherText(value);
    setData({ ...data, healthConditionsOther: value });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-health-title">Do any of these apply to you?</h1>
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
          
          {/* Other option */}
          <button
            onClick={toggleOther}
            className={`w-full p-4 rounded-lg border text-left transition-all ${
              data.healthConditions.includes("other") ? "border-primary bg-primary/5" : "border-border hover-elevate"
            }`}
            data-testid="option-health-other"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-primary"><MessageSquare className="h-6 w-6" /></div>
                <span className="font-medium">Other</span>
              </div>
              <Checkbox 
                checked={data.healthConditions.includes("other")}
                className="pointer-events-none"
              />
            </div>
          </button>
          
          {/* Other text input - shown when Other is selected */}
          {data.healthConditions.includes("other") && (
            <div className="pl-4 border-l-2 border-primary/30">
              <Input
                value={otherText}
                onChange={(e) => handleOtherTextChange(e.target.value)}
                placeholder="Please describe your situation..."
                className="mt-2"
                data-testid="input-health-other"
              />
            </div>
          )}
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
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-schedule-title">Now let's set up your check-in schedule</h1>
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
            <Sunset className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold">Evening check-ins available</div>
              <div className="text-sm text-muted-foreground">Flexible timing to suit your routine</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Step12Frequency({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const options = [
    { value: "daily", label: "Daily", recommended: true, icon: <Calendar className="h-6 w-6" />, intervalHours: 24 },
    { value: "twice-daily", label: "Twice a day", icon: <RefreshCw className="h-6 w-6" />, intervalHours: 12 },
    { value: "few-times-week", label: "A few times per week", icon: <Calendar className="h-6 w-6" />, intervalHours: 48 },
  ];

  const handleSelect = (option: typeof options[0]) => {
    setData({ 
      ...data, 
      checkInFrequency: option.value,
      intervalHours: option.intervalHours 
    });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" data-testid="text-frequency-title">How often should we check in?</h1>
        
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option)}
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

// Interval values matching settings page
const INTERVAL_VALUES = [
  0.0833, // 5 minutes (for testing)
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48
];

function hoursToIndex(hours: number): number {
  const idx = INTERVAL_VALUES.findIndex(v => Math.abs(v - hours) < 0.01);
  return idx >= 0 ? idx : 24; // Default to 24 hours if not found
}

function indexToHours(index: number): number {
  return INTERVAL_VALUES[Math.min(index, INTERVAL_VALUES.length - 1)];
}

function formatInterval(hours: number): string {
  if (hours < 0.1) return "5 mins";
  if (hours === 1) return "1 hour";
  if (hours < 24) return `${Math.round(hours)} hours`;
  if (hours === 24) return "1 day";
  if (hours === 48) return "2 days";
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) return `${days} days`;
  return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
}

// Generate time options for dropdown
const timeOptions = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return time;
});

function Step13Time({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const handleIntervalChange = (value: number[]) => {
    const hours = indexToHours(value[0]);
    setData({ ...data, intervalHours: hours });
  };

  const handleTimeChange = (time: string) => {
    setData({ ...data, scheduleStartTime: time, checkInTime: time });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold" data-testid="text-time-title">Check-In Interval</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          How long between check-ins before an alert is sent?
        </p>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-1">Schedule Start Time</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Set the time of day your check-in schedule starts from.
            </p>
            <select
              value={data.scheduleStartTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-testid="select-schedule-start-time"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">5 mins</span>
              <span className="text-lg font-semibold text-primary">
                {formatInterval(data.intervalHours)}
              </span>
              <span className="text-sm text-muted-foreground">48 hours</span>
            </div>
            <Slider
              value={[hoursToIndex(data.intervalHours)]}
              onValueChange={handleIntervalChange}
              min={0}
              max={INTERVAL_VALUES.length - 1}
              step={1}
              className="w-full"
              data-testid="slider-interval"
            />
          </div>
          
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              If you don't check in within {formatInterval(data.intervalHours)}, your emergency contacts will be notified.
            </p>
          </div>
          
          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
            <Settings className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              These settings can be adjusted anytime in the Settings page.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Step14ContactDetails({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  
  // Filter to only show contacts with names entered
  const contactsWithNames = data.contacts.filter(c => c.name.trim() !== "");
  const currentContact = contactsWithNames[currentContactIndex];
  
  if (!currentContact) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <p className="text-muted-foreground">No contacts to configure.</p>
        </CardContent>
      </Card>
    );
  }
  
  const updateCurrentContact = (field: keyof ContactData, value: string) => {
    const originalIndex = data.contacts.findIndex(c => c.name === currentContact.name);
    if (originalIndex === -1) return;
    
    const newContacts = [...data.contacts];
    newContacts[originalIndex] = { ...newContacts[originalIndex], [field]: value };
    
    // Also update legacy fields for the primary contact (first with name)
    if (currentContactIndex === 0) {
      setData({ 
        ...data, 
        contacts: newContacts,
        contactEmail: field === 'email' ? value : data.contactEmail,
        contactPhone: field === 'phone' ? value : data.contactPhone,
        contactPhoneCountry: field === 'phoneCountry' ? value : data.contactPhoneCountry,
        contactLandline: field === 'landline' ? value : data.contactLandline,
        contactLandlineCountry: field === 'landlineCountry' ? value : data.contactLandlineCountry,
      });
    } else {
      setData({ ...data, contacts: newContacts });
    }
  };
  
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-4 sm:p-6">
        {contactsWithNames.length > 1 && (
          <div className="flex gap-2 mb-4">
            {contactsWithNames.map((contact, idx) => (
              <Button
                key={idx}
                variant={currentContactIndex === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentContactIndex(idx)}
                data-testid={`button-tab-contact-${idx}`}
              >
                {contact.name || `Contact ${idx + 1}`}
              </Button>
            ))}
          </div>
        )}
        
        <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-contact-details-title">
          How can we reach {currentContact.name}?
        </h1>
        <p className="text-muted-foreground mb-6">
          We'll use these details to alert them in an emergency.
          {currentContactIndex === 0 && " This is your primary contact."}
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Their email address</label>
            <Input
              type="email"
              value={currentContact.email}
              onChange={(e) => updateCurrentContact('email', e.target.value)}
              placeholder="contact@example.com"
              data-testid="input-contact-email"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Their mobile number</label>
            <div className="flex gap-2">
              <select
                value={currentContact.phoneCountry}
                onChange={(e) => updateCurrentContact('phoneCountry', e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="select-phone-country"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <Input
                type="tel"
                value={currentContact.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d\s]/g, '');
                  updateCurrentContact('phone', value);
                }}
                onBlur={(e) => {
                  let value = e.target.value.replace(/[^\d\s]/g, '');
                  value = value.replace(/^0+/, '');
                  updateCurrentContact('phone', value);
                }}
                placeholder={currentContact.phoneCountry === "+44" ? "7700 900000" : "Phone number"}
                className="flex-1"
                data-testid="input-contact-phone"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For SMS alerts and voice calls. {currentContact.phoneCountry === "+44" ? "UK mobiles: 10 digits starting with 7" : ""}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Their landline number (optional)</label>
            <div className="flex gap-2">
              <select
                value={currentContact.landlineCountry}
                onChange={(e) => updateCurrentContact('landlineCountry', e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="select-landline-country"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <Input
                type="tel"
                value={currentContact.landline}
                onChange={(e) => {
                  let value = e.target.value.replace(/[^\d\s]/g, '');
                  value = value.replace(/^0+/, '');
                  updateCurrentContact('landline', value);
                }}
                placeholder={currentContact.landlineCountry === "+44" ? "20 7946 0958" : "Landline number"}
                className="flex-1"
                data-testid="input-contact-landline"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For voice call alerts
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 mt-6">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            {currentContactIndex === 0 
              ? "This is your primary contact who will receive all check-in notifications."
              : "Additional contacts will be alerted in emergencies."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Step15Plan({ data, setData }: { data: OnboardingData; setData: (d: OnboardingData) => void }) {
  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-plan-title">Give {formatContactNames(data.contacts, "your loved ones")} peace of mind</h1>
          <p className="text-muted-foreground mb-6">
            {formatContactNames(data.contacts, "They")} will be alerted if you ever need help.
          </p>
          
          <div className="p-4 border rounded-lg bg-muted/30 mb-6">
            <div className="font-semibold mb-3">Your protection plan includes:</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span data-testid="text-plan-feature-1">Daily check-in reminders</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span data-testid="text-plan-feature-2">Multi-channel alerts to {formatContactNames(data.contacts, "your contacts")}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span data-testid="text-plan-feature-3">GPS alert in an emergency</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => setData({ ...data, billingCycle: "monthly" })}
              className={`p-4 rounded-lg border text-center transition-all ${
                data.billingCycle === "monthly" ? "border-primary bg-primary/5" : "border-border hover-elevate"
              }`}
              data-testid="option-billing-monthly"
            >
              <div className="text-sm text-muted-foreground">Monthly</div>
              <div className="text-xl font-bold">£6.99<span className="text-sm font-normal">/mo</span></div>
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
              <div className="text-xl font-bold">£5.83<span className="text-sm font-normal">/mo</span></div>
              <div className="text-xs text-muted-foreground">billed £69.99/year</div>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-emerald-500 text-white rounded-xl p-6 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-1" data-testid="text-trial-title">Try free for 7 days</h2>
        <p className="text-emerald-100 mb-3">Cancel anytime</p>
        <p className="text-sm">
          You won't be charged until <strong>{getTrialEndDate()}</strong>
        </p>
        <p className="text-sm text-emerald-100">Then £6.99/month</p>
      </div>
    </div>
  );
}

function Step16Payment({ data, setData, onNext }: { data: OnboardingData; setData: (d: OnboardingData) => void; onNext: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [testCode, setTestCode] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const email = data.email; // Email already collected on page 1

  const handleStartTrial = async () => {
    // Check if promo code is entered - if valid, skip payment and go to terms
    if (testCode.trim()) {
      if (testCode.trim().toUpperCase() === "NG1") {
        // Store test mode flag in data and advance to Terms & Conditions
        const updatedData = { ...data, testMode: true };
        setData(updatedData);
        localStorage.setItem("onboardingData", JSON.stringify(updatedData));
        onNext(); // Advance to Terms & Conditions step
        return;
      } else {
        toast({
          title: "Invalid code",
          description: "The promotional code you entered is not valid",
          variant: "destructive",
        });
        return;
      }
    }
    
    // No promo code - proceed to Stripe checkout
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
        localStorage.setItem("onboardingData", JSON.stringify(data));
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

  return (
    <div className="space-y-4">
      <div className="bg-emerald-500 text-white rounded-xl p-6 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-1" data-testid="text-payment-trial-title">Try free for 7 days</h2>
        <p className="text-emerald-100 mb-3">Cancel anytime</p>
        <p className="text-sm">
          You won't be charged until <strong>{getTrialEndDate()}</strong>
        </p>
        <p className="text-sm text-emerald-100">Then £6.99/month</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            <div>
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
              disabled={isLoading}
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

            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-muted-foreground mb-2 text-center">Have a promotional code?</p>
              <Input
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="Enter code"
                className="text-center"
                data-testid="input-test-code"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-4 sm:p-6">
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
    </div>
  );
}

function getTrialEndDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
}
