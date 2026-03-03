import type { Express, Request, Response, NextFunction } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { storage } from "../../storage";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg",
  "video/mp4", "video/webm",
  "text/plain", "text/csv",
  "application/json",
];
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

async function uploadAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.session;
  if (!sessionId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const session = await storage.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  next();
}

export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  app.post("/api/uploads/request-url", uploadAuthMiddleware, async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Missing required field: name" });
      }

      if (size != null && (typeof size !== "number" || size > MAX_UPLOAD_SIZE || size <= 0)) {
        return res.status(400).json({ error: `File size must be between 1 byte and ${MAX_UPLOAD_SIZE / (1024 * 1024)}MB` });
      }

      if (contentType && !ALLOWED_CONTENT_TYPES.includes(contentType)) {
        return res.status(400).json({ error: "Unsupported file type" });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.get("/objects/:objectPath(*)", uploadAuthMiddleware, async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

