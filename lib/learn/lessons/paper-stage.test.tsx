import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudioStage } from '@/components/studio/stages/StudioStage';
import { actionErrors } from './action-validation';
import { validateAuthoredMath } from './authored-math';
import { lessonSchema, stageSchema, type Scene } from './schema';
import { paperStage, problemMarks, problemPlain, stageTargetIds } from './stage-targets';
import { stageStateAt } from './stage-state-at';
import { styleWarnings } from './style-lint';

const problem = '이차함수 $y=\\p{q}{x^2-2x}+a$ 의 그래프가 [[touch|$x$축에 접한다]]. [[ask|$a$의 값]]을 구하시오.';
const scene = (cue: object, stage: object = {}): Scene => lessonSchema.parse({ id: 'w', kind: 'worked', title: 't', pack_id: 'p', ability_ids: [], scenes: [{ id: 's', title: '풀이', tag: 'derive',
  stage: { type: 'steps', problem, steps: [{ tex: 'y=(x-1)^2+\\p{h}{a-1}' }, { tex: 'a=1' }], ...stage },
  narration: [{ id: 'n1', role: 'think', text: '식부터 봅니다.', cue }, { id: 'n2', role: 'write', text: '$a=1$.', cue: { actions: [{ type: 'reveal', target: 'step', index: 0, at: 0 }] } }] }] }).scenes[0];
const noop = () => {};

describe('시험지 지면: 문제를 고정한 풀이 무대', () => {
  it('문제 문장의 구절과 수식 부분이 지시 대상이 된다', () => {
    expect(problemMarks(problem)).toEqual(['touch', 'ask']);
    expect(problemPlain(problem)).not.toContain('[[');
    const ids = stageTargetIds(scene({}).stage);
    for (const id of ['problem', 'problem/q', 'problem/touch', 'problem/ask', 'step:0/h']) expect(ids.has(id)).toBe(true);
    expect(paperStage(scene({}).stage)).toBe(true);
    expect(paperStage({ type: 'steps' })).toBe(false);
  });
  it('없는 구절·중복 이름은 검사에서 걸리고, 여백 메모는 items 없이도 쓸 수 있다', () => {
    expect(actionErrors(scene({ actions: [{ type: 'underline', target: 'problem/touch', at: 0 }, { type: 'handwrite', text: '→ 높이 0', position: { near: 'problem', side: 'right' }, at: 0 }] }))).toEqual([]);
    expect(() => scene({ actions: [{ type: 'underline', target: 'problem/none', at: 0 }] })).toThrow('칠판 대상 범위 오류');
    expect(() => scene({}, { problem: '[[a|하나]] [[a|둘]]' })).toThrow('부분 이름 중복: problem');
    expect(() => validateAuthoredMath(lessonSchema.parse({ id: 'w', kind: 'worked', title: 't', pack_id: 'p', ability_ids: [], scenes: [{ id: 's', title: 't', tag: 'derive', stage: { type: 'steps', problem: '$\\frac{1$', steps: [{ tex: 'x' }] }, narration: [{ id: 'n', role: 'say', text: 'x' }] }] }))).toThrow();
  });
  it('문제는 처음부터 보이고, 아직 적지 않은 줄은 자리만 차지한다', () => {
    const target = scene({});
    const before = renderToStaticMarkup(<StudioStage scene={target} state={stageStateAt(target, 0, [0, 1000])} onWhy={noop} onTrace={noop} onQuiz={noop} />);
    expect(before).toContain('data-stage-target="problem/touch"');
    expect(before).toContain('data-stage-target="problem/q"');
    expect(before).not.toContain('data-stage-target="step:0"');
    expect(before.match(/data-reserved="true"/g)).toHaveLength(2);
    const after = renderToStaticMarkup(<StudioStage scene={target} state={{ ...stageStateAt(target, 0, [0, 1000]), revealed: { step: [0], node: [], row: [] } }} onWhy={noop} onTrace={noop} onQuiz={noop} />);
    expect(after).toContain('data-stage-target="step:0"');
    expect(after.match(/data-reserved="true"/g)).toHaveLength(1);
    expect(after.indexOf('data-stage-target="problem"')).toBeLessThan(after.indexOf('data-stage-target="step:0"'));
  });
  it('problem이 없는 풀이 무대는 예전처럼 그린다', () => {
    const plain = stageSchema.parse({ type: 'steps', steps: [{ tex: 'x' }, { tex: 'y' }] });
    const target = { ...scene({}), stage: plain } as Scene;
    const html = renderToStaticMarkup(<StudioStage scene={target} state={{ ...stageStateAt(target, 0, [0, 1000]), revealed: { step: [0], node: [], row: [] } }} onWhy={noop} onTrace={noop} onQuiz={noop} />);
    expect(html).not.toContain('data-reserved');
    expect(html).not.toContain('problem');
  });
});

describe('문제풀이 매뉴얼 검사', () => {
  it('문제를 고정하지 않았거나 읽자마자 적는 대본을 알려 준다', () => {
    const codes = (target: Scene) => styleWarnings(target as never).map(line => line.match(/\[([a-z-]+)\]/)?.[1]);
    expect(codes(scene({}))).toEqual(expect.arrayContaining(['worked-lookback']));
    expect(codes({ ...scene({}), stage: stageSchema.parse({ type: 'steps', steps: [{ tex: 'x' }] }) } as Scene)).toContain('worked-problem');
    const hasty = scene({}); hasty.narration = [hasty.narration[1], hasty.narration[0], hasty.narration[0], hasty.narration[0]];
    expect(codes(hasty)).toContain('worked-scan');
    const acting = scene({}); acting.narration = [{ ...acting.narration[0], tts: '[thinking aloud] 식부터 봅니다.' }, acting.narration[1], { ...acting.narration[1], id: 'n3' }];
    expect(codes(acting)).toEqual(expect.arrayContaining(['worked-acting', 'worked-reason']));
  });
  it('시범 강의 rm-22-w1은 매뉴얼 검사를 모두 통과한다', () => {
    const lesson = lessonSchema.parse(JSON.parse(readFileSync('content/lessons/rm-22-w1.json', 'utf8')));
    validateAuthoredMath(lesson);
    const solve = lesson.scenes[0];
    expect(solve.stage.type === 'steps' && solve.stage.problem).toBeTruthy();
    expect(lesson.scenes.filter(target => target.stage.type !== 'quiz')).toHaveLength(1);
    expect(lesson.scenes.flatMap(target => styleWarnings(target as never)).filter(line => line.includes('[worked-'))).toEqual([]);
  });
});
