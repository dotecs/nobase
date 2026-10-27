'use client';
import { useEffect, useRef, useState } from 'react';
import { uploadAttemptPhoto } from '@/lib/storage';
import styles from './input.module.css';
export function PhotoCapture({ userId, required, onChange, disabled = false }: { userId: string; required: boolean; onChange: (path: string | null) => void; disabled?: boolean }) {
  const [preview, setPreview] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { request.current++; }, []);
  return <div className={styles.photo}><label>풀이 사진 {required ? '(필수)' : '(선택)'}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" disabled={disabled || busy} onChange={async event => {
    const file = event.target.files?.[0], token = ++request.current; onChange(null); setError(''); setPreview('');
    if (!file) return;
    setPreview(URL.createObjectURL(file)); setBusy(true);
    try { const result = await uploadAttemptPhoto(userId, file); if (token !== request.current) return; if (result.error) setError(result.error.message); else onChange(result.storagePath); }
    catch { if (token === request.current) setError('사진 업로드에 실패했습니다. 다시 시도해 주세요.'); }
    finally { if (token === request.current) setBusy(false); }
  }} /></label>
    {preview && <img src={preview} alt="선택한 풀이 사진" className={styles.photoPreview} />}
    {busy && <p role="status">사진을 업로드하고 있습니다.</p>}{error && <p role="alert">{error}</p>}
  </div>;
}
