import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { db } from "./db";
import { moodEntries, users } from "@shared/schema";
import { eq, desc, gte, and } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
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
  app.get("/api/wellbeing-ai/mood-check", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).session?.userId;
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
      const userId = (req as any).session?.userId;
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
