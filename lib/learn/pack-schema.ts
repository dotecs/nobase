import { z } from 'zod';
import { AnswerSpec } from './answer-spec';

const id = z.string().min(1);
const text = z.string().nullable().default(null);
const positive = z.number().int().positive();
const json = z.json();
export const PackFile = z.object({ id, title: id, version: positive, status: z.enum(['draft', 'reviewed', 'live']), source_book: text, map_version: text, checksum: text, imported_at: text, created_at: z.string().optional(), updated_at: z.string().optional() }).strict();
export const UnitsFile = z.array(z.object({ id, pack_id: id, order: positive, title: id, slide_pages: text, tier: z.enum(['mvp1', 'next']) }).strict());
export const AbilitiesFile = z.array(z.object({ id, pack_id: id, unit_id: id, order_in_unit: positive, name: id, action: id, kind: z.enum(['concept', 'procedure', 'representation']), slide_pages: text, is_supplement: z.boolean().default(false), request_ability: text, source_node_id: text, status: z.string().default('draft') }).strict());
export const EdgesFile = z.array(z.object({ id: z.uuid(), pack_id: id, source_id: id, target_id: id, type: z.enum(['prerequisite', 'support']), origin: z.enum(['book_order', 'map_v02', 'coach']), status: z.string().default('hypothesis'), reason: text }).strict());
export const GoalsFile = z.object({ goals: z.array(z.object({ id, pack_id: id, title: id, track: text, year: z.number().int().nullable().default(null), evidence: text }).strict()), requirements: z.array(z.object({ goal_id: id, ability_id: id, required_level: z.enum(['verified', 'retained']), format_notes: text }).strict()) }).strict();
export const MaterialsFile = z.array(z.object({ id: z.uuid(), ability_id: id, type: z.enum(['slide', 'text', 'image', 'video', 'lesson']), slide_pages: text, body_md: text, storage_path: text, lesson_id: z.uuid().nullable().default(null), role: z.enum(['explain', 'example', 'visual']), status: z.string().default('draft'), version: positive.default(1) }).strict());
export const ItemsFile = z.array(z.object({ id, version: positive, ability_id: id, usage: z.enum(['diagnostic', 'practice', 'assessment', 'review']), variant_group: text, stem_md: id, answer_type: z.enum(['number', 'fraction', 'expression', 'choice', 'photo', 'text']), answer_spec: AnswerSpec, hints: json.default([]), rubric: json.default([]), required_abilities: z.array(id).default([]), misconception_ids: z.array(id).default([]), status: z.string().default('draft'), exposure: z.string().default('assessment_only'), source_draft_id: z.uuid().nullable().default(null), created_at: z.string().optional() }).strict().superRefine((item, ctx) => {
  const error = (message: string) => ctx.addIssue({ code: 'custom', message, path: ['answer_spec'] });
  if (item.answer_type !== item.answer_spec.type) error('answer_spec.type과 answer_type 불일치');
  if (item.answer_spec.type !== 'choice') return;
  const { options, correct } = item.answer_spec;
  if (new Set(options.map(option => option.id)).size !== options.length) error('선택형 보기 중복 ID');
  if (new Set(correct).size !== correct.length || correct.some(value => !options.some(option => option.id === value))) error('선택형 correct는 고유한 보기 ID여야 합니다');
  if (options.filter(option => !correct.includes(option.id)).length < item.misconception_ids.length) error('선택형 오답 보기 수 부족');
  if (options.some(option => option.misconception_id && !item.misconception_ids.includes(option.misconception_id))) error('선택형 misconception_id 참조 오류');
}));
export const MisconceptionsFile = z.array(z.object({ id, ability_id: id, pattern: id, suggests: z.array(id).default([]), coach_note: text }).strict());
export const DiagnosticFile = z.object({ id: z.uuid(), goal_id: id, version: positive, base_abilities: z.array(id).default([]), followup_rule: text, base_items: z.array(id).default([]), followups: json.default([]) }).strict();
export const ContentPack = z.object({ pack: PackFile, units: UnitsFile, abilities: AbilitiesFile, edges: EdgesFile, goals: GoalsFile, materials: MaterialsFile, items: ItemsFile, misconceptions: MisconceptionsFile, diagnostic: DiagnosticFile });
export type ContentPackData = z.infer<typeof ContentPack>;

export function validatePack(input: unknown): { data?: ContentPackData; errors: string[]; warnings: string[] } {
  const parsed = ContentPack.safeParse(input);
  if (!parsed.success) return { errors: parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`), warnings: [] };
  const data = parsed.data;
  const errors: string[] = [], warnings: string[] = [];
  const unique = (label: string, values: string[]) => { const seen = new Set<string>(); values.forEach(value => { if (seen.has(value)) errors.push(`${label}: 중복 ID ${value}`); seen.add(value); }); };
  for (const key of ['units', 'abilities', 'edges', 'materials', 'misconceptions'] as const) unique(key, data[key].map(row => row.id));
  unique('goals', data.goals.goals.map(row => row.id));
  unique('requirements', data.goals.requirements.map(row => `${row.goal_id}/${row.ability_id}`));
  unique('items', data.items.map(row => `${row.id}/${row.version}`));
  unique('edges', data.edges.map(row => `${row.source_id}/${row.target_id}/${row.type}/${row.origin}`));
  const ids = { pack: new Set([data.pack.id]), units: new Set(data.units.map(row => row.id)), abilities: new Set(data.abilities.map(row => row.id)), goals: new Set(data.goals.goals.map(row => row.id)), items: new Set(data.items.map(row => row.id)), misconceptions: new Set(data.misconceptions.map(row => row.id)) };
  const ref = (kind: keyof typeof ids, value: string, owner: string) => { if (!ids[kind].has(value)) errors.push(`${owner}: 없는 참조 ${kind}/${value}`); };
  for (const row of [...data.units, ...data.abilities, ...data.edges, ...data.goals.goals]) ref('pack', row.pack_id, row.id);
  data.abilities.forEach(row => ref('units', row.unit_id, row.id));
  for (const row of [...data.materials, ...data.items, ...data.misconceptions, ...data.goals.requirements]) ref('abilities', row.ability_id, 'id' in row ? row.id : row.goal_id);
  data.goals.requirements.forEach(row => ref('goals', row.goal_id, row.ability_id));
  data.items.forEach(row => { row.required_abilities.forEach(value => ref('abilities', value, row.id)); row.misconception_ids.forEach(value => ref('misconceptions', value, row.id)); });
  data.misconceptions.forEach(row => row.suggests.forEach(value => ref('abilities', value, row.id)));
  ref('goals', data.diagnostic.goal_id, 'diagnostic');
  data.diagnostic.base_abilities.forEach(value => ref('abilities', value, 'diagnostic'));
  data.diagnostic.base_items.forEach(value => ref('items', value, 'diagnostic'));
  const graph = new Map<string, string[]>();
  data.edges.forEach(row => {
    ref('abilities', row.source_id, row.id); ref('abilities', row.target_id, row.id);
    if (row.source_id === row.target_id) errors.push(`자기순환 엣지: ${row.source_id}`);
    if (row.type === 'prerequisite') graph.set(row.source_id, [...(graph.get(row.source_id) ?? []), row.target_id]);
  });
  const visited = new Set<string>(), active = new Set<string>();
  const visit = (value: string) => { if (active.has(value)) { errors.push(`prerequisite 순환: ${value}`); return; } if (visited.has(value)) return; active.add(value); (graph.get(value) ?? []).forEach(visit); active.delete(value); visited.add(value); };
  ids.abilities.forEach(visit);
  const consecutive = (values: number[], label: string) => { if (values.sort((a, b) => a - b).some((value, index) => value !== index + 1)) errors.push(`${label}: 순서가 1..n 연속이어야 합니다`); };
  consecutive(data.units.map(row => row.order), 'units.order');
  data.units.forEach(unit => consecutive(data.abilities.filter(row => row.unit_id === unit.id).map(row => row.order_in_unit), unit.id));
  data.abilities.forEach(ability => {
    const needed = ability.kind === 'procedure' ? 6 : ability.kind === 'concept' ? 3 : 0;
    const count = new Set(data.items.filter(item => item.ability_id === ability.id).map(item => item.id)).size;
    if (count < needed) (data.pack.status === 'draft' ? warnings : errors).push(`${ability.id}: 문항 수 부족 (${count}/${needed})`);
  });
  return { data, errors, warnings };
}
