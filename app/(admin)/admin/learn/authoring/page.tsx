import { adminClient, message } from '../packs/server';
import AuthoringClient from './AuthoringClient';
import type { Ability, Draft, Source } from '@/lib/learn/llm/authoring';
import type { Database } from '@/lib/database.types';
import styles from './authoring.module.css';

export const maxDuration = 60;
export default async function AuthoringPage() {
  try {
    const client = await adminClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('관리자 로그인이 필요합니다.');
    const [sourcesResult, draftsResult, jobsResult, abilityResult] = await Promise.all([
      client.from('learn_item_sources').select('*').order('created_at', { ascending: false }).limit(100),
      client.from('learn_item_drafts').select('*').order('created_at', { ascending: false }).limit(1000),
      client.from('learn_jobs').select('*').order('created_at', { ascending: false }).limit(300),
      client.from('learn_abilities').select('id,name').eq('pack_id', 'root-math').order('id'),
    ]);
    for (const result of [sourcesResult, draftsResult, jobsResult, abilityResult]) if (result.error) throw result.error;
    const sources = await Promise.all(((sourcesResult.data ?? []) as Source[]).map(async source => {
      const signed = await client.storage.from('learn-authoring').createSignedUrl(source.storage_path, 3600);
      return { ...source, url: signed.data?.signedUrl ?? null };
    }));
    return <section className={styles.page}><h1>문항 데이터화</h1><p>최근 이미지 100개를 표시합니다. 이미지 URL이 만료되면 새로고침해 주세요.</p>
      {!abilityResult.data?.length && <p>학습 팩 화면에서 root-math를 먼저 가져와 주세요.</p>}
      <AuthoringClient userId={user.id} sources={sources} drafts={(draftsResult.data ?? []) as Draft[]} abilities={(abilityResult.data ?? []) as Ability[]} jobs={(jobsResult.data ?? []) as Database['public']['Tables']['learn_jobs']['Row'][]} />
    </section>;
  } catch (error) { return <section className={styles.page}><h1>문항 데이터화</h1><p role="status">{message(error).replace('040을', '040·041을')}</p></section>; }
}
