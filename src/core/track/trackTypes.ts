import type { SectionId } from "../types/common";

export interface TrackSegment {
  index: number;
  zStart: number;
  length: number;
  centerX: number;
  centerY: number;
  tangentHeading: number;
  curveDelta: number;
  sectionId: SectionId;
  sectionName: string;
}

export interface TrackSection {
  id: SectionId;
  name: string;
  zStart: number;
  length: number;
}

export interface TrackLayout {
  segments: TrackSegment[];
  sections: TrackSection[];
  totalLength: number;
}

export interface TrackSample {
  segment: TrackSegment;
  centerX: number;
  centerY: number;
  tangentHeading: number;
  sectionId: SectionId;
  sectionName: string;
  sectionProgress: number;
}

export interface AuthoredTrackSection {
  id: SectionId;
  name: string;
  length: number;
  curve: number;
}
