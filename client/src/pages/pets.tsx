import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, PawPrint, Trash2, Pencil, Loader2, Stethoscope, Phone, Dog, Cat, Bird, Fish, Rabbit, ArrowLeft, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Pet, InsertPet } from "@shared/schema";
import { insertPetSchema, petTypes } from "@shared/schema";

const petIcons: Record<string, LucideIcon> = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  fish: Fish,
  rabbit: Rabbit,
  hamster: PawPrint,
  reptile: PawPrint,
  other: PawPrint,
};

export default function Pets() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Check feature access
  const { data: features, isLoading: featuresLoading } = useQuery<{
    featurePetProtection: boolean;
    isOrgAccount: boolean;
    isOrgClient: boolean;
  }>({
    queryKey: ["/api/features"],
  });

  // Redirect if feature is disabled or user is an org account
  useEffect(() => {
    if (!featuresLoading && features) {
      if (features.isOrgAccount) {
        toast({
          title: "Feature not available",
          description: "This feature is only available to individual users.",
          variant: "destructive",
        });
        setLocation("/org/dashboard");
        return;
      }
      if (features.featurePetProtection === false) {
        toast({
          title: "Feature not available",
          description: "This feature has not been enabled by your organisation.",
          variant: "destructive",
        });
        setLocation("/app/settings");
      }
    }
  }, [features, featuresLoading, setLocation, toast]);

  const form = useForm<InsertPet>({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: "",
      type: "dog",
      breed: "",
      age: "",
      medicalConditions: "",
      medications: "",
      feedingInstructions: "",
      vetName: "",
      vetPhone: "",
      vetAddress: "",
      specialInstructions: "",
    },
  });

  const { data: pets = [], isLoading } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
    enabled: features?.featurePetProtection !== false,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertPet) => apiRequest("POST", "/api/pets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Pet added",
        description: "Your pet's information has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to add pet",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertPet> }) =>
      apiRequest("PATCH", `/api/pets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      setDialogOpen(false);
      setEditingPet(null);
      form.reset();
      toast({
        title: "Pet updated",
        description: "Your pet's information has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update pet",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/pets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      setDeleteId(null);
      toast({
        title: "Pet removed",
        description: "Your pet has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove pet",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPet) => {
    if (editingPet) {
      updateMutation.mutate({ id: editingPet.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    form.reset({
      name: pet.name,
      type: pet.type as any,
      breed: pet.breed || "",
      age: pet.age || "",
      medicalConditions: pet.medicalConditions || "",
      medications: pet.medications || "",
      feedingInstructions: pet.feedingInstructions || "",
      vetName: pet.vetName || "",
      vetPhone: pet.vetPhone || "",
      vetAddress: pet.vetAddress || "",
      specialInstructions: pet.specialInstructions || "",
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 max-w-md mx-auto h-full overflow-y-auto">
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Link href="/app">
            <Button variant="ghost" size="icon" data-testid="button-back-pets">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <PawPrint className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">Pet Protection</h1>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingPet(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="icon" data-testid="button-add-pet">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPet ? "Edit Pet" : "Add Pet"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Buddy" {...field} data-testid="input-pet-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-pet-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {petTypes.map((type) => {
                            const PetIcon = petIcons[type] || PawPrint;
                            return (
                              <SelectItem key={type} value={type}>
                                <span className="flex items-center gap-2">
                                  <PetIcon className="h-4 w-4" />
                                  <span className="capitalize">{type}</span>
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="breed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Breed</FormLabel>
                        <FormControl>
                          <Input placeholder="Golden Retriever" {...field} value={field.value || ""} data-testid="input-pet-breed" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input placeholder="3 years" {...field} value={field.value || ""} data-testid="input-pet-age" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="medicalConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Conditions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any allergies, conditions..."
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-pet-medical"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Medications</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="List any medications..."
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-pet-medications"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="feedingInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feeding Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Diet, feeding times..."
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-pet-feeding"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Veterinary Information
                  </h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="vetName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vet Name/Practice</FormLabel>
                          <FormControl>
                            <Input placeholder="Happy Paws Veterinary" {...field} value={field.value || ""} data-testid="input-vet-name" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vetPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vet Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+44 XXXX XXXXXX" {...field} value={field.value || ""} data-testid="input-vet-phone" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vet Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 High Street..." {...field} value={field.value || ""} data-testid="input-vet-address" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Care Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special care needs..."
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-pet-special"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-pet"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingPet ? "Update Pet" : "Save Pet"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Store your pets' information so your emergency contacts can care for them if something happens to you.
      </p>

      {pets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <PawPrint className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No pets added</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Add your pets' details so they can be cared for in an emergency.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-pet">
              <Plus className="h-4 w-4 mr-2" />
              Add Pet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {pets.map((pet) => {
            const isExpanded = expandedId === pet.id;
            return (
              <Card
                key={pet.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : pet.id)}
                data-testid={`card-pet-${pet.id}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const PetIcon = petIcons[pet.type] || PawPrint;
                      return (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <PetIcon className="h-6 w-6 text-primary" />
                        </div>
                      );
                    })()}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{pet.name}</h3>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {pet.type}
                        </Badge>
                      </div>
                      {pet.breed && (
                        <p className="text-sm text-muted-foreground">{pet.breed}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(pet)}
                        data-testid={`button-edit-pet-${pet.id}`}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(pet.id)}
                        data-testid={`button-delete-pet-${pet.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                      {pet.age && (
                        <div>
                          <span className="font-medium">Age:</span> {pet.age}
                        </div>
                      )}
                      {pet.medicalConditions && (
                        <div>
                          <span className="font-medium">Medical Conditions:</span>
                          <p className="text-muted-foreground">{pet.medicalConditions}</p>
                        </div>
                      )}
                      {pet.medications && (
                        <div>
                          <span className="font-medium">Medications:</span>
                          <p className="text-muted-foreground">{pet.medications}</p>
                        </div>
                      )}
                      {pet.feedingInstructions && (
                        <div>
                          <span className="font-medium">Feeding:</span>
                          <p className="text-muted-foreground">{pet.feedingInstructions}</p>
                        </div>
                      )}
                      {(pet.vetName || pet.vetPhone) && (
                        <div className="pt-2 border-t">
                          <span className="font-medium flex items-center gap-1">
                            <Stethoscope className="h-3 w-3" /> Vet:
                          </span>
                          {pet.vetName && <p className="text-muted-foreground">{pet.vetName}</p>}
                          {pet.vetPhone && (
                            <a
                              href={`tel:${pet.vetPhone}`}
                              className="text-primary flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" /> {pet.vetPhone}
                            </a>
                          )}
                          {pet.vetAddress && (
                            <p className="text-muted-foreground text-xs">{pet.vetAddress}</p>
                          )}
                        </div>
                      )}
                      {pet.specialInstructions && (
                        <div>
                          <span className="font-medium">Special Instructions:</span>
                          <p className="text-muted-foreground">{pet.specialInstructions}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Pet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this pet? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-pet"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
