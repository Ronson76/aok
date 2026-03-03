import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera, CheckCircle, User, Hash, Calendar, ArrowLeft,
  Loader2, RefreshCw, Shield, LogOut
} from "lucide-react";

type LookupMethod = "reference_code" | "name_dob";
type KioskStep = "identify" | "photo" | "confirm" | "success";

interface FoundClient {
  id: string;
  clientName: string | null;
  referenceCode: string | null;
  seatType: string;
  status: string;
}

export default function KioskPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<KioskStep>("identify");
  const [lookupMethod, setLookupMethod] = useState<LookupMethod>("reference_code");
  const [referenceCode, setReferenceCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [foundClient, setFoundClient] = useState<FoundClient | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lookupMutation = useMutation({
    mutationFn: async () => {
      const body: any = { method: lookupMethod };
      if (lookupMethod === "reference_code") {
        body.referenceCode = referenceCode;
      } else {
        body.clientName = clientName;
        body.dateOfBirth = dateOfBirth;
      }
      const response = await apiRequest("POST", "/api/kiosk/lookup", body);
      return response.json();
    },
    onSuccess: (data) => {
      setFoundClient(data.client);
      setStep("photo");
    },
    onError: (error: any) => {
      toast({
        title: "Client not found",
        description: error.message || "Please check the details and try again.",
        variant: "destructive",
      });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/kiosk/checkin", {
        orgClientId: foundClient!.id,
        lookupMethod,
        photoData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/clients"] });
      setStep("success");
      autoResetTimerRef.current = setTimeout(() => {
        resetKiosk();
      }, 8000);
    },
    onError: (error: any) => {
      toast({
        title: "Check-in failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError("Camera access denied. You can skip the photo and check in without one.");
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }
    const data = canvas.toDataURL("image/jpeg", 0.7);
    setPhotoData(data);
    stopCamera();
  }, [stopCamera]);

  const resetKiosk = useCallback(() => {
    if (autoResetTimerRef.current) {
      clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = null;
    }
    stopCamera();
    setStep("identify");
    setLookupMethod("reference_code");
    setReferenceCode("");
    setClientName("");
    setDateOfBirth("");
    setFoundClient(null);
    setPhotoData(null);
    setCameraError(null);
  }, [stopCamera]);

  useEffect(() => {
    if (step === "photo" && !photoData) {
      startCamera();
    }
    return () => {
      if (step !== "photo") {
        stopCamera();
      }
    };
  }, [step]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col" data-testid="kiosk-page">
      <div className="bg-slate-800/80 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AOK Kiosk Check-in</h1>
            <p className="text-xs text-slate-400">Physical attendance and wellbeing verification</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {step !== "identify" && step !== "success" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetKiosk}
              className="text-slate-400 hover:text-white"
              data-testid="button-kiosk-reset"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Start Over
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
              navigate("/org/login");
            }}
            className="text-slate-400 hover:text-white"
            data-testid="button-kiosk-exit"
          >
            <LogOut className="h-4 w-4 mr-1" /> Exit Kiosk
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 flex items-center justify-center p-6">
          {step === "identify" && (
            <Card className="w-full max-w-lg bg-slate-800 border-slate-700 text-white">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <User className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <h2 className="text-2xl font-bold" data-testid="text-kiosk-title">Who are you?</h2>
                  <p className="text-slate-400 mt-1">Identify yourself to check in</p>
                </div>

                <div className="flex gap-2 mb-6">
                  <Button
                    variant={lookupMethod === "reference_code" ? "default" : "outline"}
                    className={`flex-1 ${lookupMethod !== "reference_code" ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}`}
                    onClick={() => setLookupMethod("reference_code")}
                    data-testid="button-method-reference"
                  >
                    <Hash className="h-4 w-4 mr-2" /> Reference Code
                  </Button>
                  <Button
                    variant={lookupMethod === "name_dob" ? "default" : "outline"}
                    className={`flex-1 ${lookupMethod !== "name_dob" ? "border-slate-600 text-slate-300 hover:bg-slate-700" : ""}`}
                    onClick={() => setLookupMethod("name_dob")}
                    data-testid="button-method-name-dob"
                  >
                    <Calendar className="h-4 w-4 mr-2" /> Name & DOB
                  </Button>
                </div>

                {lookupMethod === "reference_code" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="refCode" className="text-slate-300 text-base">Your Reference Code</Label>
                      <Input
                        id="refCode"
                        value={referenceCode}
                        onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
                        placeholder="e.g. AB12CD34"
                        className="bg-slate-700 border-slate-600 text-white text-center text-2xl font-mono tracking-wider h-14 placeholder:text-slate-500"
                        maxLength={8}
                        data-testid="input-kiosk-reference"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && referenceCode.length >= 4) {
                            lookupMutation.mutate();
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="kioskName" className="text-slate-300 text-base">Full Name</Label>
                      <Input
                        id="kioskName"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Enter your full name"
                        className="bg-slate-700 border-slate-600 text-white h-12 placeholder:text-slate-500"
                        data-testid="input-kiosk-name"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kioskDOB" className="text-slate-300 text-base">Date of Birth</Label>
                      <Input
                        id="kioskDOB"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white h-12"
                        data-testid="input-kiosk-dob"
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                )}

                <Button
                  className="w-full mt-6 h-14 text-lg"
                  onClick={() => lookupMutation.mutate()}
                  disabled={
                    lookupMutation.isPending ||
                    (lookupMethod === "reference_code" && referenceCode.length < 4) ||
                    (lookupMethod === "name_dob" && (!clientName || !dateOfBirth))
                  }
                  data-testid="button-kiosk-find"
                >
                  {lookupMutation.isPending ? (
                    <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Looking up...</>
                  ) : (
                    "Find Me"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "photo" && foundClient && (
            <Card className="w-full max-w-lg bg-slate-800 border-slate-700 text-white">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold" data-testid="text-client-found">
                    Hello, {foundClient.clientName}
                  </h2>
                  <p className="text-slate-400 mt-1">
                    {photoData ? "Photo captured - ready to check in" : "Take a quick photo to verify it's you"}
                  </p>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] mb-6">
                  {!photoData && cameraActive && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: "scaleX(-1)" }}
                      data-testid="video-camera"
                    />
                  )}
                  {photoData && (
                    <img
                      src={photoData}
                      alt="Check-in photo"
                      className="w-full h-full object-cover"
                      data-testid="img-photo-preview"
                    />
                  )}
                  {!photoData && !cameraActive && !cameraError && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  )}
                  {cameraError && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                      <Camera className="h-10 w-10 text-slate-500 mb-3" />
                      <p className="text-sm text-slate-400">{cameraError}</p>
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="flex gap-3">
                  {!photoData && cameraActive && (
                    <Button
                      className="flex-1 h-14 text-lg"
                      onClick={capturePhoto}
                      data-testid="button-capture-photo"
                    >
                      <Camera className="h-5 w-5 mr-2" /> Take Photo
                    </Button>
                  )}
                  {photoData && (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 h-14 border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={() => {
                          setPhotoData(null);
                          startCamera();
                        }}
                        data-testid="button-retake-photo"
                      >
                        <RefreshCw className="h-5 w-5 mr-2" /> Retake
                      </Button>
                      <Button
                        className="flex-1 h-14 text-lg"
                        onClick={() => setStep("confirm")}
                        data-testid="button-use-photo"
                      >
                        <CheckCircle className="h-5 w-5 mr-2" /> Use Photo
                      </Button>
                    </>
                  )}
                  {(cameraError || (!cameraActive && !photoData)) && (
                    <Button
                      className="flex-1 h-14 text-lg"
                      onClick={() => {
                        setPhotoData(null);
                        setStep("confirm");
                      }}
                      data-testid="button-skip-photo"
                    >
                      Skip Photo & Check In
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === "confirm" && foundClient && (
            <Card className="w-full max-w-lg bg-slate-800 border-slate-700 text-white">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <h2 className="text-2xl font-bold" data-testid="text-confirm-title">Confirm Check-in</h2>
                </div>

                <div className="bg-slate-700/50 rounded-xl p-6 mb-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Name</span>
                    <span className="font-medium" data-testid="text-confirm-name">{foundClient.clientName}</span>
                  </div>
                  {foundClient.referenceCode && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Reference</span>
                      <span className="font-mono" data-testid="text-confirm-ref">{foundClient.referenceCode}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Photo</span>
                    <Badge variant={photoData ? "default" : "outline"} className={!photoData ? "border-slate-500 text-slate-400" : ""}>
                      {photoData ? "Captured" : "Skipped"}
                    </Badge>
                  </div>
                </div>

                {photoData && (
                  <div className="rounded-xl overflow-hidden mb-6 aspect-[4/3]">
                    <img src={photoData} alt="Check-in photo" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-14 border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => {
                      setStep("photo");
                      setPhotoData(null);
                    }}
                    data-testid="button-back-to-photo"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" /> Back
                  </Button>
                  <Button
                    className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
                    onClick={() => checkinMutation.mutate()}
                    disabled={checkinMutation.isPending}
                    data-testid="button-confirm-checkin"
                  >
                    {checkinMutation.isPending ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Checking in...</>
                    ) : (
                      "Check In Now"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "success" && (
            <Card className="w-full max-w-lg bg-slate-800 border-slate-700 text-white">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold mb-2" data-testid="text-success-title">You're Checked In</h2>
                <p className="text-slate-400 text-lg mb-2">
                  {foundClient?.clientName}, your check-in has been recorded.
                </p>
                <p className="text-slate-500 text-sm mb-8">
                  This screen will reset automatically in a few seconds.
                </p>
                <Button
                  className="h-14 px-8 text-lg"
                  onClick={resetKiosk}
                  data-testid="button-next-person"
                >
                  Next Person
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
