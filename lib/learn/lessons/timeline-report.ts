import type {Lesson} from './schema';
import type {Alignment} from './alignment';
import {actionAnchor,resolveAnchor} from './anchors';
import {captionDuration} from './events';
import {sentenceActions} from './legacy-actions';
export function timelineReport(lesson:Lesson,alignments:Record<string,Alignment|null>={}){return lesson.scenes.flatMap(scene=>scene.narration.map(sentence=>{const alignment=alignments[sentence.id]??null,duration=alignment?.end.at(-1)??captionDuration(sentence.text,1);return {scene:scene.id,sentence:sentence.id,duration_ms:duration,timing:alignment?'실제':'추정',actions:sentenceActions(scene,sentence).map(action=>{const at=actionAnchor(action),resolved=resolveAnchor(at,sentence,alignment,duration);return action.type+' '+String(at)+' → '+Math.round(resolved.ms)+'ms'+(resolved.warning?' ⚠ '+resolved.warning:'');}).join(' | ')};}));}
