// 일회성 reset 스크립트 — 본인 카카오 매칭 테스트 반복용
// 실행: node scripts/reset-migration-test.mjs
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = '3b89d77d-115d-4416-b85a-03fa3615993c';
const EMAIL = 'hcm07mch@gmail.com';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE 환경변수 누락');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('\n=== Reset 시작 ===');

  const r1 = await supabase.from('enrollments').delete().eq('user_id', USER_ID);
  console.log('1) DELETE enrollments        ', r1.error ?? `ok (rows: ${r1.count ?? '?'})`);

  const r2 = await supabase.from('profiles').delete().eq('user_id', USER_ID);
  console.log('2) DELETE profiles           ', r2.error ?? `ok (rows: ${r2.count ?? '?'})`);

  const r3 = await supabase
    .from('migrated_profiles')
    .update({ linked_user_id: null, linked_at: null })
    .eq('email', EMAIL);
  console.log('3) UPDATE migrated_profiles  ', r3.error ?? `ok (rows: ${r3.count ?? '?'})`);

  const r4 = await supabase
    .from('migrated_enrollments')
    .update({ linked_user_id: null, linked_at: null })
    .eq('email', EMAIL);
  console.log('4) UPDATE migrated_enrollments', r4.error ?? `ok (rows: ${r4.count ?? '?'})`);

  console.log('\n=== 현재 상태 확인 ===');

  const { data: mp } = await supabase
    .from('migrated_profiles')
    .select('id, kakao_id, email, linked_user_id, linked_at')
    .eq('email', EMAIL);
  console.log('migrated_profiles    :', JSON.stringify(mp, null, 2));

  const { data: me } = await supabase
    .from('migrated_enrollments')
    .select('id, email, cohort_id, linked_user_id')
    .eq('email', EMAIL);
  console.log('migrated_enrollments :', JSON.stringify(me, null, 2));

  const { data: pr } = await supabase
    .from('profiles')
    .select('user_id, name, email, kakao_id')
    .eq('user_id', USER_ID);
  console.log('profiles             :', JSON.stringify(pr, null, 2));

  const { data: er } = await supabase
    .from('enrollments')
    .select('user_id, cohort_id, status')
    .eq('user_id', USER_ID);
  console.log('enrollments          :', JSON.stringify(er, null, 2));

  console.log('\n=== 완료 — 이제 로그아웃 → 카카오 재로그인 ===\n');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
