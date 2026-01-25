import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, FileText, Trash2, Pencil, Loader2, Shield, Lock, Eye, EyeOff, Scroll, Scale, Heart, ShieldCheck, KeyRound, Mail, File, type LucideIcon } from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import { format } from "date-fns";
import type { DigitalDocument, InsertDigitalDocument } from "@shared/schema";
import { insertDigitalDocumentSchema, documentTypes } from "@shared/schema";

const documentIcons: Record<string, LucideIcon> = {
  will: Scroll,
  power_of_attorney: Scale,
  healthcare_directive: Heart,
  insurance: ShieldCheck,
  account_info: KeyRound,
  letter: Mail,
  other: File,
};

const documentLabels: Record<string, string> = {
  will: "Will",
  power_of_attorney: "Power of Attorney",
  healthcare_directive: "Healthcare Directive",
  insurance: "Insurance",
  account_info: "Account Information",
  letter: "Personal Letter",
  other: "Other",
};

export default function Documents() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DigitalDocument | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DigitalDocument | null>(null);

  // Check feature access
  const { data: features, isLoading: featuresLoading } = useQuery<{
    featureDigitalWill: boolean;
    isOrgAccount: boolean;
    isOrgClient: boolean;
  }>({
    queryKey: ["/api/features"],
  });

  // Redirect if feature is disabled
  useEffect(() => {
    if (!featuresLoading && features?.featureDigitalWill === false) {
      toast({
        title: "Feature not available",
        description: "This feature has not been enabled by your organisation.",
        variant: "destructive",
      });
      setLocation("/app/settings");
    }
  }, [features, featuresLoading, setLocation, toast]);

  const form = useForm<InsertDigitalDocument>({
    resolver: zodResolver(insertDigitalDocumentSchema),
    defaultValues: {
      title: "",
      type: "will",
      description: "",
      content: "",
    },
  });

  const { data: documents = [], isLoading } = useQuery<DigitalDocument[]>({
    queryKey: ["/api/documents"],
    enabled: features?.featureDigitalWill !== false,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertDigitalDocument) =>
      apiRequest("POST", "/api/documents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Document saved",
        description: "Your document has been securely stored.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save document",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertDigitalDocument> }) =>
      apiRequest("PATCH", `/api/documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setDialogOpen(false);
      setEditingDoc(null);
      form.reset();
      toast({
        title: "Document updated",
        description: "Your document has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update document",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setDeleteId(null);
      toast({
        title: "Document removed",
        description: "Your document has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove document",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDigitalDocument) => {
    if (editingDoc) {
      updateMutation.mutate({ id: editingDoc.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (doc: DigitalDocument) => {
    setEditingDoc(doc);
    form.reset({
      title: doc.title,
      type: doc.type as any,
      description: doc.description || "",
      content: doc.content || "",
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
          <FileText className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">Digital Will</h1>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingDoc(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="icon" data-testid="button-add-document">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? "Edit Document" : "Add Document"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="My Last Will" {...field} data-testid="input-doc-title" />
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
                      <FormLabel>Document Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-doc-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documentTypes.map((type) => {
                            const DocIcon = documentIcons[type] || File;
                            return (
                              <SelectItem key={type} value={type}>
                                <span className="flex items-center gap-2">
                                  <DocIcon className="h-4 w-4" />
                                  <span>{documentLabels[type]}</span>
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

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Brief description..."
                          {...field}
                          data-testid="input-doc-description"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your document content here..."
                          className="min-h-[200px] resize-none"
                          {...field}
                          data-testid="input-doc-content"
                        />
                      </FormControl>
                      <FormDescription>
                        This content is stored securely and will only be released to your designated executors.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-document"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  {editingDoc ? "Update Document" : "Save Document"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Secure Storage</p>
              <p className="text-xs text-muted-foreground">
                Your documents are encrypted and will only be released to your emergency contacts when needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Store your will, healthcare directives, and other important documents securely.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-document">
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover-elevate" data-testid={`card-document-${doc.id}`}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {(() => {
                    const DocIcon = documentIcons[doc.type] || File;
                    return (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <DocIcon className="h-6 w-6 text-primary" />
                      </div>
                    );
                  })()}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{doc.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {documentLabels[doc.type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.updatedAt), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setViewingDoc(doc)}
                      data-testid={`button-view-document-${doc.id}`}
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(doc)}
                      data-testid={`button-edit-document-${doc.id}`}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteId(doc.id)}
                      data-testid={`button-delete-document-${doc.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingDoc && (() => {
                const DocIcon = documentIcons[viewingDoc.type] || File;
                return <DocIcon className="h-5 w-5 text-primary" />;
              })()}
              {viewingDoc?.title}
            </DialogTitle>
          </DialogHeader>
          {viewingDoc && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{documentLabels[viewingDoc.type]}</Badge>
                <span className="text-sm text-muted-foreground">
                  Last updated: {format(new Date(viewingDoc.updatedAt), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
              {viewingDoc.description && (
                <p className="text-sm text-muted-foreground">{viewingDoc.description}</p>
              )}
              {viewingDoc.content && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-sans">{viewingDoc.content}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-document"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
