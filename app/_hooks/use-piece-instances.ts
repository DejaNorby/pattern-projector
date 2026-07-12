import { PieceInstances } from "@/_lib/interfaces/piece-instance";
import pieceInstancesReducer from "@/_reducers/pieceInstancesReducer";
import { useEffect, useReducer, useRef } from "react";

/**
 * Hook that stores piece layout instances per file name in local storage,
 * following the same persistence convention as useLayers/useShapes.
 */
export default function usePieceInstances(fileName: string) {
  const [instances, dispatchInstancesAction] = useReducer(
    pieceInstancesReducer,
    {},
  );
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    const stored = readFromLocalStorage(fileName);
    dispatchInstancesAction({
      type: "set-instances",
      instances: stored ?? {},
    });
    // Only load from local storage when the file changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileName]);

  // Persisting from an effect keyed on the actual committed `instances` state
  // (rather than writing inside the dispatch call itself) keeps this correct
  // even when several actions are dispatched synchronously in a row - each
  // dispatch call would otherwise compute its "new" value from the same
  // stale closured `instances`, so only the last of a batch would ever
  // actually get persisted.
  useEffect(() => {
    if (!loadedRef.current) {
      // Skip the write that would otherwise follow the initial "set-instances"
      // load itself - it's already exactly what's in local storage.
      loadedRef.current = true;
      return;
    }
    writeToLocalStorage(fileName, instances);
  }, [instances, fileName]);

  return { instances, dispatchInstancesAction };
}

function writeToLocalStorage(fileName: string, instances: PieceInstances) {
  localStorage.setItem(`pieceInstances:${fileName}`, JSON.stringify(instances));
}

function readFromLocalStorage(fileName: string): PieceInstances | undefined {
  const rawValue = localStorage.getItem(`pieceInstances:${fileName}`);
  if (rawValue == null) {
    return undefined;
  }
  try {
    return JSON.parse(rawValue);
  } catch {
    return undefined;
  }
}
