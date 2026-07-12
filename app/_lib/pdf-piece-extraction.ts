import { buildInteriorMask } from "@/_lib/interior-mask";

export interface PatternSpaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crops the PDF page canvas that PdfViewer/CustomRenderer already rendered
 * (found via the data-pdf-page-canvas attribute) to a rectangle given in
 * "pattern space" coordinates - the canvas's own local, untransformed CSS
 * box (its style.width/height), before the calibration transform is applied.
 * Using the canvas's own declared CSS size (rather than
 * getBoundingClientRect(), which reports the axis-aligned bounding box of
 * whatever the calibration transform - a full perspective warp, not just a
 * scale - makes it look like on screen) keeps this correct regardless of
 * calibration skew. No re-rendering or layer isolation needed - this simply
 * captures whatever is already on screen, at whatever layer
 * visibility/pattern scale is currently in effect.
 *
 * Also returns maskDataUrl - a luminance mask isolating the piece's outline
 * and interior from its (white) background, so callers can clip
 * whole-piece overlays (like the mirrored-piece dot fill) to the actual
 * shape instead of its full rectangular crop.
 */
export function cropPdfCanvasToRect(
  rect: PatternSpaceRect,
): { dataUrl: string; maskDataUrl: string } | null {
  const source = document.querySelector<HTMLCanvasElement>(
    "canvas[data-pdf-page-canvas]",
  );
  if (source == null) {
    return null;
  }

  const cssWidth = parseFloat(source.style.width);
  const cssHeight = parseFloat(source.style.height);
  if (!cssWidth || !cssHeight) {
    return null;
  }
  const scaleX = source.width / cssWidth;
  const scaleY = source.height / cssHeight;

  const sx = rect.x * scaleX;
  const sy = rect.y * scaleY;
  const sw = rect.width * scaleX;
  const sh = rect.height * scaleY;

  const cropWidth = Math.max(1, Math.round(sw));
  const cropHeight = Math.max(1, Math.round(sh));
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const ctx = cropCanvas.getContext("2d");
  if (ctx == null) {
    return null;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, cropWidth, cropHeight);

  const maskCanvas = buildInteriorMask(ctx, cropWidth, cropHeight);

  return {
    dataUrl: cropCanvas.toDataURL("image/png"),
    maskDataUrl: maskCanvas.toDataURL("image/png"),
  };
}
