import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, UserCheck, UserX } from "lucide-react";

export default function ConfirmContact() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "declined" | "error">("pending");
  const [message, setMessage] = useState("");
  
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const handleConfirmation = async (action: "accept" | "decline") => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid confirmation link.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch(`/api/contacts/confirm?token=${token}&action=${action}`);
      const html = await response.text();
      
      if (response.ok) {
        if (action === "accept") {
          setStatus("success");
          setMessage("Thank you! You are now an emergency contact. You will receive notifications if the person misses a check-in.");
        } else {
          setStatus("declined");
          setMessage("You have declined to be an emergency contact. The request has been removed.");
        }
      } else if (response.status === 410) {
        setStatus("error");
        setMessage("This confirmation link has expired. Please ask to be added again.");
      } else if (response.status === 404) {
        setStatus("error");
        setMessage("This confirmation link has expired or is invalid.");
      } else {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-5">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
            <p className="text-muted-foreground">Invalid confirmation link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-5">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">aok</h1>
          
          {status === "pending" && (
            <>
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-6 mt-6">
                <UserCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Emergency Contact Request</h2>
              <p className="text-muted-foreground mb-8">
                Someone wants to add you as their emergency contact. You will receive alerts if they miss a safety check-in.
              </p>
              <div className="flex flex-col gap-4">
                <Button 
                  size="lg" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleConfirmation("accept")}
                  data-testid="button-accept-contact"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Accept
                </Button>
                <Button 
                  size="lg" 
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleConfirmation("decline")}
                  data-testid="button-decline-contact"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Decline
                </Button>
              </div>
            </>
          )}

          {status === "loading" && (
            <>
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-6 mt-6">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Processing...</h2>
              <p className="text-muted-foreground">Please wait while we confirm your response.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6 mt-6">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Success</h2>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "declined" && (
            <>
              <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-6 mt-6">
                <UserX className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Request Declined</h2>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6 mt-6">
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Error</h2>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
