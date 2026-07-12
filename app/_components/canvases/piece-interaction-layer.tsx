import {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Matrix } from "ml-matrix";
import {
  PieceInstance,
  PieceInstances,
} from "@/_lib/interfaces/piece-instance";
import { PieceInstanceAction } from "@/_reducers/pieceInstancesReducer";
import { ExtractedContent } from "@/_components/piece-layout-viewer";
import {
  getPieceCorners,
  patternSpaceToScreen,
  screenToPatternSpace,
} from "@/_lib/piece-layout";
import { Point } from "@/_lib/point";
import { useTransformContext } from "@/_hooks/use-transform-context";
import PieceToolbar from "@/_components/piece-toolbar";
import { Layers } from "@/_lib/layers";
import {
  extractSvgRectPiece,
  rasterizeSvgPieceMask,
} from "@/_lib/svg-piece-extraction";
import { cropPdfCanvasToRect } from "@/_lib/pdf-piece-extraction";

interface DragState {
  instanceId: string;
  startScreen: Point;
  startInstance: PieceInstance;
}

interface RotateState {
  instanceId: string;
  startAngleRad: number;
  startRotation: number;
}

interface DrawState {
  startScreen: Point;
  currentScreen: Point;
}

const MIN_SELECTION_SCREEN_PX = 6;

export default function PieceInteractionLayer({
  file,
  dataUrl,
  layers,
  instances,
  dispatchInstancesAction,
  content,
  setContent,
  selectedId,
  setSelectedId,
  calibrationTransform,
  perspective,
  patternScaleFactor,
  isCalibrating,
  addingPiece,
}: {
  file: File;
  dataUrl: string;
  layers: Layers;
  instances: PieceInstances;
  dispatchInstancesAction: Dispatch<PieceInstanceAction>;
  content: Map<string, ExtractedContent>;
  setContent: Dispatch<SetStateAction<Map<string, ExtractedContent>>>;
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  calibrationTransform: Matrix;
  perspective: Matrix;
  patternScaleFactor: number;
  isCalibrating: boolean;
  addingPiece: boolean;
}) {
  const isPdf = file.type === "application/pdf";
  const localTransform = useTransformContext();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [rotateDrag, setRotateDrag] = useState<RotateState | null>(null);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const rotateDragRef = useRef(rotateDrag);
  rotateDragRef.current = rotateDrag;
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const svgRootRef = useRef<SVGSVGElement | null>(null);
  const objectRef = useRef<HTMLObjectElement>(null);

  function toPatternSpace(screenPoint: Point): Point {
    const p = screenToPatternSpace(screenPoint, perspective, localTransform);
    return { x: p.x / patternScaleFactor, y: p.y / patternScaleFactor };
  }

  function toScreenSpace(patternPoint: Point): Point {
    const scaled = {
      x: patternPoint.x * patternScaleFactor,
      y: patternPoint.y * patternScaleFactor,
    };
    return patternSpaceToScreen(scaled, calibrationTransform, localTransform);
  }

  function finishDrawing(state: DrawState) {
    const dx = Math.abs(state.currentScreen.x - state.startScreen.x);
    const dy = Math.abs(state.currentScreen.y - state.startScreen.y);
    if (dx < MIN_SELECTION_SCREEN_PX || dy < MIN_SELECTION_SCREEN_PX) {
      return;
    }
    const screenRect = {
      x: Math.min(state.startScreen.x, state.currentScreen.x),
      y: Math.min(state.startScreen.y, state.currentScreen.y),
      width: dx,
      height: dy,
    };
    // The calibration transform is a full perspective (homography) warp, not
    // just a scale/rotate/translate - a screen-space rectangle maps to a
    // general quadrilateral in pattern space, not another axis-aligned
    // rectangle. Transform all 4 corners (not just 2 diagonal ones) and take
    // their bounding box, or a skewed view would systematically clip content
    // near the edges of a tight selection.
    const screenCorners = [
      { x: screenRect.x, y: screenRect.y },
      { x: screenRect.x + screenRect.width, y: screenRect.y },
      { x: screenRect.x + screenRect.width, y: screenRect.y + screenRect.height },
      { x: screenRect.x, y: screenRect.y + screenRect.height },
    ];
    const patternCorners = screenCorners.map(toPatternSpace);
    const patternXs = patternCorners.map((p) => p.x);
    const patternYs = patternCorners.map((p) => p.y);
    const minX = Math.min(...patternXs);
    const maxX = Math.max(...patternXs);
    const minY = Math.min(...patternYs);
    const maxY = Math.max(...patternYs);
    const patternRect = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    const contentId = `piece-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

    if (isPdf) {
      // The PDF canvas's own untransformed CSS box is in "pattern space"
      // scaled by patternScaleFactor (see pdf-custom-renderer.tsx), unlike
      // patternRect above which is pre-scale - undo that division here.
      const cropped = cropPdfCanvasToRect({
        x: patternRect.x * patternScaleFactor,
        y: patternRect.y * patternScaleFactor,
        width: patternRect.width * patternScaleFactor,
        height: patternRect.height * patternScaleFactor,
      });
      if (!cropped) return;
      setContent((prev) => {
        const next = new Map(prev);
        next.set(contentId, {
          kind: "pdf",
          width: patternRect.width,
          height: patternRect.height,
          dataUrl: cropped.dataUrl,
          maskDataUrl: cropped.maskDataUrl,
        });
        return next;
      });
    } else {
      if (!svgRootRef.current) return;
      const piece = extractSvgRectPiece(
        svgRootRef.current,
        layers,
        patternRect,
        contentId,
      );
      if (!piece) return;
      setContent((prev) => {
        const next = new Map(prev);
        next.set(contentId, { kind: "svg", ...piece });
        return next;
      });
      // Rasterizing to build the mirror-fill mask is async - fill it in
      // once ready rather than delaying the piece's initial appearance (a
      // freshly drawn piece isn't mirrored yet, so this can't be seen
      // until the user flips it anyway).
      rasterizeSvgPieceMask(piece.html, piece.width, piece.height).then(
        (maskDataUrl) => {
          setContent((prev) => {
            const existing = prev.get(contentId);
            if (!existing) return prev;
            const next = new Map(prev);
            next.set(contentId, { ...existing, maskDataUrl });
            return next;
          });
        },
        () => {
          // Leave the piece without a mask - the dot fill falls back to
          // covering the full selection rectangle.
        },
      );
    }

    const newId = `${contentId}-instance`;
    dispatchInstancesAction({
      type: "add-instance",
      instance: {
        id: newId,
        fileName: file.name,
        sourceType: isPdf ? "pdf" : "svg",
        contentId,
        x: patternRect.x,
        y: patternRect.y,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
      },
    });
    setSelectedId(newId);
  }

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const currentDrag = dragRef.current;
      const currentRotate = rotateDragRef.current;
      const currentDraw = drawRef.current;
      if (currentDrag != null) {
        const startPattern = toPatternSpace(currentDrag.startScreen);
        const currentPattern = toPatternSpace({ x: e.clientX, y: e.clientY });
        const dx = currentPattern.x - startPattern.x;
        const dy = currentPattern.y - startPattern.y;
        dispatchInstancesAction({
          type: "update-instance",
          instance: {
            ...currentDrag.startInstance,
            x: currentDrag.startInstance.x + dx,
            y: currentDrag.startInstance.y + dy,
          },
        });
      } else if (currentRotate != null) {
        const instance = instances[currentRotate.instanceId];
        const piece = instance && content.get(instance.contentId);
        if (!instance || !piece) return;
        const center = {
          x: instance.x + piece.width / 2,
          y: instance.y + piece.height / 2,
        };
        const currentPattern = toPatternSpace({ x: e.clientX, y: e.clientY });
        const currentAngleRad = Math.atan2(
          currentPattern.y - center.y,
          currentPattern.x - center.x,
        );
        const deltaDeg =
          ((currentAngleRad - currentRotate.startAngleRad) * 180) / Math.PI;
        dispatchInstancesAction({
          type: "update-instance",
          instance: {
            ...instance,
            rotation: currentRotate.startRotation + deltaDeg,
          },
        });
      } else if (currentDraw != null) {
        setDraw({
          ...currentDraw,
          currentScreen: { x: e.clientX, y: e.clientY },
        });
      }
    }
    function handleUp() {
      setDrag(null);
      setRotateDrag(null);
      if (drawRef.current) {
        finishDrawing(drawRef.current);
      }
      setDraw(null);
    }
    if (drag != null || rotateDrag != null || draw != null) {
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      return () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, rotateDrag, draw, instances, content, patternScaleFactor]);

  const selectedInstance = selectedId != null ? instances[selectedId] : null;
  const selectedPiece =
    selectedInstance && content.get(selectedInstance.contentId);
  let toolbarScreen: Point | null = null;
  if (selectedInstance && selectedPiece) {
    const corners = getPieceCorners(
      selectedInstance.x,
      selectedInstance.y,
      selectedPiece.width,
      selectedPiece.height,
      selectedInstance.rotation,
      selectedInstance.flipHorizontal,
      selectedInstance.flipVertical,
    ).map((p) => toScreenSpace(p));
    const minX = Math.min(...corners.map((p) => p.x));
    const minY = Math.min(...corners.map((p) => p.y));
    toolbarScreen = { x: minX, y: minY - 56 };
  }

  const drawScreenRect = draw
    ? {
        x: Math.min(draw.startScreen.x, draw.currentScreen.x),
        y: Math.min(draw.startScreen.y, draw.currentScreen.y),
        width: Math.abs(draw.currentScreen.x - draw.startScreen.x),
        height: Math.abs(draw.currentScreen.y - draw.startScreen.y),
      }
    : null;

  return (
    <>
      {!isPdf && (
        <object
          ref={objectRef}
          data={dataUrl}
          type="image/svg+xml"
          style={{
            position: "absolute",
            top: -99999,
            left: -99999,
            pointerEvents: "none",
          }}
          onLoad={() => {
            const svg =
              objectRef.current?.contentDocument?.querySelector("svg");
            svgRootRef.current = svg ?? null;
          }}
        />
      )}
      {!isCalibrating && (
        <div className="absolute top-0 left-0 w-screen h-screen pointer-events-none">
          {selectedInstance && toolbarScreen && !addingPiece && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: toolbarScreen.x,
                top: Math.max(8, toolbarScreen.y),
              }}
            >
              <PieceToolbar
                instance={selectedInstance}
                dispatchInstancesAction={dispatchInstancesAction}
                setSelectedId={setSelectedId}
              />
            </div>
          )}
          <svg className="absolute top-0 left-0 w-full h-full">
            {addingPiece && (
              <rect
                x={0}
                y={0}
                width="100%"
                height="100%"
                fill="transparent"
                className="pointer-events-auto cursor-crosshair"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedId(null);
                  setDraw({
                    startScreen: { x: e.clientX, y: e.clientY },
                    currentScreen: { x: e.clientX, y: e.clientY },
                  });
                }}
              />
            )}
            {drawScreenRect && (
              <rect
                x={drawScreenRect.x}
                y={drawScreenRect.y}
                width={drawScreenRect.width}
                height={drawScreenRect.height}
                fill="rgba(147,51,234,0.12)"
                stroke="#9333ea"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}
            {!addingPiece &&
              Object.values(instances).map((instance) => {
                const piece = content.get(instance.contentId);
                if (!piece) return null;
                const corners = getPieceCorners(
                  instance.x,
                  instance.y,
                  piece.width,
                  piece.height,
                  instance.rotation,
                  instance.flipHorizontal,
                  instance.flipVertical,
                ).map((p) => toScreenSpace(p));
                const screenCorners = corners
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ");

                const center = {
                  x: instance.x + piece.width / 2,
                  y: instance.y + piece.height / 2,
                };
                const rotateHandlePattern = {
                  x: center.x,
                  y: instance.y - 40,
                };
                const rotateHandleScreen = toScreenSpace(rotateHandlePattern);

                return (
                  <g key={instance.id}>
                    <polygon
                      points={screenCorners}
                      fill={
                        selectedId === instance.id
                          ? "rgba(147,51,234,0.08)"
                          : "transparent"
                      }
                      stroke="none"
                      className="pointer-events-auto cursor-move"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedId(instance.id);
                        setDrag({
                          instanceId: instance.id,
                          startScreen: { x: e.clientX, y: e.clientY },
                          startInstance: instance,
                        });
                      }}
                    />
                    {selectedId === instance.id &&
                      instance.sourceType === "svg" && (
                        <circle
                          cx={rotateHandleScreen.x}
                          cy={rotateHandleScreen.y}
                          r={7}
                          fill="#9333ea"
                          className="pointer-events-auto cursor-alias"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startPattern = toPatternSpace({
                              x: e.clientX,
                              y: e.clientY,
                            });
                            const startAngleRad = Math.atan2(
                              startPattern.y - center.y,
                              startPattern.x - center.x,
                            );
                            setRotateDrag({
                              instanceId: instance.id,
                              startAngleRad,
                              startRotation: instance.rotation,
                            });
                          }}
                        />
                      )}
                  </g>
                );
              })}
          </svg>
        </div>
      )}
    </>
  );
}
