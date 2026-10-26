'use server';

import { revalidatePath } from 'next/cache';
import { adminClient, readRepositoryPack, validatePack, importValidated, readDatabasePack, exportItems, message } from './server';

export async function importPack(packId: string) {
  try {
    const client = await adminClient();
    const result = validatePack(await readRepositoryPack(packId));
    if (result.errors.length || !result.data) return { error: result.errors.join('\n') };
    const stats = await importValidated(client, result.data);
    revalidatePath('/admin/learn/packs');
    return { message: `추가 ${stats.added} / 갱신 ${stats.updated} / 건너뜀 ${stats.skipped}`, warnings: result.warnings };
  } catch (error) { return { error: message(error) }; }
}
export async function exportPack(packId: string) {
  try {
    const client = await adminClient();
    const data = await readDatabasePack(client, packId);
    const output = await exportItems(packId, data.items);
    return { message: output.local ? 'items/에 내보냈습니다.' : '검토 완료 문항을 다운로드합니다.', download: output.text, filename: `${packId}-items.txt` };
  } catch (error) { return { error: message(error) }; }
}
export async function setPackStatus(packId: string, status: 'live') {
  try {
    if (status !== 'live') throw new Error('지원하지 않는 상태');
    const client = await adminClient();
    const data = await readDatabasePack(client, packId);
    const result = validatePack({ ...data, pack: { ...data.pack, status } });
    if (result.errors.length) return { error: result.errors.join('\n') };
    const updated = await client.from('learn_packs').update({ status } as never).eq('id', packId);
    if (updated.error) throw updated.error;
    revalidatePath('/admin/learn/packs');
    return { message: '팩을 live로 변경했습니다.' };
  } catch (error) { return { error: message(error) }; }
}
