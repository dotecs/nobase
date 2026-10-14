'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FaArrowLeft,
  FaCheck,
  FaCheckCircle,
  FaCloudUploadAlt,
  FaDownload,
  FaExclamationCircle,
  FaPause,
  FaPlay,
  FaPrint,
  FaRedo,
  FaUserTie,
} from 'react-icons/fa';
import {
  INTERVIEW_WORKBOOK,
  WORKBOOK_YEAR_LABEL,
  getAllFields,
  noteKey,
  type WorkbookBlock,
  type WorkbookField,
} from '@/lib/interview-workbook-content';
import { saveInterviewWorkbookAnswers, type WorkbookAnswers } from './actions';
import styles from './workbook.module.css';

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface Props {
  displayName: string;
  initialAnswers: WorkbookAnswers;
  initialSavedAt: string | null;
  passedAt: string | null;
  backHref: string;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 1200;
const ALL_FIELDS = getAllFields();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

const isFilled = (v: string | boolean | undefined) =>
  typeof v === 'boolean' ? v : typeof v === 'string' && v.trim().length > 0;

function countFilled(answers: WorkbookAnswers, fields: WorkbookField[]) {
  let filled = 0;
  for (const f of fields) if (isFilled(answers[f.id])) filled++;
  return { filled, total: fields.length };
}

function buildMarkdown(displayName: string, answers: WorkbookAnswers) {
  const lines: string[] = [];
  lines.push(`# ${displayName}님의 SSIT 면접 대비 워크북 (${WORKBOOK_YEAR_LABEL})`);
  lines.push(`_내보낸 날짜: ${fmtDate(new Date().toISOString())} · 노베이스구조대_`);
  lines.push('');
  for (const part of INTERVIEW_WORKBOOK) {
    const fields = part.blocks.flatMap((b) => b.fields || []);
    if (fields.length === 0) continue;
    lines.push(`## ${part.title}`);
    lines.push('');
    for (const block of part.blocks) {
      if (!block.fields?.length) continue;
      if (block.title) {
        lines.push(`### ${block.title}`);
        lines.push('');
      }
      for (const f of block.fields) {
        if (f.kind === 'checkbox') {
          const checked = answers[f.id] === true;
          const note = (answers[noteKey(f.id)] as string | undefined)?.trim();
          lines.push(`- [${checked ? 'x' : ' '}] ${f.label}${note ? ` — ${note}` : ''}`);
        } else {
          const v = ((answers[f.id] as string | undefined) || '').trim();
          lines.push(`**${f.label}**`);
          lines.push('');
          lines.push(v ? v : '_(미작성)_');
          lines.push('');
        }
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function InterviewWorkbook({
  displayName,
  initialAnswers,
  initialSavedAt,
  passedAt,
  backHref,
}: Props) {
  const [answers, setAnswers] = useState<WorkbookAnswers>(initialAnswers);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activePart, setActivePart] = useState<string>(INTERVIEW_WORKBOOK[0].id);
  const [confirmReset, setConfirmReset] = useState(false);

  const latestRef = useRef<WorkbookAnswers>(initialAnswers);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);

  // ── 저장 ──────────────────────────────────────────────────
  const flush = useCallback(async () => {
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    inFlightRef.current = true;
    setSaveState('saving');
    const snapshot = latestRef.current;
    const result = await saveInterviewWorkbookAnswers(snapshot);
    inFlightRef.current = false;

    if (result.ok) {
      setSavedAt(result.savedAt);
      setSaveError(null);
      // 저장 중 추가 입력이 있었으면 다시 저장
      if (queuedRef.current || latestRef.current !== snapshot) {
        queuedRef.current = false;
        void flush();
      } else {
        setSaveState('saved');
      }
    } else {
      setSaveError(result.error);
      setSaveState('error');
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState('dirty');
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, AUTOSAVE_DELAY_MS);
  }, [flush]);

  const update = useCallback(
    (id: string, value: string | boolean) => {
      setAnswers((prev) => {
        const next = { ...prev, [id]: value };
        latestRef.current = next;
        return next;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void flush();
  }, [flush]);

  // 저장 안 된 변경이 있으면 이탈 경고
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveState]);

  // ── 목차 스크롤 스파이 ─────────────────────────────────────
  useEffect(() => {
    const sections = INTERVIEW_WORKBOOK.map((p) => document.getElementById(`part-${p.id}`)).filter(
      Boolean,
    ) as HTMLElement[];
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActivePart(visible[0].target.id.replace('part-', ''));
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // ── 진행률 ────────────────────────────────────────────────
  const progress = useMemo(() => countFilled(answers, ALL_FIELDS), [answers]);
  const progressPct = progress.total ? Math.round((progress.filled / progress.total) * 100) : 0;

  const partProgress = useMemo(() => {
    const map: Record<string, { filled: number; total: number }> = {};
    for (const part of INTERVIEW_WORKBOOK) {
      map[part.id] = countFilled(answers, part.blocks.flatMap((b) => b.fields || []));
    }
    return map;
  }, [answers]);

  // ── 내보내기 / 초기화 ────────────────────────────────────
  const exportMarkdown = () => {
    const md = buildMarkdown(displayName, answers);
    const date = new Date().toISOString().slice(0, 10);
    downloadText(`SSIT_면접워크북_${displayName}_${date}.md`, md);
  };

  const resetAll = () => {
    const next: WorkbookAnswers = {};
    latestRef.current = next;
    setAnswers(next);
    setConfirmReset(false);
    scheduleSave();
  };

  // ─────────────────────────────────────────────────────────
  return (
    <main className={styles.main}>
      {/* ── 상단 네비 ── */}
      <nav className={styles.breadcrumb}>
        <Link href={backHref} className={styles.breadcrumbLink}>
          <FaArrowLeft /> 학습 페이지
        </Link>
      </nav>

      {/* ── 히어로 ── */}
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.kicker}>
            <FaUserTie /> SSIT 면접 대비 · {WORKBOOK_YEAR_LABEL}
          </span>
          <h1 className={styles.title}>
            <span className={styles.titleName}>{displayName}</span>님의 면접 워크북
          </h1>
          <p className={styles.lead}>
            필기 합격을 축하합니다. 이 워크북은 답변을 <b>자신의 이야기로</b> 말할 수 있게 돕는 연습장입니다.
            입력은 자동으로 저장되니 생각날 때마다 조금씩 채워 보세요.
          </p>
          <div className={styles.pills}>
            <span className={styles.pill}>발표 3분</span>
            <span className={styles.pill}>PPT 3매 (표지 제외)</span>
            <span className={styles.pill}>다대일 · 교수 3 : 지원자 1</span>
            {passedAt && <span className={`${styles.pill} ${styles.pillAccent}`}>필기 합격 {fmtDate(passedAt)}</span>}
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.progressHead}>
            <span className={styles.progressLabel}>작성 진행률</span>
            <span className={styles.progressValue}>{progressPct}%</span>
          </div>
          <div className={styles.progressBar} role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.progressMeta}>
            {progress.filled} / {progress.total} 항목
          </div>
          <SaveStatus state={saveState} savedAt={savedAt} error={saveError} onRetry={saveNow} />
          <div className={styles.heroActions}>
            <button type="button" className={styles.actionBtn} onClick={() => window.print()}>
              <FaPrint /> 인쇄 / PDF
            </button>
            <button type="button" className={styles.actionBtn} onClick={exportMarkdown}>
              <FaDownload /> 텍스트 내보내기
            </button>
          </div>
        </div>
      </header>

      {/* ── 본문: 목차 + 콘텐츠 ── */}
      <div className={styles.layout}>
        <aside className={styles.toc} aria-label="목차">
          <ol className={styles.tocList}>
            {INTERVIEW_WORKBOOK.map((part, i) => {
              const pp = partProgress[part.id];
              const done = pp.total > 0 && pp.filled === pp.total;
              return (
                <li key={part.id}>
                  <a
                    href={`#part-${part.id}`}
                    className={`${styles.tocItem} ${activePart === part.id ? styles.tocActive : ''}`}
                  >
                    <span className={`${styles.tocNum} ${done ? styles.tocNumDone : ''}`}>
                      {done ? <FaCheck /> : i + 1}
                    </span>
                    <span className={styles.tocLabel}>{part.short}</span>
                    {pp.total > 0 && (
                      <span className={styles.tocCount}>
                        {pp.filled}/{pp.total}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className={styles.content}>
          {INTERVIEW_WORKBOOK.map((part) => (
            <section key={part.id} id={`part-${part.id}`} className={styles.part}>
              <h2 className={styles.partTitle}>{part.title}</h2>
              {part.intro && <p className={styles.partIntro}>{part.intro}</p>}
              <div className={styles.blocks}>
                {part.blocks.map((block, bi) => (
                  <BlockView key={bi} block={block} answers={answers} onChange={update} />
                ))}
              </div>
            </section>
          ))}

          {/* ── 하단: 초기화 ── */}
          <section className={styles.footerBox}>
            <div>
              <div className={styles.footerTitle}>입력 초기화</div>
              <div className={styles.footerDesc}>모든 답변과 체크 상태를 지웁니다. 되돌릴 수 없으니 먼저 내보내기를 권합니다.</div>
            </div>
            {confirmReset ? (
              <div className={styles.confirmRow}>
                <button type="button" className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={resetAll}>
                  정말 지우기
                </button>
                <button type="button" className={styles.actionBtn} onClick={() => setConfirmReset(false)}>
                  취소
                </button>
              </div>
            ) : (
              <button type="button" className={styles.actionBtn} onClick={() => setConfirmReset(true)}>
                <FaRedo /> 초기화
              </button>
            )}
          </section>
        </div>
      </div>

      {/* ── 인쇄 전용 뷰 ── */}
      <PrintView displayName={displayName} answers={answers} />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Save status
// ─────────────────────────────────────────────────────────────
function SaveStatus({
  state,
  savedAt,
  error,
  onRetry,
}: {
  state: SaveState;
  savedAt: string | null;
  error: string | null;
  onRetry: () => void;
}) {
  let icon = <FaCheckCircle />;
  let text = savedAt ? `저장됨 · ${fmtTime(savedAt)}` : '아직 저장된 내용이 없습니다';
  let cls = styles.saveIdle;

  if (state === 'dirty') {
    icon = <FaCloudUploadAlt />;
    text = '변경 사항 저장 대기 중…';
    cls = styles.saveDirty;
  } else if (state === 'saving') {
    icon = <FaCloudUploadAlt />;
    text = '저장 중…';
    cls = styles.saveDirty;
  } else if (state === 'saved') {
    icon = <FaCheckCircle />;
    text = `저장됨 · ${savedAt ? fmtTime(savedAt) : '방금'}`;
    cls = styles.saveOk;
  } else if (state === 'error') {
    icon = <FaExclamationCircle />;
    text = error || '저장 실패';
    cls = styles.saveErr;
  }

  return (
    <div className={`${styles.saveStatus} ${cls}`} role="status" aria-live="polite">
      <span className={styles.saveIcon}>{icon}</span>
      <span className={styles.saveText}>{text}</span>
      {state === 'error' && (
        <button type="button" className={styles.saveRetry} onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Block
// ─────────────────────────────────────────────────────────────
function BlockView({
  block,
  answers,
  onChange,
}: {
  block: WorkbookBlock;
  answers: WorkbookAnswers;
  onChange: (id: string, v: string | boolean) => void;
}) {
  const checklist = block.fields?.length && block.fields.every((f) => f.kind === 'checkbox');

  return (
    <div className={styles.card}>
      {block.title && <h3 className={styles.cardTitle}>{block.title}</h3>}
      {block.description && !block.steps && <p className={styles.cardDesc}>{block.description}</p>}

      {block.table && (
        <table className={styles.table}>
          <thead>
            <tr>
              {block.table.head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {block.bullets && (
        <ul className={styles.bullets}>
          {block.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {block.steps && (
        <>
          <ol className={styles.steps}>
            {block.steps.map((s, i) => (
              <li key={i}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {block.description && <p className={styles.cardHint}>{block.description}</p>}
        </>
      )}

      {block.callout && (
        <div className={`${styles.callout} ${styles[`callout_${block.callout.tone}`]}`}>{block.callout.text}</div>
      )}

      {block.widget === 'timer' && <Timer />}

      {block.fields && (
        <div className={checklist ? styles.checklist : styles.fields}>
          {block.fields.map((f) => (
            <FieldView key={f.id} field={f} answers={answers} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Field
// ─────────────────────────────────────────────────────────────
function FieldView({
  field,
  answers,
  onChange,
}: {
  field: WorkbookField;
  answers: WorkbookAnswers;
  onChange: (id: string, v: string | boolean) => void;
}) {
  if (field.kind === 'checkbox') {
    const checked = answers[field.id] === true;
    const nk = noteKey(field.id);
    const note = (answers[nk] as string | undefined) ?? '';
    return (
      <div className={`${styles.checkRow} ${checked ? styles.checkRowDone : ''}`}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={checked}
            onChange={(e) => onChange(field.id, e.target.checked)}
          />
          <span>{field.label}</span>
        </label>
        {field.notePlaceholder && (
          <input
            type="text"
            className={styles.checkNote}
            placeholder={field.notePlaceholder}
            value={note}
            onChange={(e) => onChange(nk, e.target.value)}
            aria-label={`${field.label} 코멘트`}
          />
        )}
      </div>
    );
  }

  const value = (answers[field.id] as string | undefined) ?? '';
  const filled = value.trim().length > 0;

  return (
    <div className={`${styles.field} ${filled ? styles.fieldFilled : ''}`}>
      <label className={styles.fieldLabel} htmlFor={`f-${field.id}`}>
        {field.label}
      </label>
      {field.kind === 'text' ? (
        <input
          id={`f-${field.id}`}
          type="text"
          className={styles.input}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      ) : (
        <AutoTextarea
          id={`f-${field.id}`}
          value={value}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          onChange={(v) => onChange(field.id, v)}
        />
      )}
      {field.maxLength && <CharCounter length={value.length} max={field.maxLength} />}
    </div>
  );
}

function AutoTextarea({
  id,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
  }, [value]);

  return (
    <textarea
      id={id}
      ref={ref}
      className={styles.textarea}
      placeholder={placeholder}
      value={value}
      maxLength={maxLength}
      rows={3}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function CharCounter({ length, max }: { length: number; max: number }) {
  const ratio = length / max;
  const cls = ratio > 1 ? styles.counterOver : ratio >= 0.9 ? styles.counterWarn : styles.counterOk;
  return (
    <div className={styles.counterRow}>
      <span className={styles.counterHint}>※ {max}자 (공백 포함)</span>
      <span className={`${styles.counter} ${cls}`}>
        {length} / {max}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3분 타이머
// ─────────────────────────────────────────────────────────────
const TIMER_SECONDS = 180;

function Timer() {
  const [remaining, setRemaining] = useState(TIMER_SECONDS);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const reset = () => {
    setRunning(false);
    setFinished(false);
    setRemaining(TIMER_SECONDS);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = ((TIMER_SECONDS - remaining) / TIMER_SECONDS) * 100;

  return (
    <div className={`${styles.timer} ${finished ? styles.timerDone : ''}`}>
      <div className={styles.timerDisplay} aria-live="off">
        {finished ? '끝!' : `${mm}:${ss}`}
      </div>
      <div className={styles.timerBar}>
        <div className={styles.timerFill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.timerControls}>
        {!running ? (
          <button type="button" className={styles.actionBtn} onClick={() => { if (finished) reset(); setRunning(true); }}>
            <FaPlay /> {remaining === TIMER_SECONDS || finished ? '시작' : '계속'}
          </button>
        ) : (
          <button type="button" className={styles.actionBtn} onClick={() => setRunning(false)}>
            <FaPause /> 일시정지
          </button>
        )}
        <button type="button" className={`${styles.actionBtn} ${styles.ghostBtn}`} onClick={reset}>
          <FaRedo /> 리셋
        </button>
      </div>
      {finished && <div className={styles.timerMsg}>3분 종료 — 핵심만 남겼는지 점검해 보세요.</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 인쇄 전용 뷰 (textarea 는 인쇄 시 잘리므로 텍스트로 다시 렌더)
// ─────────────────────────────────────────────────────────────
function PrintView({ displayName, answers }: { displayName: string; answers: WorkbookAnswers }) {
  return (
    <div className={styles.printOnly} aria-hidden="true">
      <h1 className={styles.printTitle}>
        {displayName}님의 SSIT 면접 대비 워크북 <small>({WORKBOOK_YEAR_LABEL})</small>
      </h1>
      <p className={styles.printMeta}>
        {fmtDate(new Date().toISOString())} · 노베이스구조대
      </p>
      {INTERVIEW_WORKBOOK.map((part) => {
        const fields = part.blocks.flatMap((b) => b.fields || []);
        if (fields.length === 0) return null;
        return (
          <section key={part.id} className={styles.printPart}>
            <h2>{part.title}</h2>
            {part.blocks.map((block, bi) => {
              if (!block.fields?.length) return null;
              return (
                <div key={bi} className={styles.printBlock}>
                  {block.title && <h3>{block.title}</h3>}
                  {block.fields.map((f) => {
                    if (f.kind === 'checkbox') {
                      const checked = answers[f.id] === true;
                      const note = (answers[noteKey(f.id)] as string | undefined)?.trim();
                      return (
                        <div key={f.id} className={styles.printCheck}>
                          <span className={styles.printBox}>{checked ? '☑' : '☐'}</span> {f.label}
                          {note ? ` — ${note}` : ''}
                        </div>
                      );
                    }
                    const v = ((answers[f.id] as string | undefined) || '').trim();
                    return (
                      <div key={f.id} className={styles.printQa}>
                        <div className={styles.printQ}>{f.label}</div>
                        <div className={`${styles.printA} ${v ? '' : styles.printEmpty}`}>{v || '(미작성)'}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
