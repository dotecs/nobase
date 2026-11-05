type TimedAction = {type:string;ttl_ms?:number;until?:'sentence'|'scene';target?:string|string[]};
export function sentenceInstruction(action: TimedAction) {
  if (action.type === 'highlight') return typeof action.target === 'string' && !/^(step|row|node):\d+$/.test(action.target);
  return ['pointer','circle','underline','strike','arrow','flash','tint'].includes(action.type);
}
/** Absolute expiry; sentence boundaries come from the player's audio timeline. */
export function actionExpiry(action: TimedAction, start: number, sentenceEnd = Infinity) {
  const until = action.until ?? (action.ttl_ms === 0 ? 'scene' : sentenceInstruction(action) ? 'sentence' : 'scene');
  const ttl = action.ttl_ms ?? (action.type === 'pointer' ? 2500 : 0);
  return Math.min(ttl > 0 ? start + ttl : Infinity, until === 'sentence' ? sentenceEnd : Infinity);
}
export function instructionOpacity(start: number, end: number, time: number) {
  if (time < start || time >= end) return 0;
  return Number.isFinite(end) ? Math.min(1, (end - time) / Math.min(200,end - start)) : 1;
}
