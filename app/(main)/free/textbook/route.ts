import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { originalMaterials } from '@/lib/learn/lessons/free-materials';

/** 무료 강의 교재 PDF: 로그인 없이 누구나 받는다. 저장소 주소 대신 매번 10분짜리 내려받기 링크로 보낸다. */
export async function GET(request: NextRequest) {
  const { textbook } = await originalMaterials();
  if (!textbook) return NextResponse.redirect(new URL('/free?textbook=missing', request.url));
  const { data, error } = await createAdminSupabaseClient().storage.from('lesson-resources').createSignedUrl(textbook.storage_path, 600, { download: textbook.title });
  if (error || !data) return NextResponse.redirect(new URL('/free?textbook=error', request.url));
  return NextResponse.redirect(data.signedUrl);
}
