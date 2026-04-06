interface AudioState {
  running: boolean;
  paused: boolean;
  speedNorm: number;
  throttle: number;
}

const GEAR_COUNT = 5;
const GEAR_BASE_FREQUENCIES = [58, 76, 96, 118, 144];
const GEAR_SWEEP = [28, 30, 34, 38, 44];

export class MvpAudio {
  private readonly masterLevel = 0.34;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineBus: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineOscA: OscillatorNode | null = null;
  private engineOscB: OscillatorNode | null = null;
  private engineGainA: GainNode | null = null;
  private engineGainB: GainNode | null = null;
  private started = false;
  private musicElement: HTMLAudioElement | null = null;
  private currentGear = 0;
  private shiftTimer = 0;
  private musicVolume = 0.05;
  private engineVolume = 0.35;
  private muted = false;

  public hasStarted(): boolean {
    return this.started;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getEngineVolume(): number {
    return this.engineVolume;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(value: boolean): void {
    this.muted = value;
    this.applyOutputLevels();
  }

  public setMusicVolume(value: number): void {
    this.musicVolume = Math.max(0, Math.min(1, value));
    this.applyOutputLevels();
  }

  public setEngineVolume(value: number): void {
    this.engineVolume = Math.max(0, Math.min(1, value));
    if (this.engineBus && this.context) {
      this.engineBus.gain.setTargetAtTime(this.engineVolume, this.context.currentTime, 0.03);
    }
  }

  public async start(): Promise<void> {
    const context = this.ensureContext();
    if (context.state === "suspended") {
      await context.resume();
    }

    if (!this.musicElement) {
      this.musicElement = new Audio("/pixel-carousel.mp3");
      this.musicElement.loop = true;
      this.musicElement.preload = "auto";
    }

    this.applyOutputLevels();

    if (this.musicElement.paused) {
      try {
        await this.musicElement.play();
      } catch {
        // Ignore autoplay/playback errors; the next user gesture will retry.
      }
    }

    this.started = true;
  }

  public update(state: AudioState, dt: number): void {
    const context = this.context;
    if (!context || !this.started) {
      return;
    }

    this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    this.updateEngine(state, context.currentTime);
  }

  public playCoin(): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== "running") {
      return;
    }

    this.playTone(context, master, "triangle", 1046, context.currentTime, 0.18, 0.11, 0.001, 1318);
    this.playTone(context, master, "square", 1568, context.currentTime + 0.04, 0.12, 0.05, 0.001, 1760);
  }

  public destroy(): void {
    this.engineOscA?.stop();
    this.engineOscB?.stop();
    if (this.musicElement) {
      this.musicElement.pause();
      this.musicElement.src = "";
      this.musicElement.load();
      this.musicElement = null;
    }
    this.context?.close();
    this.context = null;
    this.master = null;
    this.engineBus = null;
    this.engineFilter = null;
    this.engineOscA = null;
    this.engineOscB = null;
    this.engineGainA = null;
    this.engineGainB = null;
    this.started = false;
    this.currentGear = 0;
    this.shiftTimer = 0;
  }

  private ensureContext(): AudioContext {
    if (this.context) {
      return this.context;
    }

    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      throw new Error("Web Audio API unavailable");
    }

    const context = new AudioCtor();
    const master = context.createGain();
    const engineBus = context.createGain();
    const engineFilter = context.createBiquadFilter();
    const engineOscA = context.createOscillator();
    const engineOscB = context.createOscillator();
    const engineGainA = context.createGain();
    const engineGainB = context.createGain();

    master.gain.value = this.muted ? 0 : this.masterLevel;
    engineBus.gain.value = this.engineVolume;

    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 900;
    engineFilter.Q.value = 1.25;

    engineOscA.type = "sawtooth";
    engineOscB.type = "triangle";
    engineOscA.frequency.value = GEAR_BASE_FREQUENCIES[0];
    engineOscB.frequency.value = GEAR_BASE_FREQUENCIES[0] * 1.98;
    engineGainA.gain.value = 0.0001;
    engineGainB.gain.value = 0.0001;

    engineOscA.connect(engineGainA);
    engineOscB.connect(engineGainB);
    engineGainA.connect(engineFilter);
    engineGainB.connect(engineFilter);
    engineFilter.connect(engineBus);
    engineBus.connect(master);
    master.connect(context.destination);

    engineOscA.start();
    engineOscB.start();

    this.context = context;
    this.master = master;
    this.engineBus = engineBus;
    this.engineFilter = engineFilter;
    this.engineOscA = engineOscA;
    this.engineOscB = engineOscB;
    this.engineGainA = engineGainA;
    this.engineGainB = engineGainB;
    return context;
  }

  private applyOutputLevels(): void {
    if (this.musicElement) {
      this.musicElement.volume = this.muted ? 0 : this.musicVolume;
    }
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterLevel, this.context.currentTime, 0.03);
    }
  }

  private updateEngine(state: AudioState, now: number): void {
    if (!this.engineOscA || !this.engineOscB || !this.engineGainA || !this.engineGainB || !this.engineFilter) {
      return;
    }

    const active = state.running && !state.paused;
    const clampedSpeed = Math.max(0, Math.min(0.999, state.speedNorm));
    const gearFloat = clampedSpeed * GEAR_COUNT;
    const nextGear = Math.min(GEAR_COUNT - 1, Math.floor(gearFloat));
    const gearProgress = gearFloat - nextGear;

    if (active && nextGear > this.currentGear) {
      this.shiftTimer = 0.17;
    }
    this.currentGear = nextGear;

    const shiftDip = this.shiftTimer > 0 ? this.shiftTimer / 0.17 : 0;
    const base = GEAR_BASE_FREQUENCIES[this.currentGear] ?? GEAR_BASE_FREQUENCIES[GEAR_COUNT - 1];
    const sweep = GEAR_SWEEP[this.currentGear] ?? GEAR_SWEEP[GEAR_COUNT - 1];
    const mainPitch = base + gearProgress * sweep + state.throttle * 5 - shiftDip * 20;
    const harmonicsPitch = mainPitch * 1.96;
    const mainGain = active ? 0.02 + clampedSpeed * 0.08 + state.throttle * 0.02 - shiftDip * 0.01 : 0.0001;
    const subGain = active ? 0.012 + clampedSpeed * 0.04 - shiftDip * 0.006 : 0.0001;
    const cutoff = active ? 380 + clampedSpeed * 1750 + state.throttle * 620 - shiftDip * 220 : 220;

    this.engineOscA.frequency.setTargetAtTime(mainPitch, now, 0.04);
    this.engineOscB.frequency.setTargetAtTime(harmonicsPitch, now, 0.04);
    this.engineGainA.gain.setTargetAtTime(Math.max(0.0001, mainGain), now, 0.04);
    this.engineGainB.gain.setTargetAtTime(Math.max(0.0001, subGain), now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(Math.max(180, cutoff), now, 0.04);
  }

  private playTone(
    context: AudioContext,
    destination: AudioNode,
    type: OscillatorType,
    frequency: number,
    start: number,
    duration: number,
    level: number,
    attack: number,
    endFrequency: number
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.linearRampToValueAtTime(endFrequency, start + duration);

    filter.type = "lowpass";
    filter.frequency.value = type === "sawtooth" ? 1400 : 2200;
    filter.Q.value = 0.7;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }
}
