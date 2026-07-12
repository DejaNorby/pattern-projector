const WHITE_THRESHOLD = 250;

/**
 * Builds a luminance mask (white = keep, black = hide, matching SVG <mask>
 * semantics) that isolates a line-art piece's interior from the background
 * of a canvas already painted with that piece (dark outline on a white
 * background). Treating all white pixels as background would also wipe out
 * the piece's own (white) interior - instead this flood-fills inward from
 * the canvas's edges through white-ish pixels only; anything that fill
 * can't reach (the interior enclosed by the piece's outline, plus the
 * outline itself) is kept.
 */
export function buildInteriorMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): HTMLCanvasElement {
  const { data } = ctx.getImageData(0, 0, width, height);
  const isWhiteish = (pixelIndex: number) =>
    data[pixelIndex] >= WHITE_THRESHOLD &&
    data[pixelIndex + 1] >= WHITE_THRESHOLD &&
    data[pixelIndex + 2] >= WHITE_THRESHOLD;

  // 1 = background, reached by flood fill from the canvas's border.
  const background = new Uint8Array(width * height);
  const stack: number[] = [];
  function tryVisit(x: number, y: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }
    const cell = y * width + x;
    if (background[cell] || !isWhiteish(cell * 4)) {
      return;
    }
    background[cell] = 1;
    stack.push(cell);
  }
  for (let x = 0; x < width; x++) {
    tryVisit(x, 0);
    tryVisit(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryVisit(0, y);
    tryVisit(width - 1, y);
  }
  while (stack.length > 0) {
    const cell = stack.pop() as number;
    const x = cell % width;
    const y = (cell - x) / width;
    tryVisit(x + 1, y);
    tryVisit(x - 1, y);
    tryVisit(x, y + 1);
    tryVisit(x, y - 1);
  }

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext("2d") as CanvasRenderingContext2D;
  const maskImageData = maskCtx.createImageData(width, height);
  for (let cell = 0; cell < width * height; cell++) {
    const v = background[cell] ? 0 : 255;
    const p = cell * 4;
    maskImageData.data[p] = v;
    maskImageData.data[p + 1] = v;
    maskImageData.data[p + 2] = v;
    maskImageData.data[p + 3] = 255;
  }
  maskCtx.putImageData(maskImageData, 0, 0);
  return maskCanvas;
}
