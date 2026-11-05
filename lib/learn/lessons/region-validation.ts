import type { Scene } from './schema';
import { buildTimeline } from './timeline';
import { actionAnchor, resolveAnchor } from './anchors';

export function regionLevelWarnings(scene: Scene): string[] {
  const events = buildTimeline(scene).entries.flatMap(entry => (entry.sentence.cue?.actions ?? []).map(action => ({
    action, start:entry.startMs + resolveAnchor(actionAnchor(action), entry.sentence, null, entry.durationMs).ms,
  }))).sort((a, b) => a.start - b.start);
  let active: { level:number; end:number }[] = [];
  const levels = new Set<number>();
  for (const { action, start } of events) {
    active = active.filter(region => region.end > start);
    if (action.type === 'clear' && (!action.what || action.what === 'all' || action.what === 'region')) active = [];
    if (action.type !== 'region') continue;
    const level = action.level ?? 1;
    if (active.some(region => region.level === level)) levels.add(level);
    active.push({ level, end:action.ttl_ms ? start + action.ttl_ms : Infinity });
  }
  return [...levels].map(level => scene.id + ': 동시에 보이는 region의 level ' + level + '이 중복됩니다. (음성 정렬이 없으면 자막 시간 기준)');
}
