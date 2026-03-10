/**
 * 레거시 DB → 새 DB 데이터 마이그레이션 스크립트
 * 
 * 실행 전 준비사항:
 * 1. 새 DB에 스키마 적용 (supabase db push 또는 SQL Editor에서 마이그레이션 실행)
 * 2. .env.local에 LEGACY/새 DB 환경변수 설정
 * 3. npm install @supabase/supabase-js dotenv
 * 
 * 실행: node scripts/migrate-data.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
config({ path: resolve(process.cwd(), '.env.local') });

// 레거시 DB 클라이언트 (service_role 사용 - RLS 우회)
const legacySupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_LEGACY_URL,
  process.env.SUPABASE_LEGACY_SERVICE_ROLE_KEY
);

// 새 DB 클라이언트 (service_role 사용 - RLS 우회)
const newSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateProfiles() {
  console.log('📦 프로필 마이그레이션 시작...');
  
  // 레거시 DB에서 profiles + auth.users 조인해서 이메일 가져오기
  const { data: legacyProfiles, error: fetchError } = await legacySupabase
    .from('profiles')
    .select('*');
  
  if (fetchError) {
    console.error('❌ 프로필 조회 실패:', fetchError);
    return [];
  }

  console.log(`  - 레거시 프로필 ${legacyProfiles.length}개 발견`);

  // 각 프로필에 대해 auth.users에서 이메일 가져오기
  const profilesWithEmail = [];
  
  for (const profile of legacyProfiles) {
    const { data: userData, error: userError } = await legacySupabase.auth.admin.getUserById(profile.user_id);
    
    if (userError || !userData?.user) {
      console.warn(`  ⚠️ user_id ${profile.user_id}의 이메일을 찾을 수 없음`);
      continue;
    }
    
    profilesWithEmail.push({
      ...profile,
      email: userData.user.email,
      legacy_user_id: profile.user_id,
    });
  }

  console.log(`  - 이메일 매칭된 프로필 ${profilesWithEmail.length}개`);
  
  // 새 DB에 삽입 (user_id 없이, 나중에 로그인 시 연결)
  // profiles 테이블에 임시로 user_id NULL 허용이 안되므로, 
  // 마이그레이션 테이블에 먼저 저장
  const { error: insertError } = await newSupabase
    .from('migrated_profiles')
    .upsert(profilesWithEmail.map(p => ({
      legacy_user_id: p.legacy_user_id,
      email: p.email,
      role: p.role,
      name: p.name,
      phone: p.phone,
      created_at: p.created_at,
      updated_at: p.updated_at,
    })), { onConflict: 'email' });

  if (insertError) {
    console.error('❌ 프로필 삽입 실패:', insertError);
  } else {
    console.log('  ✅ 프로필 마이그레이션 완료');
  }

  return profilesWithEmail;
}

async function migrateEnrollments(profilesWithEmail) {
  console.log('📦 수강등록 마이그레이션 시작...');
  
  const { data: legacyEnrollments, error: fetchError } = await legacySupabase
    .from('enrollments')
    .select('*');
  
  if (fetchError) {
    console.error('❌ 수강등록 조회 실패:', fetchError);
    return;
  }

  console.log(`  - 레거시 수강등록 ${legacyEnrollments.length}개 발견`);

  // 이메일 매핑 생성
  const userIdToEmail = {};
  profilesWithEmail.forEach(p => {
    userIdToEmail[p.legacy_user_id] = p.email;
  });

  const enrollmentsToMigrate = legacyEnrollments.map(e => ({
    id: e.id,
    legacy_user_id: e.user_id,
    email: userIdToEmail[e.user_id],
    cohort_id: e.cohort_id,
    status: e.status,
    receipt_contact: e.receipt_contact,
    depositor_name: e.depositor_name,
    created_at: e.created_at,
    updated_at: e.updated_at,
  })).filter(e => e.email); // 이메일이 있는 것만

  const { error: insertError } = await newSupabase
    .from('migrated_enrollments')
    .upsert(enrollmentsToMigrate, { onConflict: 'id' });

  if (insertError) {
    console.error('❌ 수강등록 삽입 실패:', insertError);
  } else {
    console.log(`  ✅ 수강등록 ${enrollmentsToMigrate.length}개 마이그레이션 완료`);
  }
}

async function migrateLessonProgress(profilesWithEmail) {
  console.log('📦 학습진도 마이그레이션 시작...');
  
  const { data: legacyProgress, error: fetchError } = await legacySupabase
    .from('lesson_progress')
    .select('*');
  
  if (fetchError) {
    console.error('❌ 학습진도 조회 실패:', fetchError);
    return;
  }

  console.log(`  - 레거시 학습진도 ${legacyProgress.length}개 발견`);

  const userIdToEmail = {};
  profilesWithEmail.forEach(p => {
    userIdToEmail[p.legacy_user_id] = p.email;
  });

  const progressToMigrate = legacyProgress.map(p => ({
    id: p.id,
    legacy_user_id: p.user_id,
    email: userIdToEmail[p.user_id],
    lesson_id: p.lesson_id,
    completed: p.completed,
    completed_at: p.completed_at,
    created_at: p.created_at,
    updated_at: p.updated_at,
  })).filter(p => p.email);

  const { error: insertError } = await newSupabase
    .from('migrated_lesson_progress')
    .upsert(progressToMigrate, { onConflict: 'id' });

  if (insertError) {
    console.error('❌ 학습진도 삽입 실패:', insertError);
  } else {
    console.log(`  ✅ 학습진도 ${progressToMigrate.length}개 마이그레이션 완료`);
  }
}

async function migrateCourses() {
  console.log('📦 코스 데이터 마이그레이션 시작...');
  
  const { data: courses, error } = await legacySupabase.from('courses').select('*');
  if (error) {
    console.error('❌ 코스 조회 실패:', error);
    return;
  }

  const { error: insertError } = await newSupabase
    .from('courses')
    .upsert(courses, { onConflict: 'id' });

  if (insertError) {
    console.error('❌ 코스 삽입 실패:', insertError);
  } else {
    console.log(`  ✅ 코스 ${courses.length}개 마이그레이션 완료`);
  }
}

async function migrateCohorts() {
  console.log('📦 기수 데이터 마이그레이션 시작...');
  
  const { data: cohorts, error } = await legacySupabase.from('cohorts').select('*');
  if (error) {
    console.error('❌ 기수 조회 실패:', error);
    return;
  }

  const { error: insertError } = await newSupabase
    .from('cohorts')
    .upsert(cohorts, { onConflict: 'id' });

  if (insertError) {
    console.error('❌ 기수 삽입 실패:', insertError);
  } else {
    console.log(`  ✅ 기수 ${cohorts.length}개 마이그레이션 완료`);
  }
}

async function migrateLessons() {
  console.log('📦 레슨 데이터 마이그레이션 시작...');
  
  const { data: lessons, error } = await legacySupabase.from('lessons').select('*');
  if (error) {
    console.error('❌ 레슨 조회 실패:', error);
    return;
  }

  const { error: insertError } = await newSupabase
    .from('lessons')
    .upsert(lessons, { onConflict: 'id' });

  if (insertError) {
    console.error('❌ 레슨 삽입 실패:', insertError);
  } else {
    console.log(`  ✅ 레슨 ${lessons.length}개 마이그레이션 완료`);
  }
}

async function migrateLessonVideos() {
  console.log('📦 레슨 비디오 데이터 마이그레이션 시작...');
  
  const { data: videos, error } = await legacySupabase.from('lesson_videos').select('*');
  if (error) {
    console.error('❌ 레슨 비디오 조회 실패:', error);
    return;
  }

  const { error: insertError } = await newSupabase
    .from('lesson_videos')
    .upsert(videos, { onConflict: 'id' });

  if (insertError) {
    console.error('❌ 레슨 비디오 삽입 실패:', insertError);
  } else {
    console.log(`  ✅ 레슨 비디오 ${videos.length}개 마이그레이션 완료`);
  }
}

async function migrateAnnouncements() {
  console.log('📦 공지사항 데이터 마이그레이션 시작...');
  
  const { data: announcements, error } = await legacySupabase.from('announcements').select('*');
  if (error) {
    console.error('❌ 공지사항 조회 실패:', error);
    return;
  }

  const { error: insertError } = await newSupabase
    .from('announcements')
    .upsert(announcements, { onConflict: 'id' });

  if (insertError) {
    console.error('❌ 공지사항 삽입 실패:', insertError);
  } else {
    console.log(`  ✅ 공지사항 ${announcements.length}개 마이그레이션 완료`);
  }
}

async function main() {
  console.log('🚀 데이터 마이그레이션 시작\n');
  console.log('레거시 DB:', process.env.NEXT_PUBLIC_SUPABASE_LEGACY_URL);
  console.log('새 DB:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('');

  try {
    // 1. 콘텐츠 데이터 마이그레이션 (user_id 없음)
    await migrateCourses();
    await migrateCohorts();
    await migrateLessons();
    await migrateLessonVideos();
    await migrateAnnouncements();
    
    // 2. 사용자 관련 데이터 마이그레이션 (이메일 기반)
    const profilesWithEmail = await migrateProfiles();
    await migrateEnrollments(profilesWithEmail);
    await migrateLessonProgress(profilesWithEmail);

    console.log('\n✅ 마이그레이션 완료!');
    console.log('');
    console.log('📋 다음 단계:');
    console.log('1. 새 DB에서 마이그레이션 테이블 확인');
    console.log('2. 사용자가 로그인하면 이메일로 자동 매칭됨');
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류:', error);
  }
}

main();
