-- Run this migration in the Supabase project before using admin.html.
-- Authorization is based on auth.users' app_metadata.role = 'admin'.
-- Do not use user_metadata for authorization.

alter table public.contact_submissions
  enable row level security;

revoke select, update, delete on table public.contact_submissions from anon;
grant select, update, delete on table public.contact_submissions to authenticated;

create policy "admins can view contact submissions"
on public.contact_submissions
for select
to authenticated
using ((select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'admin');

create policy "admins can update contact submissions"
on public.contact_submissions
for update
to authenticated
using ((select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'admin')
with check ((select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'admin');

create policy "admins can delete contact submissions"
on public.contact_submissions
for delete
to authenticated
using ((select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'admin');
