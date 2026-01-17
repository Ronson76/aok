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

  const onSubmit = (data: InsertUser) => {
    registerMutation.mutate(data);
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" />
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
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your reference number" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-reference-number" 
                          />
                        </FormControl>
                        <FormDescription>
                          Your unique reference number provided by your organisation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
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

              {/* Location Permission Section */}
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
