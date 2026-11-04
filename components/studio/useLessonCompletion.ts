'use client';
import { useRef, useState } from 'react';

export function useLessonCompletion(onFirstComplete: () => void) {
  const recorded = useRef(false);
  const [completed, setCompleted] = useState(false);
  const [open, setOpen] = useState(false);
  const show = () => {
    if (!recorded.current) {
      recorded.current = true;
      setCompleted(true);
      onFirstComplete();
    }
    setOpen(true);
  };
  return { completed, open, show, close: () => setOpen(false), onEnded: () => { if (!recorded.current) show(); } };
}
