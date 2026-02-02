import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Send, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MoodCheckResponse {
  shouldPrompt: boolean;
  consecutiveLowDays: number;
  averageMood: number;
  trend: "declining" | "stable" | "improving";
  message: string | null;
}

export default function WellbeingAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: moodCheck } = useQuery<MoodCheckResponse>({
    queryKey: ["/api/wellbeing-ai/mood-check"],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setHasStarted(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/wellbeing-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          conversationHistory,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let assistantMessage = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantMessage += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantMessage,
                };
                return updated;
              });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const startConversation = () => {
    sendMessage("Hi, I'd like to talk.");
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto">
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        <Link href="/app">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <div className="w-6 h-2 bg-green-600 absolute rounded-sm" />
            <div className="w-2 h-6 bg-green-600 absolute rounded-sm" />
            <Heart className="h-3 w-3 text-green-600 absolute -bottom-1 -right-0" fill="currentColor" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">Wellbeing AI</h1>
            <p className="text-xs text-muted-foreground">Your conversations are not stored</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasStarted ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="relative h-16 w-16 flex items-center justify-center mb-6">
              <div className="w-12 h-3 bg-green-600 absolute rounded-sm" />
              <div className="w-3 h-12 bg-green-600 absolute rounded-sm" />
              <Heart className="h-5 w-5 text-green-600 absolute -bottom-2 -right-1" fill="currentColor" />
            </div>
            
            {moodCheck?.shouldPrompt ? (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 mb-6">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        I noticed things have been tough lately
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        {moodCheck.consecutiveLowDays > 0 
                          ? `You've had ${moodCheck.consecutiveLowDays} day${moodCheck.consecutiveLowDays > 1 ? 's' : ''} with lower mood scores.`
                          : "Your recent mood entries suggest you might benefit from a chat."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <h2 className="text-xl font-semibold mb-2">How are you feeling?</h2>
            <p className="text-muted-foreground mb-6 max-w-xs">
              I'm here to listen and support you. Your conversation won't be stored - it's just between us, right now.
            </p>

            <Button 
              onClick={startConversation} 
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-start-chat"
            >
              <Heart className="h-4 w-4 mr-2" />
              Start a conversation
            </Button>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-xs">
              <p className="text-xs text-muted-foreground">
                <strong>Need urgent support?</strong><br />
                Samaritans: 116 123 (free, 24/7)<br />
                Crisis Text Line: Text "SHOUT" to 85258
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-green-600 text-white"
                      : "bg-muted"
                  }`}
                  data-testid={`message-${message.role}-${index}`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {hasStarted && (
        <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            This conversation is not stored. Refresh to start fresh.
          </p>
        </form>
      )}
    </div>
  );
}
