import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Send, Loader2, ArrowLeft, AlertTriangle, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Link } from "wouter";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioUrl?: string; // Store TTS audio URL
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
  
  // Voice chat state
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: moodCheck } = useQuery<MoodCheckResponse>({
    queryKey: ["/api/wellbeing-ai/mood-check"],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Text-to-Speech function
  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    
    try {
      setIsPlaying(true);
      const response = await fetch("/api/wellbeing-ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (error) {
      console.error("Error speaking text:", error);
      setIsPlaying(false);
    }
  }, [voiceEnabled]);

  // Stop audio playback
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Start voice recording
  const startRecording = useCallback(async () => {
    // Stop any playing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      
      audioChunksRef.current = [];
      
      // Auto-stop after 60 seconds to prevent indefinite recording
      const recordingTimeout = setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
          setRecordingStatus("Recording stopped (60s limit)");
          setTimeout(() => setRecordingStatus(""), 2000);
        }
      }, 60000);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        clearTimeout(recordingTimeout);
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length === 0) {
          setRecordingStatus("");
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordingStatus("Transcribing...");
        
        try {
          const response = await fetch("/api/wellbeing-ai/stt", {
            method: "POST",
            headers: { "Content-Type": "audio/webm" },
            body: audioBlob,
          });
          
          if (!response.ok) throw new Error("Transcription failed");
          
          const { text } = await response.json();
          if (text && text.trim()) {
            setInput(text.trim());
            setRecordingStatus("");
          } else {
            setRecordingStatus("Couldn't hear that. Try again?");
            setTimeout(() => setRecordingStatus(""), 2000);
          }
        } catch (error) {
          console.error("Error transcribing:", error);
          setRecordingStatus("Transcription failed");
          setTimeout(() => setRecordingStatus(""), 2000);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus("Listening...");
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingStatus("Microphone access denied");
      setTimeout(() => setRecordingStatus(""), 2000);
    }
  }, []);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

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
      
      // Speak the complete response if voice is enabled
      if (assistantMessage && voiceEnabled) {
        speakText(assistantMessage);
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
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (isPlaying) stopAudio();
            setVoiceEnabled(!voiceEnabled);
          }}
          className={voiceEnabled ? "text-green-600" : "text-muted-foreground"}
          data-testid="button-toggle-voice"
          title={voiceEnabled ? "Voice responses on" : "Voice responses off"}
        >
          {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
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
              className="bg-green-600"
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
          {recordingStatus && (
            <div className="mb-2 text-center">
              <span className={`text-sm ${isRecording ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}>
                {recordingStatus}
              </span>
            </div>
          )}
          {isPlaying && (
            <div className="mb-2 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={stopAudio}
                className="text-xs"
                data-testid="button-stop-audio"
              >
                <VolumeX className="h-3 w-3 mr-1" /> Stop speaking
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={toggleRecording}
              disabled={isLoading}
              className={isRecording ? "animate-pulse" : ""}
              data-testid="button-voice-input"
              title={isRecording ? "Stop recording" : "Tap to speak"}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or tap mic to speak..."
              disabled={isLoading || isRecording}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || isLoading || isRecording}
              className="bg-green-600"
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
