import { annotationColor } from './annotation-schema';
import type { StageState } from './stage-state';
export function instructionColor(state: StageState, target: string, base = 'currentColor') {
  const move=state.moves?.find(m=>(m.from===target&&m.flying)||(m.to===target&&m.keepColor));
  if(move?.color)return annotationColor(move.color);
  const color = annotationColor(state.tints?.[target]);
  const opacity = state.tintOpacity?.[target] ?? 1;
  return color && opacity < 1 ? `color-mix(in srgb, ${color} ${opacity*100}%, ${base})` : color;
}
export function targetOpacity(state: StageState, target: string, dim = .25) {
  const selected = state.highlight?.some(value => value === target || value.startsWith(target + '/') || target.startsWith(value + '/'));
  return state.highlight?.length && state.dimOthers && !selected ? 1-(1-dim)*(state.highlightOpacity??1) : 1;
}
