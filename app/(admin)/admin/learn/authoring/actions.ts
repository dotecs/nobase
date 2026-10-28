'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminClient, message as packMessage } from '../packs/server';
import { prepareApproval, recordCoachClassification, type Draft, type Source } from '@/lib/learn/llm/authoring';
import type { Database } from '@/lib/database.types';
import { runJobs } from '@/lib/learn/llm/worker';
import { templatize, generateVariants, validateStoredVariants, VariantRules, TemplateSchema } from '@/lib/learn/mathcheck/templatize';
import type { AnswerType } from '@/lib/learn/types';
import { EnrichmentSelection } from '@/lib/learn/llm/schema';
import { validateEnrichmentSelection } from '@/lib/learn/llm/enrichment';

export async function enqueueEnrichment(draftId: string) {
  try {
    z.uuid().parse(draftId);
    const client = await adminClient();
    const result = await client.from('learn_item_drafts').select('*').eq('id', draftId).single();
    const draft = result.data as Draft | null;
    if (result.error || !draft || draft.status !== 'approved') throw new Error('승인된 초안만 보강할 수 있습니다');
    if ((draft.enrichment as { applied_at?: string } | null)?.applied_at) throw new Error('이미 적용된 보강');
    const pending = await client.from('learn_jobs').select('id').eq('ref_id', draftId).eq('kind', 'item_enrich').in('status', ['queued', 'running']);
    if (pending.error) throw pending.error;
    if (pending.data?.length) throw new Error('이미 대기·실행 중인 보강 작업이 있습니다');
    const inserted = await client.from('learn_jobs').insert({ kind: 'item_enrich', ref_id: draftId } as never);
    if (inserted.error) throw inserted.error;
    revalidatePath('/admin/learn/authoring');
    return { message: '보강 작업을 등록했습니다. 지금 처리를 눌러 주세요.' };
  } catch (error) { return { error: message(error) }; }
}
export async function applyEnrichment(draftId: string, selection: unknown) {
  try {
    z.uuid().parse(draftId);
    const selected = EnrichmentSelection.parse(selection), client = await adminClient();
    const draft = await client.from('learn_item_drafts').select('*').eq('id', draftId).single();
    const row = draft.data as Draft | null;
    if (draft.error || !row) throw draft.error ?? new Error('초안 없음');
    validateEnrichmentSelection(row.status, row.enrichment, selected);
    const result = await client.rpc('learn_apply_enrichment', { p_draft_id: draftId, p_selection: selected } as never);
    if (result.error) throw result.error;
    revalidatePath('/admin/learn/authoring');
    return { message: '선택한 보강을 새 문항 버전에 적용했습니다.' };
  } catch (error) { return { error: message(error) }; }
}

function message(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code === '42P01' || code === 'PGRST205' ? '마이그레이션 미적용 — 대표가 040·041을 적용한 뒤 이용해 주세요.' : packMessage(error);
}

export async function registerSource(input: unknown) {
  try {
    const value = z.object({ storagePath: z.string().min(1), origin: z.enum(['own', 'book', 'licensed', 'reference_only']), note: z.string().max(2000) }).parse(input);
    const client = await adminClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user || !value.storagePath.startsWith(`${user.id}/authoring/`) || value.storagePath.includes('..')) throw new Error('잘못된 이미지 경로');
    const slash = value.storagePath.lastIndexOf('/');
    const check = await client.storage.from('learn-authoring').list(value.storagePath.slice(0, slash), { search: value.storagePath.slice(slash + 1) });
    if (check.error || !check.data?.some(file => file.name === value.storagePath.slice(slash + 1))) throw new Error('먼저 이미지를 업로드해 주세요.');
    const source = await client.from('learn_item_sources').insert({ uploader_id: user.id, storage_path: value.storagePath, origin: value.origin, note: value.note } as never).select('id').single();
    const sourceRow = source.data as { id: string } | null;
    if (source.error || !sourceRow) throw source.error ?? new Error('소스 등록 실패');
    const sourceId = sourceRow.id;
    const job = await client.from('learn_jobs').insert({ kind: 'item_extract', ref_id: sourceId } as never);
    if (job.error) throw job.error;
    revalidatePath('/admin/learn/authoring');
    return { message: '대기열에 등록했습니다. 지금 처리를 눌러 추출하세요.' };
  } catch (error) { return { error: message(error) }; }
}
export async function processNow() {
  try {
    await adminClient();
    const jobs = await runJobs();
    revalidatePath('/admin/learn/authoring');
    return { message: JSON.stringify(jobs) };
  } catch (error) { return { error: message(error) }; }
}
export async function rejectDraft(id: string) {
  try {
    z.uuid().parse(id); const client = await adminClient();
    const result = await client.from('learn_item_drafts').update({ status: 'rejected' } as never).eq('id', id).in('status', ['extracted', 'needs_coach']);
    if (result.error) throw result.error;
    revalidatePath('/admin/learn/authoring'); return { message: '초안을 버렸습니다.' };
  } catch (error) { return { error: message(error) }; }
}

export async function saveDraftReview(input: unknown) {
  try {
    const id = z.object({ draftId: z.uuid() }).parse(input).draftId;
    const client = await adminClient();
    const draftResult = await client.from('learn_item_drafts').select('*').eq('id', id).single();
    const draft = draftResult.data as Draft | null;
    if (draftResult.error || !draft) throw draftResult.error ?? new Error('초안 없음');
    if (!['extracted', 'needs_coach'].includes(draft.status)) throw new Error('이미 처리된 초안');
    const sourceResult = await client.from('learn_item_sources').select('*').eq('id', draft.source_id).single();
    const source = sourceResult.data as Source | null;
    if (sourceResult.error || !source) throw sourceResult.error ?? new Error('원본 없음');
    const extract = draft.extract as { original?: { needs_figure?: boolean; injection_suspected?: boolean }; warning?: string } | null;
    const requiresCoach = !!extract?.original?.needs_figure || !!extract?.original?.injection_suspected || extract?.warning === 'injection_suspected';
    const prepared = prepareApproval(input, source, requiresCoach);
    const { item, verified } = prepared;
    const invalidateVariants = draft.stem_md !== item.stem_md || draft.answer_type !== item.answer_type || draft.ability_id !== item.ability_id || verified !== 'program';
    const result = await client.from('learn_item_drafts').update({ stem_md: item.stem_md, answer_type: item.answer_type, answer_spec: item.answer_spec, answer_verified_by: verified, ability_id: item.ability_id, usage_suggested: item.usage, extract:recordCoachClassification(draft.extract,item.ability_id), ...(invalidateVariants ? { template: null, variants: [] } : {}) } as never)
      .eq('id', id).eq('stem_md', draft.stem_md).eq('variants', JSON.stringify(draft.variants ?? [])).in('status', ['extracted', 'needs_coach']).select('id');
    if (result.error) throw result.error;
    if (!result.data?.length) throw new Error('이미 처리된 초안');
    return { message: '정답 검토 내용을 저장했습니다.' };
  } catch (error) { return { error: message(error) }; }
}

async function editableDraft(id: string) {
  z.uuid().parse(id);
  const client = await adminClient();
  const result = await client.from('learn_item_drafts').select('*').eq('id', id).single();
  const draft = result.data as Draft | null;
  if (result.error || !draft) throw result.error ?? new Error('초안 없음');
  if (!['extracted', 'needs_coach', 'approved'].includes(draft.status)) throw new Error('이미 처리된 초안');
  return { client, draft };
}

export async function generateDraftVariants(draftId: string, n?: number) {
  try {
    if (n !== undefined) z.number().int().min(3).max(5).parse(n);
    const { client, draft } = await editableDraft(draftId);
    if (draft.answer_verified_by !== 'program' || !draft.answer_type) throw new Error('프로그램 검증 후 검토 내용을 먼저 저장해 주세요.');
    const ruleResult = await client.from('learn_rule_configs').select('config').eq('key', 'variants').lte('active_from', new Date().toISOString()).order('version', { ascending: false }).limit(1).maybeSingle();
    if (ruleResult.error) throw ruleResult.error;
    const row = ruleResult.data as { config: unknown } | null;
    if (!row) throw new Error('variants 규칙이 없습니다. 개정된 040 적용을 확인해 주세요.');
    const rules = VariantRules.parse(row.config);
    const template = templatize(draft.stem_md, draft.answer_type as AnswerType, rules);
    const variants = validateStoredVariants(generateVariants(template, n ?? rules.count_default));
    const saved = await client.from('learn_item_drafts').update({ template, variants } as never)
      .eq('id', draft.id).eq('stem_md', draft.stem_md).eq('answer_type', draft.answer_type).eq('answer_verified_by', 'program')
      .eq('variants', JSON.stringify(draft.variants ?? [])).eq('status', draft.status).select('id');
    if (saved.error) throw saved.error;
    if (!saved.data?.length) throw new Error('검토 내용이 변경되었습니다. 새로고침 후 다시 생성해 주세요.');
    revalidatePath('/admin/learn/authoring');
    return { message: `${variants.length}개 변형을 생성·검증했습니다.` };
  } catch (error) { return { error: message(error) }; }
}

export async function toggleDraftVariant(draftId: string, index: number, enabled: boolean) {
  try {
    z.number().int().nonnegative().parse(index); z.boolean().parse(enabled);
    const { client, draft } = await editableDraft(draftId);
    const template = TemplateSchema.parse(draft.template);
    if (template.params.source_stem !== draft.stem_md || template.params.answer_type !== draft.answer_type) throw new Error('씨앗 수정 후 변형을 다시 생성해 주세요.');
    const variants = validateStoredVariants(draft.variants);
    if (!variants[index]) throw new Error('변형 번호가 잘못되었습니다.');
    variants[index].enabled = enabled;
    const saved = await client.from('learn_item_drafts').update({ variants } as never).eq('id', draft.id)
      .eq('stem_md', draft.stem_md).eq('variants', JSON.stringify(draft.variants)).eq('status', draft.status).select('id');
    if (saved.error) throw saved.error;
    if (!saved.data?.length) throw new Error('변형 목록이 변경되었습니다. 새로고침 후 다시 선택해 주세요.');
    revalidatePath('/admin/learn/authoring');
    return { message: enabled ? '변형을 포함합니다.' : '변형을 제외합니다.' };
  } catch (error) { return { error: message(error) }; }
}

export async function appendApprovedVariants(draftId: string) {
  try {
    const { client, draft } = await editableDraft(draftId);
    if (draft.status !== 'approved') throw new Error('승인된 초안만 변형을 추가할 수 있습니다.');
    const template = TemplateSchema.parse(draft.template);
    if (template.params.source_stem !== draft.stem_md || template.params.answer_type !== draft.answer_type) throw new Error('씨앗 수정 후 변형을 다시 생성해 주세요.');
    const variants = validateStoredVariants(draft.variants);
    if (!variants.some(variant => variant.enabled)) throw new Error('추가할 변형을 선택해 주세요.');
    const result = await client.rpc('learn_append_variants', { p_draft_id: draftId } as never);
    if (result.error) {
      if (['42883', 'PGRST202'].includes(result.error.code)) throw new Error('마이그레이션 미적용 — 대표가 045를 적용한 뒤 이용해 주세요.');
      throw result.error;
    }
    revalidatePath('/admin/learn/authoring'); revalidatePath('/admin/learn/packs');
    return { message: `${result.data}개 변형을 추가했습니다. 기존 문항은 건너뜁니다.` };
  } catch (error) { return { error: message(error) }; }
}

export async function approveDraft(input: { draftId: string; saveImage: boolean }) {
  try {
    const value = z.object({ draftId: z.uuid(), saveImage: z.boolean() }).parse(input);
    const client = await adminClient();
    const draftResult = await client.from('learn_item_drafts').select('*').eq('id', value.draftId).single();
    const draft = draftResult.data as Draft | null;
    if (draftResult.error || !draft) throw draftResult.error ?? new Error('초안 없음');
    if (!draft.ability_id || !draft.usage_suggested) throw new Error('소주제와 용도를 선택해 주세요.');
    const result = await client.rpc('learn_approve_draft', {
      p_draft_id: draft.id, p_ability_id: draft.ability_id, p_usage: draft.usage_suggested,
      p_item: { stem_md: draft.stem_md, answer_type: draft.answer_type, answer_spec: draft.answer_spec },
    } as never);
    if (result.error) throw result.error;
    const item = (Array.isArray(result.data) ? result.data[0] : result.data) as Database['public']['Tables']['learn_items']['Row'] | null;
    if (!item) throw new Error('승인 결과를 확인하지 못했습니다.');
    let materialWarning = '';
    if (value.saveImage || item.answer_type === 'photo') {
      const sourceResult = await client.from('learn_item_sources').select('storage_path').eq('id', draft.source_id).single();
      const source = sourceResult.data as { storage_path: string } | null;
      if (sourceResult.error || !source) materialWarning = ' 원본 자료 연결 실패 — 문항 승인은 유지됩니다.';
      else {
        const material = await client.from('learn_materials').insert({ ability_id: item.ability_id, type: 'image', storage_path: source.storage_path, role: 'example', status: 'reviewed', version: 1 } as never);
        if (material.error) materialWarning = ' 원본 자료 연결 실패 — 문항 승인은 유지됩니다.';
      }
    }
    revalidatePath('/admin/learn/authoring'); revalidatePath('/admin/learn/packs');
    return { message: `${item.id} 승인 완료.${materialWarning}` };
  } catch (error) { return { error: message(error) }; }
}
