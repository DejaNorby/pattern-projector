import { Shapes } from "@/_lib/interfaces/shape";
import shapesReducer from "@/_reducers/shapesReducer";
import { useEffect, useReducer, useRef } from "react";

const STORAGE_KEY = "customShapes";

/**
 * Hook that stores the user's custom shapes in local storage so they persist
 * across sessions, since (unlike layers) they aren't tied to an uploaded file.
 */
export default function useShapes() {
  const [shapes, dispatchShapesAction] = useReducer(shapesReducer, {});
  const loadedRef = useRef(false);

  useEffect(() => {
    const stored = readFromLocalStorage();
    if (stored != null) {
      dispatchShapesAction({ type: "set-shapes", shapes: stored });
    }
    // Only load from local storage once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persisting from an effect keyed on the actual committed `shapes` state
  // (rather than writing inside the dispatch call itself) keeps this correct
  // even when several actions are dispatched synchronously in a row - each
  // dispatch call would otherwise compute its "new" value from the same
  // stale closured `shapes`, so only the last of a batch would ever actually
  // get persisted.
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    writeToLocalStorage(shapes);
  }, [shapes]);

  return { shapes, dispatchShapesAction };
}

function writeToLocalStorage(shapes: Shapes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes));
}

function readFromLocalStorage(): Shapes | undefined {
  const rawValue = localStorage.getItem(STORAGE_KEY);
  if (rawValue == null) {
    return undefined;
  }
  try {
    return JSON.parse(rawValue);
  } catch {
    return undefined;
  }
}
