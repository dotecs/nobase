import { checkedLesson } from './lesson-check.mjs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
async function main(){
 if(!process.argv[2]||process.argv[2]==='--help'){console.log('Usage: npm run lesson:seed -- <lesson.json> (새 draft 버전 insert만 수행)');return;}
 const lesson=await checkedLesson(process.argv[2]);
 config({path:'.env.local',quiet:true});
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Supabase 서버 환경변수가 필요합니다.');
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {seedLesson}=await import('../lib/learn/lessons/seed.ts');
 const version=await seedLesson(lesson,{
  latestVersion:async id=>{const {data,error}=await client.from('learn_lessons').select('version').eq('id',id).order('version',{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data?.version??null;},
  conceptIds:async pack=>{const {data,error}=await client.from('learn_concepts').select('id').eq('pack_id',pack);if(error)throw error;return data.map(row=>row.id);},
  abilityIds:async pack=>{const {data,error}=await client.from('learn_abilities').select('id').eq('pack_id',pack);if(error)throw error;return data.map(row=>row.id);},
  insert:async row=>{const {error}=await client.from('learn_lessons').insert(row);return error;},
 });console.log(`INSERT ${lesson.id} v${version} (draft)`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
