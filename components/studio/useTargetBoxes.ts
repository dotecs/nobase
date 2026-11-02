'use client';
import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { TargetBox } from '@/lib/learn/lessons/chalk';

/** Convert the rendered client rectangle back to the overlay's SVG coordinates. */
export function localTargetBox(rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>, convert: (x: number, y: number) => { x: number; y: number }): TargetBox {
  const start = convert(rect.left, rect.top);
  const end = convert(rect.right, rect.bottom);
  return { left: start.x, right: end.x, top: start.y, bottom: end.y, x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

export function useTargetBoxes(root: RefObject<HTMLElement>, svg: RefObject<SVGSVGElement>, revision: string) {
  const [targets, setTargets] = useState<Record<string, TargetBox>>({});
  const measure = useCallback(() => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix || !root.current) return;
    const inverse = matrix.inverse();
    const next: Record<string, TargetBox> = {};
    root.current.querySelectorAll<HTMLElement>('[data-stage-target]').forEach(element => {
      next[element.dataset.stageTarget!] = localTargetBox(element.getBoundingClientRect(), (x, y) => new DOMPoint(x, y).matrixTransform(inverse));
    });
    setTargets(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, [root, svg]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    const observeTargets = () => {
      observer.disconnect();
      observer.observe(element);
      element.querySelectorAll('[data-stage-target]').forEach(target => observer.observe(target));
      measure();
    };
    const mutation = new MutationObserver(records => {
      if (records.some(record => record.type === 'childList')) observeTargets();
      else measure();
    });
    mutation.observe(element, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'transform', 'viewBox', 'x', 'y'] });
    observeTargets();
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); mutation.disconnect(); window.removeEventListener('resize', measure); };
  }, [root, measure]);
  useEffect(measure, [measure, revision]);
  return targets;
}
