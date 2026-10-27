-- Purpose: append-only administrative enrollment status history.
-- Application: not applied; application date: pending human review.

begin;

create table public.enrollment_status_events (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  reason text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index enrollment_status_events_enrollment_created_idx
on public.enrollment_status_events(enrollment_id, created_at);

alter table public.enrollment_status_events enable row level security;
create policy enrollment_status_events_admin_select
on public.enrollment_status_events for select to authenticated using (public.is_admin());
create policy enrollment_status_events_admin_insert
on public.enrollment_status_events for insert to authenticated with check (public.is_admin());

commit;
