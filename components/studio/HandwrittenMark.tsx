'use client';
import { useEffect, useRef, useState } from 'react';
import {nearBox} from '@/lib/learn/lessons/position';
import {boxAnchor,targetAnchor} from '@/lib/learn/lessons/pointing';
import { InlineMath } from 'react-katex';
import { chalkLine, chalkPoint, curvedArrow, memoArrowStart, rotatedMemoBounds, type ChalkMark, type ChalkSpace } from '@/lib/learn/lessons/chalk';
import { ChalkStroke } from './ChalkStroke';
import styles from './chalk.module.css';

export function HandwrittenMark({ mark, space, scale }: { mark: ChalkMark; space: ChalkSpace; scale: number }) {
  const text = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const element = text.current;
    if (!element) return;
    const measure = () => {
      const next = { width: element.offsetWidth, height: element.offsetHeight };
      setMeasured(previous => previous?.width === next.width && previous?.height === next.height ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const action = mark.action;
  if (action.type !== 'handwrite') return null;
  const position = action.position ?? (typeof action.at === 'object' ? action.at : null);
  if (!position) return null;
  const override=space.noteBoxes?.['memo:'+mark.id];
  const anchor = override?{x:override.left,y:override.top+26}:chalkPoint(position, space);
  if(!anchor)return null;
  const left = space.sx(space.x[0]), right = space.sx(space.x[1]);
  const top = Math.min(space.sy(space.y[0]), space.sy(space.y[1]));
  const bottom = Math.max(space.sy(space.y[0]), space.sy(space.y[1]));
  const fontSize = space.portrait?20:Math.max(28 * Math.min(1, (right - left) / 1100), 14 / Math.max(.1, scale));
  const maxWidth = space.portrait?Math.max(1,right-left-24):Math.max(1, Math.min(440 * fontSize / 28, right - left - 12));
  const width = Math.min(maxWidth, measured?.width ?? maxWidth);
  const height = measured?.height ?? Math.max(110, fontSize * 5);
  const offset = !space.portrait&&action.align === 'middle' ? width / 2 : 0;
  if('near' in position&&!override){const target=space.target(position.near);if(target){const box=nearBox(target,width,height,position.side,position.gap);anchor.x=box.left+offset;anchor.y=box.top+26;}}
  if(!override){
  anchor.x = Math.max(left + offset + 8, Math.min(right - width + offset, anchor.x));
  anchor.y = Math.max(top + 32, Math.min(bottom - height + 26, anchor.y));
  }
  const rotation = space.portrait?0:action.rotate ?? -4;
  const bounds = rotatedMemoBounds({ left: anchor.x - offset, top: anchor.y - 26, width, height }, anchor, rotation);
  const arrowTo = space.portrait&&action.arrow_to&&!('target' in action.arrow_to)?undefined:action.arrow_to;
  const destination = arrowTo ? ('target' in arrowTo ? targetAnchor(arrowTo.target, bounds, space, arrowTo.anchor) : chalkPoint(arrowTo, space)) : null;
  const start = destination ? space.portrait?boxAnchor(bounds,destination,'edge',0):memoArrowStart(bounds, destination) : null;
  const target = start && arrowTo && 'target' in arrowTo ? targetAnchor(arrowTo.target, start, space, arrowTo.anchor) : destination;
  const points = start && target && measured ? space.portrait?[start,target]:curvedArrow(start, target) : [];
  const previous = points.at(-2);
  const angle = target && previous ? Math.atan2(target.y - previous.y, target.x - previous.x) : 0;
  const progress = Math.max(0, Math.min(1, (mark.elapsed - (target ? 400 : 0)) / 400));
  return <>
    {target && measured && <g data-memo-arrow>
      <ChalkStroke points={points} progress={Math.min(1, mark.elapsed / 400)} smooth />
      <path className={styles.arrowHead} style={{ opacity: mark.elapsed < 400 ? 0 : 1 }} d={chalkLine([
        { x: target.x - (space.portrait?6:12) * Math.cos(angle - .45), y: target.y - (space.portrait?6:12) * Math.sin(angle - .45) }, target,
        { x: target.x - 12 * Math.cos(angle + .45), y: target.y - 12 * Math.sin(angle + .45) },
      ])} />
    </g>}
    <foreignObject x={anchor.x - offset} y={anchor.y - 26} width={width} height={height} overflow="visible" transform={'rotate(' + rotation + ' ' + anchor.x + ' ' + anchor.y + ')'}>
      <div className={styles.memo} style={{ fontSize: space.portrait?'20px':'max(calc(var(--studio-type-hand) * '+Math.min(1,(right-left)/1100)+'), '+(14/Math.max(.1,scale))+'px)', width: 'max-content', maxWidth, textAlign: action.align === 'middle' ? 'center' : 'left', clipPath: 'inset(0 ' + (100 - progress * 100) + '% 0 0)' }}>
        <span ref={text} className={styles.memoText} data-memo-text data-stage-target={'memo:'+mark.id}>{action.tex ? <InlineMath math={'\\displaystyle ' + action.tex} /> : action.text}</span>
      </div>
    </foreignObject>
  </>;
}
