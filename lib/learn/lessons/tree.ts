import { z } from 'zod';

export type TreeNode = { id: string; label: string; tex?: string; children?: TreeNode[] };
const nodeId = z.string().regex(/^[a-z][a-z0-9-]*$/);
const nodeSchema: z.ZodType<TreeNode> = z.lazy(() => z.object({
  id: nodeId,
  label: z.string().min(1).max(20000),
  tex: z.string().min(1).max(20000).optional(),
  children: z.array(nodeSchema).max(24).optional(),
}));
export const treeSchema = z.object({
  type: z.literal('tree'),
  direction: z.enum(['right', 'down']).default('right'),
  root: nodeSchema,
  initial: z.object({ hidden_nodes: z.array(nodeId).optional(), hidden: z.literal('all').optional() }).optional(),
}).superRefine((tree, ctx) => {
  const nodes = treeNodes(tree.root);
  const ids = new Set(nodes.map(({ node }) => node.id));
  if (ids.size !== nodes.length) ctx.addIssue({ code: 'custom', message: 'tree 노드 ID 중복' });
  if (nodes.length > 24) ctx.addIssue({ code: 'custom', message: 'tree 노드는 최대 24개입니다.' });
  if (nodes.some(({ depth }) => depth > 3)) ctx.addIssue({ code: 'custom', message: 'tree 깊이는 최대 4입니다.' });
  if (tree.initial?.hidden_nodes?.some(id => !ids.has(id))) ctx.addIssue({ code: 'custom', message: 'tree initial에 없는 노드 ID가 있습니다.' });
});
export type TreeStage = z.infer<typeof treeSchema>;

export function treeNodes(root: TreeNode) {
  const result: { node: TreeNode; depth: number; ancestors: string[] }[] = [];
  function visit(node: TreeNode, depth: number, ancestors: string[]) {
    result.push({ node, depth, ancestors });
    node.children?.forEach(child => visit(child, depth + 1, [...ancestors, node.id]));
  }
  visit(root, 0, []);
  return result;
}

type PositionedNode = { node: TreeNode; depth: number; parent?: string; x: number; y: number; width: number; height: number };
/** Layout depends only on content, never on reveal order or browser measurements. */
export function layoutTree(root: TreeNode, direction: 'right' | 'down' = 'right') {
  const nodes = treeNodes(root);
  const widths = nodes.map(({ node }) => Math.max(110, Math.min(280, Array.from(node.label).reduce((sum, c) => sum + (/[^\x00-\x7F]/.test(c) ? 20 : 11), 0) + 36)));
  const columns = Array.from({ length: Math.max(...nodes.map(n => n.depth)) + 1 }, (_, depth) => Math.max(...nodes.flatMap((n, i) => n.depth === depth ? [widths[i]] : [])));
  const centers = new Map<string, number>();
  let leaf = 0;
  function place(node: TreeNode): number {
    const positions = (node.children ?? []).map(place);
    const center = positions.length ? (positions[0] + positions[positions.length - 1]) / 2 : leaf++;
    centers.set(node.id, center);
    return center;
  }
  place(root);
  const padding = 48, height = 64, gap = 54, leafGap = 96, downGap = Math.max(...widths) + 30;
  const positions: PositionedNode[] = nodes.map(({ node, depth, ancestors }, i) => ({
    node, depth, parent: ancestors.at(-1), width: widths[i], height,
    x: direction === 'right' ? padding + columns.slice(0, depth).reduce((sum, width) => sum + width + gap, 0) : padding + centers.get(node.id)! * downGap + (downGap - widths[i]) / 2,
    y: direction === 'right' ? padding + centers.get(node.id)! * leafGap : padding + depth * (height + gap),
  }));
  const edges = positions.filter(node => node.parent).map(node => {
    const parent = positions.find(p => p.node.id === node.parent)!;
    if (direction === 'right') {
      const x = parent.x + parent.width, y = parent.y + parent.height / 2, middle = parent.x + columns[parent.depth] + gap / 2;
      return { id: node.node.id, parent: parent.node.id, path: `M${x},${y} H${middle} V${node.y + node.height / 2} H${node.x}` };
    }
    const x = parent.x + parent.width / 2, y = parent.y + parent.height, middle = y + gap / 2;
    return { id: node.node.id, parent: parent.node.id, path: `M${x},${y} V${middle} H${node.x + node.width / 2} V${node.y}` };
  });
  return { nodes: positions, edges, width: Math.max(...positions.map(n => n.x + n.width)) + padding, height: Math.max(...positions.map(n => n.y + n.height)) + padding };
}
