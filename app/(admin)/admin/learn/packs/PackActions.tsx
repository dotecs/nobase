'use client';

import { useState, useTransition } from 'react';
import { importPack, exportPack, setPackStatus } from './actions';
import styles from './packs.module.css';

type Result = { error?: string; message?: string; warnings?: string[]; download?: string; filename?: string };
export default function PackActions({ packId, existing = false }: { packId: string; existing?: boolean }) {
  const [result, setResult] = useState<Result>();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<Result>) => startTransition(async () => {
    const response = await action(); setResult(response);
    if (response.download !== undefined) {
      const url = URL.createObjectURL(new Blob([response.download], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = response.filename ?? 'items.txt'; link.click(); URL.revokeObjectURL(url);
    }
  });
  return <div className={styles.actions}>
    <button disabled={pending} onClick={() => run(() => importPack(packId))}>{packId} 가져오기</button>
    {existing && <><button disabled={pending} onClick={() => run(() => exportPack(packId))}>내보내기</button><button disabled={pending} onClick={() => run(() => setPackStatus(packId, 'live'))}>검증 후 공개</button></>}
    {pending && <span role="status">처리 중…</span>}
    {result && <pre role="status">{result.error ?? result.message}{result.warnings?.length ? `\n${result.warnings.join('\n')}` : ''}</pre>}
  </div>;
}
