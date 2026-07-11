import { getPtDensity } from "@/_lib/unit";
import { Shape } from "@/_lib/interfaces/shape";

export interface ShapeGeometry {
  /** Local bounding box, in CSS px, with its own top-left corner at (0,0). */
  width: number;
  height: number;
  kind: "rect" | "ellipse" | "polygon" | "path";
  points?: string; // "polygon" kind
  path?: string; // "path" kind
}

/**
 * Validates a shape's dimensions and returns an error message if invalid,
 * or null if the shape can be safely rendered.
 */
export function validateShape(shape: Shape): string | null {
  switch (shape.type) {
    case "rectangle":
    case "ellipse":
      if (!(shape.width > 0) || !(shape.height > 0)) {
        return "Width and height must be greater than 0.";
      }
      return null;
    case "triangle":
      if (shape.mode === "base-height") {
        if (!(shape.base && shape.base > 0) || !(shape.height && shape.height > 0)) {
          return "Base and height must be greater than 0.";
        }
        return null;
      } else {
        const { sideA, sideB, sideC } = shape;
        if (
          !(sideA && sideA > 0) ||
          !(sideB && sideB > 0) ||
          !(sideC && sideC > 0)
        ) {
          return "All three side lengths must be greater than 0.";
        }
        if (
          sideA + sideB <= sideC ||
          sideA + sideC <= sideB ||
          sideB + sideC <= sideA
        ) {
          return "These side lengths can't form a triangle: each side must be shorter than the sum of the other two.";
        }
        return null;
      }
    case "pie":
      if (!(shape.radius > 0)) {
        return "Radius must be greater than 0.";
      }
      if (shape.innerRadius < 0 || shape.innerRadius >= shape.radius) {
        return "Inner radius must be 0 or greater, and smaller than the radius.";
      }
      if (!(shape.angle > 0) || shape.angle > 360) {
        return "Angle must be greater than 0 and no more than 360 degrees.";
      }
      return null;
  }
}

/**
 * Builds the local (untranslated, unrotated) SVG geometry for a shape, with
 * its own dimensions converted from the shape's chosen real-world unit to
 * CSS px via getPtDensity - the same conversion used to build the
 * calibration rectangle, so shapes size correctly once projected.
 */
export function getShapeGeometry(shape: Shape): ShapeGeometry {
  const ptDensity = getPtDensity(shape.unit);

  switch (shape.type) {
    case "rectangle": {
      const width = shape.width * ptDensity;
      const height = shape.height * ptDensity;
      return { width, height, kind: "rect" };
    }
    case "ellipse": {
      const width = shape.width * ptDensity;
      const height = shape.height * ptDensity;
      return { width, height, kind: "ellipse" };
    }
    case "triangle": {
      if (shape.mode === "base-height") {
        const base = (shape.base ?? 0) * ptDensity;
        const height = (shape.height ?? 0) * ptDensity;
        const points = `0,${height} ${base},${height} ${base / 2},0`;
        return { width: base, height, kind: "polygon", points };
      }
      const a = (shape.sideA ?? 0) * ptDensity; // BC
      const b = (shape.sideB ?? 0) * ptDensity; // CA
      const c = (shape.sideC ?? 0) * ptDensity; // AB
      const A = { x: 0, y: 0 };
      const B = { x: c, y: 0 };
      const angleA = Math.acos(
        clamp((b * b + c * c - a * a) / (2 * b * c), -1, 1),
      );
      const C = { x: b * Math.cos(angleA), y: b * Math.sin(angleA) };
      const xs = [A.x, B.x, C.x];
      const ys = [A.y, B.y, C.y];
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const width = Math.max(...xs) - minX;
      const height = Math.max(...ys) - minY;
      const points = [A, B, C]
        .map((p) => `${p.x - minX},${p.y - minY}`)
        .join(" ");
      return { width, height, kind: "polygon", points };
    }
    case "pie": {
      const R = shape.radius * ptDensity;
      const r = shape.innerRadius * ptDensity;
      const path = piePath(R, r, shape.angle);
      return { width: R * 2, height: R * 2, kind: "path", path };
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Builds an SVG path for a pie wedge (innerRadius 0) or annulus segment. */
function piePath(outerRadius: number, innerRadius: number, angle: number): string {
  const startAngle = -Math.PI / 2; // 12 o'clock
  const endAngle = startAngle + toRad(angle);
  const largeArc = angle > 180 ? 1 : 0;
  const cx = outerRadius;
  const cy = outerRadius;

  const outerStart = {
    x: cx + outerRadius * Math.cos(startAngle),
    y: cy + outerRadius * Math.sin(startAngle),
  };
  const outerEnd = {
    x: cx + outerRadius * Math.cos(endAngle),
    y: cy + outerRadius * Math.sin(endAngle),
  };

  if (innerRadius <= 0) {
    return `M ${cx},${cy} L ${outerStart.x},${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x},${outerEnd.y} Z`;
  }

  const innerStart = {
    x: cx + innerRadius * Math.cos(startAngle),
    y: cy + innerRadius * Math.sin(startAngle),
  };
  const innerEnd = {
    x: cx + innerRadius * Math.cos(endAngle),
    y: cy + innerRadius * Math.sin(endAngle),
  };

  return [
    `M ${outerStart.x},${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x},${outerEnd.y}`,
    `L ${innerEnd.x},${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x},${innerStart.y}`,
    "Z",
  ].join(" ");
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes the axis-aligned bounding box, in the shared shapes canvas'
 * coordinate space, of a shape positioned at (x,y) and rotated about its own
 * bounding box center.
 */
export function getShapeWorldBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDeg: number,
): Bounds {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rad = toRad(rotationDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ].map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  });
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}
