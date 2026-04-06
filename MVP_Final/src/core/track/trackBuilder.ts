import type { AuthoredTrackSection, TrackLayout, TrackSection, TrackSegment } from "./trackTypes";

const buildSectionMetadata = (
  authoredSection: AuthoredTrackSection,
  zStart: number
): TrackSection => ({
  id: authoredSection.id,
  name: authoredSection.name,
  zStart,
  length: authoredSection.length
});

export const buildTrackLayout = (
  sections: AuthoredTrackSection[],
  segmentLength: number
): TrackLayout => {
  const segments: TrackSegment[] = [];
  const sectionMetadata: TrackSection[] = [];
  let heading = 0;
  let centerX = 0;
  let zStart = 0;

  for (const section of sections) {
    sectionMetadata.push(buildSectionMetadata(section, zStart));
    const segmentCount = Math.max(1, Math.round(section.length / segmentLength));
    const curveDelta = section.curve;

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const segment: TrackSegment = {
        index: segments.length,
        zStart,
        length: segmentLength,
        centerX,
        centerY: 0,
        tangentHeading: heading,
        curveDelta,
        sectionId: section.id,
        sectionName: section.name
      };

      segments.push(segment);
      heading += curveDelta * segmentLength;
      centerX += Math.sin(heading) * segmentLength;
      zStart += segmentLength;
    }
  }

  return {
    segments,
    sections: sectionMetadata,
    totalLength: zStart
  };
};
