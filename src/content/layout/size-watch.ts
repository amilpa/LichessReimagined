// Measures only after a size change. A tick finds the elements (lookups, no
// layout), and the measure runs when they're new or a ResizeObserver saw one
// of them resize, rather than reading the layout four times a second.

export interface SizeWatch {
  /** Watches `elements`; true when they must be measured again. */
  readonly changed: (elements: readonly Element[]) => boolean;
}

const sameElements = (elements: readonly Element[], others: readonly Element[]): boolean =>
  elements.length === others.length && elements.every((element, i) => element === others[i]);

export function createSizeWatch(): SizeWatch {
  let watched: readonly Element[] = [];
  let resized = true;
  const observer = new ResizeObserver(() => {
    resized = true;
  });
  return {
    changed: elements => {
      if (!sameElements(elements, watched)) {
        observer.disconnect();
        // The border box: what the tasks measure (getBoundingClientRect).
        for (const element of elements) observer.observe(element, { box: 'border-box' });
        watched = elements;
        resized = true;
      }
      const changed = resized;
      resized = false;
      return changed;
    },
  };
}
