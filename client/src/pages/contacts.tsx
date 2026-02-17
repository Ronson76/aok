import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, Trash2, Users, Loader2, UserPlus, Star, Smartphone, PhoneCall, ShieldAlert, Pencil, Clock, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useAuth } from "@/contexts/auth-context";
import type { Contact, InsertContact } from "@shared/schema";
import { insertContactSchema } from "@shared/schema";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

const countryCodes = [
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+1", country: "US/CA", flag: "🇺🇸" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
];

function isValidInternationalPhone(phone: string): boolean {
  if (!phone || phone.trim() === "") return true;
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return /^\+\d{7,15}$/.test(cleaned);
}

export default function Contacts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeletePasswordDialog, setShowDeletePasswordDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState("+44");
  const [editSelectedCountryCode, setEditSelectedCountryCode] = useState("+44");
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  
  const isOrganization = user?.accountType === "organization";
  
  // Check if user is an org client (contacts managed by organisation)
  const { data: features } = useQuery<{
    isOrgClient: boolean;
  }>({
    queryKey: ["/api/features"],
  });
  
  const isOrgClient = features?.isOrgClient ?? false;

  // Screenshot protection: blur content when page loses focus or visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    const handleBlur = () => {
      setIsPageVisible(false);
    };

    const handleFocus = () => {
      setIsPageVisible(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      phoneType: undefined,
      relationship: "",
    },
  });

  const editForm = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      phoneType: undefined,
      relationship: "",
    },
  });

  const phoneValue = useWatch({ control: form.control, name: "phone" });
  const editPhoneValue = useWatch({ control: editForm.control, name: "phone" });

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertContact) => apiRequest("POST", "/api/contacts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Confirmation email sent",
        description: "Your contact must click the link in their email to confirm within 24 hours.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add contact",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password?: string }) => 
      apiRequest("DELETE", `/api/contacts/${id}`, password ? { password } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setDeleteId(null);
      setShowDeletePasswordDialog(false);
      setDeletePassword("");
      setShowDeletePassword(false);
      setPendingDeleteId(null);
      toast({
        title: "Contact removed",
        description: "The contact has been deleted.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Please try again.";
      // If organization requires password, show password dialog
      if (message.includes("Password required") && isOrganization) {
        setShowDeletePasswordDialog(true);
        return;
      }
      setDeleteId(null);
      setShowDeletePasswordDialog(false);
      setDeletePassword("");
      setShowDeletePassword(false);
      setPendingDeleteId(null);
      toast({
        title: "Cannot remove contact",
        description: message.includes("one emergency contact") 
          ? "At least one emergency contact is required for aok to function properly."
          : message.includes("password") ? "Incorrect password" : message,
        variant: "destructive",
      });
    },
  });

  const primaryContactCount = contacts.filter(c => c.isPrimary).length;
  const maxPrimariesReached = primaryContactCount >= 3;
  
  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/contacts/${id}/primary`),
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      const contact = contacts.find(c => c.id === contactId);
      const wasToggled = contact?.isPrimary;
      toast({
        title: wasToggled ? "Primary status removed" : "Primary contact/carer set",
        description: wasToggled 
          ? "This contact will only receive emergency alerts."
          : "This contact will now receive notifications for every check-in.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "";
      if (message.includes("Maximum of 3")) {
        toast({
          title: "Maximum primary contacts/carers reached",
          description: "You can have up to 3 primary contacts/carers. Remove one to add another.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to update primary status",
          description: "At least one contact must remain as primary.",
          variant: "destructive",
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertContact }) => 
      apiRequest("PATCH", `/api/contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setEditDialogOpen(false);
      setEditingContact(null);
      editForm.reset();
      toast({
        title: "Contact updated",
        description: "Your emergency contact has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update contact",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContact) => {
    console.log("[CONTACTS] Form submitted with data:", data);
    createMutation.mutate(data);
  };
  
  // Debug: log form errors
  const formErrors = form.formState.errors;
  if (Object.keys(formErrors).length > 0) {
    console.log("[CONTACTS] Form validation errors:", formErrors);
  }

  const onEditSubmit = (data: InsertContact) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data });
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    
    // Extract country code from existing phone number
    if (contact.phone) {
      const matchedCode = countryCodes.find(c => contact.phone?.startsWith(c.code));
      if (matchedCode) {
        setEditSelectedCountryCode(matchedCode.code);
      } else {
        setEditSelectedCountryCode("+44");
      }
    } else {
      setEditSelectedCountryCode("+44");
    }
    
    editForm.reset({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || "",
      phoneType: contact.phoneType as "mobile" | "landline" | undefined,
      relationship: contact.relationship,
    });
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isLastContact = contacts.length === 1;

  return (
    <div className={`flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto h-full overflow-y-auto select-none ${!isPageVisible ? 'blur-lg pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">Contacts</h1>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          {!isOrgClient && (
            <DialogTrigger asChild>
              <Button size="icon" data-testid="button-add-contact">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Emergency Contact
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-contact-name" />
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
                        <Input type="email" placeholder="john@example.com" {...field} data-testid="input-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <div className="flex gap-2">
                        <Select value={selectedCountryCode} onValueChange={(code) => {
                          const oldCode = selectedCountryCode;
                          setSelectedCountryCode(code);
                          if (field.value) {
                            const localNumber = field.value.replace(oldCode, "").replace(/^0+/, "");
                            field.onChange(localNumber ? code + localNumber : "");
                          }
                        }}>
                          <SelectTrigger className="w-[100px]" data-testid="select-country-code">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {countryCodes.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                <span className="flex items-center gap-1">
                                  <span>{c.flag}</span>
                                  <span>{c.code}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="7XXX XXXXXX" 
                            {...field} 
                            value={field.value?.replace(selectedCountryCode, "") || ""} 
                            onChange={(e) => {
                              const localNumber = e.target.value.replace(/^0+/, "");
                              field.onChange(localNumber ? selectedCountryCode + localNumber : "");
                            }}
                            data-testid="input-contact-phone" 
                          />
                        </FormControl>
                      </div>
                      <FormDescription className="text-xs">
                        Include country code for international calls (e.g., +44 for UK)
                      </FormDescription>
                      {field.value && !isValidInternationalPhone(field.value) && (
                        <p className="text-xs text-destructive">Please enter a valid phone number with country code</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {phoneValue && phoneValue.length > 0 && (
                  <FormField
                    control={form.control}
                    name="phoneType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-phone-type">
                              <SelectValue placeholder="Select phone type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mobile" data-testid="option-mobile">
                              <span className="flex items-center gap-2">
                                <Smartphone className="h-4 w-4" />
                                Mobile
                              </span>
                            </SelectItem>
                            <SelectItem value="landline" data-testid="option-landline">
                              <span className="flex items-center gap-2">
                                <PhoneCall className="h-4 w-4" />
                                Landline
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Landline contacts will receive automated voice calls during emergencies.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="Spouse, Parent, Friend..." {...field} data-testid="input-contact-relationship" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createMutation.isPending}
                  data-testid="button-save-contact"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Contact
                </Button>
              </form>
              </Form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Primary contacts/carers (up to 3) receive notifications for successful check-ins and missed check-in alerts. 
        Non-primary contacts only receive emergency SOS alerts. New contacts must confirm via email 
        before they become active.
      </p>

      {contacts.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-medium ${maxPrimariesReached ? "text-amber-600" : "text-muted-foreground"}`}>
            Primary contacts/carers: {primaryContactCount}/3
          </span>
          {maxPrimariesReached && (
            <span className="text-xs text-amber-600">(maximum reached)</span>
          )}
        </div>
      )}

      {contacts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No contacts yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              {isOrgClient 
                ? "Your emergency contacts are managed by your organisation."
                : "Add your loved ones so they can be alerted if you miss a check-in."
              }
            </p>
            {!isOrgClient && (
              <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-contact">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => {
              const firstName = contact.name.split(" ")[0];
              const isConfirmed = !!contact.confirmedAt;
              const isExpanded = expandedContactId === contact.id;
              
              return (
            <Card 
              key={contact.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => isConfirmed && setExpandedContactId(isExpanded ? null : contact.id)}
              data-testid={`card-contact-${contact.id}`}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={`${getAvatarColor(contact.name)} text-white font-medium`}>
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium truncate">{isConfirmed && !isExpanded ? firstName : contact.name}</h3>
                    {!isConfirmed && (
                      <>
                        <Badge variant="secondary" className="text-xs">
                          {contact.relationship}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </>
                    )}
                    {isConfirmed && isExpanded && (
                      <Badge variant="secondary" className="text-xs">
                        {contact.relationship}
                      </Badge>
                    )}
                    {contact.isPrimary && isConfirmed && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  {(!isConfirmed || isExpanded) && (
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </span>
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          {contact.phoneType === "landline" ? (
                            <PhoneCall className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <Smartphone className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span>{contact.phone}</span>
                          {contact.phoneType === "landline" && (
                            <Badge variant="outline" className="text-xs ml-1 px-1 py-0">
                              Landline
                            </Badge>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {/* Only show primary checkbox for confirmed contacts */}
                  {isConfirmed && (() => {
                    const isDisabled = setPrimaryMutation.isPending || (!contact.isPrimary && maxPrimariesReached);
                    return (
                    <div className="flex items-center gap-1.5 mr-2">
                      <Checkbox
                        id={`primary-${contact.id}`}
                        checked={contact.isPrimary}
                        disabled={isDisabled}
                        onCheckedChange={() => setPrimaryMutation.mutate(contact.id)}
                        data-testid={`checkbox-primary-${contact.id}`}
                        title={
                          (!contact.isPrimary && maxPrimariesReached)
                            ? "Maximum 3 primary contacts/carers"
                            : (contact.isPrimary ? "Remove primary status" : "Set as primary contact/carer")
                        }
                      />
                      <label 
                        htmlFor={`primary-${contact.id}`}
                        className={`text-xs ${
                          isDisabled
                            ? "text-muted-foreground cursor-not-allowed"
                            : contact.isPrimary 
                              ? "text-foreground font-medium cursor-pointer" 
                              : "text-muted-foreground cursor-pointer"
                        }`}
                        data-testid={`label-primary-${contact.id}`}
                      >
                        Primary
                      </label>
                    </div>
                    );
                  })()}
                  {!isOrgClient && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditContact(contact)}
                      title="Edit contact"
                      data-testid={`button-edit-contact-${contact.id}`}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  {!isOrgClient && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteId(contact.id)}
                      data-testid={`button-delete-contact-${contact.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
              );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isLastContact ? "Cannot Remove Contact" : "Remove Contact"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isLastContact 
                ? "At least one emergency contact is required for aok to function properly. Please add another contact before removing this one."
                : "Are you sure you want to remove this contact? They will no longer receive alerts when you miss a check-in."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!isLastContact && (
              <AlertDialogAction
                onClick={() => {
                  if (deleteId) {
                    setPendingDeleteId(deleteId);
                    setShowDeletePasswordDialog(true);
                    setDeleteId(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Continue
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDeletePasswordDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeletePasswordDialog(false);
          setDeletePassword("");
          setShowDeletePassword(false);
          setPendingDeleteId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Confirm Contact Removal
            </DialogTitle>
            <DialogDescription>
              Removing contacts requires password verification to protect your safety settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Password</Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showDeletePassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && pendingDeleteId) {
                      deleteMutation.mutate({ id: pendingDeleteId, password: deletePassword });
                    }
                  }}
                  className="pr-10"
                  autoComplete="off"
                  data-testid="input-delete-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  data-testid="button-toggle-delete-password"
                >
                  {showDeletePassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeletePasswordDialog(false);
                setDeletePassword("");
                setShowDeletePassword(false);
                setPendingDeleteId(null);
              }}
              data-testid="button-cancel-delete-password"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deletePassword.trim()) {
                  toast({
                    title: "Password required",
                    description: "Please enter your password to remove this contact.",
                    variant: "destructive",
                  });
                  return;
                }
                if (pendingDeleteId) {
                  deleteMutation.mutate({ id: pendingDeleteId, password: deletePassword });
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-password"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Remove Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditDialogOpen(false);
          setEditingContact(null);
          editForm.reset();
        }
      }}>
        <DialogContent className="max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Contact
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pb-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} data-testid="input-edit-contact-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} data-testid="input-edit-contact-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <div className="flex gap-2">
                      <Select value={editSelectedCountryCode} onValueChange={(code) => {
                        const oldCode = editSelectedCountryCode;
                        setEditSelectedCountryCode(code);
                        if (field.value) {
                          const localNumber = field.value.replace(oldCode, "").replace(/^0+/, "");
                          field.onChange(localNumber ? code + localNumber : "");
                        }
                      }}>
                        <SelectTrigger className="w-[100px]" data-testid="select-edit-country-code">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              <span className="flex items-center gap-1">
                                <span>{c.flag}</span>
                                <span>{c.code}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="7XXX XXXXXX" 
                          {...field} 
                          value={field.value?.replace(editSelectedCountryCode, "") || ""} 
                          onChange={(e) => {
                            const localNumber = e.target.value.replace(/^0+/, "");
                            field.onChange(localNumber ? editSelectedCountryCode + localNumber : "");
                          }}
                          data-testid="input-edit-contact-phone" 
                        />
                      </FormControl>
                    </div>
                    <FormDescription className="text-xs">
                      Include country code for international calls (e.g., +44 for UK)
                    </FormDescription>
                    {field.value && !isValidInternationalPhone(field.value) && (
                      <p className="text-xs text-destructive">Please enter a valid phone number with country code</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              {editPhoneValue && editPhoneValue.length > 0 && (
                <FormField
                  control={editForm.control}
                  name="phoneType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-phone-type">
                            <SelectValue placeholder="Select phone type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mobile" data-testid="option-edit-mobile">
                            <span className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              Mobile
                            </span>
                          </SelectItem>
                          <SelectItem value="landline" data-testid="option-edit-landline">
                            <span className="flex items-center gap-2">
                              <PhoneCall className="h-4 w-4" />
                              Landline
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Landline contacts will receive automated voice calls during emergencies.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={editForm.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="Spouse, Parent, Friend..." {...field} data-testid="input-edit-contact-relationship" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={updateMutation.isPending}
                data-testid="button-update-contact"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Update Contact
              </Button>
            </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
