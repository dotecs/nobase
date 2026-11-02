import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { studioDemo } from './studio-demo';
import { layoutTree, treeSchema, type TreeNode } from './tree';
import { lessonSchema, stageSchema, type Scene } from './schema';
import { stageStateAt } from './stage-state-at';
import { actionErrors } from './action-validation';
import { TreeStage } from '@/components/studio/stages/TreeStage';
import { StudioStage } from '@/components/studio/stages/StudioStage';
import { equalGraph } from './equal-graph';
import { ChalkLayer } from '@/components/studio/ChalkLayer';
import { chalkAt } from './chalk';
import { chalkSchema } from './chalk-schema';

const scene = studioDemo.scenes.find(scene => scene.id === 'number-tree')!;
const tree = treeSchema.parse(scene.stage);
const starts = [0, 3000, 6000];
const callbacks = { onWhy() {}, onTrace() {}, onQuiz() {} };

describe('tree stage', () => {
  it.each(['right', 'down'] as const)('lays out %s deterministically without overlapping cards', direction => {
    const layout = layoutTree(tree.root, direction);
    expect(layoutTree(structuredClone(tree.root), direction)).toEqual(layout);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + node.width).toBeLessThanOrEqual(layout.width);
      expect(node.y + node.height).toBeLessThanOrEqual(layout.height);
      for (const other of layout.nodes.filter(other => other !== node)) {
        expect(node.x + node.width <= other.x || other.x + other.width <= node.x || node.y + node.height <= other.y || other.y + other.height <= node.y).toBe(true);
      }
      const children = layout.nodes.filter(child => child.parent === node.node.id);
      if (children.length) {
        const center = (item: typeof node) => direction === 'right' ? item.y + item.height / 2 : item.x + item.width / 2;
        expect(center(node)).toBe((center(children[0]) + center(children.at(-1)!)) / 2);
      }
    }
  });

  it('shows all nodes by default and respects explicit hidden nodes', () => {
    const visible: Scene = { ...scene, stage: { ...tree, initial: undefined }, narration: [{ id: 'text', role: 'say', text: '수' }] };
    expect(stageStateAt(visible, 0, [0]).revealed.tree).toHaveLength(8);
    const hidden: Scene = { ...visible, stage: { ...tree, initial: { hidden_nodes: ['pos'] } } };
    expect(stageStateAt(hidden, 0, [0]).revealed.tree).not.toContain('pos');
    const hiddenParent: Scene = { ...visible, stage: { ...tree, initial: { hidden_nodes: ['int'] } } };
    expect(stageStateAt(hiddenParent, 0, [0]).revealed.tree).toContain('pos');
  });

  it('reveals ancestors and draws the incoming edge for 300ms before fading in the card', () => {
    const reveal: Scene = { ...scene, narration: [{ id: 'text', role: 'say', text: '정수', cue: { actions: [{ type: 'reveal', target: 'tree', id: 'int', at_ms: 1000 }] } }] };
    expect(stageStateAt(reveal, 999, [0]).revealed.tree).toEqual([]);
    const halfway = stageStateAt(reveal, 1150, [0]);
    expect(halfway.revealed.tree).toEqual(['real', 'rational', 'int']);
    expect(halfway.treeReveal?.int).toEqual({ line: .5, card: 0 });
    expect(stageStateAt(reveal, 1400, [0]).treeReveal?.int).toEqual({ line: 1, card: .5 });
    expect(stageStateAt(reveal, 1500, [0]).treeReveal?.int).toEqual({ line: 1, card: 1 });
    expect(stageStateAt(reveal, 1150, [0])).toEqual(halfway);
  });

  it('keeps scene order when seeking forward and backward', () => {
    expect(stageStateAt(scene, 3500, starts).revealed.tree).toEqual(['real', 'rational', 'irrational', 'int']);
    expect(stageStateAt(scene, 8000, starts).revealed.tree).toHaveLength(8);
    expect(stageStateAt(scene, 500, starts).revealed.tree).toEqual(['real', 'rational']);
  });

  it('validates tree targets for reveal, highlight, flash, underline and pointer', () => {
    for (const type of ['highlight', 'flash', 'underline', 'pointer'] as const) {
      const valid: Scene = { ...scene, narration: [{ id: 'a', role: 'say', text: '정수', cue: { actions: [{ type, target: 'tree:int' }] } }] };
      expect(actionErrors(valid)).toEqual([]);
      valid.narration[0].cue!.actions = [{ type, target: 'tree:missing' }];
      expect(actionErrors(valid).length).toBeGreaterThan(0);
    }
    const invalid: Scene = { ...scene, narration: [{ id: 'a', role: 'say', text: '정수', cue: { actions: [{ type: 'reveal', target: 'tree', id: 'missing' }] } }] };
    expect(lessonSchema.safeParse({ ...studioDemo, scenes: [invalid] }).success).toBe(false);
  });

  it('rejects duplicate IDs, missing initial IDs, invalid IDs, excessive depth and node count', () => {
    expect(treeSchema.safeParse({ ...tree, root: { id: 'a', label: 'a', children: [{ id: 'a', label: 'b' }] } }).success).toBe(false);
    expect(treeSchema.safeParse({ ...tree, initial: { hidden_nodes: ['missing'] } }).success).toBe(false);
    expect(treeSchema.safeParse({ ...tree, root: { id: 'A bad', label: 'a' } }).success).toBe(false);
    let root: TreeNode = { id: 'a', label: 'a' };
    for (let i = 0; i < 4; i++) root = { id: 'b' + i, label: 'b', children: [root] };
    expect(treeSchema.safeParse({ ...tree, root }).success).toBe(false);
    expect(treeSchema.safeParse({ ...tree, root: { id: 'a', label: 'a', children: Array.from({ length: 24 }, (_, i) => ({ id: 'n' + i, label: 'n' })) } }).success).toBe(false);
  });

  it('renders authored math, visible connections and dim_others', () => {
    const state = stageStateAt(scene, 8000, starts);
    state.highlight = ['tree:int'];
    const markup = renderToStaticMarkup(<TreeStage stage={tree} state={state} />);
    expect(markup).toContain('data-stage-target="tree:int"');
    expect(markup).toContain('data-tree-edge="pos"');
    expect(markup).toContain('opacity:0.25');
    expect(renderToStaticMarkup(<TreeStage stage={{ ...tree, root: { id: 'math', label: '$x^2$', tex: '\\sqrt{2}' } }} state={{ ...state, revealed: { step: [], node: [], row: [] } }} />)).toContain('katex');
  });
});

describe('number line and brackets', () => {
  const graph: Scene = { id: 'line', title: '수직선', tag: 'define', stage: { type: 'graph', x: [-5, 5], y: [-1, 1], number_line: true, fns: [], aria: '수직선', points: [{ x: 2, y: 0, c: 'c1', label: '2' }] }, narration: [{ id: 'line-1', role: 'say', text: '수직선' }] };

  it('allows no functions only on number lines', () => {
    expect(stageSchema.safeParse(graph.stage).success).toBe(true);
    expect(stageSchema.safeParse({ ...graph.stage, number_line: false }).success).toBe(false);
  });

  it('fills the declared x range without expanding it to match y', () => {
    const camera = { x: [-5, 5] as [number, number], y: [-1, 1] as [number, number] };
    const viewport = { width: 1000, height: 400, left: 30, right: 24, top: 24, bottom: 28 };
    const result = equalGraph(camera, viewport, 'equal', true);
    expect(result.x).toEqual(camera.x);
    expect(result.unitX).toBe(result.unitY); // 좌우·상하 축척이 같아야 한다(왜곡 금지)
    expect((result.y[0]+result.y[1])/2).toBeCloseTo(0);
    expect(result.sx(-5)).toBe(30);
    expect(result.sx(5)).toBe(976);
    expect(result.sy(0) - viewport.top).toBeGreaterThanOrEqual(120);
    expect(viewport.height - viewport.bottom - result.sy(0)).toBeGreaterThanOrEqual(120);
  });

  it('renders x with two arrowheads and zero, hides y, and places point labels below the axis', () => {
    const state = stageStateAt(graph, 0, [0]);
    const markup = renderToStaticMarkup(<StudioStage scene={graph} state={state} {...callbacks} />);
    expect(markup).toContain('data-axis="x"');
    expect(markup).not.toContain('data-axis="y"');
    expect(markup).toContain('data-arrow="left"');
    expect(markup).toContain('stroke-width:2');
    expect(markup).toContain('>0</text>');
    const circleY = Number(markup.match(/cy="([\d.]+)"/)![1]);
    const labelY = Number(markup.match(/<foreignObject[^>]+y="([\d.]+)"/)![1]);
    expect(labelY).toBeGreaterThan(circleY + 24);
  });

  it('passes number_line through slider stages', () => {
    const slider: Scene = { ...studioDemo.scenes[0], stage: { ...studioDemo.scenes[0].stage, number_line: true } as Scene['stage'] };
    const markup = renderToStaticMarkup(<StudioStage scene={slider} state={stageStateAt(slider, 0, [0, 3000, 6000])} {...callbacks} />);
    expect(markup).toContain('data-number-line="true"');
    expect(markup).not.toContain('data-axis="y"');
  });

  it.each([undefined, 'below', 'above'] as const)('positions bracket labels %s with a background outline', label_pos => {
    const action = chalkSchema.parse({ type: 'bracket', axis: 'x', from: -2, to: 2, label: '구간', label_pos });
    const markup = renderToStaticMarkup(<svg><ChalkLayer marks={[chalkAt(action, 0, 500, 'bracket')!]} space={{ x: [-5, 5], y: [-1, 1], sx: x => 300 + 50 * x, sy: y => 200 - 100 * y, target: () => null }} /></svg>);
    const labelY = Number(markup.match(/<text[^>]+y="([\d.]+)"/)![1]);
    expect(labelY).toBe(label_pos === 'above' ? 118 : 282);
    expect(markup).toContain('bracketLabel');
  });
});
