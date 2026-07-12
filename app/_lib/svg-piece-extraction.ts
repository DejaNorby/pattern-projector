import { Layers } from "@/_lib/layers";
import { buildInteriorMask } from "@/_lib/interior-mask";

export interface ExtractedPiece {
  width: number;
  height: number;
  // Serialized markup of a <g> whose own local coordinate system has its
  // origin at the selection rectangle's top-left - ready to be placed via
  // dangerouslySetInnerHTML inside a wrapping
  // <g transform="translate(x,y) rotate(...) scale(...)">.
  html: string;
}

export interface PatternSpaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Clips whatever is currently visible in the source SVG (respecting the
 * same layer visibility rules svg-viewer.tsx applies) to a rectangle drawn
 * by the user, in the SVG's own native coordinate system (CSS px, the same
 * "pattern space" convention used throughout this app). Unlike extracting a
 * single named layer, this works regardless of whether the file's layers
 * correspond to individual pieces or, e.g., whole garment sizes.
 */
export function extractSvgRectPiece(
  svgRoot: SVGSVGElement,
  layers: Layers,
  rect: PatternSpaceRect,
  clipId: string,
): ExtractedPiece | null {
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const clone = svgRoot.cloneNode(true) as SVGSVGElement;
  Object.entries(layers).forEach(([id, layer]) => {
    // The hidden <object>'s document has its own separate global realm, so
    // `g instanceof SVGElement` would always be false here even for a
    // genuine element - check for a `style` property instead.
    const g = clone.querySelector(`[id="${CSS.escape(id)}"]`);
    if (g != null && "style" in g) {
      (g as unknown as SVGElement).style.display = layer.visible ? "" : "none";
    }
  });

  const svgNs = "http://www.w3.org/2000/svg";
  const clipPath = document.createElementNS(svgNs, "clipPath");
  clipPath.setAttribute("id", clipId);
  const clipRect = document.createElementNS(svgNs, "rect");
  clipRect.setAttribute("x", String(rect.x));
  clipRect.setAttribute("y", String(rect.y));
  clipRect.setAttribute("width", String(rect.width));
  clipRect.setAttribute("height", String(rect.height));
  clipPath.appendChild(clipRect);

  const contentGroup = document.createElementNS(svgNs, "g");
  contentGroup.setAttribute("clip-path", `url(#${clipId})`);
  Array.from(clone.children).forEach((child) => {
    contentGroup.appendChild(child);
  });

  const wrapper = document.createElementNS(svgNs, "g");
  wrapper.setAttribute("transform", `translate(${-rect.x} ${-rect.y})`);
  // Carry over the source file's namespace declarations (e.g. Inkscape's
  // "inkscape:" prefix, used on attributes like inkscape:groupmode) so
  // piece.html remains valid, independently-parseable XML - needed when
  // rasterizeSvgPieceMask below wraps it in a standalone <svg> document;
  // without them, the extra namespaced attributes are undeclared and the
  // browser refuses to parse it as SVG at all.
  Array.from(svgRoot.attributes).forEach((attr) => {
    if (attr.name === "xmlns" || attr.name.startsWith("xmlns:")) {
      wrapper.setAttribute(attr.name, attr.value);
    }
  });
  wrapper.appendChild(clipPath);
  wrapper.appendChild(contentGroup);

  return { width: rect.width, height: rect.height, html: wrapper.outerHTML };
}

/**
 * Builds a luminance mask isolating an extracted SVG piece's actual shape
 * from the (often generous) margin left around it in the rectangular
 * selection. Clip-path/mask elements referencing this same piece markup as
 * clip geometry can't be used directly for that: browsers only consider the
 * union of the leaf shapes' own geometry when resolving clip-path/<use>
 * references, silently ignoring any clip-path already applied to an
 * ancestor within that geometry (like the selection-rectangle clip baked
 * into the extracted piece markup) - so reusing the markup that way clips to
 * the whole selection rectangle, not the shape within it. Rasterizing the
 * piece instead (which - unlike clip-path resolution - does correctly
 * respect that nested clip) and flood-filling from its edges sidesteps the
 * issue entirely, and reuses the same technique already used for PDF pieces.
 */
export function rasterizeSvgPieceMask(
  pieceHtml: string,
  width: number,
  height: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvasWidth = Math.max(1, Math.round(width));
    const canvasHeight = Math.max(1, Math.round(height));
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" fill="white"/>${pieceHtml}</svg>`;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (ctx == null) {
        reject(new Error("Unable to get 2d context for SVG piece mask"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      const maskCanvas = buildInteriorMask(ctx, canvasWidth, canvasHeight);
      resolve(maskCanvas.toDataURL("image/png"));
    };
    img.onerror = () =>
      reject(new Error("Failed to rasterize SVG piece for masking"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
  });
}
