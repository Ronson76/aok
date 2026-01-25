import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface TermsModalProps {
  open: boolean;
}

export function TermsModal({ open }: TermsModalProps) {
  const [agreed, setAgreed] = useState(false);
  const queryClient = useQueryClient();

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/accept-terms");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const handleAccept = () => {
    if (agreed) {
      acceptTermsMutation.mutate();
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please read and accept the terms and conditions to continue using aok.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-base mb-2">1. About aok</h3>
              <p className="text-muted-foreground mb-2">
                aok is a voluntary wellbeing and emergency support application designed to allow users to send alerts, notifications, and optional location information to contacts designated by the user.
              </p>
              <p className="text-muted-foreground mb-2">
                aok is intended as a secondary support tool only.
              </p>
              <p className="text-muted-foreground">aok:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>is not an emergency service</li>
                <li>is not a medical, safeguarding, monitoring, rescue, or response service</li>
                <li>does not guarantee assistance, response, intervention, or safety</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                aok does not replace personal judgement, human responsibility, or emergency services.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. Eligibility and Use</h3>
              <p className="text-muted-foreground mb-2">By downloading, accessing, or using aok, you confirm that:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>you are 16 years of age or older</li>
                <li>you understand these Terms & Conditions</li>
                <li>you agree to be bound by them</li>
                <li>you are responsible for your use of the app</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                If you are under 16 years of age, you must not use the app. If you do not agree to these terms, you must not use the app.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. User-Provided Information and Emergency Contacts</h3>
              <p className="text-muted-foreground mb-2">You acknowledge and agree that:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>All emergency contacts, phone numbers, email addresses, and notification recipients are provided, managed, and maintained solely by you</li>
                <li>You are entirely responsible for ensuring that all contact details are accurate, current, and correctly formatted</li>
                <li>aok does not verify, validate, or confirm the accuracy, availability, or responsiveness of any contact you provide</li>
                <li>If alerts or notifications fail due to incorrect, incomplete, or outdated information, aok accepts no responsibility or liability</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Emergency Alerts - Contacts Only</h3>
              <p className="text-muted-foreground mb-2 font-medium">aok does not alert emergency services.</p>
              <p className="text-muted-foreground mb-2">By using aok, you expressly acknowledge and agree that:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>All emergency alerts, notifications, and communications generated by aok are sent only to the emergency contacts you designate within the app</li>
                <li>aok does not contact, notify, communicate with, or dispatch: police, ambulance services, fire services, coastguard, medical responders, government authorities, or emergency services of any country, state, territory, or jurisdiction</li>
                <li>aok has no capability or functionality to contact emergency services on your behalf</li>
                <li>Activating an emergency alert does not result in any emergency response, monitoring, intervention, or dispatch by public authorities</li>
              </ul>
              <p className="text-muted-foreground mt-2 font-medium">
                If you require immediate assistance, you must contact local emergency services directly using the appropriate emergency number for your location.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Emergency Location Sharing (Optional Feature)</h3>
              <p className="text-muted-foreground mb-2">Emergency location sharing is optional, off by default, and activated only by the user.</p>
              <p className="text-muted-foreground mb-2">By enabling and using emergency location sharing, you expressly agree that:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>Your location may be shared with your designated emergency contacts during an active emergency alert</li>
                <li>Location updates may be sent at regular intervals, including approximately every five (5) minutes</li>
                <li>Location data depends on device, network, and GPS availability and may be delayed, inaccurate, or incomplete</li>
              </ul>
              <p className="text-muted-foreground mt-2">You acknowledge and agree that:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>Location sharing is informational only</li>
                <li>It does not guarantee safety, assistance, or intervention</li>
                <li>aok does not track users outside of user-initiated emergency activation</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Technology Limitations and Service Availability</h3>
              <p className="text-muted-foreground mb-2">You understand and accept that aok relies on technology that may fail, be delayed, or be unavailable, including but not limited to:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>telecommunications networks</li>
                <li>internet connectivity</li>
                <li>GPS and location services</li>
                <li>device hardware or software</li>
                <li>operating system or platform restrictions</li>
                <li>third-party messaging, email, or notification services</li>
              </ul>
              <p className="text-muted-foreground mt-2">aok shall not be responsible for any failure, delay, interruption, or loss of communication caused by network outages, loss of signal, device malfunction, software errors, or third-party service disruptions.</p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. No Assumption of Responsibility for Safety or Wellbeing</h3>
              <p className="text-muted-foreground mb-2">You expressly acknowledge and agree that:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>aok is not responsible for your personal safety, health, or wellbeing</li>
                <li>aok does not remove the human element of responsibility</li>
                <li>You remain fully responsible for your actions, your personal safety, taking all reasonable and sensible steps to protect yourself, and contacting emergency services when required</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                aok does not prevent harm, guarantee outcomes, or replace personal judgement.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">8. Use by Organisations</h3>
              <p className="text-muted-foreground mb-2">Where aok is used by an organisation:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>Responsibility for use rests with the organisation and its users</li>
                <li>aok does not assume safeguarding, supervisory, or duty-of-care responsibilities unless expressly agreed in writing</li>
                <li>Organisations are responsible for defining and managing their own internal response procedures</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">9. Limitation of Liability</h3>
              <p className="text-muted-foreground mb-2">To the fullest extent permitted by law:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>aok shall not be liable for any loss, damage, injury, or harm arising from reliance on alerts, notifications, or location sharing, failure or delay of alerts or notifications, or misuse, misunderstanding, or misinterpretation of the app</li>
                <li>Use of aok is entirely at your own risk</li>
                <li>Nothing in these Terms limits liability where such limitation is prohibited by law</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">10. User Acknowledgement</h3>
              <p className="text-muted-foreground mb-2">By using aok, you confirm that you:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-1">
                <li>understand that emergency alerts notify only your designated emergency contacts</li>
                <li>understand that aok never contacts emergency services</li>
                <li>understand the limitations of technology</li>
                <li>accept full responsibility for your own wellbeing and safety</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-4 sm:flex-col flex-shrink-0 pt-4 border-t">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              data-testid="checkbox-terms-agree"
            />
            <Label 
              htmlFor="terms-agree" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              I have read, understood, and agree to be bound by these Terms & Conditions. I understand that aok is not an emergency service and does not contact emergency services on my behalf.
            </Label>
          </div>
          <Button
            onClick={handleAccept}
            disabled={!agreed || acceptTermsMutation.isPending}
            className="w-full"
            data-testid="button-accept-terms"
          >
            {acceptTermsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              "I Agree"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
