import { Matrix, inverse } from "ml-matrix";
import {
  getPieceCorners,
  patternSpaceToScreen,
  screenToPatternSpace,
} from "@/_lib/piece-layout";

test("screenToPatternSpace and patternSpaceToScreen round-trip", () => {
  // An arbitrary, non-trivial calibration transform (scale + translate).
  const calibrationTransform = Matrix.from1DArray(3, 3, [
    2, 0, 50, 0, 3, 20, 0, 0, 1,
  ]);
  // An arbitrary local (pan/rotate) transform.
  const localTransform = Matrix.from1DArray(3, 3, [
    1, 0, 15, 0, 1, -10, 0, 0, 1,
  ]);
  const perspective = inverse(calibrationTransform);

  const patternPoint = { x: 37, y: 84 };
  const screenPoint = patternSpaceToScreen(
    patternPoint,
    calibrationTransform,
    localTransform,
  );
  const roundTripped = screenToPatternSpace(
    screenPoint,
    perspective,
    localTransform,
  );

  expect(roundTripped.x).toBeCloseTo(patternPoint.x);
  expect(roundTripped.y).toBeCloseTo(patternPoint.y);
});

test("getPieceCorners with no rotation/flip returns the axis-aligned box", () => {
  const corners = getPieceCorners(10, 20, 100, 50, 0, false, false);
  expect(corners[0]).toEqual({ x: 10, y: 20 });
  expect(corners[1]).toEqual({ x: 110, y: 20 });
  expect(corners[2]).toEqual({ x: 110, y: 70 });
  expect(corners[3]).toEqual({ x: 10, y: 70 });
});

test("getPieceCorners with a 90 degree rotation swaps width/height footprint", () => {
  const corners = getPieceCorners(0, 0, 100, 50, 90, false, false);
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  expect(width).toBeCloseTo(50);
  expect(height).toBeCloseTo(100);
});

test("getPieceCorners with a horizontal flip mirrors the box in place", () => {
  const corners = getPieceCorners(0, 0, 100, 50, 0, true, false);
  // Flipping horizontally about the local center leaves the same bounding
  // box, just with corner order/labels mirrored.
  const xs = corners.map((p) => p.x).sort((a, b) => a - b);
  const ys = corners.map((p) => p.y).sort((a, b) => a - b);
  expect(xs).toEqual([0, 0, 100, 100]);
  expect(ys).toEqual([0, 0, 50, 50]);
});
