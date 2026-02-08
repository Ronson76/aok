import { useState, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

interface EmergencyRecordingState {
  isRecording: boolean;
  recordingId: string | null;
  error: string | null;
  durationSeconds: number;
  status: "idle" | "initializing" | "recording" | "uploading" | "completed" | "failed";
}

export function useEmergencyRecording() {
  const [state, setState] = useState<EmergencyRecordingState>({
    isRecording: false,
    recordingId: null,
    error: null,
    durationSeconds: 0,
    status: "idle",
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordingIdRef = useRef<string | null>(null);

  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const uploadRecording = useCallback(async (blob: Blob, recId: string, duration: number) => {
    setState(prev => ({ ...prev, status: "uploading" }));

    try {
      const urlResponse = await apiRequest("POST", "/api/emergency/recordings/upload-url", {
        recordingId: recId,
        contentType: blob.type,
      });
      const { uploadURL } = await urlResponse.json();

      await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": blob.type || "video/webm" },
      });

      await apiRequest("POST", "/api/emergency/recordings/complete", {
        recordingId: recId,
        fileSize: blob.size,
        durationSeconds: Math.round(duration),
      });

      setState(prev => ({
        ...prev,
        status: "completed",
        isRecording: false,
      }));

      console.log(`[EMERGENCY RECORDING] Upload complete: ${blob.size} bytes, ${Math.round(duration)}s`);
    } catch (err) {
      console.error("[EMERGENCY RECORDING] Upload failed:", err);
      setState(prev => ({
        ...prev,
        status: "failed",
        error: "Failed to upload recording",
        isRecording: false,
      }));
    }
  }, []);

  const startRecording = useCallback(async () => {
    setState(prev => ({ ...prev, status: "initializing", error: null }));

    try {
      const initResponse = await apiRequest("POST", "/api/emergency/recordings/init", {
        contentType: "video/webm",
      });
      const { recordingId } = await initResponse.json();
      recordingIdRef.current = recordingId;

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (audioErr) {
          throw new Error("Could not access camera or microphone. Please grant permission.");
        }
      }

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : MediaRecorder.isTypeSupported("video/mp4")
            ? "video/mp4"
            : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "video/webm",
        });

        stopMediaTracks();

        if (blob.size > 0 && recordingIdRef.current) {
          await uploadRecording(blob, recordingIdRef.current, duration);
        }
      };

      recorder.onerror = () => {
        console.error("[EMERGENCY RECORDING] MediaRecorder error");
        stopMediaTracks();
        setState(prev => ({
          ...prev,
          status: "failed",
          error: "Recording failed",
          isRecording: false,
        }));
      };

      startTimeRef.current = Date.now();
      recorder.start(10000);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, durationSeconds: elapsed }));
      }, 1000);

      setState({
        isRecording: true,
        recordingId: recordingId,
        error: null,
        durationSeconds: 0,
        status: "recording",
      });

      console.log(`[EMERGENCY RECORDING] Started recording ${recordingId}`);
    } catch (err: any) {
      console.error("[EMERGENCY RECORDING] Failed to start:", err);
      stopMediaTracks();
      setState(prev => ({
        ...prev,
        status: "failed",
        error: err?.message || "Failed to start recording",
        isRecording: false,
      }));
    }
  }, [stopMediaTracks, uploadRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  const resetState = useCallback(() => {
    stopMediaTracks();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setState({
      isRecording: false,
      recordingId: null,
      error: null,
      durationSeconds: 0,
      status: "idle",
    });
  }, [stopMediaTracks]);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetState,
  };
}
