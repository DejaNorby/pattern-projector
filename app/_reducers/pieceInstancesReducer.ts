import { PieceInstance, PieceInstances } from "@/_lib/interfaces/piece-instance";

interface AddInstanceAction {
  type: "add-instance";
  instance: PieceInstance;
}

interface UpdateInstanceAction {
  type: "update-instance";
  instance: PieceInstance;
}

interface DuplicateInstanceAction {
  type: "duplicate-instance";
  id: string;
  newId: string;
}

interface RemoveInstanceAction {
  type: "remove-instance";
  id: string;
}

interface SetInstancesAction {
  type: "set-instances";
  instances: PieceInstances;
}

interface ClearAction {
  type: "clear";
}

export type PieceInstanceAction =
  | AddInstanceAction
  | UpdateInstanceAction
  | DuplicateInstanceAction
  | RemoveInstanceAction
  | SetInstancesAction
  | ClearAction;

const DUPLICATE_OFFSET = 24;

export default function pieceInstancesReducer(
  instances: PieceInstances,
  action: PieceInstanceAction,
): PieceInstances {
  switch (action.type) {
    case "add-instance":
    case "update-instance":
      return { ...instances, [action.instance.id]: action.instance };
    case "duplicate-instance": {
      const source = instances[action.id];
      if (source == null) {
        return instances;
      }
      return {
        ...instances,
        [action.newId]: {
          ...source,
          id: action.newId,
          x: source.x + DUPLICATE_OFFSET,
          y: source.y + DUPLICATE_OFFSET,
        },
      };
    }
    case "remove-instance": {
      const rest = { ...instances };
      delete rest[action.id];
      return rest;
    }
    case "set-instances":
      return action.instances;
    case "clear":
      return {};
  }
}
