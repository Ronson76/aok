import type { Express, Request, Response } from "express";
import OpenAI, { toFile } from "openai";
import { db } from "./db";
import { moodEntries, users } from "@shared/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { storage } from "./storage";

// Helper to get authenticated userId from session cookie
async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const sessionId = (req as any).cookies?.session;
  if (!sessionId) return null;
  
  const session = await storage.getSession(sessionId);
  if (!session) return null;
  
  return session.userId;
}

// Main OpenAI client for chat (uses Replit AI integration)
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Separate client for Whisper STT/TTS (must use standard OpenAI API, not Azure)
const openaiWhisper = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface MoodPattern {
  hasLowMood: boolean;
  consecutiveLowDays: number;
  averageMood: number;
  trend: "declining" | "stable" | "improving";
  recentEntries: Array<{ date: string; mood: number; notes: string | null }>;
}

async function analyzeMoodPatterns(userId: string): Promise<MoodPattern> {
  // Filter to last 14 days, not just last 14 entries
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  
  const entries = await db
    .select()
    .from(moodEntries)
    .where(
      and(
        eq(moodEntries.userId, userId),
        gte(moodEntries.createdAt, fourteenDaysAgo)
      )
    )
    .orderBy(desc(moodEntries.createdAt));

  if (entries.length === 0) {
    return {
      hasLowMood: false,
      consecutiveLowDays: 0,
      averageMood: 5,
      trend: "stable",
      recentEntries: [],
    };
  }

  const recentEntries = entries.map((e) => ({
    date: e.createdAt ? new Date(e.createdAt).toLocaleDateString("en-GB") : "Unknown",
    mood: e.mood,
    notes: e.notes,
  }));

  const moods = entries.map((e) => e.mood);
  const averageMood = moods.reduce((a, b) => a + b, 0) / moods.length;

  let consecutiveLowDays = 0;
  for (const mood of moods) {
    if (mood <= 4) {
      consecutiveLowDays++;
    } else {
      break;
    }
  }

  let trend: "declining" | "stable" | "improving" = "stable";
  if (entries.length >= 3) {
    const recent = moods.slice(0, 3);
    const older = moods.slice(Math.max(0, moods.length - 3));
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    if (recentAvg < olderAvg - 1) {
      trend = "declining";
    } else if (recentAvg > olderAvg + 1) {
      trend = "improving";
    }
  }

  return {
    hasLowMood: consecutiveLowDays >= 2 || averageMood < 4,
    consecutiveLowDays,
    averageMood,
    trend,
    recentEntries,
  };
}

function buildSystemPrompt(userName: string, moodPattern: MoodPattern): string {
  let context = "";
  
  if (moodPattern.recentEntries.length > 0) {
    context = `\n\nRecent mood check-ins (most recent first):\n`;
    moodPattern.recentEntries.slice(0, 5).forEach((e) => {
      context += `- ${e.date}: Mood ${e.mood}/10${e.notes ? ` - "${e.notes}"` : ""}\n`;
    });
    
    if (moodPattern.hasLowMood) {
      context += `\nNote: ${userName} has had ${moodPattern.consecutiveLowDays} consecutive days with lower mood scores.`;
    }
    if (moodPattern.trend === "declining") {
      context += `\nNote: There appears to be a declining trend in mood recently.`;
    }
  }

  return `You are a compassionate wellbeing support companion for the aok personal safety app. Your role is to provide emotional support, active listening, and gentle guidance.

IMPORTANT GUIDELINES:
- Be warm, empathetic, and non-judgmental
- Use simple, everyday language - avoid clinical or medical terminology
- Never diagnose or provide medical advice
- If someone expresses thoughts of self-harm or suicide, gently encourage them to reach out to professional services (Samaritans: 116 123, or their GP)
- Focus on validation, active listening, and practical coping strategies
- Keep responses concise but caring (2-3 paragraphs maximum)
- Remember this is a GDPR-compliant ephemeral chat - no conversation history is stored
- Use British English spelling

The user's name is ${userName}.${context}

Start by acknowledging their feelings and asking how you can support them today.`;
}

export function registerWellbeingAIRoutes(app: Express): void {
  // Text-to-Speech endpoint - converts AI text to speech
  app.post("/api/wellbeing-ai/tts", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      // Limit text length to prevent abuse
      const truncatedText = text.slice(0, 2000);

      const mp3Response = await openaiWhisper.audio.speech.create({
        model: "tts-1",
        voice: "nova", // Warm, friendly female voice suitable for wellbeing support
        input: truncatedText,
        response_format: "mp3",
      });

      const buffer = Buffer.from(await mp3Response.arrayBuffer());

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Speech-to-Text endpoint - transcribes user voice to text
  app.post("/api/wellbeing-ai/stt", async (req: Request, res: Response) => {
    console.log("[STT] Received speech-to-text request");
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        console.log("[STT] User not authenticated");
        return res.status(401).json({ error: "Not authenticated" });
      }
      console.log("[STT] User authenticated:", userId);

      // Handle raw audio data with size limit (10MB max)
      const maxSize = 10 * 1024 * 1024;
      const chunks: Buffer[] = [];
      let totalSize = 0;
      
      req.on("data", (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize <= maxSize) {
          chunks.push(chunk);
        }
      });

      req.on("error", (error) => {
        console.error("[STT] Request error:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Request error" });
        }
      });

      req.on("end", async () => {
        console.log("[STT] Received audio data, size:", totalSize, "bytes");
        try {
          if (totalSize > maxSize) {
            console.log("[STT] Audio too large");
            return res.status(413).json({ error: "Audio file too large" });
          }
          
          if (chunks.length === 0) {
            console.log("[STT] No audio data received");
            return res.status(400).json({ error: "No audio data received" });
          }

          const audioBuffer = Buffer.concat(chunks);
          console.log("[STT] Sending to Whisper API...");
          
          // Use OpenAI's toFile helper for Node.js compatibility
          const audioFile = await toFile(audioBuffer, "audio.webm", {
            type: "audio/webm",
          });

          const transcription = await openaiWhisper.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            language: "en",
          });

          console.log("[STT] Transcription successful:", transcription.text?.substring(0, 50));
          res.json({ text: transcription.text });
        } catch (error: any) {
          console.error("[STT] Error transcribing audio:", error.message || error);
          console.error("[STT] Full error:", JSON.stringify(error, null, 2));
          if (!res.headersSent) {
            // Return more details for debugging
            const errorMessage = error.message || "Failed to transcribe audio";
            const errorCode = error.code || error.status || "unknown";
            res.status(500).json({ 
              error: `Transcription error: ${errorMessage}`,
              code: errorCode
            });
          }
        }
      });
    } catch (error: any) {
      console.error("[STT] Error in STT endpoint:", error.message || error);
      res.status(500).json({ error: "Failed to process audio" });
    }
  });

  app.get("/api/wellbeing-ai/mood-check", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const moodPattern = await analyzeMoodPatterns(userId);
      
      res.json({
        shouldPrompt: moodPattern.hasLowMood,
        consecutiveLowDays: moodPattern.consecutiveLowDays,
        averageMood: Math.round(moodPattern.averageMood * 10) / 10,
        trend: moodPattern.trend,
        message: moodPattern.hasLowMood
          ? "I noticed things have been tough lately. Would you like to talk?"
          : null,
      });
    } catch (error) {
      console.error("Error checking mood patterns:", error);
      res.status(500).json({ error: "Failed to check mood patterns" });
    }
  });

  app.post("/api/wellbeing-ai/chat", async (req: Request, res: Response) => {
    try {
      const userId = await getAuthenticatedUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { message, conversationHistory = [] } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const userName = user?.name?.split(" ")[0] || "there";

      const moodPattern = await analyzeMoodPatterns(userId);
      const systemPrompt = buildSystemPrompt(userName, moodPattern);

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-10),
        { role: "user", content: message },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        stream: true,
        max_tokens: 500,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in wellbeing chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });
}
