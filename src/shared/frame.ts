/**
 * Wraps `task` so it runs at most once per animation frame, however many
 * times it is asked for in between.
 */
export function oncePerFrame(task: () => void): () => void {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      task();
    });
  };
}
