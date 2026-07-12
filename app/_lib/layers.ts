import type { PDFDocumentProxy } from "pdfjs-dist";
import { Layer } from "./interfaces/layer";

export type Layers = { [key: string]: Layer };

export function getLayersFromSvg(svg: SVGSVGElement): Layers {
  const layers: Layers = {};
  Array.from(svg.querySelectorAll("g"))
    .filter((g) => g.getAttribute("inkscape:groupmode") === "layer")
    .forEach((g) => {
      const isVisible = getComputedStyle(g).display !== "none";
      layers[g.id] = {
        name: g.getAttribute("inkscape:label") ?? g.id,
        ids: [g.id],
        visible: isVisible,
      };
    });
  return layers;
}

export async function getLayersFromPdf(pdf: PDFDocumentProxy): Promise<Layers> {
  const layers: Layers = {};
  const groups: { [key: string]: { name: string } } = (
    await pdf.getOptionalContentConfig()
  ).getGroups();
  if (groups == null) {
    return layers;
  }
  Object.entries(groups).forEach(([key, group]) => {
    const name = String(group.name) ?? key;
    const existing = layers[name];
    if (existing != null) {
      existing.ids.push(key);
    } else {
      layers[name] = {
        name,
        ids: [key],
        visible: true,
      };
    }
  });
  return layers;
}
