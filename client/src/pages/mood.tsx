import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Meh, Frown, ThumbsUp, Heart, TrendingUp, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import type { MoodEntry } from "@shared/schema";

const moodOptions = [
  { key: "great", label: "Great", Icon: Heart, color: "bg-green-500" },
  { key: "good", label: "Good", Icon: ThumbsUp, color: "bg-emerald-400" },
  { key: "okay", label: "Okay", Icon: Meh, color: "bg-yellow-400" },
  { key: "low", label: "Low", Icon: Frown, color: "bg-orange-400" },
  { key: "bad", label: "Bad", Icon: Frown, color: "bg-red-500" },
];

const formSchema = z.object({
  mood: z.enum(["great", "good", "okay", "low", "bad"]),
  note: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Mood() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check feature access
  const { data: features, isLoading: featuresLoading } = useQuery<{
    featureMoodTracking: boolean;
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
      if (features.featureMoodTracking === false) {
        toast({
          title: "Feature not available",
          description: "This feature has not been enabled by your organisation.",
          variant: "destructive",
        });
        setLocation("/app/settings");
      }
    }
  }, [features, featuresLoading, setLocation, toast]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mood: undefined,
      note: "",
    },
  });

  const selectedMood = form.watch("mood");

  const { data: entries = [], isLoading } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood"],
    enabled: features?.featureMoodTracking !== false,
  });

  const { data: stats = [] } = useQuery<{ mood: string; count: number }[]>({
    queryKey: ["/api/mood/stats"],
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/mood", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/stats"] });
      form.reset();
      toast({
        title: "Mood recorded",
        description: "Your wellness check-in has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to record mood",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const totalEntries = stats.reduce((sum, s) => sum + s.count, 0);

  const getMoodInfo = (moodKey: string) => {
    return moodOptions.find((m) => m.key === moodKey) || moodOptions[2];
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
      <div className="flex items-center gap-3 pt-2">
        <TrendingUp className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">Wellness</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Track how you're feeling alongside your safety check-ins. This helps identify patterns in your wellbeing over time.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How are you feeling today?</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="mood"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex justify-center gap-2">
                        {moodOptions.map(({ key, label, Icon, color }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => field.onChange(key)}
                            className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                              field.value === key
                                ? `${color} text-white scale-110 shadow-lg`
                                : "bg-muted hover:bg-muted/80"
                            }`}
                            data-testid={`button-mood-${key}`}
                          >
                            <Icon className="h-6 w-6" />
                            <span className="text-xs mt-1">{label}</span>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {selectedMood && (
                <>
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Add a note (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="How are things going..."
                            className="resize-none"
                            {...field}
                            data-testid="input-mood-note"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full"
                    data-testid="button-save-mood"
                  >
                    {createMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Save Mood
                  </Button>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Mood Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {moodOptions.map(({ key, label, Icon, color }) => {
                const stat = stats.find((s) => s.mood === key);
                const percentage = stat ? (stat.count / totalEntries) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-8 flex justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{label}</span>
                        <span className="text-muted-foreground">{stat?.count || 0}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.slice(0, 10).map((entry) => {
                const moodInfo = getMoodInfo(entry.mood);
                const MoodIcon = moodInfo.Icon;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    data-testid={`mood-entry-${entry.id}`}
                  >
                    <div className={`p-2 rounded-full ${moodInfo.color}`}>
                      <MoodIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {moodInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
