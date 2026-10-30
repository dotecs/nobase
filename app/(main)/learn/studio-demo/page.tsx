import { requireLearner } from '@/lib/learn/runtime';import StudioDemo from '@/components/studio/StudioDemo';
export const metadata={title:'러닝 스튜디오 데모',robots:{index:false,follow:false}};
export default async function StudioDemoPage({searchParams}:{searchParams:Promise<{frame?:string;chrome?:string}>}){await requireLearner();const query=await searchParams;return <StudioDemo frame={query.frame==='16x9'} chrome={query.chrome!=='0'}/>;}
