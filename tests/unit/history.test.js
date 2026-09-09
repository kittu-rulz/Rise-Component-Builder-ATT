import { describe, expect, test, vi } from 'vitest';
import { createHistoryManager } from '../../js/history.js';

describe('createHistoryManager', () => {
  test('initializes with empty stacks and correct initial state', () => {
    const history = createHistoryManager();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.getStats()).toEqual({ undoDepth: 0, redoDepth: 0, maxDepth: 50 });
  });

  test('pushes state and enables undo', () => {
    const history = createHistoryManager();
    history.pushState({ title: 'Step 1' });
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
    expect(history.getStats().undoDepth).toBe(1);
  });

  test('undo returns previous state and pushes current to redo stack', () => {
    const history = createHistoryManager();
    history.pushState({ title: 'Step 1' });
    history.pushState({ title: 'Step 2' });

    const current = { title: 'Step 3' };
    const restored = history.undo(current);

    expect(restored).toEqual({ title: 'Step 2' });
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(true);

    const restored1 = history.undo(restored);
    expect(restored1).toEqual({ title: 'Step 1' });
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });

  test('redo returns next state and pushes current to undo stack', () => {
    const history = createHistoryManager();
    history.pushState({ title: 'Step 1' });
    
    let current = { title: 'Step 2' };
    current = history.undo(current);
    expect(current).toEqual({ title: 'Step 1' });

    const redone = history.redo(current);
    expect(redone).toEqual({ title: 'Step 2' });
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  test('pushState clears redo stack', () => {
    const history = createHistoryManager();
    history.pushState({ title: 'Step 1' });
    history.undo({ title: 'Step 2' });
    expect(history.canRedo()).toBe(true);

    history.pushState({ title: 'Branch step' });
    expect(history.canRedo()).toBe(false);
  });

  test('does not push duplicate consecutive identical states', () => {
    const history = createHistoryManager();
    history.pushState({ title: 'Step 1' });
    history.pushState({ title: 'Step 1' });
    expect(history.getStats().undoDepth).toBe(1);
  });

  test('enforces maxDepth limit', () => {
    const history = createHistoryManager({ maxDepth: 3 });
    history.pushState({ count: 1 });
    history.pushState({ count: 2 });
    history.pushState({ count: 3 });
    history.pushState({ count: 4 });

    expect(history.getStats().undoDepth).toBe(3);
    const restored = history.undo({ count: 5 });
    expect(restored).toEqual({ count: 4 });
  });

  test('clear resets stacks and notifies callback', () => {
    const onStateChange = vi.fn();
    const history = createHistoryManager({ onStateChange });
    history.pushState({ title: 'Step 1' });
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ canUndo: true, canRedo: false, undoDepth: 1, redoDepth: 0 }));

    history.clear({ title: 'Initial' });
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.getStats().undoDepth).toBe(0);
  });

  test('debounced push groups rapid edits', async () => {
    vi.useFakeTimers();
    const history = createHistoryManager({ debounceMs: 100 });

    history.pushDebouncedState({ text: 'H' });
    history.pushDebouncedState({ text: 'He' });
    history.pushDebouncedState({ text: 'Hel' });
    history.pushDebouncedState({ text: 'Hello' });

    expect(history.getStats().undoDepth).toBe(0);

    vi.advanceTimersByTime(150);

    expect(history.getStats().undoDepth).toBe(1);
    const undone = history.undo({ text: 'Hello World' });
    expect(undone).toEqual({ text: 'Hello' });

    vi.useRealTimers();
  });
});
