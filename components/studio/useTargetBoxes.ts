'use client';
import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { TargetBox } from '@/lib/learn/lessons/chalk';
import { overlayCoordinates } from '@/lib/learn/lessons/overlay-coordinates';

/** Convert the rendered client rectangle back to the overlay's SVG coordinates. */
export function localTargetBox(rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>, convert: (x: number, y: number) => { x: number; y: number }): TargetBox {
  const start = convert(rect.left, rect.top);
  const end = convert(rect.right, rect.bottom);
  return { left: start.x, right: end.x, top: start.y, bottom: end.y, x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

export function useTargetBoxes(root: RefObject<HTMLElement>, svg: RefObject<SVGSVGElement>, revision: string) {
  const [targets, setTargets] = useState<Record<string, TargetBox>>({});
  const measure = useCallback(() => {
    const overlay=svg.current;
    if (!overlay || !root.current || !overlay.viewBox.baseVal.width) return;
    const {toLocal}=overlayCoordinates(overlay.getBoundingClientRect(),overlay.viewBox.baseVal);
    const next: Record<string, TargetBox> = {};
    root.current.querySelectorAll<HTMLElement>('[data-stage-target]').forEach(element => {
      if(element.closest('[data-move-clone]'))return;
      next[element.dataset.stageTarget!] = localTargetBox(element.getBoundingClientRect(), toLocal);
    });
    setTargets(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, [root, svg]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    const moving = () => element.getAnimations({subtree:true}).some(animation =>
      animation.playState === 'running' && animation.effect instanceof KeyframeEffect
      && animation.effect.getKeyframes().some(keyframe => keyframe.transform !== undefined));
    const follow = () => {
      frame = 0;
      measure();
      if (moving()) frame = requestAnimationFrame(follow);
    };
    const followAnimation = () => { if (!frame) frame = requestAnimationFrame(follow); };
    const observer = new ResizeObserver(measure);
    const observeTargets = () => {
      observer.disconnect();
      observer.observe(element);
      element.querySelectorAll('[data-stage-target]').forEach(target => {if(!target.closest('[data-move-clone]'))observer.observe(target);});
      measure();
      followAnimation();
    };
    const mutation = new MutationObserver(records => {
      records=records.filter(record=>!(record.target instanceof Element&&record.target.closest('[data-move-layer]')));
      if(!records.length)return;
      if (records.some(record => record.type === 'childList')) observeTargets();
      else measure();
    });
    mutation.observe(element, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'transform', 'viewBox', 'x', 'y'] });
    observeTargets();
    element.addEventListener('animationstart', followAnimation);
    element.addEventListener('animationend', followAnimation);
    element.addEventListener('animationcancel', followAnimation);
    element.addEventListener('transitionrun', followAnimation);
    element.addEventListener('transitionend', followAnimation);
    window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true); // 스크롤에 붙어 있는(sticky) 대상의 위치를 다시 잰다
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect(); mutation.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true);
      element.removeEventListener('animationstart', followAnimation);
      element.removeEventListener('animationend', followAnimation);
      element.removeEventListener('animationcancel', followAnimation);
      element.removeEventListener('transitionrun', followAnimation);
      element.removeEventListener('transitionend', followAnimation);
    };
  }, [root, measure]);
  useEffect(measure, [measure, revision]);
  return targets;
}
