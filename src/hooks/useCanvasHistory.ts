import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasElement } from '../types';

function cloneElements(els: CanvasElement[]): CanvasElement[] {
  return els.map((el) => ({ ...el }));
}

function elementsEqual(a: CanvasElement[], b: CanvasElement[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useCanvasHistory(initial: CanvasElement[] = []) {
  const [elementsHistory, setElementsHistory] = useState<CanvasElement[][]>([initial]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(historyIndex);
  const interactionSnapshotRef = useRef<CanvasElement[] | null>(null);

  historyIndexRef.current = historyIndex;
  const currentElements = elementsHistory[historyIndex] ?? [];

  const updateElementsWithHistory = useCallback(
    (newElements: CanvasElement[]) => {
      setElementsHistory((prev) => {
        const idx = historyIndexRef.current;
        const next = prev.slice(0, idx + 1);
        next.push(newElements);
        setHistoryIndex(next.length - 1);
        return next;
      });
    },
    []
  );

  const resetHistory = useCallback((elements: CanvasElement[] = []) => {
    setElementsHistory([elements]);
    setHistoryIndex(0);
  }, []);

  const undo = useCallback(() => {
    setHistoryIndex((idx) => (idx > 0 ? idx - 1 : idx));
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex((idx) =>
      idx < elementsHistory.length - 1 ? idx + 1 : idx
    );
  }, [elementsHistory.length]);

  const beginElementEdit = useCallback(() => {
    interactionSnapshotRef.current = cloneElements(currentElements);
  }, [currentElements]);

  const commitElementEdit = useCallback(() => {
    const snapshot = interactionSnapshotRef.current;
    interactionSnapshotRef.current = null;
    if (!snapshot) return;

    const idx = historyIndexRef.current;
    setElementsHistory((prev) => {
      const current = prev[idx] ?? [];
      if (elementsEqual(snapshot, current)) return prev;

      const next = prev.slice(0, idx + 1);
      next[idx] = snapshot;
      next.push(current);
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, []);

  const updateElementLive = useCallback(
    (updatedEl: CanvasElement) => {
      setElementsHistory((prev) => {
        const next = [...prev];
        const idx = historyIndexRef.current;
        const snapshot = prev[idx] ?? [];
        next[idx] = snapshot.map((el) => (el.id === updatedEl.id ? updatedEl : el));
        return next;
      });
    },
    []
  );

  return {
    currentElements,
    elementsHistory,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < elementsHistory.length - 1,
    updateElementsWithHistory,
    resetHistory,
    undo,
    redo,
    beginElementEdit,
    commitElementEdit,
    updateElementLive,
  };
}

/** Clear selection when the selected layer is removed from history (e.g. eraser). */
export function useClearInvalidSelection(
  selectedElementId: string | null,
  currentElements: CanvasElement[],
  onClear: () => void
) {
  useEffect(() => {
    if (!selectedElementId) return;
    const el = currentElements.find((e) => e.id === selectedElementId);
    if (!el || el.type === 'eraser') {
      onClear();
    }
  }, [selectedElementId, currentElements, onClear]);
}
