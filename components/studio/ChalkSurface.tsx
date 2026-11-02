'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ChalkMark } from '@/lib/learn/lessons/chalk';
import type { Scene } from '@/lib/learn/lessons/schema';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import { itemsOf, itemParameters } from '@/lib/learn/lessons/items';
import { ChalkLayer } from './ChalkLayer';
import { BoardItems } from './BoardItems';
import { StageFit } from './stages/StageFit';
import { useTargetBoxes } from './useTargetBoxes';
import styles from './chalk.module.css';

export function ChalkSurface({ marks, revision, children, scene, state }: {
  marks: ChalkMark[]; revision: string; children: ReactNode; scene: Scene; state: StageState;
}) {
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const items = itemsOf(scene.stage);
  const canvas = scene.stage.type === 'board' || items.length > 0;
  const targets = useTargetBoxes(root, svg, revision + JSON.stringify(size));
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const next = { width: element.offsetWidth || 1, height: element.offsetHeight || 1 };
      setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const normalized = canvas;
  return <div ref={root} className={styles.surface} data-canvas={canvas} data-board={scene.stage.type === 'board'}>
    {canvas ? <div className={styles.canvasContent}><StageFit intrinsic={scene.stage.type === 'tree'}>{children}</StageFit></div> : children}
    <BoardItems items={items} state={state} params={itemParameters(scene.stage, state.params)} space={{ sx: x => x * size.width, sy: y => y * size.height }} />
    <svg ref={svg} className={styles.overlay} viewBox={'0 0 ' + size.width + ' ' + size.height}>
      <ChalkLayer marks={marks} space={{
        sx: x => normalized ? x * size.width : x,
        sy: y => normalized ? y * size.height : y,
        x: [0, normalized ? 1 : size.width], y: [0, normalized ? 1 : size.height],
        target: id => targets[id] ?? null,
      }} />
    </svg>
  </div>;
}
