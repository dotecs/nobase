'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {containedImageBox,figureSpace} from '@/lib/learn/lessons/figure-space';
import {localTargetBox} from './useTargetBoxes';
import {overlayCoordinates} from '@/lib/learn/lessons/overlay-coordinates';
import type { TargetBox, ChalkMark } from '@/lib/learn/lessons/chalk';
import type { Scene } from '@/lib/learn/lessons/schema';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import { itemsOf, itemParameters } from '@/lib/learn/lessons/items';
import { CalloutLayer } from './CalloutLayer';
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
  const canvas = scene.stage.type === 'board' || scene.stage.type === 'figure' || items.length > 0 || scene.narration.some(sentence => sentence.cue?.actions?.some(action => action.type === 'callout'));
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
  const [imageBox,setImageBox]=useState<TargetBox|null>(null);
  useEffect(()=>{
    const element=root.current,image=element?.querySelector<HTMLImageElement>('[data-figure-image]');
    if(!element||!image)return;
    const measure=()=>{
      const rect=svg.current?.getBoundingClientRect(),box=containedImageBox(image.getBoundingClientRect(),image.naturalWidth,image.naturalHeight);
      const next=box&&rect?.width&&rect.height?localTargetBox(box,overlayCoordinates(rect,{x:0,y:0,width:element.offsetWidth,height:element.offsetHeight}).toLocal):null;
      setImageBox(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
    };
    const observer=new ResizeObserver(measure);observer.observe(element);observer.observe(image);
    image.addEventListener('load',measure);window.addEventListener('resize',measure);measure();
    return()=>{observer.disconnect();image.removeEventListener('load',measure);window.removeEventListener('resize',measure);};
  },[scene.id]);
  const normalized = canvas;
  const coordinates=imageBox&&scene.stage.type==='figure'?figureSpace(imageBox):{sx:(x:number)=>x*size.width,sy:(y:number)=>y*size.height};
  const ready=scene.stage.type!=='figure'||!!imageBox;
  const space = { sx:(x:number) => normalized ? coordinates.sx(x) : x, sy:(y:number) => normalized ? coordinates.sy(y) : y,
    x:[0,normalized?1:size.width] as [number,number], y:[0,normalized?1:size.height] as [number,number], target:(id:string)=>targets[id]??null };
  return <div ref={root} className={styles.surface} data-canvas={canvas} data-board={scene.stage.type === 'board'}>
    {scene.stage.type === 'figure' ? <div className={styles.figureContent}>{children}</div> : canvas ? <div className={styles.canvasContent}><StageFit intrinsic={scene.stage.type === 'tree'}>{children}</StageFit></div> : children}
    <BoardItems items={ready?items:[]} state={state} params={itemParameters(scene.stage, state.params)} space={{...coordinates,target:space.target}} />
    <svg ref={svg} className={styles.overlay} viewBox={'0 0 ' + size.width + ' ' + size.height}>
      {ready && <CalloutLayer state={state} space={space} boxes={targets} params={itemParameters(scene.stage,state.params)} />}
      <ChalkLayer marks={ready?marks:[]} space={{
        sx: x => normalized ? coordinates.sx(x) : x,
        sy: y => normalized ? coordinates.sy(y) : y,
        x: [0, normalized ? 1 : size.width], y: [0, normalized ? 1 : size.height],
        target: id => targets[id] ?? null,
      }} />
    </svg>
  </div>;
}
