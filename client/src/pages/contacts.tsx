import { useState } from "react";
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
import { Plus, Mail, Trash2, Users, Loader2, UserPlus, Star, Smartphone, PhoneCall, ShieldAlert, Pencil } from "lucide-react";
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

export default function Contacts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeletePasswordDialog, setShowDeletePasswordDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  const isOrganization = user?.accountType === "organization";

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
        title: "Contact added",
        description: "Your emergency contact has been saved.",
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

  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/contacts/${id}/primary`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Primary contact set",
        description: "This contact will now receive notifications for every check-in.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to set primary contact",
        description: "Please try again.",
        variant: "destructive",
      });
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
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertContact) => {
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data });
    }
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
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
    <div className="flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">Contacts</h1>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" data-testid="button-add-contact">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Emergency Contact
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-1 pb-2">
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
                      <FormControl>
                        <Input type="tel" placeholder="+1 234 567 8900" {...field} value={field.value || ""} data-testid="input-contact-phone" />
                      </FormControl>
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
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        These people will be notified if you miss a check-in. Your primary contact 
        (marked with a star) will also receive notifications for every successful check-in.
      </p>

      {contacts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No contacts yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Add your loved ones so they can be alerted if you miss a check-in.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-contact">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <Card key={contact.id} className="hover-elevate">
              <CardContent className="flex items-center gap-4 py-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={`${getAvatarColor(contact.name)} text-white font-medium`}>
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium truncate">{contact.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {contact.relationship}
                    </Badge>
                    {contact.isPrimary && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
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
                </div>

                <div className="flex items-center gap-1">
                  {!contact.isPrimary && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setPrimaryMutation.mutate(contact.id)}
                      disabled={setPrimaryMutation.isPending}
                      title="Set as primary contact"
                      data-testid={`button-set-primary-${contact.id}`}
                    >
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEditContact(contact)}
                    title="Edit contact"
                    data-testid={`button-edit-contact-${contact.id}`}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteId(contact.id)}
                    data-testid={`button-delete-contact-${contact.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
                    if (isOrganization) {
                      setPendingDeleteId(deleteId);
                      setShowDeletePasswordDialog(true);
                      setDeleteId(null);
                    } else {
                      deleteMutation.mutate({ id: deleteId });
                    }
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Remove
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDeletePasswordDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeletePasswordDialog(false);
          setDeletePassword("");
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
              As an organization account, removing contacts requires password verification 
              to protect the safety settings of monitored individuals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Password</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pendingDeleteId) {
                    deleteMutation.mutate({ id: pendingDeleteId, password: deletePassword });
                  }
                }}
                data-testid="input-delete-password"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeletePasswordDialog(false);
                setDeletePassword("");
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
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Contact
            </DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-1 pb-2">
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
                    <FormControl>
                      <Input type="tel" placeholder="+1 234 567 8900" {...field} value={field.value || ""} data-testid="input-edit-contact-phone" />
                    </FormControl>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
