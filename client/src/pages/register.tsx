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
import { ShieldCheck, Loader2, User, Building2, MapPin, AlertTriangle } from "lucide-react";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

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
      addressLine1: "",
      addressLine2: "",
      city: "",
      postalCode: "",
      country: "",
      password: "",
      confirmPassword: "",
    },
  });

  const accountType = form.watch("accountType");
  const referenceId = form.watch("referenceId");
  
  // For PWA (mobile app): require location permission (granted or unavailable)
  // For web browser: allow signup without location (always true)
  const canSubmit = isPWA 
    ? (locationPermission === 'granted' || locationPermission === 'unavailable')
    : true; // Web browsers can sign up without location

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to register");
      }
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
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
          <div className="flex flex-col items-center justify-center mb-2">
            <ShieldCheck className="h-12 w-12 text-primary" />
            <span className="text-lg font-semibold text-primary">aok</span>
          </div>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Sign up for aok to stay connected with your loved ones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

              {accountType === "organization" ? (
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
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Location access was denied. Please enable it in your device settings to use aok.
                        </AlertDescription>
                      </Alert>
                    ) : locationPermission === 'unavailable' ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Location services are not available on this device.
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
                    disabled={!referenceId || referenceId.length !== 6 || activateMutation.isPending || (locationPermission !== 'granted' && locationPermission !== 'unavailable')}
                    data-testid="button-org-continue"
                  >
                    {activateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : locationPermission !== 'granted' && locationPermission !== 'unavailable' ? (
                      "Grant Location Access to Continue"
                    ) : (
                      "Continue"
                    )}
                  </Button>
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

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-medium text-sm text-muted-foreground">Address</h3>
                    <p className="text-xs text-muted-foreground">Your address is shared with emergency contacts when alerts are sent.</p>
                    
                    <FormField
                      control={form.control}
                      name="addressLine1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 1</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123 High Street" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-address1" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="addressLine2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address Line 2 (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Flat 4" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-address2" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="London" 
                                {...field} 
                                value={field.value || ""}
                                data-testid="input-city" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postcode</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="SW1A 1AA" 
                                {...field} 
                                value={field.value || ""}
                                data-testid="input-postcode" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}

              {accountType !== "organization" && (
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

              {/* Location Permission Section - only for individual accounts */}
              {accountType !== "organization" && (
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
                  <Alert variant={isPWA ? "destructive" : "default"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {isPWA 
                        ? "Location access was denied. Please enable it in your device settings to use aok. This is required for the mobile app."
                        : "Location access was denied. You can still sign up, but emergency alerts will be sent without your location."
                      }
                    </AlertDescription>
                  </Alert>
                ) : locationPermission === 'unavailable' ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Location services are not available on this device. Emergency alerts will be sent without location data.
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
                      Creating account...
                    </>
                  ) : !canSubmit ? (
                    "Grant Location Access to Continue"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              )}
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
