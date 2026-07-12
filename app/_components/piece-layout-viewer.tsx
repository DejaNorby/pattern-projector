import { CSSProperties } from "react";
import { PieceInstances } from "@/_lib/interfaces/piece-instance";

export interface ExtractedContent {
  kind: "svg" | "pdf";
  width: number;
  height: number;
  html?: string; // svg
  dataUrl?: string; // pdf
  // Luminance mask isolating the piece's actual shape from the (often
  // generous) margin left around it in the drawn selection rectangle - used
  // to clip whole-piece overlays like the mirrored-piece dot fill.
  maskDataUrl?: string;
}

/**
 * Renders whatever piece instances currently exist as an overlay on top of
 * the normal pattern content - it never replaces PdfViewer/SvgViewer and
 * never auto-populates anything; pieces only come into existence via the
 * "Add Piece" rectangle-selection tool in PieceInteractionLayer. Uses a
 * generously overflow-visible <svg> anchored at pattern-space (0,0) rather
 * than a tightly-fitted viewBox, since it no longer owns sizing/zoom-to-fit
 * for the pattern (the underlying viewer still does).
 */
export default function PieceLayoutViewer({
  instances,
  content,
  selectedId,
  svgStyle,
  patternScaleFactor,
}: {
  instances: PieceInstances;
  content: Map<string, ExtractedContent>;
  selectedId: string | null;
  svgStyle: CSSProperties;
  patternScaleFactor: number;
}) {
  const scaleTransform =
    patternScaleFactor === 1 ? "none" : `scale(${patternScaleFactor})`;

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0"
      style={{
        ...svgStyle,
        transform: scaleTransform,
        transformOrigin: "top left",
        overflow: "visible",
      }}
      width={1}
      height={1}
      viewBox="0 0 1 1"
    >
      {Object.values(instances).map((instance) => {
        const piece = content.get(instance.contentId);
        if (!piece) return null;
        const cx = piece.width / 2;
        const cy = piece.height / 2;
        const sx = instance.flipHorizontal ? -1 : 1;
        const sy = instance.flipVertical ? -1 : 1;
        const isMirrored = instance.flipHorizontal !== instance.flipVertical;
        const groupTransform = [
          `translate(${instance.x} ${instance.y})`,
          `translate(${cx} ${cy})`,
          `rotate(${instance.rotation})`,
          `scale(${sx} ${sy})`,
          `translate(${-cx} ${-cy})`,
        ].join(" ");
        return (
          <g key={instance.id} transform={groupTransform} data-piece-id={instance.id}>
            {piece.kind === "svg" && piece.html && (
              <g dangerouslySetInnerHTML={{ __html: piece.html }} />
            )}
            {piece.kind === "pdf" && piece.dataUrl && (
              <image
                href={piece.dataUrl}
                width={piece.width}
                height={piece.height}
                style={{ imageRendering: "pixelated" }}
              />
            )}
            {isMirrored &&
              (() => {
                // Fill the whole piece with a dot texture (not just one
                // indicator dot) so "cut 2, mirrored" is visible no matter
                // where on the piece you're looking - a single dot, even
                // centered, is easy to miss or lose behind other UI. Masked
                // to the piece's actual shape (via a rasterized luminance
                // mask - see interior-mask.ts) so the dots don't spill into
                // the margin between the drawn selection rectangle and the
                // piece's true outline. clip-path can't be used for this:
                // browsers only consider the union of the leaf shapes' own
                // geometry when resolving a clip-path/<use> reference,
                // ignoring any clip-path already applied within that
                // geometry (like the selection-rectangle clip baked into
                // piece.html), so it would clip to the whole rectangle.
                const patternId = `mirror-dots-${instance.id}`;
                const maskId = `mirror-shape-${instance.id}`;
                const spacing = 24;
                const dotRadius = 2.5;
                const dotFill = selectedId === instance.id ? "#9333ea" : "black";
                return (
                  <>
                    <defs>
                      <pattern
                        id={patternId}
                        width={spacing}
                        height={spacing}
                        patternUnits="userSpaceOnUse"
                      >
                        <circle
                          cx={spacing / 2}
                          cy={spacing / 2}
                          r={dotRadius}
                          fill={dotFill}
                        />
                      </pattern>
                      {piece.maskDataUrl && (
                        <mask
                          id={maskId}
                          maskUnits="userSpaceOnUse"
                          x={0}
                          y={0}
                          width={piece.width}
                          height={piece.height}
                        >
                          <image
                            href={piece.maskDataUrl}
                            width={piece.width}
                            height={piece.height}
                          />
                        </mask>
                      )}
                    </defs>
                    <rect
                      x={0}
                      y={0}
                      width={piece.width}
                      height={piece.height}
                      fill={`url(#${patternId})`}
                      fillOpacity={0.5}
                      mask={piece.maskDataUrl ? `url(#${maskId})` : undefined}
                    />
                  </>
                );
              })()}
            {selectedId === instance.id && (
              <rect
                x={0}
                y={0}
                width={piece.width}
                height={piece.height}
                fill="none"
                stroke="#9333ea"
                strokeWidth={2}
                strokeDasharray="8 6"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
