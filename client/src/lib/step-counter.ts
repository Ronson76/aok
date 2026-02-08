const STEP_THRESHOLD = 1.2;
const MIN_STEP_INTERVAL_MS = 250;
const MAX_STEP_INTERVAL_MS = 1200;
const SMOOTHING_FACTOR = 0.15;

type StepCallback = (totalSteps: number) => void;

export class StepCounter {
  private steps = 0;
  private lastStepTime = 0;
  private smoothedMagnitude = 9.8;
  private lastPeakMagnitude = 0;
  private rising = false;
  private callback: StepCallback;
  private listening = false;
  private handler: ((event: DeviceMotionEvent) => void) | null = null;

  constructor(callback: StepCallback, initialSteps = 0) {
    this.callback = callback;
    this.steps = initialSteps;
  }

  async start(): Promise<boolean> {
    if (this.listening) return true;

    if (typeof DeviceMotionEvent !== "undefined" &&
        typeof (DeviceMotionEvent as any).requestPermission === "function") {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== "granted") return false;
      } catch {
        return false;
      }
    }

    if (!("DeviceMotionEvent" in window)) return false;

    this.handler = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      this.smoothedMagnitude = this.smoothedMagnitude * (1 - SMOOTHING_FACTOR) + magnitude * SMOOTHING_FACTOR;

      const diff = magnitude - this.smoothedMagnitude;

      if (diff > 0 && !this.rising) {
        this.rising = true;
        this.lastPeakMagnitude = diff;
      } else if (diff > this.lastPeakMagnitude && this.rising) {
        this.lastPeakMagnitude = diff;
      } else if (diff < 0 && this.rising) {
        this.rising = false;

        if (this.lastPeakMagnitude > STEP_THRESHOLD) {
          const now = Date.now();
          const timeSinceLastStep = now - this.lastStepTime;

          if (timeSinceLastStep >= MIN_STEP_INTERVAL_MS &&
              (this.lastStepTime === 0 || timeSinceLastStep <= MAX_STEP_INTERVAL_MS * 3)) {
            this.steps++;
            this.lastStepTime = now;
            this.callback(this.steps);
          } else if (this.lastStepTime === 0) {
            this.steps++;
            this.lastStepTime = now;
            this.callback(this.steps);
          }
        }
        this.lastPeakMagnitude = 0;
      }
    };

    window.addEventListener("devicemotion", this.handler);
    this.listening = true;
    return true;
  }

  stop(): number {
    if (this.handler) {
      window.removeEventListener("devicemotion", this.handler);
      this.handler = null;
    }
    this.listening = false;
    return this.steps;
  }

  getSteps(): number {
    return this.steps;
  }

  reset(initialSteps = 0): void {
    this.steps = initialSteps;
    this.lastStepTime = 0;
    this.smoothedMagnitude = 9.8;
    this.lastPeakMagnitude = 0;
    this.rising = false;
  }

  isActive(): boolean {
    return this.listening;
  }
}

const MET_VALUES: Record<string, number> = {
  run: 9.8,
  walk: 3.8,
  cycle: 7.5,
};

export function estimateCalories(
  activityType: string,
  durationSec: number,
  weightKg = 70
): number {
  const met = MET_VALUES[activityType] || 4.0;
  const hours = durationSec / 3600;
  return Math.round(met * weightKg * hours);
}

export function estimateStepsFromDistance(
  distanceM: number,
  activityType: string
): number {
  if (activityType === "cycle") return 0;
  const strideM = activityType === "run" ? 0.85 : 0.72;
  return Math.round(distanceM / strideM);
}
