'use client';

import { useEffect } from 'react';

export default function HomeMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!reduced.matches) entry.target.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
      observer.unobserve(entry.target);
    }), { threshold: 0.08 });
    document.querySelectorAll('main > section:not(#top)').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return null;
}
