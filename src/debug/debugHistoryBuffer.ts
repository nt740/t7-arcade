export interface DebugHistorySample {
  timestampMs: number;
  laneOffset: number;
  lateralVelocity: number;
  headingError: number;
  slipAngle: number;
  roadTangent: number;
  carHeading: number;
  cameraHeading: number;
  velocityDirection: number;
}

export class DebugHistoryBuffer {
  private readonly historyWindowMs: number;
  private samples: DebugHistorySample[] = [];

  constructor(historyWindowMs: number) {
    this.historyWindowMs = historyWindowMs;
  }

  public push(sample: DebugHistorySample): void {
    this.samples.push(sample);
    const cutoff = sample.timestampMs - this.historyWindowMs;
    this.samples = this.samples.filter((entry) => entry.timestampMs >= cutoff);
  }

  public getSamples(): DebugHistorySample[] {
    return this.samples;
  }
}
