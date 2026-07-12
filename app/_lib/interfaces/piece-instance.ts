export type PieceSourceType = "pdf" | "svg";

export interface PieceInstance {
  id: string;
  fileName: string;
  sourceType: PieceSourceType;
  // Id of the extracted content this instance displays (a manually-drawn
  // rectangle selection, not tied to any layer declared in the file).
  // Duplicating a piece creates a new instance sharing the same contentId,
  // so the content is only extracted/cached once.
  contentId: string;
  // Top-left of the piece's own local bounding box, in CSS px, in the same
  // "pattern layout" space Shape.x/y already use.
  x: number;
  y: number;
  // Degrees, about the piece's own bounding box center. PDF-sourced pieces
  // are raster crops, so the UI only offers 90-degree steps to avoid blur;
  // SVG-sourced pieces stay vector and may use any angle.
  rotation: number;
  flipHorizontal: boolean;
  // Mirrored iff flipHorizontal !== flipVertical - flipping both axes is a
  // 180-degree rotation, not a mirror, so no marker dots in that case.
  flipVertical: boolean;
}

export type PieceInstances = { [id: string]: PieceInstance };
