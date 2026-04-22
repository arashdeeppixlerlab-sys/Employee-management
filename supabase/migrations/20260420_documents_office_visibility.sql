alter table if exists public.documents enable row level security;

drop policy if exists "documents_select_own_or_admin_uploaded" on public.documents;
create policy "documents_select_own_or_admin_uploaded"
on public.documents
for select
to authenticated
using (
  employee_id = auth.uid()
  or uploaded_by = 'admin'
  or public.is_admin(auth.uid())
);

drop policy if exists "documents_insert_own_or_admin" on public.documents;
create policy "documents_insert_own_or_admin"
on public.documents
for insert
to authenticated
with check (
  (
    uploaded_by = 'employee'
    and employee_id = auth.uid()
  )
  or (
    uploaded_by = 'admin'
    and employee_id is null
    and public.is_admin(auth.uid())
  )
);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own"
on public.documents
for delete
to authenticated
using (
  uploaded_by = 'employee'
  and employee_id = auth.uid()
);

drop policy if exists "documents_admin_all" on public.documents;
create policy "documents_admin_all"
on public.documents
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
