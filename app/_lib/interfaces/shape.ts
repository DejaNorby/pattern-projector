// Matches the MM/CM/IN constants exported from "@/_lib/unit" so shape
// dimensions can be passed directly to getPtDensity().
export type ShapeUnit = "MM" | "CM" | "IN";

export type ShapeType = "rectangle" | "ellipse" | "triangle" | "pie";

interface ShapeCommon {
  id: string;
  name: string;
  unit: ShapeUnit;
  // Position of the top-left corner of the shape's local bounding box,
  // in CSS px within the shared shapes canvas.
  x: number;
  y: number;
  // Degrees, rotated about the shape's own bounding box center.
  rotation: number;
  visible: boolean;
}

export interface RectangleShape extends ShapeCommon {
  type: "rectangle";
  width: number;
  height: number;
}

export interface EllipseShape extends ShapeCommon {
  type: "ellipse";
  width: number;
  height: number;
}

export type TriangleMode = "base-height" | "sides";

export interface TriangleShape extends ShapeCommon {
  type: "triangle";
  mode: TriangleMode;
  base?: number;
  height?: number;
  sideA?: number;
  sideB?: number;
  sideC?: number;
}

export interface PieShape extends ShapeCommon {
  type: "pie";
  radius: number;
  innerRadius: number;
  angle: number; // degrees
}

export type Shape = RectangleShape | EllipseShape | TriangleShape | PieShape;

export type Shapes = { [id: string]: Shape };
