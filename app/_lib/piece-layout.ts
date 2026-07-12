import { Matrix, inverse } from "ml-matrix";
import { Point } from "@/_lib/point";
import { transformPoint } from "@/_lib/geometry";

/**
 * Converts a raw screen-space point (e.g. from e.clientX/e.clientY, the same
 * coordinate system used to build the calibration transform) into "pattern
 * layout space" - the coordinate system a piece instance's own x/y live in,
 * i.e. the space before the whole-canvas calibration and local (pan/rotate)
 * transforms are applied.
 */
export function screenToPatternSpace(
  screenPoint: Point,
  perspective: Matrix,
  localTransform: Matrix,
): Point {
  const afterCalibration = transformPoint(screenPoint, perspective);
  return transformPoint(afterCalibration, inverse(localTransform));
}

/**
 * The inverse of screenToPatternSpace: projects a pattern-layout-space point
 * onto the screen, given the current calibration and local transforms.
 */
export function patternSpaceToScreen(
  patternPoint: Point,
  calibrationTransform: Matrix,
  localTransform: Matrix,
): Point {
  const combined = calibrationTransform.mmul(localTransform);
  return transformPoint(patternPoint, combined);
}

/**
 * The 4 corners of a piece's own local (width x height) bounding box, after
 * applying its flip and rotation about its own center and translating to its
 * (x, y) position - i.e. in pattern layout space, ready to be projected to
 * the screen via patternSpaceToScreen.
 */
export function getPieceCorners(
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDeg: number,
  flipHorizontal: boolean,
  flipVertical: boolean,
): Point[] {
  const cx = width / 2;
  const cy = height / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = flipHorizontal ? -1 : 1;
  const sy = flipVertical ? -1 : 1;

  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ].map((p) => {
    // Flip about the local center first, then rotate about the same center.
    const fx = cx + (p.x - cx) * sx;
    const fy = cy + (p.y - cy) * sy;
    const dx = fx - cx;
    const dy = fy - cy;
    return {
      x: x + cx + dx * cos - dy * sin,
      y: y + cy + dx * sin + dy * cos,
    };
  });
}
