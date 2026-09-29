/** Waits one macrotask: observers, promise callbacks and 0 ms timers have run by then. */
export const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
