import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {lessonSchema} from './schema';
import {stageStateAt} from './stage-state-at';
import {StudioStage} from '@/components/studio/stages/StudioStage';

it('renders the situation graph above a quiz stem when quiz.graph is set (rm-16 확인 문제)',()=>{
 const lesson=lessonSchema.parse(JSON.parse(readFileSync('content/lessons/rm-16.json','utf8')));
 const scene=lesson.scenes.at(-1)!;expect(scene.stage.type).toBe('quiz');
 const html=renderToStaticMarkup(<StudioStage scene={scene} state={stageStateAt(scene,0,scene.narration.map((_,i)=>i*1000))} onWhy={()=>{}} onTrace={()=>{}} onQuiz={()=>{}}/>);
 expect(html).toContain('<svg');expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('그래프를 보고'));
});
