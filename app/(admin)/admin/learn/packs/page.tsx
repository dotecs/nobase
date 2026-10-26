import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { adminClient, allRows, message } from './server';
import PackActions from './PackActions';
import styles from './packs.module.css';

export default async function PacksPage() {
  try {
    const client = await adminClient();
    const [packs, units, abilities, items, directories] = await Promise.all([
      allRows(client, 'learn_packs'), allRows(client, 'learn_units'), allRows(client, 'learn_abilities'), allRows(client, 'learn_items'),
      readdir(resolve(process.cwd(), 'content/learn/packs'), { withFileTypes: true }),
    ]);
    return <section className={styles.page}><h1>학습 팩</h1>
      {directories.filter(entry => entry.isDirectory() && !packs.some(pack => pack.id === entry.name)).map(entry => <PackActions key={entry.name} packId={entry.name} />)}
      {packs.map(pack => {
        const ids = new Set(abilities.filter(row => row.pack_id === pack.id).map(row => row.id));
        const counts = new Map<string, number>();
        items.filter(row => ids.has(row.ability_id)).forEach(row => counts.set(String(row.status), (counts.get(String(row.status)) ?? 0) + 1));
        return <article key={String(pack.id)} className={styles.card}><h2>{String(pack.title)}</h2>
          <p>{String(pack.id)} · v{String(pack.version)} · {String(pack.status)}</p>
          <p>단원 {units.filter(row => row.pack_id === pack.id).length} · 소주제 {ids.size} · 문항 {Array.from(counts, ([status, count]) => `${status} ${count}`).join(' / ') || '0'}</p>
          <p>마지막 가져오기: {String(pack.imported_at ?? '없음')}</p><PackActions packId={String(pack.id)} existing />
        </article>;
      })}
    </section>;
  } catch (error) { return <section className={styles.page}><h1>학습 팩</h1><p role="status">{message(error)}</p></section>; }
}
