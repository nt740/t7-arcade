import type { AuthoredTrackSection } from "./trackTypes";

export const createRoadLabSections = (curveStrength: number): AuthoredTrackSection[] => [
  { id: "launch-straight", name: "Launch Straight", length: 900, curve: 0 },
  { id: "grand-right-arc", name: "Grand Right Arc", length: 1400, curve: 0.00012 * curveStrength },
  { id: "compression-right", name: "Compression Right", length: 900, curve: 0.00018 * curveStrength },
  { id: "grand-left-arc", name: "Grand Left Arc", length: 1400, curve: -0.00012 * curveStrength },
  { id: "tight-left-bend", name: "Tight Left Bend", length: 700, curve: -0.00026 * curveStrength }
];
