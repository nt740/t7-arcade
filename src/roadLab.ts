interface TrackSegment {
  index: number;
  z: number;
  centerX: number;
  y: number;
  curve: number;
  sectionName: string;
  marker: boolean;
}

interface TrackData {
  segments: TrackSegment[];
  length: number;
  sectionStarts: Record<string, number>;
}

interface TrackSample {
  index: number;
  centerX: number;
  y: number;
  curve: number;
  sectionName: string;
  marker: boolean;
}

interface ProjectedPoint {
  x: number;
  y: number;
  roadHalfWidth: number;
  scale: number;
}

interface ProjectedSegment {
  index: number;
  curve: number;
  sectionName: string;
  marker: boolean;
  p1: ProjectedPoint;
  p2: ProjectedPoint;
  clipY: number;
}

interface InputSnapshot {
  steer: -1 | 0 | 1;
  accel: boolean;
  brake: boolean;
}

interface RoadLabElements {
  canvas: HTMLCanvasElement;
  debugReadout: HTMLElement;
  touchLeft: HTMLButtonElement;
  touchRight: HTMLButtonElement;
  touchAccel: HTMLButtonElement;
  touchBrake: HTMLButtonElement;
  curveStrength: HTMLInputElement;
  curveStrengthValue: HTMLElement;
}

interface SectionBlueprint {
  name: string;
  length: number;
  peakCurve: number;
}

const LAB_VERSION = "RoadLab v0.2";
const FIXED_STEP_MS = 1000 / 60;
const MAX_SUBSTEPS = 5;
const FOV_DEGREES = 82;
const CAMERA_HEIGHT = 0.92;
const ROAD_HALF_WIDTH_WORLD = 1.02;
const ROAD_BOTTOM_HALF_WIDTH_SCREEN = 0.44;
const SEGMENT_LENGTH = 1;
const DRAW_DISTANCE = 320;
const CAMERA_NEAR_Z = 2.2;
const MAX_SPEED = 18;
const ACCEL_RATE = 8.2;
const BRAKE_RATE = 14.6;
const COAST_RATE = 2.8;
const OFFROAD_RATE = 5.6;
const STEER_ACCEL = 3.35;
const CURVE_FORCE = 18;
const LATERAL_CLAMP = 3.6;
const LATERAL_BASE_GRIP = 4.4;
const LATERAL_STRAIGHT_GRIP = 7.8;
const LATERAL_NEUTRAL_GRIP = 3.1;
const DRIVABLE_LIMIT = 1.02;
const PLAYER_LANE_CLAMP = 2.2;
const PLAYER_WORLD_LANE_SCALE = 0.92;
const BG_TOP = "#f7a968";
const BG_BOTTOM = "#fde0b6";
const ASPHALT = "#545b68";
const ASPHALT_FAR = "#666d78";
const GRASS_A = "#225b33";
const GRASS_B = "#28663a";
const GRASS_NEAR = "#1b502f";
const RUMBLE_A = "#d26d52";
const RUMBLE_B = "#cfdab8";
const STRIPE = "rgba(248, 246, 233, 0.52)";

const SECTION_BLUEPRINTS: SectionBlueprint[] = [
  { name: "Launch Straight", length: 72, peakCurve: 0 },
  { name: "Grand Right Arc", length: 220, peakCurve: 0.018 },
  { name: "Settle Straight", length: 44, peakCurve: 0 },
  { name: "Compression Right", length: 132, peakCurve: 0.028 },
  { name: "Bridge Straight", length: 40, peakCurve: 0 },
  { name: "Grand Left Arc", length: 220, peakCurve: -0.018 },
  { name: "Tight Left Bend", length: 84, peakCurve: -0.042 },
  { name: "Reset Straight", length: 56, peakCurve: 0 }
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function positiveMod(value: number, mod: number): number {
  return ((value % mod) + mod) % mod;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function buildTrack(curveStrength: number): TrackData {
  const segments: TrackSegment[] = [];
  const sectionStarts: Record<string, number> = {};
  let centerX = 0;
  let z = 0;

  for (const blueprint of SECTION_BLUEPRINTS) {
    sectionStarts[blueprint.name] = z;
    for (let i = 0; i < blueprint.length; i += 1) {
      const t = blueprint.length > 1 ? i / (blueprint.length - 1) : 0;
      let curve = 0;
      const peakCurve = blueprint.peakCurve * curveStrength;
      if (peakCurve !== 0) {
        if (t < 0.2) {
          curve = peakCurve * easeInOutSine(t / 0.2);
        } else if (t > 0.8) {
          curve = peakCurve * easeInOutSine((1 - t) / 0.2);
        } else {
          curve = peakCurve;
        }
      }

      centerX += curve;
      segments.push({
        index: segments.length,
        z,
        centerX,
        y: 0,
        curve,
        sectionName: blueprint.name,
        marker: segments.length % 4 === 0
      });
      z += SEGMENT_LENGTH;
    }
  }

  return {
    segments,
    length: segments.length * SEGMENT_LENGTH,
    sectionStarts
  };
}

function sampleTrack(track: TrackData, z: number): TrackSample {
  const wrapped = positiveMod(z, track.length);
  const idx = Math.floor(wrapped / SEGMENT_LENGTH);
  const nextIdx = (idx + 1) % track.segments.length;
  const t = positiveMod(wrapped, SEGMENT_LENGTH) / SEGMENT_LENGTH;
  const a = track.segments[idx];
  const b = track.segments[nextIdx];
  return {
    index: idx,
    centerX: lerp(a.centerX, b.centerX, t),
    y: lerp(a.y, b.y, t),
    curve: lerp(a.curve, b.curve, t),
    sectionName: a.sectionName,
    marker: a.marker
  };
}

class LabInput {
  private readonly pressed = new Set<string>();
  private readonly oneShot = new Set<string>();
  private readonly disposers: Array<() => void> = [];

  constructor(private readonly elements: RoadLabElements) {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!this.pressed.has(key)) {
        this.oneShot.add(key);
      }
      this.pressed.add(key);
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key) || key.length === 1) {
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      this.pressed.delete(event.key.toLowerCase());
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    this.disposers.push(() => window.removeEventListener("keydown", onKeyDown));
    this.disposers.push(() => window.removeEventListener("keyup", onKeyUp));

    this.bindTouch(this.elements.touchLeft, "touch-left");
    this.bindTouch(this.elements.touchRight, "touch-right");
    this.bindTouch(this.elements.touchAccel, "touch-accel");
    this.bindTouch(this.elements.touchBrake, "touch-brake");
  }

  destroy(): void {
    for (const dispose of this.disposers) {
      dispose();
    }
  }

  snapshot(): InputSnapshot {
    const left = this.pressed.has("arrowleft") || this.pressed.has("a") || this.pressed.has("touch-left");
    const right = this.pressed.has("arrowright") || this.pressed.has("d") || this.pressed.has("touch-right");
    const accel = this.pressed.has("arrowup") || this.pressed.has("w") || this.pressed.has("touch-accel");
    const brake = this.pressed.has("arrowdown") || this.pressed.has("s") || this.pressed.has("touch-brake");
    const steer = left === right ? 0 : left ? -1 : 1;
    return { steer, accel, brake };
  }

  consumePressed(key: string): boolean {
    const lowered = key.toLowerCase();
    if (!this.oneShot.has(lowered)) {
      return false;
    }
    this.oneShot.delete(lowered);
    return true;
  }

  private bindTouch(button: HTMLButtonElement, token: string): void {
    const down = (event: PointerEvent) => {
      event.preventDefault();
      this.pressed.add(token);
      button.setPointerCapture(event.pointerId);
    };
    const up = (event: PointerEvent) => {
      event.preventDefault();
      this.pressed.delete(token);
      if (button.hasPointerCapture(event.pointerId)) {
        button.releasePointerCapture(event.pointerId);
      }
    };

    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", up);

    this.disposers.push(() => button.removeEventListener("pointerdown", down));
    this.disposers.push(() => button.removeEventListener("pointerup", up));
    this.disposers.push(() => button.removeEventListener("pointercancel", up));
    this.disposers.push(() => button.removeEventListener("pointerleave", up));
  }
}

export class RoadLab {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly input: LabInput;
  private readonly cameraDepth = 1 / Math.tan((FOV_DEGREES * Math.PI) / 360);
  private track: TrackData;

  private width = window.innerWidth;
  private height = window.innerHeight;
  private raf = 0;
  private lastFrameMs = 0;
  private accumulatorMs = 0;

  private speed = 0;
  private playerZ = 0;
  private playerLaneX = 0;
  private playerLatVel = 0;
  private steerAxis = 0;
  private steerVisual = 0;
  private offroad = false;
  private showGuides = true;
  private activeSection = SECTION_BLUEPRINTS[0].name;
  private currentCurve = 0;
  private currentCameraX = 0;
  private roadCenterAhead = 0;
  private curveStrength = 3;
  private currentViewHeading = 0;

  constructor(private readonly elements: RoadLabElements) {
    const ctx = elements.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Road Lab 2D context unavailable");
    }
    this.ctx = ctx;
    this.input = new LabInput(elements);
    this.track = buildTrack(this.curveStrength);
    this.elements.curveStrength.value = this.curveStrength.toFixed(1);
    this.elements.curveStrengthValue.textContent = `${this.curveStrength.toFixed(1)}x`;
    this.elements.curveStrength.addEventListener("input", this.handleCurveStrengthInput);
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  start(): void {
    this.lastFrameMs = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.input.destroy();
    this.elements.curveStrength.removeEventListener("input", this.handleCurveStrengthInput);
    window.removeEventListener("resize", this.resize);
  }

  private readonly handleCurveStrengthInput = (): void => {
    const nextStrength = clamp(Number(this.elements.curveStrength.value) || this.curveStrength, 0.5, 12);
    this.curveStrength = nextStrength;
    this.elements.curveStrengthValue.textContent = `${nextStrength.toFixed(1)}x`;
    this.track = buildTrack(this.curveStrength);
    this.resetToSection(this.activeSection);
  };

  private readonly resize = (): void => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.elements.canvas.width = Math.floor(this.width * dpr);
    this.elements.canvas.height = Math.floor(this.height * dpr);
    this.elements.canvas.style.width = `${this.width}px`;
    this.elements.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  };

  private readonly tick = (timestamp: number): void => {
    const deltaMs = Math.min(64, timestamp - this.lastFrameMs);
    this.lastFrameMs = timestamp;
    this.accumulatorMs += deltaMs;

    let substeps = 0;
    while (this.accumulatorMs >= FIXED_STEP_MS && substeps < MAX_SUBSTEPS) {
      this.update(FIXED_STEP_MS / 1000);
      this.accumulatorMs -= FIXED_STEP_MS;
      substeps += 1;
    }
    if (substeps === MAX_SUBSTEPS && this.accumulatorMs >= FIXED_STEP_MS) {
      this.accumulatorMs = 0;
    }

    this.render();
    this.raf = requestAnimationFrame(this.tick);
  };

  private update(deltaSeconds: number): void {
    if (this.input.consumePressed("g")) {
      this.showGuides = !this.showGuides;
    }
    if (this.input.consumePressed("r")) {
      this.resetToSection(SECTION_BLUEPRINTS[0].name);
    }
    if (this.input.consumePressed("1")) {
      this.resetToSection("Launch Straight");
    }
    if (this.input.consumePressed("2")) {
      this.resetToSection("Grand Right Arc");
    }
    if (this.input.consumePressed("3")) {
      this.resetToSection("Compression Right");
    }
    if (this.input.consumePressed("4")) {
      this.resetToSection("Grand Left Arc");
    }
    if (this.input.consumePressed("5")) {
      this.resetToSection("Tight Left Bend");
    }

    const input = this.input.snapshot();
    const speedRatio = this.speed / MAX_SPEED;

    if (input.accel) {
      this.speed = clamp(this.speed + ACCEL_RATE * deltaSeconds, 0, MAX_SPEED);
    } else if (input.brake) {
      this.speed = clamp(this.speed - BRAKE_RATE * deltaSeconds, 0, MAX_SPEED);
    } else {
      this.speed = clamp(this.speed - COAST_RATE * deltaSeconds, 0, MAX_SPEED);
    }

    const sample = sampleTrack(this.track, this.playerZ);
    this.activeSection = sample.sectionName;
    this.currentCurve = sample.curve;

    this.steerAxis += (input.steer - this.steerAxis) * Math.min(1, deltaSeconds * (input.steer === 0 ? 8.5 : 12));
    const steerAccel = this.steerAxis * (STEER_ACCEL - speedRatio * 0.75 + (input.brake ? 0.22 : 0));
    const curveAccel = -sample.curve * (6 + speedRatio * CURVE_FORCE);
    const curveReference = Math.max(0.01, 0.018 * this.curveStrength);
    const curveActivity = clamp(Math.abs(sample.curve) / curveReference, 0, 1);
    const lateralGripAccel =
      -this.playerLatVel *
      (LATERAL_BASE_GRIP +
        (1 - curveActivity) * LATERAL_STRAIGHT_GRIP +
        (input.steer === 0 ? LATERAL_NEUTRAL_GRIP : 0) +
        (input.brake ? 1.1 : 0));
    const residualDamping = Math.exp(-0.4 * deltaSeconds);

    this.playerLatVel += (steerAccel + curveAccel + lateralGripAccel) * deltaSeconds;
    this.playerLatVel = clamp(this.playerLatVel * residualDamping, -LATERAL_CLAMP, LATERAL_CLAMP);
    this.playerLaneX = clamp(this.playerLaneX + this.playerLatVel * deltaSeconds, -PLAYER_LANE_CLAMP, PLAYER_LANE_CLAMP);

    this.offroad = Math.abs(this.playerLaneX) > DRIVABLE_LIMIT;
    if (this.offroad) {
      this.speed = Math.max(0, this.speed - OFFROAD_RATE * (0.7 + speedRatio) * deltaSeconds);
      this.playerLatVel *= 0.985;
    }

    this.steerVisual += (this.steerAxis - this.steerVisual) * Math.min(1, deltaSeconds * 9.5);
    this.playerZ = positiveMod(this.playerZ + this.speed * deltaSeconds, this.track.length);

    const currentRoad = sampleTrack(this.track, this.playerZ);
    const aheadRoad = sampleTrack(this.track, this.playerZ + 48);
    this.currentCameraX = currentRoad.centerX + this.playerLaneX * ROAD_HALF_WIDTH_WORLD * PLAYER_WORLD_LANE_SCALE;
    this.roadCenterAhead = aheadRoad.centerX - currentRoad.centerX;
    this.currentViewHeading = Math.atan2(this.roadCenterAhead, 48);
  }

  private resetToSection(sectionName: string): void {
    const sectionStart = this.track.sectionStarts[sectionName];
    if (sectionStart === undefined) {
      return;
    }
    this.playerZ = sectionStart;
    this.playerLaneX = 0;
    this.playerLatVel = 0;
    this.steerAxis = 0;
    this.steerVisual = 0;
    this.speed = 0;
    this.offroad = false;
  }

  private project(
    worldX: number,
    worldY: number,
    relativeZ: number,
    cameraX: number,
    cameraY: number,
    viewHeading: number
  ): ProjectedPoint | null {
    if (relativeZ <= 0.001) {
      return null;
    }
    const dx = worldX - cameraX;
    const sinHeading = Math.sin(viewHeading);
    const cosHeading = Math.cos(viewHeading);
    const viewX = dx * cosHeading - relativeZ * sinHeading;
    const viewZ = relativeZ * cosHeading + dx * sinHeading;
    if (viewZ <= 0.001) {
      return null;
    }
    const scale = this.cameraDepth / viewZ;
    return {
      x: this.width * 0.5 + scale * viewX * this.width * 0.5,
      y: this.height * 0.5 - scale * (worldY - cameraY) * this.height * 0.5,
      roadHalfWidth: scale * ROAD_HALF_WIDTH_WORLD * this.width * 0.5,
      scale
    };
  }

  private buildVisibleSegments(): ProjectedSegment[] {
    const segments: ProjectedSegment[] = [];
    const cameraSample = sampleTrack(this.track, this.playerZ);
    const cameraX = cameraSample.centerX + this.playerLaneX * ROAD_HALF_WIDTH_WORLD * PLAYER_WORLD_LANE_SCALE;
    const cameraY = cameraSample.y + CAMERA_HEIGHT;
    const headingSample = sampleTrack(this.track, this.playerZ + 48);
    const viewHeading = Math.atan2(headingSample.centerX - cameraSample.centerX, 48);
    const basePercent = positiveMod(this.playerZ, SEGMENT_LENGTH) / SEGMENT_LENGTH;
    let clipY = this.height;

    for (let n = 0; n < DRAW_DISTANCE; n += 1) {
      const dist1 = n * SEGMENT_LENGTH - basePercent * SEGMENT_LENGTH;
      const dist2 = dist1 + SEGMENT_LENGTH;
      if (dist2 <= CAMERA_NEAR_Z) {
        continue;
      }

      const z1 = this.playerZ + Math.max(CAMERA_NEAR_Z, dist1);
      const z2 = this.playerZ + Math.max(CAMERA_NEAR_Z + 0.001, dist2);
      const s1 = sampleTrack(this.track, z1);
      const s2 = sampleTrack(this.track, z2);
      const p1 = this.project(s1.centerX, s1.y, Math.max(CAMERA_NEAR_Z, dist1), cameraX, cameraY, viewHeading);
      const p2 = this.project(s2.centerX, s2.y, Math.max(CAMERA_NEAR_Z + 0.001, dist2), cameraX, cameraY, viewHeading);

      if (!p1 || !p2) {
        continue;
      }
      if (p2.y >= p1.y) {
        continue;
      }
      if (p1.y >= clipY) {
        continue;
      }
      if (p2.y > this.height || p1.y < -this.height * 0.3) {
        continue;
      }

      segments.push({
        index: s1.index,
        curve: s1.curve,
        sectionName: s1.sectionName,
        marker: s1.marker,
        p1,
        p2,
        clipY
      });
      clipY = p2.y;
    }

    return segments;
  }

  private fillQuad(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, fill: string): void {
    this.ctx.fillStyle = fill;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineTo(x3, y3);
    this.ctx.lineTo(x4, y4);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawBackground(horizonY: number): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, BG_TOP);
    gradient.addColorStop(0.7, BG_BOTTOM);
    gradient.addColorStop(1, BG_BOTTOM);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const lookAheadShift = clamp(this.currentViewHeading * this.width * 0.34, -this.width * 0.18, this.width * 0.18);
    const drawBand = (baseY: number, color: string, profile: number[], span: number, shift: number): void => {
      const startX = -span * 1.4 + shift;
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(startX, this.height);
      for (let repeat = 0; repeat < 4; repeat += 1) {
        const offset = startX + repeat * span;
        for (let i = 0; i < profile.length; i += 1) {
          const px = offset + (i / (profile.length - 1)) * span;
          const py = baseY - profile[i] * this.height;
          this.ctx.lineTo(px, py);
        }
      }
      this.ctx.lineTo(startX + span * 4, this.height);
      this.ctx.closePath();
      this.ctx.fill();
    };

    this.ctx.fillStyle = GRASS_A;
    this.ctx.fillRect(0, horizonY, this.width, this.height - horizonY);
    drawBand(horizonY + this.height * 0.03, "#58759b", [0.04, 0.1, 0.05, 0.13, 0.07, 0.11], this.width * 0.7, lookAheadShift * 0.55);
    drawBand(horizonY + this.height * 0.055, "#3a7d49", [0.08, 0.16, 0.07, 0.21, 0.08, 0.15], this.width * 0.6, lookAheadShift);
  }

  private drawRoad(segments: readonly ProjectedSegment[]): void {
    if (segments.length === 0) {
      return;
    }

    for (let i = segments.length - 1; i >= 0; i -= 1) {
      const segment = segments[i];
      const grass = i % 6 < 3 ? GRASS_A : GRASS_B;
      const road = i > segments.length * 0.72 ? ASPHALT_FAR : ASPHALT;
      const rumble = (segment.index & 1) === 0 ? RUMBLE_A : RUMBLE_B;
      const shoulder1 = segment.p1.roadHalfWidth * 1.08;
      const shoulder2 = segment.p2.roadHalfWidth * 1.08;

      this.fillQuad(0, segment.p1.y, this.width, segment.p1.y, this.width, segment.p2.y, 0, segment.p2.y, grass);
      this.fillQuad(
        segment.p1.x - shoulder1,
        segment.p1.y,
        segment.p1.x - segment.p1.roadHalfWidth,
        segment.p1.y,
        segment.p2.x - segment.p2.roadHalfWidth,
        segment.p2.y,
        segment.p2.x - shoulder2,
        segment.p2.y,
        rumble
      );
      this.fillQuad(
        segment.p1.x + segment.p1.roadHalfWidth,
        segment.p1.y,
        segment.p1.x + shoulder1,
        segment.p1.y,
        segment.p2.x + shoulder2,
        segment.p2.y,
        segment.p2.x + segment.p2.roadHalfWidth,
        segment.p2.y,
        rumble
      );
      this.fillQuad(
        segment.p1.x - segment.p1.roadHalfWidth,
        segment.p1.y,
        segment.p1.x + segment.p1.roadHalfWidth,
        segment.p1.y,
        segment.p2.x + segment.p2.roadHalfWidth,
        segment.p2.y,
        segment.p2.x - segment.p2.roadHalfWidth,
        segment.p2.y,
        road
      );

      if (segment.index % 12 < 4) {
        const laneHalf1 = segment.p1.roadHalfWidth * 0.035;
        const laneHalf2 = segment.p2.roadHalfWidth * 0.035;
        this.fillQuad(
          segment.p1.x - laneHalf1,
          segment.p1.y,
          segment.p1.x + laneHalf1,
          segment.p1.y,
          segment.p2.x + laneHalf2,
          segment.p2.y,
          segment.p2.x - laneHalf2,
          segment.p2.y,
          STRIPE
        );
      }
    }

    const nearest = segments[0];
    const bottomCenter = clamp(nearest.p1.x + this.steerVisual * this.width * 0.005, -this.width * 0.4, this.width * 1.4);
    const roadHalf = this.width * ROAD_BOTTOM_HALF_WIDTH_SCREEN;
    const shoulderHalf = roadHalf * 1.08;

    this.fillQuad(0, nearest.p1.y, this.width, nearest.p1.y, this.width, this.height, 0, this.height, GRASS_NEAR);
    this.fillQuad(
      nearest.p1.x - nearest.p1.roadHalfWidth * 1.08,
      nearest.p1.y,
      nearest.p1.x - nearest.p1.roadHalfWidth,
      nearest.p1.y,
      bottomCenter - roadHalf,
      this.height,
      bottomCenter - shoulderHalf,
      this.height,
      (nearest.index & 1) === 0 ? RUMBLE_A : RUMBLE_B
    );
    this.fillQuad(
      nearest.p1.x + nearest.p1.roadHalfWidth,
      nearest.p1.y,
      nearest.p1.x + nearest.p1.roadHalfWidth * 1.08,
      nearest.p1.y,
      bottomCenter + shoulderHalf,
      this.height,
      bottomCenter + roadHalf,
      this.height,
      (nearest.index & 1) === 0 ? RUMBLE_A : RUMBLE_B
    );
    this.fillQuad(
      nearest.p1.x - nearest.p1.roadHalfWidth,
      nearest.p1.y,
      nearest.p1.x + nearest.p1.roadHalfWidth,
      nearest.p1.y,
      bottomCenter + roadHalf,
      this.height,
      bottomCenter - roadHalf,
      this.height,
      ASPHALT
    );
    this.fillQuad(
      nearest.p1.x - nearest.p1.roadHalfWidth * 0.035,
      nearest.p1.y,
      nearest.p1.x + nearest.p1.roadHalfWidth * 0.035,
      nearest.p1.y,
      bottomCenter + roadHalf * 0.035,
      this.height,
      bottomCenter - roadHalf * 0.035,
      this.height,
      STRIPE
    );
  }

  private drawMarkers(segments: readonly ProjectedSegment[]): void {
    for (let i = segments.length - 1; i >= 0; i -= 1) {
      const segment = segments[i];
      if (!segment.marker) {
        continue;
      }
      const size = Math.max(2, segment.p2.scale * this.height * 0.16);
      const leftX = segment.p2.x - segment.p2.roadHalfWidth * 1.22;
      const rightX = segment.p2.x + segment.p2.roadHalfWidth * 1.22;
      const baseY = segment.p2.y;

      this.ctx.fillStyle = "rgba(239, 241, 233, 0.9)";
      this.ctx.fillRect(leftX - size * 0.18, baseY - size * 1.1, size * 0.36, size * 1.1);
      this.ctx.fillRect(rightX - size * 0.18, baseY - size * 1.1, size * 0.36, size * 1.1);

      this.ctx.fillStyle = i % 8 < 4 ? "rgba(255, 170, 72, 0.95)" : "rgba(85, 194, 255, 0.95)";
      this.ctx.fillRect(leftX - size * 0.46, baseY - size * 1.55, size * 0.92, size * 0.38);
      this.ctx.fillRect(rightX - size * 0.46, baseY - size * 1.55, size * 0.92, size * 0.38);
    }
  }

  private drawPlayerCar(): void {
    const carWidth = Math.min(this.width, this.height) * 0.135;
    const carHeight = carWidth * 1.42;
    const x = this.width * 0.5 - carWidth * 0.5 + this.playerLaneX * carWidth * 0.04 + this.steerVisual * carWidth * 0.18;
    const y = this.height - carHeight - 24;
    const yaw = this.steerVisual * carWidth * 0.06;
    const roll = this.steerVisual * 0.055;
    const pivotX = x + carWidth * 0.5;
    const pivotY = y + carHeight * 0.64;

    this.ctx.save();
    this.ctx.translate(pivotX, pivotY);
    this.ctx.rotate(roll);
    this.ctx.translate(-pivotX, -pivotY);

    this.ctx.fillStyle = "#f2f6ff";
    this.ctx.beginPath();
    this.ctx.moveTo(x + yaw + carWidth * 0.12, y);
    this.ctx.lineTo(x + yaw + carWidth * 0.88, y);
    this.ctx.quadraticCurveTo(x + yaw + carWidth, y, x + yaw + carWidth, y + carHeight * 0.12);
    this.ctx.lineTo(x + yaw + carWidth, y + carHeight * 0.9);
    this.ctx.quadraticCurveTo(x + yaw + carWidth, y + carHeight, x + yaw + carWidth * 0.88, y + carHeight);
    this.ctx.lineTo(x + yaw + carWidth * 0.12, y + carHeight);
    this.ctx.quadraticCurveTo(x + yaw, y + carHeight, x + yaw, y + carHeight * 0.9);
    this.ctx.lineTo(x + yaw, y + carHeight * 0.12);
    this.ctx.quadraticCurveTo(x + yaw, y, x + yaw + carWidth * 0.12, y);
    this.ctx.fill();

    this.ctx.fillStyle = "#85a8d2";
    this.ctx.beginPath();
    this.ctx.moveTo(x + yaw + carWidth * 0.28, y + carHeight * 0.16);
    this.ctx.lineTo(x + yaw + carWidth * 0.72, y + carHeight * 0.16);
    this.ctx.lineTo(x + yaw + carWidth * 0.64, y + carHeight * 0.42);
    this.ctx.lineTo(x + yaw + carWidth * 0.36, y + carHeight * 0.42);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = "rgba(20, 26, 38, 0.9)";
    this.ctx.lineWidth = Math.max(2, carWidth * 0.03);
    this.ctx.beginPath();
    this.ctx.moveTo(x + yaw + carWidth * 0.2, y + carHeight * 0.62);
    this.ctx.lineTo(x + yaw + carWidth * 0.8, y + carHeight * 0.62);
    this.ctx.stroke();

    this.ctx.fillStyle = "#6d737d";
    this.ctx.fillRect(x + yaw + carWidth * 0.1, y + carHeight * 0.8, carWidth * 0.8, carHeight * 0.1);
    this.ctx.fillStyle = "#ec4951";
    this.ctx.fillRect(x + yaw + carWidth * 0.14, y + carHeight * 0.88, carWidth * 0.16, carHeight * 0.1);
    this.ctx.fillRect(x + yaw + carWidth * 0.7, y + carHeight * 0.88, carWidth * 0.16, carHeight * 0.1);

    this.ctx.restore();
  }

  private drawGuides(segments: readonly ProjectedSegment[], horizonY: number): void {
    if (!this.showGuides) {
      return;
    }

    this.ctx.strokeStyle = "rgba(120, 220, 255, 0.4)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    this.ctx.lineTo(this.width, horizonY);
    this.ctx.stroke();

    this.ctx.fillStyle = "rgba(255, 212, 88, 0.9)";
    for (const segment of segments) {
      this.ctx.beginPath();
      this.ctx.arc(segment.p2.x, segment.p2.y, Math.max(1.5, segment.p2.scale * 4), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private render(): void {
    const segments = this.buildVisibleSegments();
    const horizonY = segments.length > 0 ? clamp(segments[segments.length - 1].p2.y, this.height * 0.24, this.height * 0.62) : this.height * 0.44;

    this.drawBackground(horizonY);
    this.drawRoad(segments);
    this.drawMarkers(segments);
    this.drawPlayerCar();
    this.drawGuides(segments, horizonY);
    this.updateDebug(horizonY, segments.length);
  }

  private updateDebug(horizonY: number, visibleSegments: number): void {
    this.elements.debugReadout.textContent = [
      `build      ${LAB_VERSION}`,
      `section    ${this.activeSection}`,
      `curve str  ${this.curveStrength.toFixed(1)}x`,
      `speed      ${this.speed.toFixed(2)} seg/s`,
      `lane x     ${this.playerLaneX.toFixed(3)}`,
      `lat vel    ${this.playerLatVel.toFixed(3)}`,
      `curve      ${this.currentCurve.toFixed(4)}`,
      `offroad    ${this.offroad ? "YES" : "NO"}`,
      `camera x   ${this.currentCameraX.toFixed(3)}`,
      `ahead dx   ${this.roadCenterAhead.toFixed(3)}`,
      `view yaw   ${(this.currentViewHeading * 57.2958).toFixed(2)} deg`,
      `horizon y  ${horizonY.toFixed(1)}`,
      `segments   ${visibleSegments}`,
      `guides     ${this.showGuides ? "ON" : "OFF"}`
    ].join("\n");
  }
}
