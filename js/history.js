/**
 * Bounded Undo/Redo History Manager
 * Section 6 of Rise Component Builder Next-Level Architecture
 */

/**
 * @typedef {Object} HistoryManagerOptions
 * @property {number} [maxHistory=50] Maximum history depth
 * @property {number} [maxDepth=50] Alias for maxHistory
 * @property {number} [debounceMs=400] Default debounce delay in ms
 * @property {(state: { canUndo: boolean, canRedo: boolean, undoDepth: number, redoDepth: number, lastAction?: string | null, nextRedoAction?: string | null }) => void} [onStateChange]
 */

/**
 * Creates a bounded undo/redo history manager
 * @param {HistoryManagerOptions} [options]
 */
export function createHistoryManager(options = {}) {
  const maxDepth = options.maxDepth ?? options.maxHistory ?? 50;
  const defaultDebounceMs = options.debounceMs ?? 400;
  const onStateChange = options.onStateChange;

  let undoStack = [];
  let redoStack = [];
  let debounceTimer = null;
  let lastPushedSnapshot = null;

  function cloneConfig(config) {
    if (!config) return {};
    return structuredClone(config);
  }

  function areConfigsEqual(a, b) {
    if (!a || !b) return false;
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  function notify() {
    if (typeof onStateChange === 'function') {
      onStateChange({
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        undoDepth: undoStack.length,
        redoDepth: redoStack.length,
        lastAction: undoStack.length ? undoStack[undoStack.length - 1].label : null,
        nextRedoAction: redoStack.length ? redoStack[redoStack.length - 1].label : null
      });
    }
  }

  function pushState(config, label = 'Edit') {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const snapshot = cloneConfig(config);
    if (lastPushedSnapshot && areConfigsEqual(snapshot, lastPushedSnapshot)) {
      return;
    }

    undoStack.push({ snapshot, label, timestamp: Date.now() });
    if (undoStack.length > maxDepth) {
      undoStack.shift();
    }
    redoStack = [];
    lastPushedSnapshot = snapshot;
    notify();
  }

  function pushDebouncedState(config, label = 'Edit', delay = defaultDebounceMs) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      pushState(config, label);
    }, delay);
  }

  function undo(currentConfig) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (undoStack.length === 0) return null;

    const current = cloneConfig(currentConfig);
    const popped = undoStack.pop();

    if (current && Object.keys(current).length > 0) {
      redoStack.push({ snapshot: current, label: popped.label, timestamp: Date.now() });
      if (redoStack.length > maxDepth) redoStack.shift();
    }

    lastPushedSnapshot = cloneConfig(popped.snapshot);
    notify();
    return cloneConfig(popped.snapshot);
  }

  function redo(currentConfig) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (redoStack.length === 0) return null;

    const entry = redoStack.pop();
    const current = cloneConfig(currentConfig);

    if (current && Object.keys(current).length > 0) {
      undoStack.push({ snapshot: current, label: entry.label, timestamp: Date.now() });
      if (undoStack.length > maxDepth) undoStack.shift();
    }

    lastPushedSnapshot = cloneConfig(entry.snapshot);
    notify();
    return cloneConfig(entry.snapshot);
  }

  function clear(initialConfig = null) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    undoStack = [];
    redoStack = [];
    lastPushedSnapshot = initialConfig ? cloneConfig(initialConfig) : null;
    notify();
  }

  return {
    pushState,
    pushDebouncedState,
    undo,
    redo,
    clear,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    getStats: () => ({ undoDepth: undoStack.length, redoDepth: redoStack.length, maxDepth })
  };
}
