import { Shape, Shapes } from "@/_lib/interfaces/shape";

interface AddShapeAction {
  type: "add-shape";
  shape: Shape;
}

interface UpdateShapeAction {
  type: "update-shape";
  shape: Shape;
}

interface RemoveShapeAction {
  type: "remove-shape";
  id: string;
}

interface ToggleVisibilityAction {
  type: "toggle-visibility";
  id: string;
}

interface SetShapesAction {
  type: "set-shapes";
  shapes: Shapes;
}

interface ClearAction {
  type: "clear";
}

export type ShapeAction =
  | AddShapeAction
  | UpdateShapeAction
  | RemoveShapeAction
  | ToggleVisibilityAction
  | SetShapesAction
  | ClearAction;

export default function shapesReducer(
  shapes: Shapes,
  action: ShapeAction,
): Shapes {
  switch (action.type) {
    case "add-shape":
    case "update-shape":
      return { ...shapes, [action.shape.id]: action.shape };
    case "remove-shape": {
      const rest = { ...shapes };
      delete rest[action.id];
      return rest;
    }
    case "toggle-visibility":
      return {
        ...shapes,
        [action.id]: {
          ...shapes[action.id],
          visible: !shapes[action.id]?.visible,
        },
      };
    case "set-shapes":
      return action.shapes;
    case "clear":
      return {};
  }
}
