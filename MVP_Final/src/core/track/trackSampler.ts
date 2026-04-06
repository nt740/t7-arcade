import { lerp } from "../math/scalar";
import { shortestAngleDelta } from "../math/angle";
import type { SectionId } from "../types/common";
import type { TrackLayout, TrackSample, TrackSection, TrackSegment } from "./trackTypes";

const clampSegmentIndex = (layout: TrackLayout, index: number): number => {
  if (layout.segments.length === 0) {
    return 0;
  }

  return Math.min(layout.segments.length - 1, Math.max(0, index));
};

export const normalizeDistanceZ = (layout: TrackLayout, distanceZ: number): number => {
  if (layout.totalLength <= 0) {
    return 0;
  }

  return ((distanceZ % layout.totalLength) + layout.totalLength) % layout.totalLength;
};

export const findTrackSection = (layout: TrackLayout, sectionId: SectionId): TrackSection | undefined =>
  layout.sections.find((section) => section.id === sectionId);

export const sampleTrack = (layout: TrackLayout, distanceZ: number): TrackSample => {
  if (layout.segments.length === 0) {
    throw new Error("Track layout has no segments");
  }

  const wrappedZ = normalizeDistanceZ(layout, distanceZ);
  const segmentLength = layout.segments[0].length;
  const segmentIndex = clampSegmentIndex(layout, Math.floor(wrappedZ / segmentLength));
  const nextSegmentIndex = clampSegmentIndex(layout, segmentIndex + 1 >= layout.segments.length ? 0 : segmentIndex + 1);
  const segment: TrackSegment = layout.segments[segmentIndex];
  const nextSegment: TrackSegment = layout.segments[nextSegmentIndex];
  const t = (wrappedZ - segment.zStart) / segmentLength;
  const section = findTrackSection(layout, segment.sectionId);
  const sectionZ = wrappedZ - (section?.zStart ?? 0);
  const sectionProgress = section ? Math.min(1, Math.max(0, sectionZ / section.length)) : 0;

  return {
    segment,
    centerX: lerp(segment.centerX, nextSegment.centerX, t),
    centerY: lerp(segment.centerY, nextSegment.centerY, t),
    tangentHeading: segment.tangentHeading + shortestAngleDelta(segment.tangentHeading, nextSegment.tangentHeading) * t,
    sectionId: segment.sectionId,
    sectionName: segment.sectionName,
    sectionProgress
  };
};
