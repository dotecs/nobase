import { chalkLine, type ChalkPoint } from '@/lib/learn/lessons/chalk';
import styles from './chalk.module.css';

export function ChalkStroke({ points, progress, close = false, smooth = false }: {
  points: ChalkPoint[]; progress: number; close?: boolean; smooth?: boolean;
}) {
  return <><path className={styles.wobbly} d={chalkLine(points, !smooth, close)} pathLength={1} strokeDasharray={1} style={{ strokeDashoffset: 1 - progress }} /><path className={styles.still} d={chalkLine(points, false, close)} pathLength={1} /></>;
}
