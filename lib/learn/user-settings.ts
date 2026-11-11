import { createAdminSupabaseClient } from '@/lib/supabase-admin';
export type StudioTheme = 'dark' | 'light';
export const isStudioTheme = (value: unknown): value is StudioTheme => value === 'dark' || value === 'light';
type SettingsClient = { from: (table: 'learn_user_settings') => any };
const db = () => createAdminSupabaseClient() as unknown as SettingsClient;
/** 계정별 러닝 스튜디오 화면 모드. 설정이 없거나 테이블이 아직 없으면 null(화면 기본값 사용). */
export async function loadStudioTheme(userId: string): Promise<StudioTheme | null> {
  const { data, error } = await db().from('learn_user_settings').select('studio_theme').eq('user_id', userId).maybeSingle();
  if (error) return null;
  return isStudioTheme(data?.studio_theme) ? data.studio_theme : null;
}
export async function saveStudioTheme(userId: string, theme: StudioTheme): Promise<void> {
  const { error } = await db().from('learn_user_settings').upsert({ user_id: userId, studio_theme: theme, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
