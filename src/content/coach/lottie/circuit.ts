/**
 * An Eulerian circuit of the complete directed graph on `nodes` (Hierholzer's
 * algorithm): every ordered pair once, from the first node back to it. Laid
 * out on a timeline, each transition between two moods is one segment.
 */
export function eulerianCircuit<T extends string>(nodes: readonly T[]): T[] {
  const unvisited = new Map(nodes.map(node => [node, nodes.filter(other => other !== node)]));
  const path: T[] = [];
  const stack: T[] = [];
  let current = nodes[0];
  while (current !== undefined) {
    const next = unvisited.get(current)?.shift();
    if (next === undefined) {
      path.push(current);
      current = stack.pop();
    } else {
      stack.push(current);
      current = next;
    }
  }
  return path.toReversed();
}
