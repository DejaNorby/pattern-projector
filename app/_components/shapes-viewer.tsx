import { CSSProperties, Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { Matrix } from "ml-matrix";
import { Shapes } from "@/_lib/interfaces/shape";
import {
  getShapeGeometry,
  getShapeWorldBounds,
  validateShape,
} from "@/_lib/shapes";
import { useTransformContext } from "@/_hooks/use-transform-context";

const BASE_STROKE_WIDTH = 3;
// Erosion (used for uploaded patterns to compensate for print/scan line
// bleed) shrinks a stroke from both edges, which erodes asymmetrically once
// the calibration transform's x/y scale factors differ even slightly (normal
// for any hand-calibrated grid) - a hairline stroke is fragile enough that
// one edge orientation can vanish before the other. Since shapes are exact
// vector geometry with no bleed to correct for, "line weight" instead grows
// the stroke width directly, which stays symmetric at any calibration scale.
const STROKE_WIDTH_PER_LEVEL = 2;

export default function ShapesViewer({
  shapes,
  svgStyle,
  setLayoutWidth,
  setLayoutHeight,
  patternScaleFactor,
  lineThickness,
  calibrationTransform,
}: {
  shapes: Shapes;
  svgStyle: CSSProperties;
  setLayoutWidth: Dispatch<SetStateAction<number>>;
  setLayoutHeight: Dispatch<SetStateAction<number>>;
  patternScaleFactor: number;
  lineThickness: number;
  calibrationTransform: Matrix;
}) {
  const localTransform = useTransformContext();
  // The calibration + local transform (pan/rotate/flip) almost never scales x
  // and y by the same amount - any hand-calibrated grid has some mismatch.
  // A single stroke-width renders thinner in whichever direction is scaled
  // down more, so horizontal vs. vertical edges end up visibly different
  // weights. Decomposing the actual on-screen matrix lets us pre-compensate
  // per edge orientation so both directions render at the same final weight.
  const { scaleX, scaleY } = useMemo(() => {
    const m = calibrationTransform.mmul(localTransform);
    const sx = Math.hypot(m.get(0, 0), m.get(1, 0));
    const sy = Math.hypot(m.get(0, 1), m.get(1, 1));
    return { scaleX: sx || 1, scaleY: sy || 1 };
  }, [calibrationTransform, localTransform]);
  const refScale = Math.sqrt(scaleX * scaleY);

  const baseStrokeWidth =
    BASE_STROKE_WIDTH + lineThickness * STROKE_WIDTH_PER_LEVEL;
  // Used for shapes whose edges aren't purely horizontal/vertical (ellipse,
  // triangle, pie) - an exact per-point correction isn't possible with a
  // single width, so this is a reasonable average-case compromise.
  const strokeWidth = baseStrokeWidth;
  // Edges running horizontally are scaled by scaleY (their thickness runs in
  // the y direction); edges running vertically are scaled by scaleX.
  const strokeWidthHorizontalEdge = baseStrokeWidth * (refScale / scaleY);
  const strokeWidthVerticalEdge = baseStrokeWidth * (refScale / scaleX);

  const visibleShapes = useMemo(
    () =>
      Object.values(shapes).filter(
        (shape) => shape.visible && validateShape(shape) === null,
      ),
    [shapes],
  );

  const bounds = useMemo(() => {
    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;
    visibleShapes.forEach((shape, i) => {
      const geometry = getShapeGeometry(shape);
      const b = getShapeWorldBounds(
        shape.x,
        shape.y,
        geometry.width,
        geometry.height,
        shape.rotation,
      );
      if (i === 0) {
        minX = b.minX;
        minY = b.minY;
        maxX = b.maxX;
        maxY = b.maxY;
      } else {
        minX = Math.min(minX, b.minX);
        minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX);
        maxY = Math.max(maxY, b.maxY);
      }
    });
    return { minX, minY, maxX, maxY };
  }, [visibleShapes]);

  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);

  useEffect(() => {
    setLayoutWidth(width * patternScaleFactor);
    setLayoutHeight(height * patternScaleFactor);
  }, [width, height, patternScaleFactor, setLayoutWidth, setLayoutHeight]);

  const transform =
    patternScaleFactor === 1 ? "none" : `scale(${patternScaleFactor})`;

  return (
    <svg
      className="pointer-events-none"
      style={{ ...svgStyle, transform, transformOrigin: "top left" }}
      width={width}
      height={height}
      viewBox={`${bounds.minX} ${bounds.minY} ${width} ${height}`}
    >
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={width}
        height={height}
        fill="white"
      />
      {visibleShapes.map((shape) => {
        const geometry = getShapeGeometry(shape);
        const groupTransform = `translate(${shape.x} ${shape.y}) rotate(${shape.rotation} ${geometry.width / 2} ${geometry.height / 2})`;
        return (
          <g key={shape.id} transform={groupTransform}>
            {geometry.kind === "rect" && (
              <>
                <line
                  x1={0}
                  y1={0}
                  x2={geometry.width}
                  y2={0}
                  stroke="black"
                  strokeWidth={strokeWidthHorizontalEdge}
                  strokeLinecap="square"
                />
                <line
                  x1={0}
                  y1={geometry.height}
                  x2={geometry.width}
                  y2={geometry.height}
                  stroke="black"
                  strokeWidth={strokeWidthHorizontalEdge}
                  strokeLinecap="square"
                />
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={geometry.height}
                  stroke="black"
                  strokeWidth={strokeWidthVerticalEdge}
                  strokeLinecap="square"
                />
                <line
                  x1={geometry.width}
                  y1={0}
                  x2={geometry.width}
                  y2={geometry.height}
                  stroke="black"
                  strokeWidth={strokeWidthVerticalEdge}
                  strokeLinecap="square"
                />
              </>
            )}
            {geometry.kind === "ellipse" && (
              <ellipse
                cx={geometry.width / 2}
                cy={geometry.height / 2}
                rx={geometry.width / 2}
                ry={geometry.height / 2}
                fill="none"
                stroke="black"
                strokeWidth={strokeWidth}
              />
            )}
            {geometry.kind === "polygon" && (
              <polygon
                points={geometry.points}
                fill="none"
                stroke="black"
                strokeWidth={strokeWidth}
              />
            )}
            {geometry.kind === "path" && (
              <path
                d={geometry.path}
                fill="none"
                stroke="black"
                strokeWidth={strokeWidth}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
