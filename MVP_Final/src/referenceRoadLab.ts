// Reference-based pseudo-3D road lab adapted from Jake Gordon's javascript-racer
// (MIT licensed: https://github.com/jakesgordon/javascript-racer)
import { MvpAudio } from "./audio";

const FPS = 60;
const STEP = 1 / FPS;
const ROAD_WIDTH = 2000;
const SEGMENT_LENGTH = 200;
const RUMBLE_LENGTH = 3;
const LANES = 3;
const FIELD_OF_VIEW = 100;
const CAMERA_HEIGHT = 1000;
const DRAW_DISTANCE = 300;
const PRESENTATION_WIDTH = 720;
const PRESENTATION_HEIGHT = 540;
const STEER_RATE = 2.35;
const CENTRIFUGAL = 0.27;
const SKY_SPEED = 0.001;
const HILL_SPEED = 0.002;
const TREE_SPEED = 0.003;
const MAX_PLAYER_X = 2;
const OFFROAD_THRESHOLD = 1;
const PLAYER_RENDER_SCALE = 1.42;
const PLAYER_HITBOX_WIDTH = 0.24;
const TRAFFIC_HITBOX_WIDTH = 0.19;
const COIN_TARGET = 7;
const COIN_HITBOX_WIDTH = 0.24;
const TRAFFIC_LOOKAHEAD = 20;
const TRAFFIC_MIN_CARS = 18;
const TRAFFIC_MAX_CARS = 40;
type SectionId = "1" | "2" | "3" | "4" | "5";
type TurnDirection = "left" | "right";
type CornerRadius = "large" | "medium" | "hairpin";
type TrackId =
  | "reference_v1"
  | "reference_v2"
  | "reference_v3"
  | "track_1"
  | "lemans_hills"
  | "stage_flow"
  | "circuit_sketch"
  | "written_sequence"
  | "corner_dsl";

interface TrackMeta {
  id: TrackId;
  label: string;
  subhead: string;
  buildLabel: string;
  modelLabel: string;
}

interface PanelRefs {
  subhead: HTMLElement;
  debugReadout: HTMLElement;
  trackSelect: HTMLSelectElement;
  recipeEditor: HTMLTextAreaElement;
  recipeApplyButton: HTMLButtonElement;
  recipeResetButton: HTMLButtonElement;
  recipeStatus: HTMLElement;
  curveStrength: HTMLInputElement;
  curveStrengthValue: HTMLElement;
  pauseButton: HTMLButtonElement;
  stepButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  audioMusic: HTMLInputElement;
  audioMusicValue: HTMLElement;
  audioEngine: HTMLInputElement;
  audioEngineValue: HTMLElement;
  placementGroup: HTMLElement;
  placementSection: HTMLSelectElement;
  placementAsset: HTMLSelectElement;
  placementSide: HTMLSelectElement;
  placementPosition: HTMLInputElement;
  placementPositionValue: HTMLElement;
  placementOffset: HTMLInputElement;
  placementOffsetValue: HTMLElement;
  placementScale: HTMLInputElement;
  placementScaleValue: HTMLElement;
  placementList: HTMLSelectElement;
  placementAddButton: HTMLButtonElement;
  placementUpdateButton: HTMLButtonElement;
  placementDeleteButton: HTMLButtonElement;
  placementClearSectionButton: HTMLButtonElement;
  placementStatus: HTMLElement;
}

interface TouchRefs {
  left: HTMLButtonElement;
  right: HTMLButtonElement;
  accel: HTMLButtonElement;
  brake: HTMLButtonElement;
}

interface GameUiRefs {
  coinCounter: HTMLElement;
  coinCount: HTMLElement;
  audioMuteButton: HTMLButtonElement;
  splashOverlay: HTMLElement;
  splashStartButton: HTMLButtonElement;
  introOverlay: HTMLElement;
  introStartButton: HTMLButtonElement;
  victoryOverlay: HTMLElement;
  victoryRestartButton: HTMLButtonElement;
}

interface Point3 {
  x: number;
  y: number;
  z: number;
}

interface CameraPoint {
  x: number;
  y: number;
  z: number;
}

interface ScreenPoint {
  x: number;
  y: number;
  w: number;
  scale: number;
}

interface SegmentPoint {
  world: Point3;
  camera: CameraPoint;
  screen: ScreenPoint;
}

interface SegmentColor {
  road: string;
  grass: string;
  rumble: string;
  lane?: string;
}

interface Segment {
  index: number;
  p1: SegmentPoint;
  p2: SegmentPoint;
  curve: number;
  color: SegmentColor;
  sectionId: SectionId;
  sectionName: string;
  props: RoadsideProp[];
  cars: TrafficCar[];
}

interface VisibleRoadSlice {
  segment: Segment;
  fog: number;
  distance: number;
  clipY: number;
}

type RoadsidePropType =
  | "pylon"
  | "block"
  | "cluster"
  | "tree"
  | "turnMarker"
  | "proxyBarrier"
  | "proxyFlagman"
  | "proxyGrassLow"
  | "proxyGrassTall";
type RoadsideSpriteKey =
  | "tracksideMass"
  | "grandstandMass"
  | "signBlock"
  | "pylon"
  | "turnMarkerLeft"
  | "turnMarkerRight";

interface RoadsideProp {
  offset: number;
  type: RoadsidePropType;
  variant: number;
  scale: number;
  sprite?: JakeSpriteRect;
  placementId?: string;
}

interface RoadsideSpriteMeta {
  src: string;
  spriteScale: number;
}

interface JakeSpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type PlacementAssetId =
  | "jake_column"
  | "jake_billboard"
  | "jake_palm"
  | "jake_tree"
  | "jake_boulder"
  | "jake_bush"
  | "proxy_barrier"
  | "proxy_flagman"
  | "proxy_grass_low"
  | "proxy_grass_tall";

type PlacementSide = "left" | "right";

interface TrackPlacement {
  id: string;
  sectionId: SectionId;
  t: number;
  side: PlacementSide;
  offset: number;
  scale: number;
  asset: PlacementAssetId;
}

interface RoadsideTypeWeights {
  pylon: number;
  block: number;
  cluster: number;
  tree: number;
}

interface SectionRoadsideProfile {
  nearSpawn: number;
  farSpawn: number;
  nearOffsetMin: number;
  nearOffsetMax: number;
  farOffsetMin: number;
  farOffsetMax: number;
  nearScaleMin: number;
  nearScaleMax: number;
  farScaleMin: number;
  farScaleMax: number;
  nearTypes: RoadsideTypeWeights;
  farTypes: RoadsideTypeWeights;
  markerOffset: number;
  markerScale: number;
}

interface TrafficCar {
  offset: number;
  z: number;
  speed: number;
  percent: number;
  sprite: JakeSpriteRect;
  scale: number;
}

interface TrackCoin {
  z: number;
  offset: number;
  lap: number;
  seed: number;
}

interface ScreenCoinSample {
  x: number;
  y: number;
  size: number;
}

interface CoinAnimation {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startSize: number;
  endSize: number;
  progress: number;
}

interface SectionMarker {
  id: SectionId;
  name: string;
  startIndex: number;
}

interface Keys {
  left: boolean;
  right: boolean;
  faster: boolean;
  slower: boolean;
}

interface RecipeSection {
  id: SectionId;
  name: string;
  commands: RecipeCommand[];
}

type RecipeCommand =
  | { kind: "straight"; length: number; height: number }
  | { kind: "hill"; length: number; height: number }
  | { kind: "road"; enter: number; hold: number; leave: number; curve: number; height: number }
  | { kind: "arc"; direction: TurnDirection; angle: number; radius: CornerRadius; height: number; stretch: number }
  | { kind: "hairpin"; direction: TurnDirection; height: number }
  | { kind: "chicane"; direction: TurnDirection }
  | { kind: "reset_elevation"; enter: number; hold: number; leave: number };

const COLORS = {
  skyTop: "#15224d",
  skyBottom: "#f4b27a",
  haze: "rgba(255, 205, 160, 0.35)",
  mountainFar: "#47668d",
  mountainNear: "#2f8650",
  treeLine: "#182419",
  fog: "rgba(20, 30, 38, 0.14)",
  horizonStructureFar: "rgba(24, 31, 43, 0.38)",
  horizonStructureNear: "rgba(18, 24, 34, 0.62)",
  markerPost: "#f5efe1",
  markerBand: "#f0a85d",
  distanceBoard: "#f5cf68",
  distanceBoardText: "#293246",
  treeDark: "#17301f",
  treeMid: "#245333",
  propWarm: "#cb7d54",
  propCool: "#8ba7c6",
  propPale: "#e6e0cf",
  propDark: "#31414d",
  propGrass: "#4d7e4f",
  light: {
    road: "#656d79",
    grass: "#214c2f",
    rumble: "#d2815c",
    lane: "rgba(244, 240, 231, 0.72)"
  },
  dark: {
    road: "#5a6270",
    grass: "#173b24",
    rumble: "#d9ddc8"
  },
  start: {
    road: "#eef4ff",
    grass: "#eef4ff",
    rumble: "#eef4ff"
  },
  finish: {
    road: "#171b21",
    grass: "#171b21",
    rumble: "#171b21"
  }
} satisfies Record<string, string | SegmentColor>;

const ROAD = {
  LENGTH: { SHORT: 25, MEDIUM: 50, LONG: 100 },
  HILL: { LOW: 20, MEDIUM: 40, HIGH: 60 },
  CURVE: { EASY: 2, MEDIUM: 4, HARD: 6 }
};

const STAGE = {
  LENGTH: { XS: 8, SHORT: 14, MEDIUM: 22, LONG: 32 },
  HILL: { LOW: 8, MEDIUM: 14, HIGH: 22 }
};

const CORNER_PROFILE: Record<CornerRadius, { enter: number; hold: number; leave: number; curve: number }> = {
  large: { enter: 7, hold: 18, leave: 7, curve: ROAD.CURVE.EASY * 0.82 },
  medium: { enter: 6, hold: 12, leave: 6, curve: ROAD.CURVE.MEDIUM * 0.78 },
  hairpin: { enter: 8, hold: 18, leave: 8, curve: ROAD.CURVE.HARD * 0.84 }
};

const ROADSIDE_SPRITES: Record<RoadsideSpriteKey, RoadsideSpriteMeta> = {
  tracksideMass: {
    src: "/art/Untitled-4_0000_trackside_mass.png",
    spriteScale: 1.55
  },
  grandstandMass: {
    src: "/art/Untitled-4_0001_grandstand_mass.png",
    spriteScale: 1.75
  },
  signBlock: {
    src: "/art/Untitled-4_0003_sign_block.png",
    spriteScale: 1.15
  },
  pylon: {
    src: "/art/Untitled-4_0004_pylon.png",
    spriteScale: 0.95
  },
  turnMarkerLeft: {
    src: "/art/Untitled-4_0005_turn_marker_left.png",
    spriteScale: 1.35
  },
  turnMarkerRight: {
    src: "/art/Untitled-4_0006_turn_marker_right.png",
    spriteScale: 1.35
  }
};

const JAKE_BACKGROUND = {
  hills: { x: 5, y: 5, w: 1280, h: 480 },
  sky: { x: 5, y: 495, w: 1280, h: 480 },
  trees: { x: 5, y: 985, w: 1280, h: 480 }
} as const;

const SECTION_ROADSIDE: Record<SectionId, SectionRoadsideProfile> = {
  "1": {
    nearSpawn: 0.08,
    farSpawn: 0.14,
    nearOffsetMin: 1.25,
    nearOffsetMax: 1.9,
    farOffsetMin: 2.8,
    farOffsetMax: 4.9,
    nearScaleMin: 1.8,
    nearScaleMax: 2.6,
    farScaleMin: 2.2,
    farScaleMax: 3.4,
    nearTypes: { pylon: 0.04, block: 0.02, cluster: 0.34, tree: 0.6 },
    farTypes: { pylon: 0.01, block: 0.01, cluster: 0.24, tree: 0.74 },
    markerOffset: 1.18,
    markerScale: 5.3
  },
  "2": {
    nearSpawn: 0.14,
    farSpawn: 0.12,
    nearOffsetMin: 1.18,
    nearOffsetMax: 1.8,
    farOffsetMin: 2.5,
    farOffsetMax: 4.2,
    nearScaleMin: 2.0,
    nearScaleMax: 3.0,
    farScaleMin: 2.0,
    farScaleMax: 3.0,
    nearTypes: { pylon: 0.12, block: 0.04, cluster: 0.2, tree: 0.64 },
    farTypes: { pylon: 0.02, block: 0.02, cluster: 0.18, tree: 0.78 },
    markerOffset: 1.14,
    markerScale: 5.7
  },
  "3": {
    nearSpawn: 0.2,
    farSpawn: 0.08,
    nearOffsetMin: 1.12,
    nearOffsetMax: 1.7,
    farOffsetMin: 2.3,
    farOffsetMax: 3.8,
    nearScaleMin: 2.1,
    nearScaleMax: 3.1,
    farScaleMin: 1.9,
    farScaleMax: 2.8,
    nearTypes: { pylon: 0.14, block: 0.05, cluster: 0.13, tree: 0.68 },
    farTypes: { pylon: 0.03, block: 0.03, cluster: 0.16, tree: 0.78 },
    markerOffset: 1.12,
    markerScale: 5.8
  },
  "4": {
    nearSpawn: 0.12,
    farSpawn: 0.18,
    nearOffsetMin: 1.2,
    nearOffsetMax: 1.85,
    farOffsetMin: 2.9,
    farOffsetMax: 5.4,
    nearScaleMin: 1.9,
    nearScaleMax: 2.8,
    farScaleMin: 2.5,
    farScaleMax: 3.8,
    nearTypes: { pylon: 0.06, block: 0.02, cluster: 0.28, tree: 0.64 },
    farTypes: { pylon: 0.01, block: 0.01, cluster: 0.24, tree: 0.74 },
    markerOffset: 1.16,
    markerScale: 5.5
  },
  "5": {
    nearSpawn: 0.18,
    farSpawn: 0.1,
    nearOffsetMin: 1.14,
    nearOffsetMax: 1.75,
    farOffsetMin: 2.4,
    farOffsetMax: 4.0,
    nearScaleMin: 2.0,
    nearScaleMax: 3.0,
    farScaleMin: 2.0,
    farScaleMax: 3.0,
    nearTypes: { pylon: 0.09, block: 0.04, cluster: 0.19, tree: 0.68 },
    farTypes: { pylon: 0.02, block: 0.02, cluster: 0.16, tree: 0.8 },
    markerOffset: 1.12,
    markerScale: 5.6
  }
};

const JAKE_SPRITES = {
  PALM_TREE: { x: 5, y: 5, w: 215, h: 540 },
  TREE1: { x: 625, y: 5, w: 360, h: 360 },
  DEAD_TREE1: { x: 5, y: 555, w: 135, h: 332 },
  COLUMN: { x: 995, y: 5, w: 200, h: 315 },
  TREE2: { x: 1205, y: 5, w: 282, h: 295 },
  DEAD_TREE2: { x: 1205, y: 490, w: 150, h: 260 },
  BOULDER3: { x: 230, y: 280, w: 320, h: 220 },
  BOULDER2: { x: 621, y: 897, w: 298, h: 140 },
  BOULDER1: { x: 1205, y: 760, w: 168, h: 248 },
  BUSH1: { x: 5, y: 1097, w: 240, h: 155 },
  CACTUS: { x: 929, y: 897, w: 235, h: 118 },
  BUSH2: { x: 255, y: 1097, w: 232, h: 152 },
  STUMP: { x: 995, y: 330, w: 195, h: 140 },
  BILLBOARD01: { x: 625, y: 375, w: 300, h: 170 },
  BILLBOARD02: { x: 245, y: 1262, w: 215, h: 220 },
  BILLBOARD03: { x: 5, y: 1262, w: 230, h: 220 },
  BILLBOARD04: { x: 1205, y: 310, w: 268, h: 170 },
  BILLBOARD05: { x: 5, y: 897, w: 298, h: 190 },
  BILLBOARD06: { x: 488, y: 555, w: 298, h: 190 },
  BILLBOARD07: { x: 313, y: 897, w: 298, h: 190 },
  BILLBOARD08: { x: 230, y: 5, w: 385, h: 265 },
  BILLBOARD09: { x: 150, y: 555, w: 328, h: 282 },
  SEMI: { x: 1365, y: 490, w: 122, h: 144 },
  TRUCK: { x: 1365, y: 644, w: 100, h: 78 },
  CAR03: { x: 1383, y: 760, w: 88, h: 55 },
  CAR02: { x: 1383, y: 825, w: 80, h: 59 },
  CAR04: { x: 1383, y: 894, w: 80, h: 57 },
  CAR01: { x: 1205, y: 1018, w: 80, h: 56 },
  PLAYER_UPHILL_LEFT: { x: 1383, y: 961, w: 80, h: 45 },
  PLAYER_UPHILL_STRAIGHT: { x: 1295, y: 1018, w: 80, h: 45 },
  PLAYER_UPHILL_RIGHT: { x: 1385, y: 1018, w: 80, h: 45 },
  PLAYER_LEFT: { x: 995, y: 480, w: 80, h: 41 },
  PLAYER_STRAIGHT: { x: 1085, y: 480, w: 80, h: 41 },
  PLAYER_RIGHT: { x: 995, y: 531, w: 80, h: 41 }
} satisfies Record<string, JakeSpriteRect>;

const JAKE_BILLBOARDS = [
  JAKE_SPRITES.BILLBOARD04,
  JAKE_SPRITES.BILLBOARD06,
  JAKE_SPRITES.BILLBOARD09
];

const JAKE_CLUSTER_SET = [
  JAKE_SPRITES.BUSH1,
  JAKE_SPRITES.BUSH2,
  JAKE_SPRITES.CACTUS,
  JAKE_SPRITES.STUMP,
  JAKE_SPRITES.BOULDER1,
  JAKE_SPRITES.BOULDER2,
  JAKE_SPRITES.BOULDER3
];

const JAKE_TREE_SET = [
  JAKE_SPRITES.TREE1,
  JAKE_SPRITES.TREE1,
  JAKE_SPRITES.TREE1,
  JAKE_SPRITES.TREE2,
  JAKE_SPRITES.DEAD_TREE1,
  JAKE_SPRITES.DEAD_TREE2,
  JAKE_SPRITES.PALM_TREE
];

const JAKE_TRAFFIC_SET = [
  JAKE_SPRITES.CAR01,
  JAKE_SPRITES.CAR02,
  JAKE_SPRITES.CAR03,
  JAKE_SPRITES.CAR04,
  JAKE_SPRITES.TRUCK,
  JAKE_SPRITES.SEMI
];

const JAKE_PLAYER_SPRITE_SCALE = 0.3 * (1 / JAKE_SPRITES.PLAYER_STRAIGHT.w);

const TRACK1_PLACEMENT_ASSETS: { id: PlacementAssetId; label: string }[] = [
  { id: "jake_column", label: "Jake Column" },
  { id: "jake_billboard", label: "Jake Billboard" },
  { id: "jake_palm", label: "Jake Palm Tree" },
  { id: "jake_tree", label: "Jake Tree" },
  { id: "jake_boulder", label: "Jake Boulder" },
  { id: "jake_bush", label: "Jake Bush" },
  { id: "proxy_barrier", label: "Proxy Barrier" },
  { id: "proxy_flagman", label: "Proxy Flagman" },
  { id: "proxy_grass_low", label: "Proxy Grass Low" },
  { id: "proxy_grass_tall", label: "Proxy Grass Tall" }
];

const TRACKS: TrackMeta[] = [
  {
    id: "reference_v1",
    label: "Reference v1 (Gold)",
    subhead: "First fun Jake Gordon-style baseline",
    buildLabel: "RoadLab Ref v1",
    modelLabel: "Jake Gordon baseline"
  },
  {
    id: "reference_v2",
    label: "Reference v2",
    subhead: "Gold baseline plus one extra bend and light elevation",
    buildLabel: "RoadLab Ref v2",
    modelLabel: "Jake Gordon baseline plus controlled delta"
  },
  {
    id: "reference_v3",
    label: "Reference v3 (Editable)",
    subhead: "Your editable route sandbox",
    buildLabel: "RoadLab Ref v3",
    modelLabel: "user-authored sandbox"
  },
  {
    id: "track_1",
    label: "Track 1",
    subhead: "Verbatim route promoted from your Reference v3 recipe",
    buildLabel: "RoadLab Track 1",
    modelLabel: "verbatim user-authored layout"
  },
  {
    id: "lemans_hills",
    label: "Le Mans Hills",
    subhead: "Authored reference baseline with hills",
    buildLabel: "RoadLab Ref v1.3.1 anchor",
    modelLabel: "authored reference baseline"
  },
  {
    id: "stage_flow",
    label: "Stage Flow",
    subhead: "Reference baseline with authored stage flow",
    buildLabel: "RoadLab Ref v1.4 stage flow",
    modelLabel: "reference baseline with stage run"
  },
  {
    id: "circuit_sketch",
    label: "Circuit Sketch",
    subhead: "Reference baseline with circuit sketch flow",
    buildLabel: "RoadLab Ref v1.5 circuit sketch",
    modelLabel: "reference baseline with circuit sketch"
  },
  {
    id: "written_sequence",
    label: "Written Sequence",
    subhead: "Reference baseline with authored written sequence",
    buildLabel: "RoadLab Ref v1.6 written sequence",
    modelLabel: "reference baseline with authored sequence"
  },
  {
    id: "corner_dsl",
    label: "Corner DSL",
    subhead: "Reference baseline with semantic corner authoring",
    buildLabel: "RoadLab Ref v1.7 corner dsl",
    modelLabel: "reference baseline with semantic corners"
  }
];

const REFERENCE_V3_RECIPE_STORAGE_KEY = "type7_roadlab_reference_v3_recipe";

const DEFAULT_REFERENCE_V3_RECIPE = `# Reference v3 recipe
# Commands:
# section <1-5> <name...>
# straight <length|number> [height]
# hill <length|number> <height>
# road <enter> <hold> <leave> <curve> [height]
# arc <left|right> <angle> <large|medium|hairpin> [height] [stretch]
# hairpin <left|right> [height]
# chicane <left|right>
# reset_elevation [enter] [hold] [leave]
#
# Tokens:
# lengths: xs short medium long
# heights: none low medium high

section 1 Launch Straight
straight medium

section 2 Grand Right Arc
road 100 200 100 4
straight short

section 3 Compression Right
road 50 50 50 6
straight short

section 4 Grand Left Arc
road 100 200 100 -4
straight short

section 5 Tight Left Bend
road 25 50 25 -6
straight medium`;

const TRACK_1_RECIPE = `# Track 1
section 1 Launch Straight
straight xs
straight xs
straight medium 5

section 2 Grand Right Arc
straight short
hairpin right
straight medium
road 100 200 100 4 -5
straight short
road 100 200 100 -2 5
road 100 200 100 2 -5
straight medium 5

section 3 Compression Right
road 50 50 50 5
straight medium -10
road 10 10 10 4 3
straight xs
road 10 10 10 -4
straight short -3

section 4 Grand Left Complex
road 100 200 100 -4 -5
straight short 5
road 40 80 40 5
straight xs
road 80 160 80 -3 20

section 5 Tight Left Bend
road 25 50 25 -6 -15
straight long 5
road 100 200 100 4 -5`;

const TRACK_1_PLACEMENTS_STORAGE_KEY = "type7_roadlab_track1_placements";

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max));
const percentRemaining = (n: number, total: number): number => (n % total) / total;
const accelerate = (value: number, amount: number, dt: number): number => value + amount * dt;
const interpolate = (a: number, b: number, t: number): number => a + (b - a) * t;
const easeIn = (a: number, b: number, percent: number): number => a + (b - a) * Math.pow(percent, 2);
const easeInOut = (a: number, b: number, percent: number): number => a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
const exponentialFog = (distance: number, density: number): number => 1 / Math.exp(distance * distance * density);
const increase = (start: number, increment: number, maximum: number): number => {
  let result = start + increment;
  while (result >= maximum) result -= maximum;
  while (result < 0) result += maximum;
  return result;
};
const seededUnit = (seed: number): number => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const createPoint = (z: number, y = 0): SegmentPoint => ({
  world: { x: 0, y, z },
  camera: { x: 0, y: 0, z: 0 },
  screen: { x: 0, y: 0, w: 0, scale: 0 }
});

const project = (
  point: SegmentPoint,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraDepth: number,
  width: number,
  height: number,
  roadWidth: number
): void => {
  point.camera.x = point.world.x - cameraX;
  point.camera.y = point.world.y - cameraY;
  point.camera.z = point.world.z - cameraZ;
  point.screen.scale = cameraDepth / Math.max(0.0001, point.camera.z);
  point.screen.x = Math.round((width * 0.5) + (point.screen.scale * point.camera.x * width * 0.5));
  point.screen.y = Math.round((height * 0.5) - (point.screen.scale * point.camera.y * height * 0.5));
  point.screen.w = Math.round(point.screen.scale * roadWidth * width * 0.5);
};

const rumbleWidth = (projectedRoadWidth: number, lanes: number): number => projectedRoadWidth / Math.max(6, 2 * lanes);
const laneMarkerWidth = (projectedRoadWidth: number, lanes: number): number => projectedRoadWidth / Math.max(32, 8 * lanes);

const drawPolygon = (
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  color: string
): void => {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.lineTo(x3, y3);
  context.lineTo(x4, y4);
  context.closePath();
  context.fill();
};

const drawSegment = (
  context: CanvasRenderingContext2D,
  width: number,
  lanes: number,
  x1: number,
  y1: number,
  w1: number,
  x2: number,
  y2: number,
  w2: number,
  fog: number,
  color: SegmentColor
): void => {
  const r1 = rumbleWidth(w1, lanes);
  const r2 = rumbleWidth(w2, lanes);
  const l1 = laneMarkerWidth(w1, lanes);
  const l2 = laneMarkerWidth(w2, lanes);

  context.fillStyle = color.grass;
  context.fillRect(0, y2, width, y1 - y2);

  drawPolygon(context, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble);
  drawPolygon(context, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble);
  drawPolygon(context, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);

  if (color.lane) {
    const laneWidth1 = (w1 * 2) / lanes;
    const laneWidth2 = (w2 * 2) / lanes;
    let laneX1 = x1 - w1 + laneWidth1;
    let laneX2 = x2 - w2 + laneWidth2;
    for (let lane = 1; lane < lanes; lane += 1) {
      drawPolygon(
        context,
        laneX1 - l1 / 2,
        y1,
        laneX1 + l1 / 2,
        y1,
        laneX2 + l2 / 2,
        y2,
        laneX2 - l2 / 2,
        y2,
        color.lane
      );
      laneX1 += laneWidth1;
      laneX2 += laneWidth2;
    }
  }

  if (fog < 1) {
    context.globalAlpha = 1 - fog;
    context.fillStyle = COLORS.fog;
    context.fillRect(0, y2, width, y1 - y2);
    context.globalAlpha = 1;
  }
};

interface ReferenceRoadLabOptions {
  canvas: HTMLCanvasElement;
  panels: PanelRefs;
  touch: TouchRefs;
  ui: GameUiRefs;
}

export class ReferenceRoadLab {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly panels: PanelRefs;
  private readonly touch: TouchRefs;
  private readonly ui: GameUiRefs;
  private width = PRESENTATION_WIDTH;
  private height = PRESENTATION_HEIGHT;
  private pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  private readonly cameraDepth = 1 / Math.tan((FIELD_OF_VIEW / 2) * (Math.PI / 180));
  private readonly playerZ = CAMERA_HEIGHT * this.cameraDepth;
  private readonly maxSpeed = SEGMENT_LENGTH / STEP;
  private readonly accel = this.maxSpeed / 5;
  private readonly breaking = -this.maxSpeed;
  private readonly decel = -this.maxSpeed / 5;
  private readonly offRoadDecel = -this.maxSpeed / 2;
  private readonly offRoadLimit = this.maxSpeed / 4;
  private segments: Segment[] = [];
  private sections: SectionMarker[] = [];
  private trackLength = 0;
  private position = 0;
  private speed = 0;
  private playerX = 0;
  private cars: TrafficCar[] = [];
  private lastTimestamp = 0;
  private accumulator = 0;
  private animationFrameId = 0;
  private paused = false;
  private stepRequested = false;
  private curveStrength = 1;
  private selectedTrack: TrackId = "track_1";
  private referenceV3Recipe = DEFAULT_REFERENCE_V3_RECIPE;
  private track1Placements: TrackPlacement[] = [];
  private selectedPlacementId = "";
  private splashSeen = false;
  private gameStarted = false;
  private victory = false;
  private victoryPending = false;
  private coinsCollected = 0;
  private lapNumber = 1;
  private activeCoin: TrackCoin | null = null;
  private activeCoinScreen: ScreenCoinSample | null = null;
  private coinAnimation: CoinAnimation | null = null;
  private skyOffset = 0;
  private hillOffset = 0;
  private treeOffset = 0;
  private readonly roadsideImages: Partial<Record<RoadsideSpriteKey, HTMLImageElement>> = {};
  private readonly jakeSpritesImage: HTMLImageElement = new Image();
  private readonly jakeBackgroundImage: HTMLImageElement = new Image();
  private readonly coinImage: HTMLImageElement = new Image();
  private readonly audio = new MvpAudio();
  private readonly keys: Keys = { left: false, right: false, faster: false, slower: false };
  private readonly handleResize = () => this.resize();
  private readonly handleKeyDown = (event: KeyboardEvent) => this.onKeyDown(event);
  private readonly handleKeyUp = (event: KeyboardEvent) => this.onKeyUp(event);

  constructor(options: ReferenceRoadLabOptions) {
    const context = options.canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D unavailable");
    }

    this.canvas = options.canvas;
    this.context = context;
    this.panels = options.panels;
    this.touch = options.touch;
    this.ui = options.ui;
    this.preloadRoadsideSprites();
    this.preloadJakeAssets();
    this.referenceV3Recipe = this.loadReferenceV3Recipe();
    this.track1Placements = this.loadTrack1Placements();
    this.rebuildTrack();
    this.restartRun(true);
  }

  public start(): void {
    this.resize();
    this.bindUi();
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.animationFrameId = window.requestAnimationFrame(this.frame);
  }

  public destroy(): void {
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.audio.destroy();
  }

  private bindUi(): void {
    const clearKeysOnFocus = () => {
      this.clearInputState();
    };

    this.panels.trackSelect.addEventListener("focus", clearKeysOnFocus);
    this.panels.recipeEditor.addEventListener("focus", clearKeysOnFocus);
    this.panels.curveStrength.addEventListener("focus", clearKeysOnFocus);
    this.panels.placementSection.addEventListener("focus", clearKeysOnFocus);
    this.panels.placementAsset.addEventListener("focus", clearKeysOnFocus);
    this.panels.placementSide.addEventListener("focus", clearKeysOnFocus);
    this.panels.placementPosition.addEventListener("focus", clearKeysOnFocus);
    this.panels.placementOffset.addEventListener("focus", clearKeysOnFocus);
    this.panels.placementScale.addEventListener("focus", clearKeysOnFocus);
    this.panels.placementList.addEventListener("focus", clearKeysOnFocus);

    this.panels.trackSelect.addEventListener("change", () => {
      this.selectedTrack = this.panels.trackSelect.value as TrackId;
      this.rebuildTrack();
      this.restartRun(false);
      this.syncTrackUi();
    });

    this.panels.recipeEditor.value = this.referenceV3Recipe;
    this.panels.recipeApplyButton.addEventListener("click", () => {
      this.applyReferenceV3Recipe();
    });
    this.panels.recipeResetButton.addEventListener("click", () => {
      this.referenceV3Recipe = DEFAULT_REFERENCE_V3_RECIPE;
      this.panels.recipeEditor.value = this.referenceV3Recipe;
      this.persistReferenceV3Recipe();
      this.setRecipeStatus("Reference v3 recipe reset to the gold baseline.", false);
      if (this.selectedTrack === "reference_v3") {
        this.rebuildTrack();
        this.restartRun(false);
      }
    });

    this.panels.curveStrength.addEventListener("input", () => {
      this.curveStrength = Number(this.panels.curveStrength.value);
      this.panels.curveStrengthValue.textContent = `${this.curveStrength.toFixed(1)}x`;
      this.rebuildTrack();
      this.restartRun(false);
    });

    this.panels.pauseButton.addEventListener("click", () => {
      this.paused = !this.paused;
      this.syncPauseButton();
    });

    this.panels.stepButton.addEventListener("click", () => {
      this.stepRequested = true;
    });

    this.panels.resetButton.addEventListener("click", () => {
      this.restartRun(false);
    });

    this.panels.audioMusic.addEventListener("input", () => {
      const value = Number(this.panels.audioMusic.value);
      this.audio.setMusicVolume(value);
      this.panels.audioMusicValue.textContent = value.toFixed(2);
    });

    this.panels.audioEngine.addEventListener("input", () => {
      const value = Number(this.panels.audioEngine.value);
      this.audio.setEngineVolume(value);
      this.panels.audioEngineValue.textContent = value.toFixed(2);
    });

    this.ui.audioMuteButton.addEventListener("click", () => {
      this.audio.setMuted(!this.audio.isMuted());
      this.syncAudioUi();
    });

    this.ui.splashStartButton.addEventListener("click", () => {
      this.splashSeen = true;
      this.syncGameUi();
    });

    this.ui.introStartButton.addEventListener("click", () => {
      this.startRun();
    });

    this.ui.victoryRestartButton.addEventListener("click", () => {
      this.restartRun(false);
    });

    this.panels.placementSection.innerHTML = this.sectionsMarkup();
    this.panels.placementAsset.innerHTML = TRACK1_PLACEMENT_ASSETS.map(
      (asset) => `<option value="${asset.id}">${asset.label}</option>`
    ).join("");
    this.panels.placementSide.innerHTML = `<option value="left">Left</option><option value="right">Right</option>`;
    this.panels.placementPosition.addEventListener("input", () => {
      this.panels.placementPositionValue.textContent = `${Math.round(Number(this.panels.placementPosition.value) * 100)}%`;
    });
    this.panels.placementOffset.addEventListener("input", () => {
      this.panels.placementOffsetValue.textContent = Number(this.panels.placementOffset.value).toFixed(2);
    });
    this.panels.placementScale.addEventListener("input", () => {
      this.panels.placementScaleValue.textContent = Number(this.panels.placementScale.value).toFixed(2);
    });
    this.panels.placementList.addEventListener("change", () => {
      this.selectedPlacementId = this.panels.placementList.value;
      this.syncPlacementEditorFromSelection();
      this.rebuildTrack();
      this.setPlacementStatus(this.selectedPlacementId ? "Placement selected." : "No placement selected.", false);
    });
    this.panels.placementAddButton.addEventListener("click", () => {
      this.addTrack1PlacementFromUi();
    });
    this.panels.placementUpdateButton.addEventListener("click", () => {
      this.updateTrack1PlacementFromUi();
    });
    this.panels.placementDeleteButton.addEventListener("click", () => {
      this.deleteSelectedTrack1Placement();
    });
    this.panels.placementClearSectionButton.addEventListener("click", () => {
      this.clearTrack1PlacementsForSection(this.panels.placementSection.value as SectionId);
    });
    this.panels.placementSection.addEventListener("change", () => {
      this.selectedPlacementId = "";
      this.syncPlacementList();
      this.setPlacementStatus("Section changed.", false);
      this.rebuildTrack();
    });

    this.bindTouchButton(this.touch.left, () => {
      this.keys.left = true;
    }, () => {
      this.keys.left = false;
    });
    this.bindTouchButton(this.touch.right, () => {
      this.keys.right = true;
    }, () => {
      this.keys.right = false;
    });
    this.bindTouchButton(this.touch.accel, () => {
      this.keys.faster = true;
    }, () => {
      this.keys.faster = false;
    });
    this.bindTouchButton(this.touch.brake, () => {
      this.keys.slower = true;
    }, () => {
      this.keys.slower = false;
    });

    this.panels.trackSelect.innerHTML = TRACKS.map((track) => `<option value="${track.id}">${track.label}</option>`).join("");
    this.panels.trackSelect.value = this.selectedTrack;
    this.setRecipeStatus("Select Reference v3, edit the recipe, then press Apply.", false);
    this.setPlacementStatus("Track 1 placement editor ready.", false);
    this.panels.curveStrength.value = this.curveStrength.toFixed(1);
    this.panels.curveStrengthValue.textContent = `${this.curveStrength.toFixed(1)}x`;
    this.panels.audioMusic.value = this.audio.getMusicVolume().toFixed(2);
    this.panels.audioMusicValue.textContent = this.audio.getMusicVolume().toFixed(2);
    this.panels.audioEngine.value = this.audio.getEngineVolume().toFixed(2);
    this.panels.audioEngineValue.textContent = this.audio.getEngineVolume().toFixed(2);
    this.panels.placementPosition.value = "0.5";
    this.panels.placementPositionValue.textContent = "50%";
    this.panels.placementOffset.value = "1.5";
    this.panels.placementOffsetValue.textContent = "1.50";
    this.panels.placementScale.value = "1.5";
    this.panels.placementScaleValue.textContent = "1.50";
    this.syncTrackUi();
    this.syncPlacementList();
    this.syncPauseButton();
    this.syncAudioUi();
    this.syncGameUi();
  }

  private bindTouchButton(element: HTMLButtonElement, onStart: () => void, onEnd: () => void): void {
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      onStart();
    });
    const end = (event: Event) => {
      event.preventDefault();
      onEnd();
    };
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
    element.addEventListener("pointerleave", end);
  }

  private syncPauseButton(): void {
    this.panels.pauseButton.textContent = this.paused ? "Resume" : "Pause";
  }

  private syncAudioUi(): void {
    const muted = this.audio.isMuted();
    this.ui.audioMuteButton.dataset.muted = muted ? "true" : "false";
    this.ui.audioMuteButton.setAttribute("aria-label", muted ? "Sound on" : "Sound off");
    this.ui.audioMuteButton.setAttribute("title", muted ? "Sound on" : "Sound off");
  }

  private startRun(): void {
    void this.audio.start();
    this.splashSeen = true;
    this.gameStarted = true;
    this.paused = false;
    this.clearInputState();
    this.syncPauseButton();
    this.syncGameUi();
  }

  private restartRun(showIntro: boolean): void {
    if (!showIntro && (this.gameStarted || this.victory || this.audio.hasStarted())) {
      void this.audio.start();
    }
    this.clearInputState();
    this.splashSeen = !showIntro;
    this.gameStarted = !showIntro;
    this.victory = false;
    this.victoryPending = false;
    this.paused = false;
    this.stepRequested = false;
    this.coinsCollected = 0;
    this.lapNumber = 1;
    this.activeCoin = null;
    this.activeCoinScreen = null;
    this.coinAnimation = null;
    this.resetToSection("1");
    this.spawnCoinForCurrentLap();
    this.syncPauseButton();
    this.syncGameUi();
  }

  private syncGameUi(): void {
    this.ui.coinCount.textContent = `${this.coinsCollected} / ${COIN_TARGET}`;
    this.ui.splashOverlay.classList.toggle("is-visible", !this.splashSeen && !this.gameStarted && !this.victory);
    this.ui.introOverlay.classList.toggle("is-visible", this.splashSeen && !this.gameStarted && !this.victory);
    this.ui.victoryOverlay.classList.toggle("is-visible", this.victory);
  }

  private getHudCoinTarget(): { x: number; y: number } {
    const canvasRect = this.canvas.getBoundingClientRect();
    const counterRect = this.ui.coinCounter.getBoundingClientRect();
    const scaleX = this.width / Math.max(1, canvasRect.width);
    const scaleY = this.height / Math.max(1, canvasRect.height);
    const iconCenterX = counterRect.left + 26;
    const iconCenterY = counterRect.top + counterRect.height * 0.5;

    return {
      x: (iconCenterX - canvasRect.left) * scaleX,
      y: (iconCenterY - canvasRect.top) * scaleY
    };
  }

  private updateCoinAnimation(dt: number): void {
    if (!this.coinAnimation) {
      return;
    }

    this.coinAnimation.progress = Math.min(1, this.coinAnimation.progress + dt / 0.6);
    if (this.coinAnimation.progress >= 1) {
      this.coinAnimation = null;
      if (this.victoryPending) {
        this.victoryPending = false;
        this.victory = true;
        this.paused = true;
        this.clearInputState();
        this.syncPauseButton();
        this.syncGameUi();
      }
    }
  }

  private spawnCoinForCurrentLap(): void {
    if (this.sections.length === 0 || this.trackLength <= 0) {
      this.activeCoin = null;
      return;
    }

    const section = this.sections[Math.floor(Math.random() * this.sections.length)] ?? this.sections[0];
    const sectionLength = Math.max(12, this.sectionLengthInSegments(section.id));
    const padding = Math.min(12, Math.max(4, Math.floor(sectionLength * 0.15)));
    const usableLength = Math.max(1, sectionLength - padding * 2);
    const segmentOffset = padding + Math.floor(Math.random() * usableLength);
    const laneOffsets = [-0.66, 0, 0.66];
    const laneOffset = laneOffsets[Math.floor(Math.random() * laneOffsets.length)] ?? 0;

    this.activeCoin = {
      z: ((section.startIndex + segmentOffset) * SEGMENT_LENGTH) + SEGMENT_LENGTH * 0.5,
      offset: clamp(laneOffset + ((Math.random() - 0.5) * 0.08), -0.85, 0.85),
      lap: this.lapNumber,
      seed: Math.random() * Math.PI * 2
    };
  }

  private tryCollectCoin(): void {
    if (!this.activeCoin) {
      return;
    }

    const playerFrontZ = increase(this.position, this.playerZ, this.trackLength);
    let delta = this.activeCoin.z - playerFrontZ;
    if (delta > this.trackLength / 2) {
      delta -= this.trackLength;
    } else if (delta < -this.trackLength / 2) {
      delta += this.trackLength;
    }

    if (Math.abs(delta) > SEGMENT_LENGTH * 0.65) {
      return;
    }

    if (!overlap(this.playerX, PLAYER_HITBOX_WIDTH, this.activeCoin.offset, COIN_HITBOX_WIDTH, 0.85)) {
      return;
    }

    const source = this.activeCoinScreen ?? {
      x: this.width * 0.5,
      y: this.height * 0.58,
      size: Math.max(44, this.width * 0.07)
    };
    const target = this.getHudCoinTarget();

    this.coinAnimation = {
      startX: source.x,
      startY: source.y,
      endX: target.x,
      endY: target.y,
      startSize: source.size,
      endSize: Math.max(26, this.width * 0.036),
      progress: 0
    };

    this.coinsCollected += 1;
    this.audio.playCoin();
    this.activeCoin = null;
    this.activeCoinScreen = null;

    if (this.coinsCollected >= COIN_TARGET) {
      this.victoryPending = true;
      this.paused = true;
      this.clearInputState();
      this.syncPauseButton();
    }

    this.syncGameUi();
  }

  private getTrackMeta(): TrackMeta {
    return TRACKS.find((track) => track.id === this.selectedTrack) ?? TRACKS[0];
  }

  private syncTrackUi(): void {
    const meta = this.getTrackMeta();
    this.panels.trackSelect.value = meta.id;
    this.panels.subhead.textContent = meta.subhead;
    this.panels.placementGroup.style.display = meta.id === "track_1" ? "" : "none";
    this.panels.placementSection.innerHTML = this.sectionsMarkup();
  }

  private loadReferenceV3Recipe(): string {
    try {
      return window.localStorage.getItem(REFERENCE_V3_RECIPE_STORAGE_KEY) || DEFAULT_REFERENCE_V3_RECIPE;
    } catch {
      return DEFAULT_REFERENCE_V3_RECIPE;
    }
  }

  private loadTrack1Placements(): TrackPlacement[] {
    try {
      const raw = window.localStorage.getItem(TRACK_1_PLACEMENTS_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item): item is TrackPlacement => {
        return (
          item &&
          typeof item.id === "string" &&
          ["1", "2", "3", "4", "5"].includes(item.sectionId) &&
          typeof item.t === "number" &&
          typeof item.offset === "number" &&
          typeof item.scale === "number" &&
          (item.side === "left" || item.side === "right") &&
          TRACK1_PLACEMENT_ASSETS.some((asset) => asset.id === item.asset)
        );
      });
    } catch {
      return [];
    }
  }

  private preloadRoadsideSprites(): void {
    for (const [key, meta] of Object.entries(ROADSIDE_SPRITES) as [RoadsideSpriteKey, RoadsideSpriteMeta][]) {
      const image = new Image();
      image.decoding = "async";
      image.src = meta.src;
      this.roadsideImages[key] = image;
    }
  }

  private preloadJakeAssets(): void {
    this.jakeSpritesImage.decoding = "async";
    this.jakeSpritesImage.src = "/type7_sprites.png";
    this.jakeBackgroundImage.decoding = "async";
    this.jakeBackgroundImage.src = "/type7_background.png";
    this.coinImage.decoding = "async";
    this.coinImage.src = "/type7_gold_medal.png";
  }

  private persistReferenceV3Recipe(): void {
    try {
      window.localStorage.setItem(REFERENCE_V3_RECIPE_STORAGE_KEY, this.referenceV3Recipe);
    } catch {
      // Ignore storage failures in the editor.
    }
  }

  private persistTrack1Placements(): void {
    try {
      window.localStorage.setItem(TRACK_1_PLACEMENTS_STORAGE_KEY, JSON.stringify(this.track1Placements));
    } catch {
      // Ignore storage failures in the placement editor.
    }
  }

  private setRecipeStatus(message: string, isError: boolean): void {
    this.panels.recipeStatus.textContent = message;
    this.panels.recipeStatus.dataset.state = isError ? "error" : "ok";
  }

  private setPlacementStatus(message: string, isError: boolean): void {
    this.panels.placementStatus.textContent = message;
    this.panels.placementStatus.dataset.state = isError ? "error" : "ok";
  }

  private sectionsMarkup(): string {
    return this.sections
      .map((section) => `<option value="${section.id}">${section.id} · ${section.name}</option>`)
      .join("");
  }

  private syncPlacementList(): void {
    const sectionId = this.panels.placementSection.value as SectionId;
    const placements = this.track1Placements.filter((placement) => placement.sectionId === sectionId);
    this.panels.placementList.innerHTML = [`<option value="">New placement</option>`]
      .concat(
        placements.map((placement) => {
          const asset = TRACK1_PLACEMENT_ASSETS.find((entry) => entry.id === placement.asset)?.label ?? placement.asset;
          const side = placement.side === "left" ? "L" : "R";
          return `<option value="${placement.id}">${asset} · ${side} · ${Math.round(placement.t * 100)}%</option>`;
        })
      )
      .join("");
    this.panels.placementList.value = this.selectedPlacementId && placements.some((p) => p.id === this.selectedPlacementId)
      ? this.selectedPlacementId
      : "";
    this.syncPlacementEditorFromSelection();
  }

  private syncPlacementEditorFromSelection(): void {
    const placement = this.track1Placements.find((entry) => entry.id === this.selectedPlacementId);
    if (!placement) {
      return;
    }
    this.panels.placementSection.value = placement.sectionId;
    this.panels.placementAsset.value = placement.asset;
    this.panels.placementSide.value = placement.side;
    this.panels.placementPosition.value = placement.t.toFixed(3);
    this.panels.placementPositionValue.textContent = `${Math.round(placement.t * 100)}%`;
    this.panels.placementOffset.value = placement.offset.toFixed(2);
    this.panels.placementOffsetValue.textContent = placement.offset.toFixed(2);
    this.panels.placementScale.value = placement.scale.toFixed(2);
    this.panels.placementScaleValue.textContent = placement.scale.toFixed(2);
  }

  private applyReferenceV3Recipe(): void {
    const recipe = this.panels.recipeEditor.value;
    try {
      this.parseRecipeSections(recipe);
      this.referenceV3Recipe = recipe;
      this.persistReferenceV3Recipe();
      this.selectedTrack = "reference_v3";
      this.rebuildTrack();
      this.restartRun(false);
      this.syncTrackUi();
      this.setRecipeStatus("Applied to Reference v3.", false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown recipe error.";
      this.setRecipeStatus(message, true);
    }
  }

  private readPlacementFromUi(existingId?: string): TrackPlacement {
    return {
      id: existingId ?? `placement_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      sectionId: this.panels.placementSection.value as SectionId,
      asset: this.panels.placementAsset.value as PlacementAssetId,
      side: this.panels.placementSide.value as PlacementSide,
      t: clamp(Number(this.panels.placementPosition.value), 0, 0.999),
      offset: clamp(Number(this.panels.placementOffset.value), 1, 6),
      scale: clamp(Number(this.panels.placementScale.value), 0.3, 6)
    };
  }

  private addTrack1PlacementFromUi(): void {
    const placement = this.readPlacementFromUi();
    this.track1Placements.push(placement);
    this.selectedPlacementId = placement.id;
    this.persistTrack1Placements();
    this.syncPlacementList();
    this.rebuildTrack();
    this.restartRun(false);
    this.setPlacementStatus("Placement added.", false);
  }

  private updateTrack1PlacementFromUi(): void {
    if (!this.selectedPlacementId) {
      this.setPlacementStatus("Select a placement first.", true);
      return;
    }
    const index = this.track1Placements.findIndex((entry) => entry.id === this.selectedPlacementId);
    if (index < 0) {
      this.setPlacementStatus("Selected placement was not found.", true);
      return;
    }
    this.track1Placements[index] = this.readPlacementFromUi(this.selectedPlacementId);
    this.persistTrack1Placements();
    this.syncPlacementList();
    this.rebuildTrack();
    this.restartRun(false);
    this.setPlacementStatus("Placement updated.", false);
  }

  private deleteSelectedTrack1Placement(): void {
    if (!this.selectedPlacementId) {
      this.setPlacementStatus("Select a placement first.", true);
      return;
    }
    this.track1Placements = this.track1Placements.filter((entry) => entry.id !== this.selectedPlacementId);
    this.selectedPlacementId = "";
    this.persistTrack1Placements();
    this.syncPlacementList();
    this.rebuildTrack();
    this.restartRun(false);
    this.setPlacementStatus("Placement deleted.", false);
  }

  private clearTrack1PlacementsForSection(sectionId: SectionId): void {
    this.track1Placements = this.track1Placements.filter((entry) => entry.sectionId !== sectionId);
    this.selectedPlacementId = "";
    this.persistTrack1Placements();
    this.syncPlacementList();
    this.rebuildTrack();
    this.restartRun(false);
    this.setPlacementStatus(`Cleared placements for section ${sectionId}.`, false);
  }

  private clearInputState(): void {
    this.keys.left = false;
    this.keys.right = false;
    this.keys.faster = false;
    this.keys.slower = false;
  }

  private isUiInputTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    );
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.isUiInputTarget(event.target)) {
      this.clearInputState();
      return;
    }

    if (!this.gameStarted) {
      if (event.key === "Enter" || event.key === " ") {
        if (!this.splashSeen) {
          this.splashSeen = true;
          this.syncGameUi();
        } else {
          this.startRun();
        }
        event.preventDefault();
      }
      return;
    }

    if (this.victory) {
      if (event.key === "Enter" || event.key === " " || event.key === "r" || event.key === "R") {
        this.restartRun(false);
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        this.keys.left = true;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.keys.right = true;
        break;
      case "ArrowUp":
      case "w":
      case "W":
        this.keys.faster = true;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        this.keys.slower = true;
        break;
      case "p":
      case "P":
        this.paused = !this.paused;
        this.syncPauseButton();
        break;
      case ".":
        this.stepRequested = true;
        break;
      case "r":
      case "R":
        this.restartRun(false);
        break;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
        this.resetToSection(event.key as SectionId);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (this.isUiInputTarget(event.target)) {
      return;
    }

    if (!this.gameStarted || this.victory) {
      this.clearInputState();
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        this.keys.left = false;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.keys.right = false;
        break;
      case "ArrowUp":
      case "w":
      case "W":
        this.keys.faster = false;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        this.keys.slower = false;
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private resize(): void {
    this.width = PRESENTATION_WIDTH;
    this.height = PRESENTATION_HEIGHT;
    this.pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  private readonly frame = (timestamp: number): void => {
    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
    }

    const elapsed = Math.min(1000, timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    this.accumulator += elapsed;
    this.updateCoinAnimation(elapsed);
    this.audio.update({
      running: this.gameStarted,
      paused: this.paused || !this.gameStarted,
      speedNorm: this.maxSpeed > 0 ? this.speed / this.maxSpeed : 0,
      throttle: this.keys.faster ? 1 : 0
    }, elapsed);

    if (this.stepRequested) {
      this.update(STEP);
      this.stepRequested = false;
      this.accumulator = 0;
    }

    if (!this.paused) {
      while (this.accumulator >= STEP) {
        this.update(STEP);
        this.accumulator -= STEP;
      }
    }

    this.render();
    this.animationFrameId = window.requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    if (!this.gameStarted || this.victory) {
      return;
    }

    const playerSegment = this.findSegment(this.position + this.playerZ);
    this.updateCars(dt, playerSegment, PLAYER_HITBOX_WIDTH);

    const speedPercent = this.speed / this.maxSpeed;
    const dx = dt * STEER_RATE * speedPercent;

    const startPosition = this.position;
    this.position = increase(this.position, dt * this.speed, this.trackLength);
    const wrappedLap = this.position < startPosition;

    if (this.keys.left) {
      this.playerX -= dx;
    } else if (this.keys.right) {
      this.playerX += dx;
    }

    this.playerX -= dx * speedPercent * playerSegment.curve * CENTRIFUGAL;

    if (this.keys.faster) {
      this.speed = accelerate(this.speed, this.accel, dt);
    } else if (this.keys.slower) {
      this.speed = accelerate(this.speed, this.breaking, dt);
    } else {
      this.speed = accelerate(this.speed, this.decel, dt);
    }

    if (Math.abs(this.playerX) > OFFROAD_THRESHOLD && this.speed > this.offRoadLimit) {
      this.speed = accelerate(this.speed, this.offRoadDecel, dt);
    }

    this.playerX = clamp(this.playerX, -MAX_PLAYER_X, MAX_PLAYER_X);
    this.speed = clamp(this.speed, 0, this.maxSpeed);

    const currentPlayerSegment = this.findSegment(this.position + this.playerZ);
    for (const car of currentPlayerSegment.cars) {
      if (this.speed <= car.speed) {
        continue;
      }
      if (overlap(this.playerX, PLAYER_HITBOX_WIDTH, car.offset, TRAFFIC_HITBOX_WIDTH * car.scale, 0.9)) {
        this.speed = car.speed * 0.45;
        this.position = increase(car.z, -this.playerZ, this.trackLength);
        break;
      }
    }

    this.tryCollectCoin();

    if (wrappedLap && !this.victory) {
      this.lapNumber += 1;
      this.spawnCoinForCurrentLap();
      this.syncGameUi();
    }

    const deltaPosition = this.position >= startPosition
      ? this.position - startPosition
      : this.trackLength - startPosition + this.position;
    this.skyOffset = increase(this.skyOffset, SKY_SPEED * playerSegment.curve * speedPercent, 1);
    this.hillOffset = increase(this.hillOffset, HILL_SPEED * playerSegment.curve * (deltaPosition / SEGMENT_LENGTH), 1);
    this.treeOffset = increase(this.treeOffset, TREE_SPEED * playerSegment.curve * (deltaPosition / SEGMENT_LENGTH), 1);
  }

  private render(): void {
    this.context.clearRect(0, 0, this.width, this.height);
    this.activeCoinScreen = null;
    const playerSegment = this.findSegment(this.position + this.playerZ);
    const playerPercent = percentRemaining(this.position + this.playerZ, SEGMENT_LENGTH);
    const playerY = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
    this.drawBackground(playerY);

    const baseSegment = this.findSegment(this.position);
    const basePercent = percentRemaining(this.position, SEGMENT_LENGTH);
    let maxY = this.height;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);
    const visibleSlices: VisibleRoadSlice[] = [];

    for (let n = 0; n < DRAW_DISTANCE; n += 1) {
      const segment = this.segments[(baseSegment.index + n) % this.segments.length];
      const looped = segment.index < baseSegment.index;
      const fog = exponentialFog(n / DRAW_DISTANCE, 5);
      const cameraZ = this.position - (looped ? this.trackLength : 0);
      project(
        segment.p1,
        (this.playerX * ROAD_WIDTH) - x,
        playerY + CAMERA_HEIGHT,
        cameraZ,
        this.cameraDepth,
        this.width,
        this.height,
        ROAD_WIDTH
      );
      project(
        segment.p2,
        (this.playerX * ROAD_WIDTH) - x - dx,
        playerY + CAMERA_HEIGHT,
        cameraZ,
        this.cameraDepth,
        this.width,
        this.height,
        ROAD_WIDTH
      );

      x += dx;
      dx += segment.curve;

      visibleSlices.push({ segment, fog, distance: n, clipY: maxY });

      if (segment.p1.camera.z <= this.cameraDepth || segment.p2.screen.y >= segment.p1.screen.y || segment.p2.screen.y >= maxY) {
        continue;
      }

      drawSegment(
        this.context,
        this.width,
        LANES,
        segment.p1.screen.x,
        segment.p1.screen.y,
        segment.p1.screen.w,
        segment.p2.screen.x,
        segment.p2.screen.y,
        segment.p2.screen.w,
        fog,
        segment.color
      );

      maxY = segment.p1.screen.y;
    }

    this.drawRoadside(visibleSlices);
    this.drawCoin(visibleSlices);
    this.drawTraffic(visibleSlices);
    this.drawPlayer(playerSegment, playerPercent);
    this.drawCoinAnimation();
    this.renderDebug(playerSegment, playerY);
  }

  private drawBackground(playerY: number): void {
    if (this.jakeBackgroundImage.complete && this.jakeBackgroundImage.naturalWidth > 0) {
      this.drawJakeBackground(playerY);
      return;
    }

    this.drawFallbackBackground(playerY);
  }

  private drawJakeBackground(playerY: number): void {
    const parallaxScale = this.height / 480;
    this.renderJakeBackgroundLayer(JAKE_BACKGROUND.sky, this.skyOffset, parallaxScale * SKY_SPEED * playerY);
    this.renderJakeBackgroundLayer(JAKE_BACKGROUND.hills, this.hillOffset, parallaxScale * HILL_SPEED * playerY);
    this.renderJakeBackgroundLayer(JAKE_BACKGROUND.trees, this.treeOffset, parallaxScale * TREE_SPEED * playerY);
  }

  private renderJakeBackgroundLayer(
    layer: { x: number; y: number; w: number; h: number },
    rotation: number,
    offset: number
  ): void {
    const imageWidth = layer.w / 2;
    const imageHeight = layer.h;
    const sourceX = layer.x + Math.floor(layer.w * rotation);
    const sourceY = layer.y;
    const sourceW = Math.min(imageWidth, layer.x + layer.w - sourceX);
    const sourceH = imageHeight;
    const destX = 0;
    const destY = offset;
    const destW = Math.floor(this.width * (sourceW / imageWidth));
    const destH = this.height;

    this.context.drawImage(
      this.jakeBackgroundImage,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      destX,
      destY,
      destW,
      destH
    );

    if (sourceW < imageWidth) {
      this.context.drawImage(
        this.jakeBackgroundImage,
        layer.x,
        sourceY,
        imageWidth - sourceW,
        sourceH,
        destW - 1,
        destY,
        this.width - destW,
        destH
      );
    }
  }

  private drawFallbackBackground(playerY: number): void {
    const gradient = this.context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, COLORS.skyTop);
    gradient.addColorStop(0.62, COLORS.skyBottom);
    gradient.addColorStop(1, "#193224");
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);

    const horizonY = this.height * 0.54 + (playerY * (this.height / 480)) * 0.025;
    this.context.fillStyle = COLORS.haze;
    this.context.fillRect(0, horizonY - 10, this.width, 16);
    this.drawMountainBand(horizonY + 16, 180, 380, COLORS.mountainFar, this.hillOffset * 0.55, playerY * 0.16);
    this.drawMountainBand(horizonY + 34, 220, 460, COLORS.mountainNear, this.hillOffset, playerY * 0.22);
    this.drawHorizonLandmarks(horizonY, playerY);
    this.context.fillStyle = COLORS.treeLine;
    this.context.fillRect(0, horizonY + 40, this.width, this.height - horizonY - 40);
  }

  private drawMountainBand(baseY: number, minHeight: number, maxHeight: number, color: string, offset: number, verticalShift: number): void {
    const span = 260;
    const shift = (offset * span * 6) % span;
    this.context.fillStyle = color;
    this.context.beginPath();
    this.context.moveTo(-span, this.height);
    for (let x = -span * 2; x <= this.width + span * 2; x += span) {
      const peakX = x + shift;
      const seed = Math.sin((x + span) * 0.013) * 0.5 + 0.5;
      const height = interpolate(minHeight, maxHeight, seed);
      this.context.lineTo(peakX, baseY - verticalShift - height);
      this.context.lineTo(peakX + span * 0.55, baseY - verticalShift);
    }
    this.context.lineTo(this.width + span * 2, this.height);
    this.context.closePath();
    this.context.fill();
  }

  private drawHorizonLandmarks(horizonY: number, playerY: number): void {
    const drift = (this.treeOffset * 180) % 220;
    const baseY = horizonY + 40 - playerY * 0.035;
    for (let x = -220; x <= this.width + 220; x += 220) {
      const anchorX = x - drift;
      const width = 180 + Math.sin((x + 90) * 0.021) * 36;
      const height = 18 + ((Math.sin((x + 40) * 0.031) * 0.5 + 0.5) * 20);
      drawPolygon(
        this.context,
        anchorX - width * 0.5,
        baseY,
        anchorX + width * 0.5,
        baseY,
        anchorX + width * 0.32,
        baseY - height,
        anchorX - width * 0.32,
        baseY - height,
        COLORS.horizonStructureFar
      );

      this.context.fillStyle = COLORS.horizonStructureNear;
      this.context.beginPath();
      this.context.arc(anchorX - width * 0.18, baseY - height * 0.72, 10, 0, Math.PI * 2);
      this.context.arc(anchorX, baseY - height * 0.9, 14, 0, Math.PI * 2);
      this.context.arc(anchorX + width * 0.2, baseY - height * 0.74, 12, 0, Math.PI * 2);
      this.context.fill();
    }
  }

  private drawRoadside(visibleSlices: VisibleRoadSlice[]): void {
    for (let index = visibleSlices.length - 1; index >= 0; index -= 1) {
      const { segment, fog, distance, clipY } = visibleSlices[index];
      if (
        distance < 4 ||
        segment.p1.camera.z <= this.cameraDepth ||
        segment.p1.screen.scale <= 0 ||
        segment.props.length === 0
      ) {
        continue;
      }

      for (const prop of segment.props) {
        this.drawRoadsideProp(segment, prop, clamp(0.72 + fog * 0.28, 0.72, 1), clipY);
      }
    }
  }

  private drawTraffic(visibleSlices: VisibleRoadSlice[]): void {
    for (let index = visibleSlices.length - 1; index >= 0; index -= 1) {
      const { segment, fog, distance, clipY } = visibleSlices[index];
      if (
        distance < 2 ||
        segment.p1.camera.z <= this.cameraDepth ||
        segment.p1.screen.scale <= 0 ||
        segment.cars.length === 0
      ) {
        continue;
      }

      for (const car of segment.cars) {
        const percent = car.percent;
        const scale = interpolate(segment.p1.screen.scale, segment.p2.screen.scale, percent);
        const roadX = interpolate(segment.p1.screen.x, segment.p2.screen.x, percent);
        const roadW = interpolate(segment.p1.screen.w, segment.p2.screen.w, percent);
        const y = interpolate(segment.p1.screen.y, segment.p2.screen.y, percent);
        const x = roadX + roadW * car.offset;
        this.drawTrafficCar(x, y, scale, clipY, car, clamp(0.76 + fog * 0.24, 0.76, 1));
      }
    }
  }

  private drawCoin(visibleSlices: VisibleRoadSlice[]): void {
    if (!this.activeCoin || !this.coinImage.complete || this.coinImage.naturalWidth <= 0) {
      return;
    }

    const coinSegment = this.findSegment(this.activeCoin.z);
    const coinPercent = percentRemaining(this.activeCoin.z, SEGMENT_LENGTH);

    for (let index = visibleSlices.length - 1; index >= 0; index -= 1) {
      const { segment, fog, distance, clipY } = visibleSlices[index];
      if (segment.index !== coinSegment.index || distance < 2 || segment.p1.screen.scale <= 0) {
        continue;
      }

      const scale = interpolate(segment.p1.screen.scale, segment.p2.screen.scale, coinPercent);
      const roadW = interpolate(segment.p1.screen.w, segment.p2.screen.w, coinPercent);
      const screenX = interpolate(segment.p1.screen.x, segment.p2.screen.x, coinPercent) + (roadW * this.activeCoin.offset);
      const screenY = interpolate(segment.p1.screen.y, segment.p2.screen.y, coinPercent);
      const coinScale = 0.18 * (1 / this.coinImage.naturalWidth);
      const destW = (this.coinImage.naturalWidth * scale * this.width / 2) * (coinScale * ROAD_WIDTH);
      const destH = (this.coinImage.naturalHeight * scale * this.width / 2) * (coinScale * ROAD_WIDTH);
      const bob = Math.sin((this.position / 400) + this.activeCoin.seed) * Math.max(3, destH * 0.05);
      const x = screenX - destW * 0.5;
      const y = screenY - destH - (destH * 0.08) - bob;
      const hidden = clipY ? Math.max(0, y + destH - clipY) : 0;

      if (hidden >= destH || destW < 4 || destH < 4) {
        return;
      }

      this.activeCoinScreen = {
        x: screenX,
        y: y + (destH - hidden) * 0.5,
        size: Math.max(destW, destH - hidden)
      };

      this.context.save();
      this.context.globalAlpha = clamp(0.78 + fog * 0.22, 0.78, 1);
      this.context.shadowColor = "rgba(255, 230, 120, 0.45)";
      this.context.shadowBlur = Math.max(10, destW * 0.12);
      this.context.drawImage(
        this.coinImage,
        0,
        0,
        this.coinImage.naturalWidth,
        this.coinImage.naturalHeight - (this.coinImage.naturalHeight * hidden) / destH,
        x,
        y,
        destW,
        destH - hidden
      );
      this.context.restore();
      return;
    }
  }

  private drawCoinAnimation(): void {
    if (!this.coinAnimation || !this.coinImage.complete || this.coinImage.naturalWidth <= 0) {
      return;
    }

    const eased = 1 - Math.pow(1 - this.coinAnimation.progress, 3);
    const x = interpolate(this.coinAnimation.startX, this.coinAnimation.endX, eased);
    const y =
      interpolate(this.coinAnimation.startY, this.coinAnimation.endY, eased) -
      Math.sin(eased * Math.PI) * Math.max(18, this.coinAnimation.startSize * 0.14);
    const size = interpolate(this.coinAnimation.startSize, this.coinAnimation.endSize, eased);
    const half = size * 0.5;

    this.context.save();
    this.context.globalAlpha = clamp(1 - eased * 0.08, 0.92, 1);
    this.context.shadowColor = "rgba(255, 228, 120, 0.58)";
    this.context.shadowBlur = Math.max(12, size * 0.22);
    this.context.drawImage(this.coinImage, x - half, y - half, size, size);
    this.context.restore();
  }

  private drawRoadsideProp(segment: Segment, prop: RoadsideProp, alpha: number, clipY: number): void {
    const type = prop.type;
    const variant = prop.variant;
    const spriteScale = segment.p1.screen.scale * prop.scale;
    const spriteX = segment.p1.screen.x + spriteScale * prop.offset * ROAD_WIDTH * (this.width / 2);
    const spriteY = segment.p1.screen.y;
    const selected = prop.placementId !== undefined && prop.placementId === this.selectedPlacementId;
    const jakeSprite = this.resolveJakeRoadsideSprite(prop);
    if (jakeSprite) {
      this.drawJakeAtlasSprite(
        jakeSprite,
        spriteScale,
        spriteX,
        spriteY,
        prop.offset < 0 ? -1 : 0,
        -1,
        clipY,
        alpha
      );
      if (selected) {
        this.drawPlacementMarker(spriteX, spriteY - 12, alpha);
      }
      return;
    }

    const x = spriteX;
    const y = spriteY;
    const spriteKey = this.resolveRoadsideSpriteKey(prop);
    const spriteMeta = ROADSIDE_SPRITES[spriteKey];
    const spriteImage = this.roadsideImages[spriteKey];
    if (spriteImage && spriteImage.complete && spriteImage.naturalWidth > 0 && spriteImage.naturalHeight > 0) {
      const localScale = segment.p1.screen.scale * (this.width / 2) * spriteMeta.spriteScale * prop.scale;
      const destW = spriteImage.naturalWidth * localScale;
      const destH = spriteImage.naturalHeight * localScale;
      const destX = x + destW * (prop.offset < 0 ? -1 : 0);
      const destY = y - destH;
      const clipH = Math.max(0, destY + destH - clipY);

      if (clipH < destH) {
        this.context.save();
        this.context.globalAlpha = alpha;
        this.context.drawImage(
          spriteImage,
          0,
          0,
          spriteImage.naturalWidth,
          spriteImage.naturalHeight - (spriteImage.naturalHeight * clipH) / destH,
          destX,
          destY,
          destW,
          destH - clipH
        );
        this.context.restore();
      }
      if (selected) {
        this.drawPlacementMarker(spriteX, spriteY - 12, alpha);
      }
      return;
    }

    const scale = Math.max(0.0001, segment.p1.screen.scale * prop.scale);
    const height = clamp(scale * interpolate(1450, 2800, variant), 24, 360);
    const width = Math.max(8, height * interpolate(0.22, 0.56, seededUnit(variant * 1000 + 3)));
    this.context.save();
    this.context.globalAlpha = alpha;

    if (type === "turnMarker") {
      const poleHeight = height * 0.74;
      const boardWidth = width * 1.7;
      const boardHeight = height * 0.48;
      const boardY = y - poleHeight;
      this.context.fillStyle = COLORS.markerPost;
      this.context.fillRect(x - 3, boardY, 6, poleHeight);
      this.context.fillStyle = COLORS.distanceBoard;
      this.context.fillRect(x - boardWidth / 2, boardY - boardHeight, boardWidth, boardHeight);
      this.context.fillStyle = COLORS.distanceBoardText;
      this.context.font = `${Math.max(10, Math.round(boardHeight * 0.68))}px monospace`;
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";
      this.context.fillText(prop.offset < 0 ? "↱" : "↰", x, boardY - boardHeight * 0.48);
    } else if (type === "proxyBarrier") {
      this.context.fillStyle = "#f6a15d";
      this.context.fillRect(x - width * 1.35, y - height * 0.36, width * 2.7, height * 0.36);
      this.context.fillStyle = "#303946";
      this.context.fillRect(x - width * 1.35, y - height * 0.22, width * 2.7, height * 0.08);
      this.context.fillStyle = "#ffe8b8";
      this.context.fillRect(x - width * 1.24, y - height * 0.34, width * 2.48, height * 0.06);
    } else if (type === "proxyFlagman") {
      this.context.fillStyle = "#f2d9aa";
      this.context.beginPath();
      this.context.arc(x, y - height * 0.82, Math.max(5, width * 0.22), 0, Math.PI * 2);
      this.context.fill();
      this.context.fillStyle = "#243144";
      this.context.fillRect(x - width * 0.12, y - height * 0.72, width * 0.24, height * 0.46);
      this.context.fillStyle = "#d85e4c";
      drawPolygon(
        this.context,
        x + width * 0.12,
        y - height * 0.74,
        x + width * 0.92,
        y - height * 0.62,
        x + width * 0.12,
        y - height * 0.46,
        x + width * 0.12,
        y - height * 0.74,
        "#d85e4c"
      );
    } else if (type === "proxyGrassLow" || type === "proxyGrassTall") {
      const bladeCount = type === "proxyGrassLow" ? 5 : 9;
      const heightScale = type === "proxyGrassLow" ? 0.42 : 0.78;
      const grassColor = type === "proxyGrassLow" ? "#7fd16d" : "#4fbe44";
      this.context.fillStyle = grassColor;
      for (let index = 0; index < bladeCount; index += 1) {
        const t = index / Math.max(1, bladeCount - 1);
        const bladeX = x + interpolate(-width * 1.05, width * 1.05, t);
        const bladeHeight = height * heightScale * interpolate(0.72, 1, seededUnit(variant * 1000 + index + 41));
        drawPolygon(
          this.context,
          bladeX - width * 0.08,
          y,
          bladeX + width * 0.08,
          y,
          bladeX + width * 0.03,
          y - bladeHeight,
          bladeX - width * 0.03,
          y - bladeHeight,
          grassColor
        );
      }
    } else if (type === "pylon") {
      this.context.fillStyle = COLORS.propPale;
      this.context.fillRect(x - width * 0.2, y - height, width * 0.4, height);
      this.context.fillStyle = COLORS.propWarm;
      this.context.fillRect(x - width * 0.55, y - height * 0.82, width * 1.1, height * 0.18);
      this.context.fillStyle = COLORS.propDark;
      this.context.fillRect(x - width * 0.14, y - height, width * 0.1, height);
    } else if (type === "block") {
      drawPolygon(
        this.context,
        x - width,
        y,
        x + width,
        y,
        x + width * 0.78,
        y - height,
        x - width * 0.78,
        y - height,
        COLORS.propCool
      );
      drawPolygon(
        this.context,
        x - width * 0.6,
        y - height * 0.28,
        x + width * 0.6,
        y - height * 0.28,
        x + width * 0.46,
        y - height * 0.7,
        x - width * 0.46,
        y - height * 0.7,
        COLORS.propPale
      );
    } else if (type === "cluster") {
      const count = 3 + Math.round(variant * 2);
      for (let index = 0; index < count; index += 1) {
        const t = count === 1 ? 0 : index / (count - 1);
        const cx = x + interpolate(-width, width, t);
        const h = height * interpolate(0.42, 1, seededUnit(variant * 1000 + index + 11));
        const w = Math.max(2, width * interpolate(0.18, 0.34, seededUnit(variant * 1000 + index + 23)));
        this.context.fillStyle = index % 2 === 0 ? COLORS.propWarm : COLORS.propCool;
        this.context.fillRect(cx - w / 2, y - h, w, h);
      }
    } else {
      this.context.fillStyle = COLORS.propDark;
      this.context.fillRect(x - width * 0.12, y - height * 0.26, width * 0.24, height * 0.26);
      drawPolygon(
        this.context,
        x,
        y - height,
        x + width,
        y - height * 0.22,
        x,
        y - height * 0.46,
        x - width,
        y - height * 0.22,
        COLORS.propGrass
      );
      drawPolygon(
        this.context,
        x,
        y - height * 0.8,
        x + width * 0.76,
        y - height * 0.12,
        x,
        y - height * 0.34,
        x - width * 0.76,
        y - height * 0.12,
        COLORS.treeMid
      );
    }

    this.context.restore();
    if (selected) {
      this.drawPlacementMarker(spriteX, spriteY - 12, alpha);
    }
  }

  private drawPlacementMarker(x: number, y: number, alpha: number): void {
    this.context.save();
    this.context.globalAlpha = alpha;
    this.context.strokeStyle = "#7be7ff";
    this.context.lineWidth = 2;
    this.context.beginPath();
    this.context.arc(x, y, 8, 0, Math.PI * 2);
    this.context.stroke();
    this.context.beginPath();
    this.context.moveTo(x - 12, y);
    this.context.lineTo(x + 12, y);
    this.context.moveTo(x, y - 12);
    this.context.lineTo(x, y + 12);
    this.context.stroke();
    this.context.restore();
  }

  private drawTrafficCar(x: number, y: number, scale: number, clipY: number, car: TrafficCar, alpha: number): void {
    if (y >= clipY) {
      return;
    }
    this.drawJakeAtlasSprite(car.sprite, scale * car.scale, x, y, -0.5, -1, clipY, alpha);
  }

  private resolveRoadsideSpriteKey(prop: RoadsideProp): RoadsideSpriteKey {
    switch (prop.type) {
      case "turnMarker":
        return prop.offset < 0 ? "turnMarkerLeft" : "turnMarkerRight";
      case "pylon":
        return "pylon";
      case "block":
        return "signBlock";
      case "cluster":
        return "tracksideMass";
      case "tree":
        return "grandstandMass";
      case "proxyBarrier":
        return "pylon";
      case "proxyFlagman":
        return prop.offset < 0 ? "turnMarkerLeft" : "turnMarkerRight";
      case "proxyGrassLow":
      case "proxyGrassTall":
        return "tracksideMass";
    }
  }

  private resolveJakeRoadsideSprite(prop: RoadsideProp): JakeSpriteRect | null {
    if (prop.sprite) {
      if (prop.sprite === JAKE_SPRITES.BILLBOARD01) return JAKE_SPRITES.TREE1;
      if (prop.sprite === JAKE_SPRITES.BILLBOARD02) return JAKE_SPRITES.TREE2;
      if (prop.sprite === JAKE_SPRITES.BILLBOARD03) return JAKE_SPRITES.PALM_TREE;
      if (prop.sprite === JAKE_SPRITES.BILLBOARD05) return JAKE_SPRITES.DEAD_TREE1;
      if (prop.sprite === JAKE_SPRITES.BILLBOARD07) return JAKE_SPRITES.TREE2;
      if (prop.sprite === JAKE_SPRITES.BILLBOARD08) return JAKE_SPRITES.PALM_TREE;
      return prop.sprite;
    }
    const variantIndex = (set: JakeSpriteRect[]) => set[Math.min(set.length - 1, Math.floor(prop.variant * set.length))];
    switch (prop.type) {
      case "turnMarker":
        return null;
      case "pylon":
        return JAKE_SPRITES.COLUMN;
      case "block":
        return variantIndex(JAKE_BILLBOARDS);
      case "cluster":
        return variantIndex(JAKE_CLUSTER_SET);
      case "tree":
        return variantIndex(JAKE_TREE_SET);
      case "proxyBarrier":
      case "proxyFlagman":
      case "proxyGrassLow":
      case "proxyGrassTall":
        return null;
    }
  }

  private drawJakeAtlasSprite(
    sprite: JakeSpriteRect,
    scale: number,
    destX: number,
    destY: number,
    offsetX: number,
    offsetY: number,
    clipY: number,
    alpha = 1
  ): void {
    if (!this.jakeSpritesImage.complete || this.jakeSpritesImage.naturalWidth <= 0) {
      return;
    }

    const destW = (sprite.w * scale * this.width / 2) * (JAKE_PLAYER_SPRITE_SCALE * ROAD_WIDTH);
    const destH = (sprite.h * scale * this.width / 2) * (JAKE_PLAYER_SPRITE_SCALE * ROAD_WIDTH);
    const x = destX + destW * offsetX;
    const y = destY + destH * offsetY;
    const clipH = clipY ? Math.max(0, y + destH - clipY) : 0;

    if (clipH >= destH || destW < 2 || destH < 2) {
      return;
    }

    this.context.save();
    this.context.globalAlpha = alpha;
    this.context.drawImage(
      this.jakeSpritesImage,
      sprite.x,
      sprite.y,
      sprite.w,
      sprite.h - (sprite.h * clipH) / destH,
      x,
      y,
      destW,
      destH - clipH
    );
    this.context.restore();
  }

  private populateRoadsideProps(): void {
    for (const segment of this.segments) {
      segment.props = [];
    }

    for (const segment of this.segments) {
      const baseSeed = segment.index * 37;
      const profile = SECTION_ROADSIDE[segment.sectionId];

      for (const side of [-1, 1] as const) {
        const sideSeed = baseSeed + (side < 0 ? 11 : 23);
        const nearSpawnRoll = seededUnit(sideSeed);
        const nearSetbackRoll = seededUnit(sideSeed + 7);
        const nearTypeRoll = seededUnit(sideSeed + 19);
        const nearSizeRoll = seededUnit(sideSeed + 29);

        if (nearSpawnRoll < profile.nearSpawn) {
          this.addSegmentProp(segment, {
            offset: side * interpolate(profile.nearOffsetMin, profile.nearOffsetMax, nearSetbackRoll),
            type: this.pickRoadsideType(profile.nearTypes, nearTypeRoll),
            variant: nearTypeRoll,
            scale: interpolate(profile.nearScaleMin, profile.nearScaleMax, nearSizeRoll)
          });
        }

        const farSpawnRoll = seededUnit(sideSeed + 41);
        const farSetbackRoll = seededUnit(sideSeed + 47);
        const farTypeRoll = seededUnit(sideSeed + 53);
        const farSizeRoll = seededUnit(sideSeed + 59);

        if (farSpawnRoll < profile.farSpawn) {
          this.addSegmentProp(segment, {
            offset: side * interpolate(profile.farOffsetMin, profile.farOffsetMax, farSetbackRoll),
            type: this.pickRoadsideType(profile.farTypes, farTypeRoll),
            variant: farTypeRoll,
            scale: interpolate(profile.farScaleMin, profile.farScaleMax, farSizeRoll)
          });
        }
      }
    }

    const cornerThreshold = ROAD.CURVE.EASY * 0.5;
    for (const segment of this.segments) {
      const previous = this.segments[(segment.index - 1 + this.segments.length) % this.segments.length];
      if (Math.abs(previous.curve) > cornerThreshold || Math.abs(segment.curve) <= cornerThreshold) {
        continue;
      }

      const outside = segment.curve > 0 ? -1 : 1;
      const profile = SECTION_ROADSIDE[segment.sectionId];
      this.addSegmentProp(segment, {
        offset: outside * profile.markerOffset,
        type: "turnMarker",
        variant: seededUnit(segment.index * 17 + 5),
        scale: profile.markerScale
      });
    }

    if (this.selectedTrack === "track_1") {
      this.populateTrack1Section1Props();
      this.applyTrack1ManualPlacements();
    }
  }

  private pickRoadsideType(weights: RoadsideTypeWeights, roll: number): RoadsidePropType {
    const total = weights.pylon + weights.block + weights.cluster + weights.tree;
    const target = roll * total;
    let cursor = weights.pylon;
    if (target <= cursor) {
      return "pylon";
    }
    cursor += weights.block;
    if (target <= cursor) {
      return "block";
    }
    cursor += weights.cluster;
    if (target <= cursor) {
      return "cluster";
    }
    return "tree";
  }

  private populateTrack1Section1Props(): void {
    const section = this.findSection("1");
    if (!section) {
      return;
    }

    const sectionIndex = this.sections.findIndex((entry) => entry.id === "1");
    const next = this.sections[sectionIndex + 1];
    const startIndex = section.startIndex;
    const endIndex = (next?.startIndex ?? this.segments.length) - 1;
    const length = Math.max(1, endIndex - startIndex + 1);

    for (let index = startIndex; index <= endIndex; index += 1) {
      this.segments[index].props = [];
    }

    const place = (
      fraction: number,
      offset: number,
      sprite: JakeSpriteRect,
      scale: number,
      type: RoadsidePropType = "cluster"
    ): void => {
      const clampedFraction = clamp(fraction, 0, 0.999);
      const segmentIndex = clamp(startIndex + Math.floor(clampedFraction * length), startIndex, endIndex);
      this.addSegmentProp(this.segments[segmentIndex], {
        offset,
        type,
        variant: clampedFraction,
        scale,
        sprite
      });
    };

    // Left-side hard edge / barrier zone close to the track.
    for (let fraction = 0.05; fraction < 0.82; fraction += 0.08) {
      const sprite = fraction % 0.24 < 0.08 ? JAKE_SPRITES.COLUMN : JAKE_SPRITES.TREE1;
      const type = sprite === JAKE_SPRITES.COLUMN ? "pylon" : "tree";
      const scale = sprite === JAKE_SPRITES.COLUMN ? 2.1 : 1.95;
      place(fraction, -1.12, sprite, scale, type);
    }
    for (let fraction = 0.34; fraction < 0.76; fraction += 0.4) {
      place(fraction, -1.55, JAKE_BILLBOARDS[Math.floor(fraction * 10) % JAKE_BILLBOARDS.length], 1.55, "block");
    }

    // Trade the earlier billboard beat for a landmark tree to keep the section less sign-heavy.
    place(0.24, -2.1, JAKE_SPRITES.TREE1, 1.75, "tree");

    // Right side stays open near the verge, with low vegetation further out.
    for (let fraction = 0.14; fraction < 0.92; fraction += 0.12) {
      const sprite = fraction % 0.24 < 0.12 ? JAKE_SPRITES.BUSH1 : JAKE_SPRITES.BUSH2;
      place(fraction, 1.9 + ((fraction * 10) % 0.8), sprite, 1.55, "cluster");
    }
    for (let fraction = 0.22; fraction < 0.9; fraction += 0.18) {
      place(fraction, 2.75, JAKE_SPRITES.TREE1, 1.55, "tree");
    }

    // Mid-distance visual masses to stop the section feeling empty.
    place(0.34, -2.45, JAKE_SPRITES.BOULDER3, 1.7, "cluster");
    place(0.52, 2.6, JAKE_SPRITES.BOULDER1, 1.6, "cluster");
    place(0.68, 2.4, JAKE_SPRITES.TREE1, 1.65, "tree");

    // Keep the section exit tree-led rather than sign-led.
    place(0.86, 1.9, JAKE_SPRITES.TREE1, 1.6, "tree");
  }

  private applyTrack1ManualPlacements(): void {
    for (const placement of this.track1Placements) {
      const section = this.findSection(placement.sectionId);
      if (!section) {
        continue;
      }
      const sectionIndex = this.sections.findIndex((entry) => entry.id === placement.sectionId);
      const next = this.sections[sectionIndex + 1];
      const startIndex = section.startIndex;
      const endIndex = (next?.startIndex ?? this.segments.length) - 1;
      const length = Math.max(1, endIndex - startIndex + 1);
      const segmentIndex = clamp(startIndex + Math.floor(placement.t * length), startIndex, endIndex);
      const resolved = this.resolvePlacementAsset(placement.asset);
      this.addSegmentProp(this.segments[segmentIndex], {
        offset: placement.side === "left" ? -placement.offset : placement.offset,
        type: resolved.type,
        variant: placement.t,
        scale: placement.scale,
        sprite: resolved.sprite,
        placementId: placement.id
      });
    }
  }

  private resolvePlacementAsset(asset: PlacementAssetId): { type: RoadsidePropType; sprite?: JakeSpriteRect } {
    switch (asset) {
      case "jake_column":
        return { type: "pylon", sprite: JAKE_SPRITES.COLUMN };
      case "jake_billboard":
        return { type: "block", sprite: JAKE_SPRITES.BILLBOARD09 };
      case "jake_palm":
        return { type: "tree", sprite: JAKE_SPRITES.PALM_TREE };
      case "jake_tree":
        return { type: "tree", sprite: JAKE_SPRITES.TREE1 };
      case "jake_boulder":
        return { type: "cluster", sprite: JAKE_SPRITES.BOULDER3 };
      case "jake_bush":
        return { type: "cluster", sprite: JAKE_SPRITES.BUSH1 };
      case "proxy_barrier":
        return { type: "proxyBarrier" };
      case "proxy_flagman":
        return { type: "proxyFlagman" };
      case "proxy_grass_low":
        return { type: "proxyGrassLow" };
      case "proxy_grass_tall":
        return { type: "proxyGrassTall" };
    }
  }

  private addSegmentProp(segment: Segment, prop: RoadsideProp): void {
    segment.props.push(prop);
  }

  private drawPlayer(playerSegment: Segment, playerPercent: number): void {
    if (this.jakeSpritesImage.complete && this.jakeSpritesImage.naturalWidth > 0) {
      const steer = this.keys.left ? -1 : this.keys.right ? 1 : 0;
      const updown = playerSegment.p2.world.y - playerSegment.p1.world.y;
      const sprite =
        steer < 0
          ? updown > 0
            ? JAKE_SPRITES.PLAYER_UPHILL_LEFT
            : JAKE_SPRITES.PLAYER_LEFT
          : steer > 0
            ? updown > 0
              ? JAKE_SPRITES.PLAYER_UPHILL_RIGHT
              : JAKE_SPRITES.PLAYER_RIGHT
            : updown > 0
              ? JAKE_SPRITES.PLAYER_UPHILL_STRAIGHT
              : JAKE_SPRITES.PLAYER_STRAIGHT;

      const bounce =
        (1.5 * Math.random() * (this.speed / this.maxSpeed) * (this.height / 480)) *
        (Math.random() > 0.5 ? 1 : -1);
      const destX = this.width / 2;
      const destY =
        this.height / 2 -
        (this.cameraDepth / this.playerZ) *
          interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) *
          (this.height / 2);

      this.drawJakeAtlasSprite(sprite, this.cameraDepth / this.playerZ, destX, destY + bounce, -0.5, -1, 0, 1);
      return;
    }

    const segmentCurve = playerSegment.curve;
    const centerX = this.width * 0.5;
    const segmentRise = playerSegment.p2.world.y - playerSegment.p1.world.y;
    const localGrade = segmentRise / SEGMENT_LENGTH;
    const hillShift = clamp(-localGrade * this.height * 0.06, -32, 32);
    const baseY = clamp(this.height * 0.86 + hillShift, this.height * 0.74, this.height * 0.9);
    const steer = this.keys.left ? -1 : this.keys.right ? 1 : 0;
    const curveLean = clamp(segmentCurve / 6, -1, 1);
    const bodyLean = clamp(steer - curveLean * 0.35, -1, 1);
    const bounce = (1.5 * Math.random() * (this.speed / this.maxSpeed) * (this.height / 480)) * (Math.random() > 0.5 ? 1 : -1);
    const yawShift = bodyLean * 16;

    this.context.save();
    this.context.translate(centerX, baseY + bounce - 50 * (PLAYER_RENDER_SCALE - 1));
    this.context.scale(PLAYER_RENDER_SCALE, PLAYER_RENDER_SCALE);

    this.context.fillStyle = "rgba(8, 12, 18, 0.28)";
    this.context.beginPath();
    this.context.ellipse(0, 18, 52, 16, 0, 0, Math.PI * 2);
    this.context.fill();

    this.context.fillStyle = "#e7edf9";
    drawPolygon(this.context, -46, 46, 46, 46, 30 + yawShift, -20, -30 + yawShift, -20, "#e7edf9");
    drawPolygon(this.context, -28 + yawShift * 0.85, -20, 28 + yawShift * 0.85, -20, 18 + yawShift * 1.05, -74, -18 + yawShift * 1.05, -74, "#e7edf9");
    drawPolygon(this.context, -18 + yawShift * 0.9, -28, 18 + yawShift * 0.9, -28, 12 + yawShift * 1.08, -60, -12 + yawShift * 1.08, -60, "#8db6e6");
    drawPolygon(this.context, -30, 16, 30, 16, 28, 44, -28, 44, "#6b717c");
    drawPolygon(this.context, -22 + yawShift * 0.2, 4, 22 + yawShift * 0.2, 4, 18, 10, -18, 10, "#1d2432");
    this.context.fillStyle = "#f04a54";
    this.context.fillRect(-28 + bodyLean * 2, 32, 12, 18);
    this.context.fillRect(16 + bodyLean * 2, 32, 12, 18);
    this.context.fillStyle = "#f1e8a7";
    this.context.fillRect(-24 + yawShift * 0.4, -68, 14, 8);
    this.context.fillRect(10 + yawShift * 0.4, -68, 14, 8);
    this.context.restore();
  }

  private renderDebug(playerSegment: Segment, playerY: number): void {
    const track = this.getTrackMeta();
    const section = this.findSection(playerSegment.sectionId);
    const segmentCurve = playerSegment.curve;
    const sectionProgress = section
      ? ((this.findSegment(this.position + this.playerZ).index - section.startIndex) /
          Math.max(1, this.sectionLengthInSegments(section.id))) * 100
      : 0;

    this.panels.debugReadout.textContent = [
      `build      ${track.buildLabel}`,
      `model      ${track.modelLabel}`,
      `track      ${track.label}`,
      `section    ${playerSegment.sectionName}`,
      `curve dbg  ${this.curveStrength.toFixed(1)}x`,
      `speed      ${this.speed.toFixed(2)} seg/s`,
      `player x   ${this.playerX.toFixed(3)}`,
      `curve      ${segmentCurve.toFixed(3)}`,
      `elev y     ${playerY.toFixed(1)}`,
      `coins      ${this.coinsCollected}/${COIN_TARGET}`,
      `lap        ${this.lapNumber}`,
      `traffic    ${this.cars.length}`,
      `position   ${this.position.toFixed(1)}`,
      `progress   ${sectionProgress.toFixed(1)}%`,
      `offroad    ${Math.abs(this.playerX) > OFFROAD_THRESHOLD ? "YES" : "NO"}`,
      `paused     ${this.paused ? "YES" : "NO"}`
    ].join("\n");
  }

  private sectionLengthInSegments(sectionId: SectionId): number {
    const current = this.sections.find((section) => section.id === sectionId);
    if (!current) {
      return 1;
    }
    const currentIndex = this.sections.indexOf(current);
    const next = this.sections[currentIndex + 1];
    return (next?.startIndex ?? this.segments.length) - current.startIndex;
  }

  private findSection(sectionId: SectionId): SectionMarker | undefined {
    return this.sections.find((section) => section.id === sectionId);
  }

  private findSegment(z: number): Segment {
    return this.segments[Math.floor(z / SEGMENT_LENGTH) % this.segments.length];
  }

  private lastY(): number {
    return this.segments.length === 0 ? 0 : this.segments[this.segments.length - 1].p2.world.y;
  }

  private resetToSection(sectionId: SectionId): void {
    const section = this.findSection(sectionId);
    this.position = (section?.startIndex ?? 0) * SEGMENT_LENGTH;
    this.playerX = 0;
    this.speed = 0;
    this.skyOffset = 0;
    this.hillOffset = 0;
    this.treeOffset = 0;
  }

  private rebuildTrack(): void {
    this.segments = [];
    this.sections = [];
    this.cars = [];

    switch (this.selectedTrack) {
      case "reference_v1":
        this.buildReferenceV1Track();
        break;
      case "reference_v2":
        this.buildReferenceV2Track();
        break;
      case "reference_v3":
        this.buildReferenceV3Track();
        break;
      case "track_1":
        this.buildTrack1();
        break;
      case "lemans_hills":
        this.buildLemansHillsTrack();
        break;
      case "stage_flow":
        this.buildStageFlowTrack();
        break;
      case "circuit_sketch":
        this.buildCircuitSketchTrack();
        break;
      case "written_sequence":
        this.buildWrittenSequenceTrack();
        break;
      case "corner_dsl":
        this.buildCornerDslTrack();
        break;
      default:
        this.buildReferenceV1Track();
        break;
    }

    this.populateRoadsideProps();

    const startIndex = this.findSegment(this.playerZ).index + 2;
    if (this.segments[startIndex]) {
      this.segments[startIndex].color = COLORS.start as SegmentColor;
    }
    if (this.segments[startIndex + 1]) {
      this.segments[startIndex + 1].color = COLORS.start as SegmentColor;
    }
    for (let n = 0; n < RUMBLE_LENGTH; n += 1) {
      const segment = this.segments[this.segments.length - 1 - n];
      if (segment) {
        segment.color = COLORS.finish as SegmentColor;
      }
    }

    this.trackLength = this.segments.length * SEGMENT_LENGTH;
    this.resetCars();
  }

  private buildReferenceV1Track(): void {
    this.addSection("1", "Launch Straight", () => {
      this.addStraight(ROAD.LENGTH.MEDIUM);
    });
    this.addSection("2", "Grand Right Arc", () => {
      this.addRoad(ROAD.LENGTH.LONG, ROAD.LENGTH.LONG * 2, ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM * this.curveStrength);
      this.addStraight(ROAD.LENGTH.SHORT);
    });
    this.addSection("3", "Compression Right", () => {
      this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.HARD * this.curveStrength);
      this.addStraight(ROAD.LENGTH.SHORT);
    });
    this.addSection("4", "Grand Left Arc", () => {
      this.addRoad(ROAD.LENGTH.LONG, ROAD.LENGTH.LONG * 2, ROAD.LENGTH.LONG, -ROAD.CURVE.MEDIUM * this.curveStrength);
      this.addStraight(ROAD.LENGTH.SHORT);
    });
    this.addSection("5", "Tight Left Bend", () => {
      this.addRoad(ROAD.LENGTH.SHORT, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.SHORT, -ROAD.CURVE.HARD * this.curveStrength);
      this.addStraight(ROAD.LENGTH.MEDIUM);
    });
  }

  private buildReferenceV2Track(): void {
    this.addSection("1", "Launch Straight", () => {
      this.addStraight(ROAD.LENGTH.MEDIUM);
      this.addHill(ROAD.LENGTH.SHORT, ROAD.HILL.LOW * 0.35);
    });
    this.addSection("2", "Grand Right Arc", () => {
      this.addRoad(ROAD.LENGTH.LONG, ROAD.LENGTH.LONG * 2, ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM * this.curveStrength, ROAD.HILL.LOW * 0.2);
      this.addStraight(ROAD.LENGTH.SHORT);
    });
    this.addSection("3", "Compression Right", () => {
      this.addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.HARD * this.curveStrength);
      this.addRoad(ROAD.LENGTH.SHORT, ROAD.LENGTH.SHORT, ROAD.LENGTH.SHORT, -ROAD.CURVE.EASY * 0.55 * this.curveStrength, -ROAD.HILL.LOW * 0.2);
    });
    this.addSection("4", "Grand Left Arc", () => {
      this.addRoad(ROAD.LENGTH.LONG, ROAD.LENGTH.LONG * 2, ROAD.LENGTH.LONG, -ROAD.CURVE.MEDIUM * this.curveStrength, ROAD.HILL.LOW * 0.25);
      this.addStraight(ROAD.LENGTH.SHORT);
    });
    this.addSection("5", "Tight Left Bend", () => {
      this.addRoad(ROAD.LENGTH.SHORT, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.SHORT, -ROAD.CURVE.HARD * this.curveStrength);
      this.addStraight(ROAD.LENGTH.MEDIUM);
    });
  }

  private buildReferenceV3Track(): void {
    try {
      this.buildTrackFromRecipe(this.referenceV3Recipe);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown recipe error.";
      this.setRecipeStatus(message, true);
      this.buildReferenceV1Track();
    }
  }

  private buildTrack1(): void {
    this.buildTrackFromRecipe(TRACK_1_RECIPE);
  }

  private buildLemansHillsTrack(): void {
    this.addSection("1", "Start Sprint", () => {
      this.addStraight(ROAD.LENGTH.MEDIUM);
      this.addHill(ROAD.LENGTH.SHORT, ROAD.HILL.LOW * 0.35);
      this.addStraight(ROAD.LENGTH.MEDIUM);
    });
    this.addSection("2", "Dunlop Rise", () => {
      this.addCurve(ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY * 0.6 * this.curveStrength, ROAD.HILL.MEDIUM * 0.55);
      this.addCurve(ROAD.LENGTH.SHORT, ROAD.CURVE.EASY * 0.5 * this.curveStrength, ROAD.HILL.LOW * 0.2);
      this.addStraight(ROAD.LENGTH.SHORT);
    });
    this.addSection("3", "Tertre Rouge Sweep", () => {
      this.addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.EASY * 1.05 * this.curveStrength, ROAD.HILL.LOW * 0.45);
      this.addStraight(ROAD.LENGTH.MEDIUM * 2);
    });
    this.addSection("4", "Mulsanne Blast", () => {
      this.addHill(ROAD.LENGTH.MEDIUM, ROAD.HILL.LOW * 0.25);
      this.addStraight(ROAD.LENGTH.LONG * 3);
      this.addHill(ROAD.LENGTH.MEDIUM, -ROAD.HILL.LOW * 0.4);
      this.addStraight(ROAD.LENGTH.LONG);
    });
    this.addSection("5", "Arnage / Porsche Curves", () => {
      this.addCurve(ROAD.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM * 0.75 * this.curveStrength, -ROAD.HILL.LOW * 0.2);
      this.addStraight(ROAD.LENGTH.SHORT);
      this.addCurve(ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY * 0.85 * this.curveStrength, ROAD.HILL.LOW * 0.35);
      this.addCurve(ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY * 0.8 * this.curveStrength, -ROAD.HILL.LOW * 0.25);
      this.addLowRollingHills(ROAD.LENGTH.SHORT, ROAD.HILL.LOW * 0.55);
      this.addStraight(ROAD.LENGTH.MEDIUM * 2);
    });
  }

  private buildStageFlowTrack(): void {
    this.addSection("1", "Launch Straight", () => {
      this.addStraight(STAGE.LENGTH.SHORT);
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.EASY * 0.35 * this.curveStrength, STAGE.HILL.LOW * 0.45);
      this.addStraight(STAGE.LENGTH.XS);
      this.addCurve(STAGE.LENGTH.XS, -ROAD.CURVE.EASY * 0.25 * this.curveStrength, -STAGE.HILL.LOW * 0.2);
    });
    this.addSection("2", "Ridge Sweep", () => {
      this.addCurve(STAGE.LENGTH.MEDIUM, ROAD.CURVE.EASY * 0.85 * this.curveStrength, STAGE.HILL.MEDIUM * 0.85);
      this.addStraight(STAGE.LENGTH.XS);
      this.addCurve(STAGE.LENGTH.SHORT, -ROAD.CURVE.EASY * 0.65 * this.curveStrength, -STAGE.HILL.LOW * 0.5);
    });
    this.addSection("3", "Esses Ridge", () => {
      this.addCurve(STAGE.LENGTH.SHORT, -ROAD.CURVE.MEDIUM * 0.55 * this.curveStrength, STAGE.HILL.LOW * 0.35);
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.MEDIUM * 0.7 * this.curveStrength, -STAGE.HILL.LOW * 0.45);
      this.addCurve(STAGE.LENGTH.SHORT, -ROAD.CURVE.EASY * 0.75 * this.curveStrength, STAGE.HILL.LOW * 0.25);
      this.addStraight(STAGE.LENGTH.XS);
    });
    this.addSection("4", "Velocity Crest", () => {
      this.addStraight(STAGE.LENGTH.MEDIUM);
      this.addHill(STAGE.LENGTH.SHORT, STAGE.HILL.MEDIUM * 0.9);
      this.addCurve(STAGE.LENGTH.XS, ROAD.CURVE.EASY * 0.55 * this.curveStrength, -STAGE.HILL.LOW * 0.4);
      this.addStraight(STAGE.LENGTH.SHORT);
      this.addCurve(STAGE.LENGTH.XS, -ROAD.CURVE.EASY * 0.5 * this.curveStrength, 0);
    });
    this.addSection("5", "Final Rhythm", () => {
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.MEDIUM * 0.65 * this.curveStrength, -STAGE.HILL.LOW * 0.3);
      this.addStraight(STAGE.LENGTH.XS);
      this.addCurve(STAGE.LENGTH.SHORT, -ROAD.CURVE.MEDIUM * 0.8 * this.curveStrength, STAGE.HILL.LOW * 0.4);
      this.addCurve(STAGE.LENGTH.MEDIUM, ROAD.CURVE.EASY * 0.75 * this.curveStrength, -STAGE.HILL.MEDIUM * 0.55);
      this.addLowRollingHills(STAGE.LENGTH.XS, STAGE.HILL.LOW * 0.8);
      this.addCurve(STAGE.LENGTH.SHORT, -ROAD.CURVE.EASY * 0.6 * this.curveStrength, 0);
      this.addStraight(STAGE.LENGTH.SHORT);
    });
  }

  private buildCircuitSketchTrack(): void {
    this.addSection("1", "Start Climb", () => {
      this.addStraight(STAGE.LENGTH.SHORT);
      this.addCurve(STAGE.LENGTH.MEDIUM, -ROAD.CURVE.EASY * 0.9 * this.curveStrength, STAGE.HILL.LOW * 0.55);
      this.addStraight(STAGE.LENGTH.XS);
      this.addCurve(STAGE.LENGTH.SHORT, -ROAD.CURVE.EASY * 0.45 * this.curveStrength, STAGE.HILL.LOW * 0.25);
    });
    this.addSection("2", "North Crest", () => {
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.MEDIUM * 0.6 * this.curveStrength, STAGE.HILL.MEDIUM * 0.95);
      this.addHill(STAGE.LENGTH.XS, STAGE.HILL.HIGH * 0.75);
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.MEDIUM * 0.7 * this.curveStrength, -STAGE.HILL.LOW * 0.25);
      this.addStraight(STAGE.LENGTH.XS);
    });
    this.addSection("3", "East Drop", () => {
      this.addCurve(STAGE.LENGTH.MEDIUM, ROAD.CURVE.EASY * 0.9 * this.curveStrength, -STAGE.HILL.MEDIUM * 0.9);
      this.addCurve(STAGE.LENGTH.XS, -ROAD.CURVE.EASY * 0.55 * this.curveStrength, -STAGE.HILL.LOW * 0.15);
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.EASY * 0.75 * this.curveStrength, 0);
      this.addStraight(STAGE.LENGTH.XS);
    });
    this.addSection("4", "South Loop", () => {
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.MEDIUM * 0.95 * this.curveStrength, -STAGE.HILL.LOW * 0.2);
      this.addCurve(STAGE.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM * 0.9 * this.curveStrength, STAGE.HILL.LOW * 0.25);
      this.addStraight(STAGE.LENGTH.SHORT);
      this.addCurve(STAGE.LENGTH.SHORT, -ROAD.CURVE.EASY * 0.6 * this.curveStrength, 0);
    });
    this.addSection("5", "Home Sweep", () => {
      this.addCurve(STAGE.LENGTH.MEDIUM, -ROAD.CURVE.EASY * 0.85 * this.curveStrength, STAGE.HILL.LOW * 0.35);
      this.addStraight(STAGE.LENGTH.XS);
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.EASY * 0.65 * this.curveStrength, -STAGE.HILL.LOW * 0.45);
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.EASY * 0.35 * this.curveStrength, 0);
      this.addRoad(STAGE.LENGTH.SHORT, STAGE.LENGTH.SHORT, STAGE.LENGTH.SHORT, 0, -this.lastY() / SEGMENT_LENGTH);
    });
  }

  private buildWrittenSequenceTrack(): void {
    this.addSection("1", "Opening Double Left", () => {
      this.addStraight(STAGE.LENGTH.SHORT);
      this.addCurve(STAGE.LENGTH.LONG, -ROAD.CURVE.EASY * 0.95 * this.curveStrength, STAGE.HILL.LOW * 0.45);
      this.addHill(STAGE.LENGTH.XS, -STAGE.HILL.MEDIUM * 0.9);
      this.addCurve(STAGE.LENGTH.LONG, -ROAD.CURVE.EASY * 0.95 * this.curveStrength, STAGE.HILL.LOW * 0.2);
      this.addStraight(STAGE.LENGTH.XS);
    });
    this.addSection("2", "Right Hook", () => {
      this.addCurve(STAGE.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM * 0.9 * this.curveStrength, 0);
      this.addCurve(STAGE.LENGTH.LONG, -ROAD.CURVE.EASY * 0.78 * this.curveStrength, STAGE.HILL.MEDIUM * 0.65);
      this.addStraight(STAGE.LENGTH.XS);
    });
    this.addSection("3", "Hairpin Release", () => {
      this.addCurve(STAGE.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM * 1.05 * this.curveStrength, -STAGE.HILL.LOW * 0.35);
      this.addStraight(STAGE.LENGTH.MEDIUM);
      this.addCurve(STAGE.LENGTH.LONG, -ROAD.CURVE.EASY * 0.92 * this.curveStrength, STAGE.HILL.LOW * 0.4);
      this.addStraight(STAGE.LENGTH.XS);
    });
    this.addSection("4", "Outer Right / Chicane", () => {
      this.addCurve(STAGE.LENGTH.LONG, ROAD.CURVE.EASY * 0.95 * this.curveStrength, STAGE.HILL.LOW * 0.15);
      this.addCurve(STAGE.LENGTH.SHORT, -ROAD.CURVE.MEDIUM * 0.7 * this.curveStrength, -STAGE.HILL.LOW * 0.1);
      this.addCurve(STAGE.LENGTH.SHORT, ROAD.CURVE.MEDIUM * 0.7 * this.curveStrength, 0);
      this.addStraight(STAGE.LENGTH.MEDIUM);
    });
    this.addSection("5", "Final Rights", () => {
      this.addCurve(STAGE.LENGTH.MEDIUM, ROAD.CURVE.EASY * 0.82 * this.curveStrength, 0);
      this.addCurve(STAGE.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM * 0.72 * this.curveStrength, -STAGE.HILL.LOW * 0.25);
      this.addRoad(STAGE.LENGTH.SHORT, STAGE.LENGTH.SHORT, STAGE.LENGTH.SHORT, 0, -this.lastY() / SEGMENT_LENGTH);
      this.addStraight(STAGE.LENGTH.SHORT);
    });
  }

  private buildCornerDslTrack(): void {
    this.addSection("1", "Start / Left Sweep", () => {
      this.addStraightBlock(STAGE.LENGTH.MEDIUM);
      this.addArc("left", 90, "large");
    });
    this.addSection("2", "Downhill Double Left", () => {
      this.addStraightBlock(STAGE.LENGTH.SHORT, -STAGE.HILL.MEDIUM * 0.9);
      this.addArc("left", 90, "large", STAGE.HILL.LOW * 0.25);
      this.addStraightBlock(STAGE.LENGTH.SHORT);
    });
    this.addSection("3", "Right / Long Left", () => {
      this.addArc("right", 90, "medium");
      this.addArc("left", 150, "large", STAGE.HILL.MEDIUM * 0.7, 1.1);
      this.addStraightBlock(STAGE.LENGTH.SHORT);
    });
    this.addSection("4", "Hairpin / Left / Right", () => {
      this.addHairpin("right", -STAGE.HILL.LOW * 0.35);
      this.addStraightBlock(STAGE.LENGTH.MEDIUM);
      this.addArc("left", 75, "large", STAGE.HILL.LOW * 0.3);
      this.addStraightBlock(STAGE.LENGTH.SHORT);
      this.addArc("right", 90, "large");
    });
    this.addSection("5", "Chicane / Final Rights", () => {
      this.addChicane("left");
      this.addStraightBlock(STAGE.LENGTH.MEDIUM, STAGE.HILL.LOW * 0.2);
      this.addArc("right", 55, "large");
      this.addArc("right", 65, "medium", -STAGE.HILL.LOW * 0.3);
      this.addStraightBlock(STAGE.LENGTH.SHORT, -this.lastY() / SEGMENT_LENGTH);
    });
  }

  private addSection(id: SectionId, name: string, builder: () => void): void {
    this.sections.push({ id, name, startIndex: this.segments.length });
    builder();
    for (let index = this.sections[this.sections.length - 1].startIndex; index < this.segments.length; index += 1) {
      this.segments[index].sectionId = id;
      this.segments[index].sectionName = name;
    }
  }

  private addStraight(length: number): void {
    this.addRoad(length, length, length, 0, 0);
  }

  private addHill(length: number, height: number): void {
    this.addRoad(length, length, length, 0, height);
  }

  private addCurve(length: number, curve: number, height = 0): void {
    this.addRoad(length, length, length, curve, height);
  }

  private addLowRollingHills(length: number, height: number): void {
    this.addRoad(length, length, length, 0, height * 0.5);
    this.addRoad(length, length, length, 0, -height);
    this.addRoad(length, length, length, ROAD.CURVE.EASY, height);
    this.addRoad(length, length, length, 0, 0);
    this.addRoad(length, length, length, -ROAD.CURVE.EASY, height * 0.5);
    this.addRoad(length, length, length, 0, 0);
  }

  private addStraightBlock(totalLength: number, height = 0): void {
    this.addRoad(0, Math.max(1, totalLength), 0, 0, height);
  }

  private addArc(direction: TurnDirection, angle: number, radius: CornerRadius, height = 0, stretch = 1): void {
    const profile = CORNER_PROFILE[radius];
    const turnScale = Math.max(0.35, (angle / 90) * stretch);
    const enter = Math.max(1, Math.round(profile.enter * turnScale));
    const hold = Math.max(1, Math.round(profile.hold * turnScale));
    const leave = Math.max(1, Math.round(profile.leave * turnScale));
    const signedCurve = (direction === "left" ? -1 : 1) * profile.curve * this.curveStrength;
    this.addRoad(enter, hold, leave, signedCurve, height);
  }

  private addHairpin(direction: TurnDirection, height = 0): void {
    this.addArc(direction, 180, "hairpin", height, 1);
  }

  private addChicane(firstDirection: TurnDirection): void {
    const secondDirection: TurnDirection = firstDirection === "left" ? "right" : "left";
    this.addArc(firstDirection, 35, "medium", -STAGE.HILL.LOW * 0.08, 0.75);
    this.addStraightBlock(STAGE.LENGTH.XS);
    this.addArc(secondDirection, 35, "medium", STAGE.HILL.LOW * 0.08, 0.75);
  }

  private buildTrackFromRecipe(recipe: string): void {
    const sections = this.parseRecipeSections(recipe);
    for (const section of sections) {
      this.addSection(section.id, section.name, () => {
        for (const command of section.commands) {
          this.executeRecipeCommand(command);
        }
      });
    }
  }

  private executeRecipeCommand(command: RecipeCommand): void {
    switch (command.kind) {
      case "straight":
        this.addStraightBlock(command.length, command.height);
        break;
      case "hill":
        this.addHill(command.length, command.height);
        break;
      case "road":
        this.addRoad(command.enter, command.hold, command.leave, command.curve * this.curveStrength, command.height);
        break;
      case "arc":
        this.addArc(command.direction, command.angle, command.radius, command.height, command.stretch);
        break;
      case "hairpin":
        this.addHairpin(command.direction, command.height);
        break;
      case "chicane":
        this.addChicane(command.direction);
        break;
      case "reset_elevation":
        this.addRoad(command.enter, command.hold, command.leave, 0, -this.lastY() / SEGMENT_LENGTH);
        break;
    }
  }

  private parseRecipeSections(recipe: string): RecipeSection[] {
    const sections: RecipeSection[] = [];
    let current: RecipeSection | null = null;

    recipe.split(/\r?\n/).forEach((rawLine, index) => {
      const lineNumber = index + 1;
      const line = rawLine.replace(/#.*/, "").trim();
      if (!line) {
        return;
      }

      const parts = line.split(/\s+/);
      const command = parts[0]?.toLowerCase();
      if (!command) {
        return;
      }

      if (command === "section") {
        const id = parts[1] as SectionId | undefined;
        if (!id || !["1", "2", "3", "4", "5"].includes(id)) {
          throw new Error(`Line ${lineNumber}: section id must be 1-5.`);
        }
        const name = rawLine.replace(/#.*/, "").trim().split(/\s+/).slice(2).join(" ").trim();
        if (!name) {
          throw new Error(`Line ${lineNumber}: section needs a name.`);
        }
        current = { id, name, commands: [] };
        sections.push(current);
        return;
      }

      if (!current) {
        throw new Error(`Line ${lineNumber}: add a section before commands.`);
      }

      current.commands.push(this.parseRecipeCommand(parts, lineNumber));
    });

    if (sections.length === 0) {
      throw new Error("Recipe has no sections.");
    }

    return sections;
  }

  private parseRecipeCommand(parts: string[], lineNumber: number): RecipeCommand {
    const command = parts[0].toLowerCase();
    switch (command) {
      case "straight":
        return {
          kind: "straight",
          length: this.parseLengthToken(parts[1], lineNumber),
          height: this.parseSignedValue(parts[2] ?? "0", this.heightTokenMap(), lineNumber, "height")
        };
      case "hill":
        return {
          kind: "hill",
          length: this.parseLengthToken(parts[1], lineNumber),
          height: this.parseSignedValue(parts[2], this.heightTokenMap(), lineNumber, "height")
        };
      case "road":
        return {
          kind: "road",
          enter: this.parsePositiveInt(parts[1], lineNumber, "enter"),
          hold: this.parsePositiveInt(parts[2], lineNumber, "hold"),
          leave: this.parsePositiveInt(parts[3], lineNumber, "leave"),
          curve: this.parseSignedValue(parts[4], this.curveTokenMap(), lineNumber, "curve"),
          height: this.parseSignedValue(parts[5] ?? "0", this.heightTokenMap(), lineNumber, "height")
        };
      case "arc":
        return {
          kind: "arc",
          direction: this.parseDirection(parts[1], lineNumber),
          angle: this.parsePositiveNumber(parts[2], lineNumber, "angle"),
          radius: this.parseRadius(parts[3], lineNumber),
          height: this.parseSignedValue(parts[4] ?? "0", this.heightTokenMap(), lineNumber, "height"),
          stretch: this.parsePositiveNumber(parts[5] ?? "1", lineNumber, "stretch")
        };
      case "hairpin":
        return {
          kind: "hairpin",
          direction: this.parseDirection(parts[1], lineNumber),
          height: this.parseSignedValue(parts[2] ?? "0", this.heightTokenMap(), lineNumber, "height")
        };
      case "chicane":
        return {
          kind: "chicane",
          direction: this.parseDirection(parts[1], lineNumber)
        };
      case "reset_elevation":
        return {
          kind: "reset_elevation",
          enter: this.parsePositiveInt(parts[1] ?? "20", lineNumber, "enter"),
          hold: this.parsePositiveInt(parts[2] ?? "20", lineNumber, "hold"),
          leave: this.parsePositiveInt(parts[3] ?? "20", lineNumber, "leave")
        };
      default:
        throw new Error(`Line ${lineNumber}: unknown command '${parts[0]}'.`);
    }
  }

  private parseDirection(token: string | undefined, lineNumber: number): TurnDirection {
    if (token === "left" || token === "right") {
      return token;
    }
    throw new Error(`Line ${lineNumber}: direction must be left or right.`);
  }

  private parseRadius(token: string | undefined, lineNumber: number): CornerRadius {
    if (token === "large" || token === "medium" || token === "hairpin") {
      return token;
    }
    throw new Error(`Line ${lineNumber}: radius must be large, medium, or hairpin.`);
  }

  private parseLengthToken(token: string | undefined, lineNumber: number): number {
    const value = this.parseSignedValue(token, this.lengthTokenMap(), lineNumber, "length");
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Line ${lineNumber}: length must be a positive number.`);
    }
    return Math.round(value);
  }

  private parsePositiveInt(token: string | undefined, lineNumber: number, label: string): number {
    const value = this.parseSignedValue(token, {}, lineNumber, label);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Line ${lineNumber}: ${label} must be a positive number.`);
    }
    return Math.round(value);
  }

  private parsePositiveNumber(token: string | undefined, lineNumber: number, label: string): number {
    const value = this.parseSignedValue(token, {}, lineNumber, label);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Line ${lineNumber}: ${label} must be a positive number.`);
    }
    return value;
  }

  private parseSignedValue(
    token: string | undefined,
    namedValues: Record<string, number>,
    lineNumber: number,
    label: string
  ): number {
    if (!token) {
      throw new Error(`Line ${lineNumber}: missing ${label}.`);
    }

    const normalized = token.toLowerCase();
    const directNamed = namedValues[normalized];
    if (directNamed !== undefined) {
      return directNamed;
    }

    const sign = normalized.startsWith("-") ? -1 : 1;
    const bare = normalized.replace(/^[-+]/, "");
    const signedNamed = namedValues[bare];
    if (signedNamed !== undefined) {
      return sign * signedNamed;
    }

    const numeric = Number(token);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }

    throw new Error(`Line ${lineNumber}: invalid ${label} '${token}'.`);
  }

  private lengthTokenMap(): Record<string, number> {
    return {
      xs: STAGE.LENGTH.XS,
      short: ROAD.LENGTH.SHORT,
      medium: ROAD.LENGTH.MEDIUM,
      long: ROAD.LENGTH.LONG
    };
  }

  private heightTokenMap(): Record<string, number> {
    return {
      none: 0,
      low: ROAD.HILL.LOW,
      medium: ROAD.HILL.MEDIUM,
      high: ROAD.HILL.HIGH
    };
  }

  private curveTokenMap(): Record<string, number> {
    return {
      none: 0,
      easy: ROAD.CURVE.EASY,
      medium: ROAD.CURVE.MEDIUM,
      hard: ROAD.CURVE.HARD
    };
  }

  private addRoad(enter: number, hold: number, leave: number, curve: number, y = 0): void {
    const startY = this.lastY();
    const endY = startY + y * SEGMENT_LENGTH;
    const total = Math.max(1, enter + hold + leave);
    for (let n = 0; n < enter; n += 1) {
      this.addSegment(
        easeIn(0, curve, n / Math.max(1, enter)),
        easeInOut(startY, endY, n / total)
      );
    }
    for (let n = 0; n < hold; n += 1) {
      this.addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    }
    for (let n = 0; n < leave; n += 1) {
      this.addSegment(
        easeInOut(curve, 0, n / Math.max(1, leave)),
        easeInOut(startY, endY, (enter + hold + n) / total)
      );
    }
  }

  private addSegment(curve: number, y: number): void {
    const index = this.segments.length;
    this.segments.push({
      index,
      p1: createPoint(index * SEGMENT_LENGTH, this.lastY()),
      p2: createPoint((index + 1) * SEGMENT_LENGTH, y),
      curve,
      color: Math.floor(index / RUMBLE_LENGTH) % 2 === 0 ? (COLORS.light as SegmentColor) : (COLORS.dark as SegmentColor),
      sectionId: "1",
      sectionName: "Launch Straight",
      props: [],
      cars: []
    });
  }

  private resetCars(): void {
    this.cars = [];
    for (const segment of this.segments) {
      segment.cars = [];
    }

    const targetCars = clamp(Math.round(this.segments.length / 28), TRAFFIC_MIN_CARS, TRAFFIC_MAX_CARS);

    for (let index = 0; index < targetCars; index += 1) {
      const seed = index * 97 + 31;
      const spacing = (index + seededUnit(seed + 3)) / targetCars;
      const z = spacing * this.trackLength;
      const car: TrafficCar = {
        offset: interpolate(-0.82, 0.82, seededUnit(seed + 7)),
        z,
        speed: interpolate(this.maxSpeed * 0.34, this.maxSpeed * 0.82, seededUnit(seed + 11)),
        percent: percentRemaining(z, SEGMENT_LENGTH),
        sprite: JAKE_TRAFFIC_SET[Math.floor(seededUnit(seed + 13) * JAKE_TRAFFIC_SET.length) % JAKE_TRAFFIC_SET.length],
        scale: interpolate(0.82, 1.16, seededUnit(seed + 17))
      };
      this.cars.push(car);
      this.findSegment(car.z).cars.push(car);
    }
  }

  private updateCars(dt: number, playerSegment: Segment, playerW: number): void {
    for (const car of this.cars) {
      const oldSegment = this.findSegment(car.z);
      car.offset = clamp(
        car.offset + this.updateCarOffset(car, oldSegment, playerSegment, playerW) * dt * 2,
        -MAX_PLAYER_X,
        MAX_PLAYER_X
      );
      car.z = increase(car.z, dt * car.speed, this.trackLength);
      car.percent = percentRemaining(car.z, SEGMENT_LENGTH);
      const newSegment = this.findSegment(car.z);
      if (oldSegment !== newSegment) {
        const oldIndex = oldSegment.cars.indexOf(car);
        if (oldIndex >= 0) {
          oldSegment.cars.splice(oldIndex, 1);
        }
        newSegment.cars.push(car);
      }
    }
  }

  private updateCarOffset(car: TrafficCar, carSegment: Segment, playerSegment: Segment, playerW: number): number {
    for (let lookahead = 1; lookahead <= TRAFFIC_LOOKAHEAD; lookahead += 1) {
      const segment = this.segments[(carSegment.index + lookahead) % this.segments.length];

      if (
        segment === playerSegment &&
        car.speed > this.speed &&
        overlap(this.playerX, playerW, car.offset, TRAFFIC_HITBOX_WIDTH * car.scale, 1.1)
      ) {
        if (this.playerX > 0.5) {
          return -1 / lookahead;
        }
        if (this.playerX < -0.5) {
          return 1 / lookahead;
        }
        return car.offset > this.playerX ? 1 / lookahead : -1 / lookahead;
      }

      for (const otherCar of segment.cars) {
        if (
          otherCar === car ||
          car.speed <= otherCar.speed ||
          !overlap(car.offset, TRAFFIC_HITBOX_WIDTH * car.scale, otherCar.offset, TRAFFIC_HITBOX_WIDTH * otherCar.scale, 1.1)
        ) {
          continue;
        }

        if (otherCar.offset > 0.5) {
          return -1 / lookahead;
        }
        if (otherCar.offset < -0.5) {
          return 1 / lookahead;
        }
        return car.offset > otherCar.offset ? 1 / lookahead : -1 / lookahead;
      }
    }

    if (car.offset < -0.9) {
      return 0.4;
    }
    if (car.offset > 0.9) {
      return -0.4;
    }
    return 0;
  }
}

const overlap = (x1: number, w1: number, x2: number, w2: number, percent = 1): boolean => {
  const half = percent * 0.5;
  const min1 = x1 - w1 * half;
  const max1 = x1 + w1 * half;
  const min2 = x2 - w2 * half;
  const max2 = x2 + w2 * half;
  return !(max1 < min2 || min1 > max2);
};
