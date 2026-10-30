import { requireLearner } from '@/lib/learn/runtime';
import StudioDemo from '@/components/studio/StudioDemo';
export const metadata={title:'러닝 스튜디오 데모',robots:{index:false,follow:false}};
export default async function StudioDemoPage(){await requireLearner();return <StudioDemo/>;}
