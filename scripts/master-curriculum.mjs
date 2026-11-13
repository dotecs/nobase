// 전 과목 마스터 목록(content/curricula/master.json)을 교재 데이터에서 다시 만든다.
//   node scripts/master-curriculum.mjs <pdf-to-data 의 data/out/curriculum.json>
// 마스터는 과목 → 대단원 → 소단원 체계만 담는다. 강의는 content/curricula/lesson-topics.json 으로 소단원에 붙인다.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = process.argv[2];
if (!source) { console.error('Usage: node scripts/master-curriculum.mjs <curriculum.json>'); process.exit(1); }
const input = JSON.parse(await readFile(resolve(source), 'utf8'));
const master = {
  note: '전 과목 마스터 목록. scripts/master-curriculum.mjs 가 만든다. 손으로 고치지 않는다.',
  subjects: input.subjects.map(subject => ({
    id: subject.id, title: subject.title, optional: Boolean(subject.optional),
    units: subject.units.map(unit => ({
      id: `${subject.id}-${String(unit.no).padStart(2, '0')}`, no: unit.no, title: unit.title,
      topics: unit.topics.map(topic => ({
        key: topic.key, title: topic.title, planned: Boolean(topic.planned),
        concepts: topic.concepts.length, problems: topic.problems.length,
      })),
    })),
  })),
};
const keys = master.subjects.flatMap(s => s.units.flatMap(u => u.topics.map(t => t.key)));
if (new Set(keys).size !== keys.length) throw new Error('소단원 key가 겹칩니다.');
await writeFile(resolve('content/curricula/master.json'), JSON.stringify(master, null, 1) + '\n');
console.log(`과목 ${master.subjects.length}, 대단원 ${master.subjects.reduce((n, s) => n + s.units.length, 0)}, 소단원 ${keys.length}`);
