-- Purpose: immutable session photos and atomic service-role-only append (approved).
-- Application: 미적용, Claude 적용. 작성일 2026-10-29.
create table public.learn_session_photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learn_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, path)
);
create index learn_session_photos_session on public.learn_session_photos(session_id);
alter table public.learn_session_photos enable row level security;
create policy learn_session_photos_owner_select on public.learn_session_photos for select to authenticated using (user_id = auth.uid());
create policy learn_session_photos_owner_insert on public.learn_session_photos for insert to authenticated with check (user_id = auth.uid());
create function public.learn_add_session_photo(p_user_id uuid, p_session_id uuid, p_path text) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  session public.learn_sessions;
  photo_id uuid;
  photo_count integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server only' using errcode = '42501'; end if;
  select * into session from public.learn_sessions where id=p_session_id for update;
  if not found or session.user_id is distinct from p_user_id or session.ended_at is null then raise exception 'Invalid ended session'; end if;
  if p_path is null or left(p_path,length(p_user_id::text||'/sessions/'||p_session_id::text||'/')) <> p_user_id::text||'/sessions/'||p_session_id::text||'/' or position('..' in p_path)>0 then raise exception 'Invalid photo path'; end if;
  select id into photo_id from public.learn_session_photos where session_id=p_session_id and path=p_path;
  if found then return photo_id; end if;
  select count(*) into photo_count from public.learn_session_photos where session_id=p_session_id;
  if photo_count>=4 then raise exception '사진은 4장까지 올릴 수 있어요'; end if;
  insert into public.learn_session_photos(session_id,user_id,path,position) values(p_session_id,p_user_id,p_path,photo_count) returning id into photo_id;
  return photo_id;
end;
$$;
revoke execute on function public.learn_add_session_photo(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.learn_add_session_photo(uuid,uuid,text) to service_role;
-- ROLLBACK: preserve photos and use a forward correction if needed.
