/**
 * 레거시 DB → 새 DB Storage 파일 마이그레이션 스크립트
 * 
 * 실행: node scripts/migrate-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.local 로드
config({ path: resolve(process.cwd(), '.env.local') });

// 레거시 DB 클라이언트
const legacySupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_LEGACY_URL,
  process.env.SUPABASE_LEGACY_SERVICE_ROLE_KEY
);

// 새 DB 클라이언트
const newSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ensureBucketExists(supabase, bucketName) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === bucketName);
  
  if (!exists) {
    console.log(`  📦 버킷 '${bucketName}' 생성 중...`);
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: false
    });
    if (error && !error.message.includes('already exists')) {
      console.error(`  ❌ 버킷 생성 실패:`, error);
      return false;
    }
  }
  return true;
}

async function listAllFiles(supabase, bucketName, folder = '') {
  const allFiles = [];
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(folder, { limit: 1000 });

  if (error) {
    console.error(`  ❌ 파일 목록 조회 실패:`, error);
    return allFiles;
  }

  for (const item of data || []) {
    const path = folder ? `${folder}/${item.name}` : item.name;
    
    if (item.id === null) {
      // 폴더인 경우 재귀적으로 탐색
      const subFiles = await listAllFiles(supabase, bucketName, path);
      allFiles.push(...subFiles);
    } else {
      // 파일인 경우
      allFiles.push({
        name: item.name,
        path: path,
        size: item.metadata?.size || 0
      });
    }
  }

  return allFiles;
}

async function migrateFile(bucketName, filePath) {
  try {
    // 1. 레거시에서 다운로드
    const { data: fileData, error: downloadError } = await legacySupabase.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError) {
      console.error(`    ❌ 다운로드 실패: ${filePath}`, downloadError);
      return false;
    }

    // 2. ArrayBuffer로 변환
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. 새 DB에 업로드
    const { error: uploadError } = await newSupabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: fileData.type,
        upsert: true
      });

    if (uploadError) {
      console.error(`    ❌ 업로드 실패: ${filePath}`, uploadError);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`    ❌ 마이그레이션 실패: ${filePath}`, err);
    return false;
  }
}

async function migrateBucket(bucketName) {
  console.log(`\n📦 버킷 '${bucketName}' 마이그레이션 시작...`);

  // 새 DB에 버킷 생성
  const bucketReady = await ensureBucketExists(newSupabase, bucketName);
  if (!bucketReady) {
    console.error(`  ❌ 버킷 준비 실패, 건너뜀`);
    return;
  }

  // 파일 목록 조회
  const files = await listAllFiles(legacySupabase, bucketName);
  console.log(`  - ${files.length}개 파일 발견`);

  if (files.length === 0) {
    console.log(`  ✅ 마이그레이션할 파일 없음`);
    return;
  }

  let success = 0;
  let failed = 0;

  for (const file of files) {
    process.stdout.write(`  - ${file.path}... `);
    const result = await migrateFile(bucketName, file.path);
    if (result) {
      console.log('✅');
      success++;
    } else {
      console.log('❌');
      failed++;
    }
  }

  console.log(`  ✅ 완료: ${success}개 성공, ${failed}개 실패`);
}

async function main() {
  console.log('🚀 Storage 마이그레이션 시작\n');
  console.log('레거시 DB:', process.env.NEXT_PUBLIC_SUPABASE_LEGACY_URL);
  console.log('새 DB:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  // 레거시 DB의 모든 버킷 조회
  const { data: buckets, error } = await legacySupabase.storage.listBuckets();

  if (error) {
    console.error('❌ 버킷 목록 조회 실패:', error);
    return;
  }

  console.log(`\n📋 레거시 DB 버킷 목록: ${buckets.map(b => b.name).join(', ')}`);

  // 각 버킷 마이그레이션
  for (const bucket of buckets) {
    await migrateBucket(bucket.name);
  }

  console.log('\n✅ Storage 마이그레이션 완료!');
}

main().catch(console.error);