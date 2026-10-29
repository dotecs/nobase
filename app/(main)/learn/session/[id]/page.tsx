import { sessionPhotos } from '@/lib/learn/session-photos';
import { SessionPhotoPanel } from '@/components/learn/SessionPhotoPanel';
import Button from '@/components/Button/Button';
import { learningView } from '@/lib/learn/learning-runtime';
import { runtimeError,requireLearner } from '@/lib/learn/runtime';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { dueReviewAbilities } from '@/lib/learn/review-runtime';
import { FocusShell } from '@/components/learn/FocusShell';
import { LearningClient } from './LearningClient';
import { SessionComplete,type CompletionSummary } from './SessionComplete';
export default async function LearningPage({params}:{params:Promise<{id:string}>}){
  try {const view=await learningView((await params).id),title=view.kind==='review'?'오늘의 복습':'오늘의 학습';
    if(view.complete){
      const summary=(view.summary??{}) as CompletionSummary,ids=summary.newly_verified??[],user=await requireLearner();
      const due=await dueReviewAbilities(user.id);
      let topicNames:string[]=[];
      if(ids.length){const result=await createAdminSupabaseClient().from('learn_abilities').select('id,name').in('id',ids);if(result.error)throw result.error;const names=new Map((result.data as {id:string;name:string}[]).map(row=>[row.id,row.name]));topicNames=ids.map(id=>names.get(id)??'완료한 주제');}
      return <FocusShell tone={view.kind==='review'?'review':'learning'} title={title}><SessionComplete withSessionPhotos summary={summary} topicNames={topicNames} hasReview={due.length>0} feedback={view.feedback}/><SessionPhotoPanel userId={user.id} sessionId={(await params).id} kind={view.kind} initialPhotos={await sessionPhotos((await params).id)}/></FocusShell>;
    }
    return <LearningClient key={`${view.sessionId}:${view.planIndex}`} {...view}/>;
  }catch(error){return <FocusShell title="오늘의 학습"><p role="alert">{runtimeError(error, 'app/(main)/learn/session/[id]/page.tsx')}</p><Button href="/learn" size="lg" fullWidth>학습 홈으로</Button></FocusShell>;}
}
