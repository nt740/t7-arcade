export interface FixedStepOptions {
  fixedDeltaSeconds: number;
  maxCatchUpSteps: number;
}

export class FixedStepRunner {
  private readonly fixedDeltaSeconds: number;
  private readonly maxCatchUpSteps: number;
  private accumulatorSeconds = 0;
  private lastTimestampMs = 0;
  private timeScale = 1;
  private paused = false;

  constructor(options: FixedStepOptions) {
    this.fixedDeltaSeconds = options.fixedDeltaSeconds;
    this.maxCatchUpSteps = options.maxCatchUpSteps;
  }

  public setTimeScale(timeScale: number): void {
    this.timeScale = timeScale;
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public step(timestampMs: number, callback: (deltaSeconds: number) => void): void {
    if (this.lastTimestampMs === 0) {
      this.lastTimestampMs = timestampMs;
      return;
    }

    const elapsedSeconds = ((timestampMs - this.lastTimestampMs) / 1000) * this.timeScale;
    this.lastTimestampMs = timestampMs;

    if (this.paused) {
      return;
    }

    this.accumulatorSeconds += elapsedSeconds;
    let catchUpSteps = 0;

    while (this.accumulatorSeconds >= this.fixedDeltaSeconds && catchUpSteps < this.maxCatchUpSteps) {
      callback(this.fixedDeltaSeconds);
      this.accumulatorSeconds -= this.fixedDeltaSeconds;
      catchUpSteps += 1;
    }
  }

  public stepOnce(callback: (deltaSeconds: number) => void): void {
    callback(this.fixedDeltaSeconds);
  }
}
