'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { adminClient, message as packMessage } from '../packs/server';
import { prepareApproval, type Draft, type Source } from '@/lib/learn/llm/authoring';
import type { Database } from '@/lib/database.types';

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
    const secret = process.env.LEARN_WORKER_SECRET;
    if (!secret) throw new Error('LEARN_WORKER_SECRET 설정이 필요합니다.');
    const origin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://127.0.0.1:${process.env.PORT || '3000'}`;
    const response = await fetch(`${origin}/api/learn/jobs/run`, { method: 'POST', headers: { 'x-learn-worker-secret': secret }, cache: 'no-store', signal: AbortSignal.timeout(58_000) });
    if (!response.ok) throw new Error(`워커 요청 실패 (${response.status}). 서버 설정을 확인해 주세요.`);
    const result = await response.json();
    revalidatePath('/admin/learn/authoring');
    return { message: JSON.stringify(result.jobs) };
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
    const needsFigure = !!(draft.extract as { original?: { needs_figure?: boolean } } | null)?.original?.needs_figure;
    const prepared = prepareApproval(input, source, needsFigure);
    const { item, verified } = prepared;
    const result = await client.from('learn_item_drafts').update({ stem_md: item.stem_md, answer_type: item.answer_type, answer_spec: item.answer_spec, answer_verified_by: verified, ability_id: item.ability_id, usage_suggested: item.usage } as never)
      .eq('id', id).in('status', ['extracted', 'needs_coach']).select('id');
    if (result.error) throw result.error;
    if (!result.data?.length) throw new Error('이미 처리된 초안');
    return { message: '정답 검토 내용을 저장했습니다.' };
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
