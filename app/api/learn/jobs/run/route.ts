import { timingSafeEqual } from 'node:crypto';
import { runJobs } from '@/lib/learn/llm/worker';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const expected = process.env.LEARN_WORKER_SECRET;
  const actual = request.headers.get('x-learn-worker-secret');
  if (!expected || !actual || Buffer.byteLength(expected) !== Buffer.byteLength(actual) || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try { return Response.json({ jobs: await runJobs() }); }
  catch { return Response.json({ error: 'Worker unavailable. Check migration and server configuration.' }, { status: 503 }); }
}
