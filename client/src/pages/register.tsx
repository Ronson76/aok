import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PasswordInput } from "@/components/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, User, Building2, MapPin, AlertTriangle, Info } from "lucide-react";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [fromOnboarding, setFromOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  // Check if coming from onboarding and load data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const onboarded = urlParams.get('onboarded') === 'true';
    const emailFromUrl = urlParams.get('email');
    const storedData = localStorage.getItem("onboardingData");
    
    if (onboarded && storedData) {
      try {
        const data = JSON.parse(storedData);
        // Use email from URL if available (from Stripe redirect), otherwise use stored email
        if (emailFromUrl) {
          data.email = emailFromUrl;
          // Update localStorage with the email from URL
          localStorage.setItem("onboardingData", JSON.stringify(data));
        }
        setOnboardingData(data);
        setFromOnboarding(true);
      } catch (e) {
        console.log("Failed to parse onboarding data");
      }
    }
  }, []);

  // Detect if running as installed PWA (mobile app)
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true
      || document.referrer.includes('android-app://');
    setIsPWA(isStandalone);
  }, []);

  // Check location permission status on mount
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationPermission('unavailable');
      return;
    }

    // Check if permission is already granted
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          setLocationPermission('granted');
        } else if (result.state === 'denied') {
          setLocationPermission('denied');
        } else {
          setLocationPermission('pending');
        }
        
        // Listen for changes
        result.onchange = () => {
          if (result.state === 'granted') {
            setLocationPermission('granted');
          } else if (result.state === 'denied') {
            setLocationPermission('denied');
          }
        };
      }).catch(() => {
        // Fallback - will request on button click
        setLocationPermission('pending');
      });
    }
  }, []);

  const requestLocationPermission = () => {
    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationPermission('granted');
        setRequestingLocation(false);
        toast({
          title: "Location Access Granted",
          description: "Your location will be shared with contacts during emergencies.",
        });
      },
      (error) => {
        setRequestingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission('denied');
          toast({
            title: "Location Access Required",
            description: "Please enable location access in your browser settings to continue.",
            variant: "destructive",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      accountType: "individual",
      name: "",
      email: "",
      referenceId: "",
      dateOfBirth: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  const accountType = form.watch("accountType");
  const referenceId = form.watch("referenceId");
  
  // Pre-fill form from onboarding data
  useEffect(() => {
    if (onboardingData) {
      form.setValue("name", onboardingData.name || "");
      form.setValue("email", onboardingData.email || "");
      // Pre-fill password if collected during onboarding
      if (onboardingData.password) {
        form.setValue("password", onboardingData.password);
        form.setValue("confirmPassword", onboardingData.password);
      }
      // Pre-fill mobile number from onboarding (stored as userPhone)
      if (onboardingData.userPhone) {
        const countryCode = onboardingData.userPhoneCountry || "+44";
        form.setValue("mobileNumber", countryCode + onboardingData.userPhone);
      }
    }
  }, [onboardingData, form]);
  
  // Allow all users to register regardless of location permission
  // Location can be enabled later in settings if needed
  const canSubmit = true;

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      // Include termsAcceptedAt from onboarding data if available
      const onboardingDataStr = localStorage.getItem("onboardingData");
      let termsAcceptedAt = null;
      if (onboardingDataStr) {
        const onboardingData = JSON.parse(onboardingDataStr);
        termsAcceptedAt = onboardingData.termsAcceptedAt;
      }
      
      const res = await apiRequest("POST", "/api/auth/register", {
        ...data,
        termsAcceptedAt,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to register");
      }
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Apply onboarding settings if available
      const onboardingDataStr = localStorage.getItem("onboardingData");
      if (onboardingDataStr) {
        try {
          const onboardingData = JSON.parse(onboardingDataStr);
          
          // Convert frequency to interval hours
          const frequencyToHours: Record<string, number> = {
            "daily": 24,
            "twice-daily": 12,
            "few-times-week": 48,
            "weekly": 168,
          };
          
          // Use scheduleStartTime from onboarding if available, otherwise fall back to checkInTime mapping
          const timeToSchedule: Record<string, string> = {
            "morning": "10:00",
            "midday": "12:00",
            "evening": "18:00",
          };
          
          // Use intervalHours directly from onboarding slider, or fall back to frequency mapping
          const intervalHours = onboardingData.intervalHours || frequencyToHours[onboardingData.checkInFrequency] || 24;
          const scheduleTime = onboardingData.scheduleStartTime || timeToSchedule[onboardingData.checkInTime] || "10:00";
          
          // Calculate next check-in due based on schedule time from step 12
          const now = new Date();
          const [hours, minutes] = scheduleTime.split(":").map(Number);
          const scheduleDate = new Date();
          scheduleDate.setHours(hours, minutes, 0, 0);
          
          // If time has passed today, set for tomorrow
          if (scheduleDate <= now) {
            scheduleDate.setDate(scheduleDate.getDate() + 1);
          }
          
          // Next check-in due is based on the scheduled time from step 12
          const nextDue = scheduleDate;
          
          // Apply settings (set both scheduleStartTime for future reference and nextCheckInDue for timer)
          const settingsUpdate: any = { 
            intervalHours,
            nextCheckInDue: nextDue.toISOString(),
            lastCheckIn: now.toISOString(), // Mark registration date (no time shown)
          };
          if (onboardingData.scheduleEnabled !== false) {
            settingsUpdate.scheduleStartTime = scheduleDate.toISOString();
          }
          
          // Save living situation from onboarding
          if (onboardingData.livingSituation) {
            settingsUpdate.livingSituation = onboardingData.livingSituation;
          }
          
          // Compile additional info based on living situation
          const additionalInfoData: any = {};
          
          // Pets info
          if (onboardingData.pets && onboardingData.pets.length > 0) {
            const petsWithData = onboardingData.pets.filter((p: any) => p.name || p.type);
            if (petsWithData.length > 0) {
              additionalInfoData.pets = petsWithData;
            }
          }
          
          // Children info
          if (onboardingData.childrenData && (onboardingData.childrenData.numberOfChildren || onboardingData.childrenData.agesDescription)) {
            additionalInfoData.children = onboardingData.childrenData;
          }
          
          // Partner travel info
          if (onboardingData.partnerTravelData && (onboardingData.partnerTravelData.typicalDestinations || onboardingData.partnerTravelData.address)) {
            additionalInfoData.partnerTravel = onboardingData.partnerTravelData;
          }
          
          // Rural area info
          if (onboardingData.ruralData && (onboardingData.ruralData.accessInstructions || onboardingData.ruralData.gateCode)) {
            additionalInfoData.rural = onboardingData.ruralData;
          }
          
          // Solo travel info
          if (onboardingData.soloTravelData && (onboardingData.soloTravelData.typicalDestinations || onboardingData.soloTravelData.localAddress)) {
            additionalInfoData.soloTravel = onboardingData.soloTravelData;
          }
          
          // Lone worker info
          if (onboardingData.loneWorkerData && (onboardingData.loneWorkerData.companyName || onboardingData.loneWorkerData.supervisorName)) {
            additionalInfoData.loneWorker = onboardingData.loneWorkerData;
          }
          
          // Health conditions info
          if (onboardingData.healthConditions && onboardingData.healthConditions.length > 0) {
            additionalInfoData.healthConditions = {
              conditions: onboardingData.healthConditions,
              other: onboardingData.healthConditionsOther || ""
            };
          }
          
          // Save additional info if any data was collected
          if (Object.keys(additionalInfoData).length > 0) {
            settingsUpdate.additionalInfo = JSON.stringify(additionalInfoData);
          }
          
          await apiRequest("PATCH", "/api/settings", settingsUpdate);
          
          // Create contacts from onboarding data (from the contacts array)
          if (onboardingData.contacts && Array.isArray(onboardingData.contacts)) {
            const validContacts = onboardingData.contacts.filter((c: any) => 
              c.name?.trim() && c.email?.trim()
            );
            
            for (let i = 0; i < validContacts.length; i++) {
              const contact = validContacts[i];
              try {
                // Format phone number with country code if provided
                let formattedPhone = "";
                if (contact.phone?.trim()) {
                  const phoneCountry = contact.phoneCountry || "+44";
                  const cleanPhone = contact.phone.replace(/^0+/, ""); // Remove leading zeros
                  formattedPhone = `${phoneCountry}${cleanPhone}`;
                }
                
                await apiRequest("POST", "/api/contacts", {
                  name: contact.name.trim(),
                  email: contact.email.trim(),
                  phone: formattedPhone || undefined,
                  phoneType: contact.landline?.trim() ? "landline" : "mobile",
                  relationship: "Emergency Contact",
                });
                console.log(`Contact ${i + 1} created from onboarding:`, contact.name);
              } catch (contactError) {
                console.log(`Failed to create contact ${i + 1}:`, contactError);
              }
            }
          }
          
          // Enable tracking if location was granted during onboarding
          if (onboardingData.locationPermission === "granted") {
            try {
              await apiRequest("PATCH", "/api/settings", { trackingEnabled: true });
              console.log("Tracking enabled from location permission");
            } catch (trackingError) {
              console.log("Failed to enable tracking:", trackingError);
            }
          }
          
          // Clear onboarding data
          localStorage.removeItem("onboardingData");
        } catch (e) {
          console.log("Failed to apply onboarding settings:", e);
        }
      }
      
      // Request notification permission on signup
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.log('Notification permission request failed');
        }
      }
      
      toast({
        title: "Account Created",
        description: "Welcome to aok! Your account has been created successfully.",
      });
      setLocation("/app");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Org client activation - just reference code
  const activateMutation = useMutation({
    mutationFn: async (referenceCode: string) => {
      const res = await apiRequest("POST", "/api/activate", {
        referenceCode: referenceCode.toUpperCase(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Activation failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Welcome to aok",
        description: "You're now signed in.",
      });
      setLocation("/app");
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid code",
        description: error.message || "Please check your reference code and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertUser) => {
    registerMutation.mutate(data);
  };

  const handleOrgActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (referenceId && referenceId.length === 6) {
      activateMutation.mutate(referenceId);
    } else {
      toast({
        title: "Invalid code",
        description: "Please enter your 6-character reference code.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <Link href="/" className="flex flex-col items-center justify-center mb-2 cursor-pointer" data-testid="link-logo-home">
            <ShieldCheck className="h-12 w-12 text-green-600" />
            <span className="text-lg font-semibold text-green-600">aok</span>
          </Link>
          <CardTitle className="text-2xl">
            {fromOnboarding ? "Registration Complete" : "Create Your Account"}
          </CardTitle>
          <CardDescription>
            {fromOnboarding 
              ? "Please check and confirm your details below."
              : "Sign up for aok to stay connected with your loved ones. You must be 16 years or older to use this service."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!fromOnboarding && (
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Account Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                        data-testid="radio-account-type"
                      >
                        <label
                          className={`flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer transition-colors ${
                            field.value === "individual"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover-elevate"
                          }`}
                        >
                          <RadioGroupItem value="individual" className="sr-only" />
                          <User className="h-6 w-6 mb-2" />
                          <span className="text-sm font-medium">Individual</span>
                          <span className="text-xs text-muted-foreground text-center mt-1">
                            Lone worker or traveller
                          </span>
                        </label>
                        <label
                          className={`flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer transition-colors ${
                            field.value === "organization"
                              ? "border-primary bg-primary/5"
                              : "border-muted hover-elevate"
                          }`}
                        >
                          <RadioGroupItem value="organization" className="sr-only" />
                          <Building2 className="h-6 w-6 mb-2" />
                          <span className="text-sm font-medium">Organisation</span>
                          <span className="text-xs text-muted-foreground text-center mt-1">
                            On behalf of vulnerable person
                          </span>
                        </label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              )}

              {!fromOnboarding && accountType === "organization" ? (
                <>
                  <FormField
                    control={form.control}
                    name="referenceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ABC123" 
                            {...field} 
                            value={(field.value || "").toUpperCase()}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="text-center text-2xl font-mono tracking-widest uppercase"
                            data-testid="input-reference-code" 
                          />
                        </FormControl>
                        <FormDescription className="text-center">
                          The 6-character code sent to your phone
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Email field for organization clients - they need an email for their account */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="your.email@example.com" 
                            {...field} 
                            data-testid="input-email-org" 
                          />
                        </FormControl>
                        <FormDescription>
                          We'll send check-in confirmations to this email
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Location Permission for Org Clients */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4" />
                      Location Access (Required)
                    </div>
                    
                    {locationPermission === 'granted' ? (
                      <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700 dark:text-green-400">
                          Location access granted. Your location will be shared during emergencies.
                        </AlertDescription>
                      </Alert>
                    ) : locationPermission === 'denied' ? (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Location access was declined. You can still continue - location can be enabled later in Settings if needed.
                        </AlertDescription>
                      </Alert>
                    ) : locationPermission === 'unavailable' ? (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Location is not available on this device. You can still continue - this feature is optional.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          aok needs your location to share with emergency contacts if you need help.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={requestLocationPermission}
                          disabled={requestingLocation}
                          data-testid="button-grant-location-org"
                        >
                          {requestingLocation ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Requesting access...
                            </>
                          ) : (
                            <>
                              <MapPin className="mr-2 h-4 w-4" />
                              Grant Location Access
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    onClick={handleOrgActivation}
                    disabled={!referenceId || referenceId.length !== 6 || activateMutation.isPending}
                    data-testid="button-org-continue"
                  >
                    {activateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </>
              ) : fromOnboarding ? (
                <>
                  {/* Simplified form for users coming from onboarding */}
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">Your details</div>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm text-muted-foreground">Name</span>
                        <span className="text-sm font-medium" data-testid="text-onboarding-name">{onboardingData?.name || "—"}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="text-sm font-medium break-all" data-testid="text-onboarding-email">{onboardingData?.email || "—"}</span>
                      </div>
                      {onboardingData?.contacts && onboardingData.contacts.filter((c: any) => c.name?.trim()).length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-sm text-muted-foreground">
                            {onboardingData.contacts.filter((c: any) => c.name?.trim()).length > 1 ? "Emergency Contacts" : "Emergency Contact"}
                          </span>
                          <span className="text-sm font-medium text-right">
                            {onboardingData.contacts
                              .filter((c: any) => c.name?.trim())
                              .map((c: any) => c.name.trim())
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      {onboardingData?.scheduleStartTime && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-sm text-muted-foreground">Check-in starts</span>
                          <span className="text-sm font-medium" data-testid="text-schedule-time">
                            {(() => {
                              const [hours, minutes] = onboardingData.scheduleStartTime.split(':');
                              const hour = parseInt(hours, 10);
                              const ampm = hour >= 12 ? 'pm' : 'am';
                              const hour12 = hour % 12 || 12;
                              return `${hour12}:${minutes}${ampm}`;
                            })()}
                          </span>
                        </div>
                      )}
                      {onboardingData?.intervalHours && (
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span className="text-sm text-muted-foreground">Check-in frequency</span>
                          <span className="text-sm font-medium" data-testid="text-check-in-frequency">
                            Every {onboardingData.intervalHours} {onboardingData.intervalHours === 1 ? 'hour' : 'hours'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hidden fields to ensure form validation passes */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <input type="hidden" {...field} />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <input type="hidden" {...field} />
                    )}
                  />
                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} data-testid="input-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="your.email@example.com" 
                            {...field} 
                            data-testid="input-email" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="+44 7700 900000" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-mobile" 
                          />
                        </FormControl>
                        <FormDescription>
                          We'll use this to contact you if needed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-dob" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {accountType !== "organization" && !fromOnboarding && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Password</h3>

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="At least 6 characters" {...field} data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="Re-enter your password" {...field} data-testid="input-confirm-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Location Permission Section - only for individual accounts, not from onboarding */}
              {accountType !== "organization" && !fromOnboarding && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4" />
                  Location Access {isPWA ? "(Required)" : "(Optional)"}
                </div>
                
                {locationPermission === 'granted' ? (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-400">
                      Location access granted. Your location will be shared with emergency contacts when needed.
                    </AlertDescription>
                  </Alert>
                ) : locationPermission === 'denied' ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Location access was declined. You can still continue - location can be enabled later in Settings if needed.
                    </AlertDescription>
                  </Alert>
                ) : locationPermission === 'unavailable' ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Location is not available on this device. You can still continue - this feature is optional.
                    </AlertDescription>
                  </Alert>
                ) : isPWA ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      aok needs your location to share with emergency contacts if you need help. This is required for the mobile app.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={requestLocationPermission}
                      disabled={requestingLocation}
                      data-testid="button-grant-location"
                    >
                      {requestingLocation ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Requesting access...
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-4 w-4" />
                          Grant Location Access
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Location sharing is optional when using the web browser. You can grant access now or later in settings.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={requestLocationPermission}
                      disabled={requestingLocation}
                      data-testid="button-grant-location"
                    >
                      {requestingLocation ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Requesting access...
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-4 w-4" />
                          Grant Location Access (Optional)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              )}

              {accountType !== "organization" && (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending || !canSubmit}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {fromOnboarding ? "Confirming..." : "Creating account..."}
                    </>
                  ) : !canSubmit ? (
                    "Grant Location Access to Continue"
                  ) : fromOnboarding ? (
                    "Confirm"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              )}
            </form>
          </Form>

          {!fromOnboarding && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                Sign in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
