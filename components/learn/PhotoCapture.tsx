'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/Button/Button';
import styles from './input.module.css';
export function PhotoCapture({ userId, required, onChange, disabled = false, value }: { userId: string; required: boolean; onChange: (path: string | null) => void; disabled?: boolean; value?: string|null }) {
  const [preview, setPreview] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''),[uploaded,setUploaded]=useState(false),[previewPath,setPreviewPath]=useState<string|null>(null);
  const request = useRef(0),input=useRef<HTMLInputElement>(null),id=useId();
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { request.current++; }, []);
  return <div className={styles.photo}><label htmlFor={id}>풀이 사진 {required ? '(필수)' : '(선택)'}</label><input ref={input} id={id} hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" disabled={disabled || busy} onChange={async event => {
    const file = event.target.files?.[0], token = ++request.current; onChange(null); setError(''); setPreview('');setUploaded(false);setPreviewPath(null);event.target.value='';
    if (!file) return;
    setPreview(URL.createObjectURL(file)); setBusy(true);
    try { const { uploadAttemptPhoto } = await import('@/lib/storage'); const result = await uploadAttemptPhoto(userId, file); if (token !== request.current) return; if (result.error) setError(result.error.message); else {onChange(result.storagePath);setPreviewPath(result.storagePath);setUploaded(true);} }
    catch { if (token === request.current) setError('사진 업로드에 실패했습니다. 다시 시도해 주세요.'); }
    finally { if (token === request.current) setBusy(false); }
  }} />
    {preview && (value===undefined||busy||value===previewPath) && <img src={preview} alt="선택한 풀이 사진" className={styles.photoPreview} />}
    <Button variant="outline" size="lg" fullWidth disabled={disabled||busy} onClick={()=>input.current?.click()}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 5l1-2h6l1 2h4v15H4V5z"/><circle cx="12" cy="12" r="4"/></svg>{preview?'다시 찍기':'사진 찍기 / 올리기'}</Button>
    <p role="status">{busy?'올리는 중…':(value===undefined?uploaded:!!value)?'✓ 올렸어요':''}</p>{error && <p role="alert">{error}</p>}
  </div>;
}
