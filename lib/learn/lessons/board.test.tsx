import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BoardItems } from '@/components/studio/BoardItems';
import { ChalkLayer } from '@/components/studio/ChalkLayer';
import StudioShell from '@/components/studio/StudioShell';
import { StudioViewer } from '@/components/studio/StudioViewer';
import { localTargetBox } from '@/components/studio/useTargetBoxes';
import { itemContent, itemParameters, itemPosition, type BoardItem } from './items';
import { actionErrors, actionWarnings } from './action-validation';
import { lessonSchema, stageSchema, type Scene } from './schema';
import { validateAuthoredMath } from './authored-math';
import { stageStateAt } from './stage-state-at';
import { studioDemo } from './studio-demo';
import { chalkAt, chalkPoint, underlinePoints, type ChalkSpace } from './chalk';
import { equalGraph } from './equal-graph';

const board = studioDemo.scenes.find(scene => scene.id === 'board-notes')!;
const item: BoardItem = { id: 'eq', tex: 'x^2', position: { x: .25, y: .4 } };

describe('board schemas and replay', () => {
  it.each(['graph', 'slider', 'tree', 'steps', 'chain', 'table', 'board'])('accepts items on %s stages', type => {
    const fixtures: Record<string, unknown> = {
      graph: { type, x: [-3, 3], y: [-2, 2], fns: [{ expr: 'x', c: 'c1' }], aria: 'graph' },
      slider: studioDemo.scenes[0].stage,
      tree: studioDemo.scenes.find(scene => scene.stage.type === 'tree')!.stage,
      steps: { type, steps: [{ tex: 'x' }] }, chain: { type, nodes: [{ text: 'x' }] },
      table: { type, columns: ['x'], rows: [{ cells: ['1'] }] }, board: board.stage,
    };
    const stage = { ...(fixtures[type] as object), items: [item], initial: { hidden_items: ['eq'] } };
    expect(stageSchema.safeParse(stage).success).toBe(true);
  });

  it('validates IDs, exclusive tex/text, ratio bounds and slider placeholders', () => {
    for (const items of [[item, item], [{ ...item, id: 'Bad' }], [{ ...item, text: 'both' }], [{ ...item, tex: undefined }], [{ ...item, position: { x: 2, y: .3 } }], [{ ...item, tex: '{{z}}' }]]) {
      expect(stageSchema.safeParse({ type: 'board', items }).success).toBe(false);
    }
    expect(stageSchema.safeParse({ type: 'board', items: [item], initial: { hidden_items: ['absent'] } }).success).toBe(false);
    const slider = studioDemo.scenes[0].stage;
    expect(stageSchema.safeParse({ ...slider, items: [{ ...item, tex: '{{a}}', position: { x: 'sqrt(2)', y: '-3/2' } }] }).success).toBe(true);
    expect(stageSchema.safeParse({ ...slider, items: [{ ...item, tex: '{{wrong}}' }] }).success).toBe(false);
    expect(stageSchema.safeParse({ ...slider, items: [{ ...item, position: { x: .25, y: .4 } }] }).success).toBe(true);
  });

  it('rejects invalid authored item TeX without changing stored content', () => {
    const lesson = structuredClone(studioDemo);
    if (!('items' in lesson.scenes[0].stage)) throw Error('fixture');
    lesson.scenes[0].stage.items = [{ ...item, tex: '\\notacommand' }];
    expect(() => validateAuthoredMath(lesson)).toThrow();
  });

  it('reveals items with a deterministic 250ms fade and honors both hiding modes', () => {
    const scene: Scene = { ...board, narration: [{ id: 'a', role: 'say', text: '식', cue: { actions: [{ type: 'reveal', target: 'item', id: 'result', at_ms: 500 }] } }] };
    expect(stageStateAt(scene, 0, [0]).revealed.item).toEqual(['source', 'note']);
    expect(stageStateAt(scene, 625, [0]).itemOpacity?.result).toBe(.5);
    expect(stageStateAt(scene, 750, [0]).itemOpacity?.result).toBe(1);
    expect(stageStateAt(scene, 0, [0]).revealed.item).not.toContain('result');
    expect(stageStateAt({ ...scene, stage: { type: 'board', items: [item], initial: { hidden: 'all' } } }, 0, [0]).revealed.item).toEqual([]);
    expect(stageStateAt({ ...scene, stage: { type: 'board', items: [item] } }, 0, [0]).revealed.item).toEqual(['eq']);
  });

  it('accepts every requested item target and rejects missing IDs and out-of-range board coordinates', () => {
    const actions = [
      { type: 'highlight', target: 'item:source', dim_others: true },
      { type: 'reveal', target: 'item', id: 'result' },
      { type: 'flash', target: 'item:source' }, { type: 'underline', target: 'item:source' },
      { type: 'circle', target: 'item:source' }, { type: 'pointer', target: 'item:source' },
      { type: 'arrow', from: 'item:source', to: 'item:result' },
      { type: 'handwrite', position: { x: .2, y: .5 }, text: '식', arrow_to: { target: 'item:source' } },
    ];
    const parse = (actions: unknown[]) => lessonSchema.safeParse({ ...studioDemo, scenes: [{ ...board, narration: [{ id: 'a', role: 'say', text: '식', cue: { actions } }] }] });
    expect(parse(actions).success).toBe(true);
    for (const action of actions) expect(parse([JSON.parse(JSON.stringify(action).replaceAll('source', 'absent').replaceAll('result', 'absent'))]).success).toBe(false);
    expect(parse([{ type: 'pointer', position: { x: 2, y: .5 } }]).success).toBe(false);
    expect(parse([{ type: 'handwrite', position: { x: .2, y: .5 }, text: '식', arrow_to: { x: -1, y: .5 } }]).success).toBe(false);
  });
});

describe('item rendering and measured chalk targets', () => {
  it('uses data scales for graph positions and ratio scales for board positions', () => {
    const graph = equalGraph({ x: [-4, 4], y: [-2, 2] }, { width: 800, height: 400, left: 0, right: 0, top: 0, bottom: 0 });
    expect(itemPosition(item, graph)).toEqual({ x: 425, y: 160 });
    expect(itemPosition(item, { sx: x => x * 800, sy: y => y * 400 })).toEqual({ x: 200, y: 160 });
    const moved = equalGraph({ x: [0, 8], y: [-2, 2] }, { width: 800, height: 400, left: 0, right: 0, top: 0, bottom: 0 });
    expect(itemPosition(item, moved).x).toBe(25);
  });

  it('snaps c to its slider step and preserves fraction, sign and text-math rendering', () => {
    const stage = studioDemo.scenes[0].stage;
    if (stage.type !== 'slider') throw Error('fixture');
    const params = itemParameters({ ...stage, param: { ...stage.param, name: 'c', step: .5 } }, { c: -1.42 });
    expect(itemContent({ ...item, tex: 'y=x^2 + {{c}}' }, params)).toBe('y=x^2 - \\dfrac{3}{2}');
    expect(itemContent({ ...item, tex: undefined, text: '값은 {{c}}, 식은 $x+{{c}}$' }, params)).toBe('값은 $-\\dfrac{3}{2}$, 식은 $x-\\dfrac{3}{2}$');
  });

  it('renders all sizes, alignment and yellow KaTeX without a card background', () => {
    const state = stageStateAt({ ...board, stage: { type: 'board', items: [item] } }, 0, [0, 1000]);
    const html = renderToStaticMarkup(<BoardItems svg items={[{ ...item, size: 'lg', color: 'hand', align: 'end' }]} state={state} params={{}} space={{ sx: x => x * 800, sy: y => y * 400 }} />);
    expect(html).toContain('x="200" y="160"');
    expect(html).toContain('data-size="lg" data-align="end" data-color="hand"');
    expect(html).toContain('katex');
  });

  it('converts rendered rectangles through the SVG scale for bbox-based marks', () => {
    const box = localTargetBox({ left: 100, right: 300, top: 50, bottom: 90 }, (x, y) => ({ x: (x - 20) * 2, y: (y - 10) * 2 }));
    expect(box).toEqual({ left: 160, right: 560, top: 80, bottom: 160, x: 360, y: 120 });
    const space: ChalkSpace = { x: [0, 1], y: [0, 1], sx: x => x * 1000, sy: y => y * 600, target: id => id === 'item:eq' ? box : null };
    const underline = underlinePoints({ type: 'underline', target: 'item:eq' }, space);
    expect(underline[0]).toEqual({ x: 160, y: 163 });
    expect(underline.at(-1)).toEqual({ x: 560, y: 163 });
    expect(chalkPoint('item:eq', space)).toEqual(box);
    const mark = chalkAt({ type: 'circle', target: 'item:eq' }, 0, 500, 'circle')!;
    const html = renderToStaticMarkup(<svg><ChalkLayer marks={[mark]} space={space} /></svg>);
    expect(html).toContain('M572.00,120.00');
  });
});

describe('studio heading and deprecated formula', () => {
  it('puts the heading in the top bar and offers a small overlay for focus/frame/landscape', () => {
    const scene = { ...studioDemo.scenes[0], headline: { title: '장면 제목', eyebrow: '분류', formula: 'LEGACY_FORMULA' } };
    for (const options of [{}, { focusMode: true }, { chrome: false }]) {
      const html = renderToStaticMarkup(<StudioShell scene={scene} stage="칠판" {...options} />);
      expect(html.match(/<header[\s\S]*?<\/header>/)?.[0]).toContain('<h1 title="장면 제목">장면 제목</h1>');
      expect(html).toContain('data-scene-title="overlay"');
      expect(html).not.toContain('stageHeader');
      expect(html).not.toContain('LEGACY_FORMULA');
    }
  });

  it('accepts existing formulas with a lesson-check warning and never renders them', () => {
    const lesson = structuredClone(studioDemo);
    lesson.scenes[0].headline!.formula = 'DEPRECATED';
    expect(lessonSchema.safeParse(lesson).success).toBe(true);
    expect(actionErrors(lesson.scenes[0])).toEqual([]);
    expect(actionWarnings(lesson.scenes[0]).join()).toContain('headline.formula는 더 이상 표시되지 않습니다. items로 옮기세요.');
    expect(renderToStaticMarkup(<StudioViewer lesson={lesson} />)).not.toContain('DEPRECATED');
    expect(actionWarnings(studioDemo.scenes[0]).join()).not.toContain('headline.formula');
  });
});
