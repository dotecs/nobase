import { describe, it, expect, vi } from 'vitest';
vi.mock('next/headers', () => ({}));
vi.mock('@/lib/supabase-admin', () => ({ createAdminSupabaseClient: vi.fn() }));
vi.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: vi.fn() }));
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { attemptedItemIds } from './runtime';

describe('exposed item IDs', () => {
  it('selects item_id only, filters on the server and deduplicates across 500-row pages', async () => {
    const query = {select:vi.fn(),eq:vi.fn(),neq:vi.fn(),lte:vi.fn(),order:vi.fn(),range:vi.fn()};
    for (const method of ['select','eq','neq','lte','order'] as const) query[method].mockReturnValue(query);
    query.range.mockResolvedValueOnce({data:Array.from({length:500},()=>({item_id:'a'})),error:null}).mockResolvedValueOnce({data:[{item_id:'a'},{item_id:'b'}],error:null});
    const from=vi.fn().mockReturnValue(query);
    vi.mocked(createAdminSupabaseClient).mockReturnValue({from} as never);
    expect(await attemptedItemIds('user',{excludeSessionId:'session',excludeAttemptId:'attempt',atOrBefore:'2026-10-28T00:00:00Z'})).toEqual(['a','b']);
    expect(query.select.mock.calls).toEqual([['item_id'],['item_id']]);
    expect(query.eq).toHaveBeenCalledWith('user_id','user');
    expect(query.neq).toHaveBeenCalledWith('session_id','session');
    expect(query.neq).toHaveBeenCalledWith('id','attempt');
    expect(query.lte).toHaveBeenCalledWith('created_at','2026-10-28T00:00:00Z');
    expect(query.range.mock.calls).toEqual([[0,499],[500,999]]);
  });
});
