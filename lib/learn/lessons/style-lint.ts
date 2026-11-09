// Style warnings collected from repeated review feedback (docs/learning-studio-lesson-production-manual.md §9).
// Each rule maps to a correction the 대표 has had to request more than once; lesson-check prints them as WARN.
type Action = Record<string, unknown> & { type: string };
type Sentence = { id: string; text: string; tts?: string; cue?: { actions?: Action[] } };
type Item = { id: string; tex?: string; text?: string; position?: { x?: number; y?: number }; group?: string };
type Scene = { id: string; stage: { type: string; items?: Item[] }; narration: Sentence[] };

const texVisible = (tex: string) => tex.replace(/\\(?:[dt]?frac|sqrt|text|mathrm|p)(?![a-zA-Z])/g, '').replace(/\\[a-zA-Z]+/g, 'X').replace(/\\./g, ' ').replace(/[{}^_]/g, '').length;
const NUM ='(?:일|이|삼|사|오|육|칠|팔|구|십|영)';
const rules: Array<{ code: string; test: (s: Sentence, scene: Scene) => string | null }> = [
  { code: 'tts-emphasis', test: s => /\[[^\]]*emphasi[sz]/i.test(s.tts ?? '') ? '강조 지시어 금지 — 쉼표·[short pause]로 대신 (§4)' : null },
  { code: 'tts-plus-run', test: s => new RegExp(NUM + '플러스' + NUM).test(s.tts ?? '') ? '숫자끼리 덧셈은 "삼 더하기 오"처럼 띄어 읽기 (§4)' : null },
  { code: 'tts-long-run', test: s => { const m = (s.tts ?? '').match(/[가-힣]{9,}/g)?.find(w => /루트|플러스마이너스/.test(w)); return m ? `"${m}" 붙여 읽기 길음 — 의미 단위로 띄우기 (§4)` : null; } },
  { code: 'tts-saisiot', test: s => /지수법칙/.test(s.tts ?? '') ? '"지수 법칙"으로 띄어 쓰기(지숫법칙 발음 방지) (§4)' : null },
  { code: 'tts-paren-reading', test: s => /괄호 (?!안|모두)/.test(s.tts ?? '') ? '식을 읽을 때 "괄호"는 빼고 "엑스 더하기 이 곱하기 삼엑스 마이너스 이"처럼 (§9)' : null },
  { code: 'memo-times-mark', test: s => (s.cue?.actions ?? []).some(a => a.type === 'handwrite' && typeof a.tex === 'string' && /\\times\s*$/.test(a.tex as string)) ? '틀림 표시로 \\times 금지(곱하기와 혼동) — "\\neq 11"처럼 (§9)' : null },
  { code: 'root-count', test: s => /근의 개수|(?<!["“])근이 (?:[01]개|하나|한 개)/.test(s.text) ? '근은 개수가 아니라 종류로 말하기 (§1)' : null },
  { code: 'memo-rotate', test: s => (s.cue?.actions ?? []).some(a => a.type === 'handwrite' && a.rotate !== undefined && a.rotate !== 0) ? '손글씨 기울이지 않기 (§3)' : null },
  { code: 'memo-coord-arrow', test: (s, scene) => !['graph','slider'].includes(scene.stage.type) && (s.cue?.actions ?? []).some(a => a.type === 'handwrite' && a.arrow_to && typeof a.arrow_to === 'object' && !('target' in (a.arrow_to as object))) ? '손글씨 arrow_to는 좌표 대신 {target, anchor} (§3)' : null },
  { code: 'memo-long-line', test: s => { const long = (s.cue?.actions ?? []).find(a => a.type === 'handwrite' && typeof a.text === 'string' && (a.text as string).split('\n').some(line => line.length > 22)); return long ? '손글씨 한 줄 22자 초과 — \\n으로 끊기 (§3)' : null; } },
  // tex 손글씨도 줄바꿈된다(rm-09 s5-3 "2×4=8, 3×3=9 → 9−8=1 ✓"가 두 줄로 깨짐). 보이는 글자 수로 근사.
  { code: 'memo-long-tex', test: s => { const long = (s.cue?.actions ?? []).find(a => a.type === 'handwrite' && typeof a.tex === 'string' && !/\\begin/.test(a.tex as string) && texVisible(a.tex as string) > 18); return long ? `손글씨 수식 "${long.tex}" 길음 — 한 식만 남기고 줄이기 (§9)` : null; } },
  { code: 'memo-example-lifetime', test: s => /예를 들어|넣으면|대입/.test(s.tts ?? '') && (s.cue?.actions ?? []).some(a => a.type === 'handwrite' && !a.arrow_to && a.until === undefined && a.ttl_ms === undefined) ? '예시·대입 필기는 until:"sentence" (§3)' : null },
  // 위아래 두 줄 배열(크로스 곱 대각선)은 직선 화살표가 맞다 — 여러 줄 tex(\\) 항이 끝점이면 제외.
  { code: 'arrow-straight-items', test: (s, scene) => { const multi = (t: unknown) => { const id = String(t).slice(5).split('/')[0]; return /\\\\/.test(scene.stage.items?.find(i => i.id === id)?.tex ?? ''); }; return (s.cue?.actions ?? []).some(a => a.type === 'arrow' && typeof a.from === 'string' && typeof a.to === 'string' && String(a.from).startsWith('item:') && String(a.to).startsWith('item:') && !a.bend && !multi(a.from) && !multi(a.to)) ? '같은 줄 항끼리 화살표는 bend:"up" (§3)' : null; } },
];

export function styleWarnings(scene: Scene): string[] {
  const out: string[] = [];
  for (const sentence of scene.narration) for (const rule of rules) { const message = rule.test(sentence, scene); if (message) out.push(`${sentence.id} [${rule.code}] ${message}`); }
  const title = (scene as Scene & { title?: string }).title;
  if (title && (title.length > 18 || title.includes(' — '))) out.push(`${scene.id} [scene-title] 장면 제목은 목차에 보인다 — 18자 이내 명사구, " — 설명" 없이 (§9)`);
  const rowItems = scene.stage.type !== 'board' ? [] : (scene.stage.items ?? []).filter(item => !item.group && item.tex && item.position?.y !== undefined);
  const byRow = new Map<number, number>();
  for (const item of rowItems) { const key = Math.round((item.position!.y as number) * 50); byRow.set(key, (byRow.get(key) ?? 0) + 1); }
  if ([...byRow.values()].some(count => count >= 3)) out.push(`${scene.id} [items-no-group] 한 줄에 수식 item 3개 이상 — 한 식이면 group:"expr"로 자동 배치, 일부러 띄운 것이면 무시 (§2)`);
  return out;
}
