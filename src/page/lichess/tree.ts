import { z } from 'zod/mini';
import { createGuard } from '#shared/guards.ts';

// A node of Lichess's analysis tree (ui/lib/src/tree). Only the fields we read.
const TreeNodeSchema = z.object({
  id: z.string(),
  ply: z.number(),
  fen: z.string(),
  uci: z.optional(z.string()),
  san: z.optional(z.string()),
  // Set on the engine's lines in the move list ("computer" variations).
  comp: z.optional(z.boolean()),
  // The server analysis' score and the mover's clock, on a game's mainline:
  // read with their own schemas (charts/game), so that no other shape of
  // theirs makes the node unreadable.
  eval: z.optional(z.unknown()),
  clock: z.optional(z.unknown()),
  children: z.array(z.unknown()),
});

export type TreeNode = z.infer<typeof TreeNodeSchema>;

export const isTreeNode = createGuard(TreeNodeSchema);

// A tree path is its nodes' ids end to end, two characters each (lila's
// ui/lib/src/tree/path.ts).
const NODE_ID_LENGTH = 2;

/** The path of the node's parent: '' for a move from the root. */
export const parentPath = (path: string): string => path.slice(0, -NODE_ID_LENGTH);

/** The id of the node the path leads to. */
export const lastNodeId = (path: string): string => path.slice(-NODE_ID_LENGTH);

/** The path of each node along `path`, the first move's first, `path` itself last. */
export function pathPrefixes(path: string): string[] {
  const prefixes: string[] = [];
  for (let end = NODE_ID_LENGTH; end <= path.length; end += NODE_ID_LENGTH)
    prefixes.push(path.slice(0, end));
  return prefixes;
}

/** The node's first child: the next move on its line. */
export function firstChild(node: TreeNode): TreeNode | null {
  const child = node.children[0];
  return isTreeNode(child) ? child : null;
}
