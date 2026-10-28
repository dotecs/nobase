'use client';

import { useState, useTransition, useEffect, useSyncExternalStore } from 'react';
import { VariantSelection } from '@/lib/learn/variant-selection';
import { useRouter } from 'next/navigation';
import { uploadAuthoringImage } from '@/lib/storage';
import { renderMathMarkdown } from '@/lib/math-markdown';
import { solveItem } from '@/lib/learn/mathcheck/solve';
import { AnswerSpec } from '@/lib/learn/answer-spec';
import type { Ability, ApprovalValue, Draft, Source } from '@/lib/learn/llm/authoring';
import type { AnswerType } from '@/lib/learn/types';
import { registerSource, processNow, rejectDraft, saveDraftReview, approveDraft, appendApprovedVariants, generateDraftVariants, toggleDraftVariant, enqueueEnrichment, applyEnrichment } from './actions';
import { StoredEnrichment } from '@/lib/learn/llm/schema';
import type { DraftVariant } from '@/lib/learn/mathcheck/templatize';
import styles from './authoring.module.css';

type Result = { message?: string; error?: string };
type SourceView = Source & { url: string | null };
type Approve = (value: ApprovalValue) => Promise<Result>;
export function EnrichmentCard({ draft }: { draft: Draft }) {
  const parsed = StoredEnrichment.safeParse(draft.enrichment), data = parsed.success ? parsed.data : null;
  const [hints, setHints] = useState<number[]>([]), [misconceptions, setMisconceptions] = useState<number[]>([]), [reason, setReason] = useState(false);
  const [result, setResult] = useState<Result>(), [pending, start] = useTransition();
  const router = useRouter();
  const run = (action: () => Promise<Result>) => start(async () => { try { setResult(await action()); router.refresh(); } catch { setResult({ error: '요청 처리 실패' }); } });
  const toggle = (values: number[], index: number, checked: boolean) => checked ? [...values, index] : values.filter(value => value !== index);
  const locked = pending || !!data?.applied_at;
  return <section className={styles.variants} aria-label="보강 검토">
    <h3>보강 검토</h3>
    <button disabled={locked} onClick={() => run(() => enqueueEnrichment(draft.id))}>보강 생성</button>
    {data && <>
      <p>{data.is_mock ? '모의 보강' : 'LLM 보강'} · {data.model_id} · {data.applied_at ? '적용 완료' : '검토 후 선택한 항목만 적용됩니다.'}</p>
      {data.hints.map((hint, index) => <div key={`h${index}`}><label><input type="checkbox" checked={hints.includes(index)} disabled={locked} onChange={event => setHints(toggle(hints, index, event.target.checked))} />힌트 {hint.level}</label>{renderMathMarkdown(hint.text_md)}</div>)}
      {data.misconceptions.map((candidate, index) => <div key={`m${index}`}><label><input type="checkbox" checked={misconceptions.includes(index)} disabled={locked || !candidate.verified} onChange={event => setMisconceptions(toggle(misconceptions, index, event.target.checked))} />오개념 {index + 1}{!candidate.verified && ' — 검증 불가, 적용 제외'}</label>{renderMathMarkdown(candidate.pattern)}<p>오답: {candidate.wrong_value}</p>{renderMathMarkdown(candidate.explanation)}</div>)}
      <label><input type="checkbox" checked={reason} disabled={locked} onChange={event => setReason(event.target.checked)} />이유 설명 문항</label>
      {renderMathMarkdown(data.reason_item.stem_md)}{renderMathMarkdown(data.reason_item.model_answer_md)}
      <ul>{data.reason_item.rubric.map((row, index) => <li key={index}>{row.criterion} · {row.points}점</li>)}</ul>
      <p>소주제 참고: LLM {data.ability_candidates.llm.join(', ') || '없음'} / 규칙 {data.ability_candidates.rule.join(', ') || '없음'}</p>
      <button disabled={locked || (!hints.length && !misconceptions.length && !reason)} onClick={() => run(() => applyEnrichment(draft.id, { hints, misconceptions, reason_item: reason }))}>선택 적용</button>
    </>}
    {result && <p role="status">{result.error ?? result.message}</p>}
  </section>;
}
export type AuthoringProps = { userId: string; sources: SourceView[]; drafts: Draft[]; abilities: Ability[]; jobs: { id: string; ref_id: string; status: string; error: string | null }[] };

export function ReviewCard({ draft, source, abilities, approve }: { draft: Draft; source: SourceView; abilities: Ability[]; approve: Approve }) {
  const [stem, setStem] = useState(draft.stem_md), [answerType, setAnswerType] = useState<AnswerType>((draft.answer_type ?? 'photo') as AnswerType);
  const [ability, setAbility] = useState(draft.ability_id ?? draft.ability_candidates[0] ?? ''), [usage, setUsage] = useState<ApprovalValue['usage']>((draft.usage_suggested ?? 'assessment') as ApprovalValue['usage']);
  const savedAnswer = AnswerSpec.safeParse(draft.answer_spec);
  const saved = savedAnswer.success ? savedAnswer.data : undefined;
  const [answer, setAnswer] = useState(saved && 'value' in saved ? `${saved.type === 'number' && saved.variable ? saved.variable + saved.relation : ''}${saved.value}` : saved && 'model_answer_md' in saved ? saved.model_answer_md ?? '' : '');
  const [choices, setChoices] = useState(saved?.type === 'choice' ? saved.options.map(option => option.text_md).join('\n') : ''), [correct, setCorrect] = useState(saved?.type === 'choice' ? saved.correct.join(',') : '');
  const [coachConfirmed, setCoachConfirmed] = useState(draft.answer_verified_by === 'coach'), [saveImage, setSaveImage] = useState(false), [zoom, setZoom] = useState(false);
  const [result, setResult] = useState<Result>(), [pending, startTransition] = useTransition();
  const [variantCount, setVariantCount] = useState('');
  const router = useRouter();
  const extract = draft.extract as { original?: { needs_figure?: boolean; injection_suspected?: boolean }; warning?: string } | null;
  const injectionSuspected = !!extract?.original?.injection_suspected || extract?.warning === 'injection_suspected';
  const needsFigure = extract?.original?.needs_figure ?? false;
  const program = needsFigure || injectionSuspected ? { ok: false as const } : solveItem(stem, answerType);
  const spec = (() => {
    if (answerType === 'number') { const match = answer.trim().match(/^([a-z])\s*(<=|>=|=|<|>)\s*(.+)$/); return match ? { type: 'number', variable: match[1], relation: match[2], value: match[3] } : { type: 'number', value: answer.trim() }; }
    if (answerType === 'fraction' || answerType === 'expression') return { type: answerType, value: answer.trim() };
    if (answerType === 'choice') return { type: 'choice', options: choices.split('\n').filter(Boolean).map((text, index) => ({ id: String(index + 1), text_md: text })), correct: correct.split(',').map(value => value.trim()).filter(Boolean) };
    return { type: answerType, model_answer_md: answer };
  })();
  const coachValid = AnswerSpec.safeParse(spec).success && (answerType === 'photo' || !!answer.trim() || answerType === 'choice');
  const locked = ['approved', 'rejected'].includes(draft.status);
  const variantsLocked = draft.status === 'rejected';
  const variants = (Array.isArray(draft.variants) ? draft.variants : []) as DraftVariant[];
  const [selection] = useState(() => new VariantSelection(variants.map(row=>row.enabled), (index,enabled)=>toggleDraftVariant(draft.id,index,enabled), ()=>router.refresh()));
  const selected = useSyncExternalStore(selection.subscribe, selection.getSnapshot, selection.getSnapshot);
  const variantsSignature = JSON.stringify(variants);
  useEffect(()=>{selection.reset((JSON.parse(variantsSignature) as DraftVariant[]).map(row=>row.enabled));},[selection,variantsSignature]);
  const savingSelection = selected.pending > 0;
  const includedCount = selected.flags.filter(Boolean).length;
  const variantsOutdated = variants.length > 0 && (stem !== draft.stem_md || answerType !== draft.answer_type || ability !== draft.ability_id || coachConfirmed);
  const allowed = !pending && !savingSelection && !selected.error && !locked && !variantsOutdated && source.origin !== 'reference_only' && !!ability && (coachConfirmed ? coachValid : program.ok);
  const reviewValue = (): ApprovalValue => ({ draftId: draft.id, stem_md: stem, answer_type: answerType, ability_id: ability, usage, coachConfirmed, coachAnswer: spec, saveImage });
  const crop = draft.crop as { x: number; y: number; width: number; height: number } | null;
  const ordered = [...abilities].sort((a, b) => Number(draft.ability_candidates.includes(b.id)) - Number(draft.ability_candidates.includes(a.id)));
  const run = (action: () => Promise<Result>) => startTransition(async () => { try { setResult(await action()); router.refresh(); } catch { setResult({ error: '요청을 처리하지 못했습니다.' }); } });
  return <article className={styles.review}>
    <div><button onClick={() => setZoom(!zoom)}>원본 {zoom ? '축소' : '확대'}</button>
      <div className={`${styles.imageScroll} ${zoom ? styles.zoom : ''}`}><div className={styles.imageFrame}>
        {source.url ? <img src={source.url} alt="문제 원본 이미지" loading="lazy" /> : <p>이미지 URL을 만들지 못했습니다.</p>}
        {crop && <svg className={styles.highlight} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="문제 영역"><rect x={crop.x * 1000} y={crop.y * 1000} width={crop.width * 1000} height={crop.height * 1000} /></svg>}
      </div></div>
    </div>
    <div className={styles.editor}>
      <p>{draft.status} · {draft.is_mock ? '모의 추출' : '이미지 추출'} · {draft.model_id}</p>
      {extract?.warning === 'llm_mismatch' && <p role="status">⚠ LLM 불일치 — 프로그램 정답과 추정 답이 다릅니다.</p>}
      {injectionSuspected && <p className={styles.injectionWarning} role="alert">이미지에 지시문 포함 — 반드시 사람이 확인</p>}
      <label>문제<textarea value={stem} onChange={event => { setStem(event.target.value); setCoachConfirmed(false); }} disabled={locked} /></label>
      <div className={styles.preview}>{renderMathMarkdown(stem)}</div>
      <label>정답 형식<select value={answerType} onChange={event => { setAnswerType(event.target.value as AnswerType); setCoachConfirmed(false); }} disabled={locked}>
        <option value="number">수·방정식·부등식의 해</option><option value="fraction">분수</option><option value="expression">식 정리</option><option value="choice">선택형</option><option value="photo">사진 풀이</option><option value="text">서술형</option>
      </select></label>
      <p>{coachConfirmed && coachValid ? '코치 확인 ✓' : program.ok ? '프로그램 검증 ✓' : '미확인 — 코치 정답 확인 필요'}</p>
      {program.ok && 'value' in program.answer_spec && <p>계산한 정답: {program.answer_spec.type === 'number' && program.answer_spec.variable ? `${program.answer_spec.variable}${program.answer_spec.relation}` : ''}{program.answer_spec.value}</p>}
      {answerType === 'choice' ? <><label>보기 (한 줄에 하나, 위에서부터 1번)<textarea value={choices} onChange={event => { setChoices(event.target.value); setCoachConfirmed(false); }} /></label><label>정답 번호 (여러 개면 쉼표로 구분)<input value={correct} onChange={event => { setCorrect(event.target.value); setCoachConfirmed(false); }} /></label></> : <label>코치 정답 / 모범 답안{answerType === 'number' && ' (예: -3/4, x<=-7)'}<textarea value={answer} onChange={event => { setAnswer(event.target.value); setCoachConfirmed(false); }} disabled={locked} /></label>}
      <label><input type="checkbox" checked={coachConfirmed} onChange={event => setCoachConfirmed(event.target.checked)} disabled={locked} />입력한 정답을 코치가 확인했습니다.</label>
      <label>소주제 (추천 우선)<select value={ability} onChange={event => setAbility(event.target.value)} disabled={locked}><option value="">선택하세요</option>{ordered.map(row => <option key={row.id} value={row.id}>{draft.ability_candidates.includes(row.id) ? '추천 · ' : ''}{row.id} {row.name}</option>)}</select></label>
      <label>용도<select value={usage} onChange={event => setUsage(event.target.value as ApprovalValue['usage'])} disabled={locked}><option value="diagnostic">진단</option><option value="practice">연습</option><option value="assessment">평가</option><option value="review">복습</option></select></label>
      <label><input type="checkbox" checked={saveImage} onChange={event => setSaveImage(event.target.checked)} disabled={locked} />원본을 예제 자료로 함께 저장</label>
      {source.origin === 'reference_only' && <p>참고용 이미지는 승인할 수 없습니다.</p>}
      <section className={styles.variants} aria-label="변형 문항">
        <h3>변형 3~5개</h3>
        <label>생성 개수<select value={variantCount} onChange={event => setVariantCount(event.target.value)} disabled={pending || variantsLocked}><option value="">규칙의 기본 개수</option>{[3, 4, 5].map(count => <option key={count} value={count}>{count}개</option>)}</select></label>
        <button disabled={pending || savingSelection || variantsLocked || !program.ok || coachConfirmed || !ability || source.origin === 'reference_only'} onClick={() => run(async () => {
          if (draft.status !== 'approved') {
            const saved = await saveDraftReview(reviewValue());
            if (saved.error) return saved;
          }
          return generateDraftVariants(draft.id, variantCount ? Number(variantCount) : undefined);
        })}>{variants.length ? '변형 다시 생성' : '변형 생성·검증'}</button>
        {draft.status === 'approved' && <><button disabled={pending || savingSelection || !!selected.error || variantsOutdated || !program.ok || !includedCount} onClick={() => run(() => appendApprovedVariants(draft.id))}>선택한 변형 추가</button><span>포함 {includedCount}개{savingSelection && ' · 저장 중…'}</span></>}
        {variantsOutdated && <p>씨앗 또는 검증 방식이 변경되었습니다. 검토 저장 후 변형을 다시 생성해 주세요.</p>}
        <ul>{variants.map((variant, index) => <li key={`${index}-${variant.stem_md}`}>
          <label><input type="checkbox" checked={selected.flags[index] ?? variant.enabled} disabled={pending || variantsLocked || variantsOutdated} onChange={event => { const enabled=event.currentTarget.checked; void selection.toggle(index,enabled); }} />변형 {index + 1} 포함 · {variant.usage === 'practice' ? '연습' : variant.usage === 'review' ? '복습' : '평가'}</label>
          <div>{renderMathMarkdown(variant.stem_md)}</div>
          <p>검증한 정답: {'value' in variant.answer_spec ? `${variant.answer_spec.type === 'number' && variant.answer_spec.variable ? variant.answer_spec.variable + variant.answer_spec.relation : ''}${variant.answer_spec.value}` : ''}</p>
        </li>)}</ul>
      </section>
      {selected.error && <p role="alert">{selected.error}</p>}
      <div className={styles.buttons}>
        <button disabled={pending || savingSelection || locked || !ability || !(coachConfirmed ? coachValid : program.ok)} onClick={() => run(() => saveDraftReview(reviewValue()))}>검토 저장</button>
        <button disabled={!allowed} onClick={() => run(() => approve(reviewValue()))}>{stem === draft.stem_md ? '승인' : '수정 후 승인'}</button>
        <span aria-live="polite">포함 {includedCount}개{savingSelection && ' · 저장 중…'}</span>
        <button disabled={locked || pending} onClick={() => { setAnswerType('photo'); setCoachConfirmed(false); setSaveImage(true); }}>이미지 문항으로 등록 준비</button>
        <button disabled={locked || pending || savingSelection} onClick={() => run(() => rejectDraft(draft.id))}>버림</button>
      </div>
      {result && <p role="status">{result.error ?? result.message}</p>}
      {draft.status === 'approved' && <EnrichmentCard key={JSON.stringify(draft.enrichment)} draft={draft} />}
    </div>
  </article>;
}

export default function AuthoringClient({ userId, sources, drafts, abilities, jobs }: AuthoringProps) {
  const [files, setFiles] = useState<File[]>([]), [origin, setOrigin] = useState(''), [note, setNote] = useState(''), [filter, setFilter] = useState('all');
  const [pending, startTransition] = useTransition(), [message, setMessage] = useState('');
  const router = useRouter();
  const approve: Approve = async value => {
    const saved = await saveDraftReview(value);
    if (saved.error) return saved;
    return approveDraft({ draftId: value.draftId, saveImage: value.saveImage });
  };
  const upload = () => startTransition(async () => {
    try {
      for (const file of files) {
        const result = await uploadAuthoringImage(userId, file);
        if (result.error || !result.storagePath) throw result.error ?? new Error('업로드 실패');
        const registered = await registerSource({ storagePath: result.storagePath, origin, note });
        if (registered.error) throw new Error(registered.error);
      }
      setMessage(`${files.length}개 이미지를 대기열에 등록했습니다.`); setFiles([]); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : '업로드 실패'); }
  });
  return <>
    <div className={styles.upload}>
      <label>이미지 선택 (각 15MB 이하)<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" onChange={event => setFiles(Array.from(event.target.files ?? []))} /></label>
      <label>출처<select value={origin} onChange={event => setOrigin(event.target.value)} required><option value="">선택하세요</option><option value="own">직접 제작</option><option value="book">교재</option><option value="licensed">사용 허가</option><option value="reference_only">참고용 (승인 불가)</option></select></label>
      <label>메모<input value={note} onChange={event => setNote(event.target.value)} /></label>
      <div className={styles.buttons}><button disabled={pending || !origin || !files.length} onClick={upload}>업로드·대기열 등록</button><button disabled={pending} onClick={() => startTransition(async () => { const result = await processNow(); setMessage(result.error ?? result.message ?? ''); router.refresh(); })}>지금 처리 (최대 3개)</button></div>
      <p role="status">{pending ? '처리 중…' : message}</p>
    </div>
    <label>초안 상태<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">전체</option>{['extracted', 'needs_coach', 'approved', 'rejected'].map(status => <option key={status}>{status}</option>)}</select></label>
    {sources.map(source => <section key={source.id} className={styles.source}><h2>{source.note || source.storage_path.split('/').at(-1)}</h2><p>{source.origin} · {source.created_at}</p>
      {jobs.filter(job => job.ref_id === source.id).map(job => <p key={job.id}>작업: {job.status}{job.error ? ` — ${job.error}` : ''}</p>)}
      {drafts.filter(draft => draft.source_id === source.id && (filter === 'all' || draft.status === filter)).map(draft => <div key={draft.id}>{jobs.filter(job => job.ref_id === draft.id).map(job => <p key={job.id}>보강 작업: {job.status}{job.error ? ` — ${job.error}` : ''}</p>)}<ReviewCard {...{ draft, source, abilities, approve }} /></div>)}
    </section>)}
  </>;
}
