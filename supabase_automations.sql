-- ==========================================
-- 1. DELETE EMPTY PODS AUTOMATICALLY
-- ==========================================
-- This function runs every time a user is removed from pod_members.
-- If the pod has 0 members left, it deletes the pod.

create or replace function public.delete_empty_pods()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Check if the pod that was just left has 0 members remaining
  if not exists (select 1 from public.pod_members where pod_id = old.pod_id) then
    delete from public.pods where id = old.pod_id;
  end if;
  return old;
end;
$$;

-- Trigger: Fires AFTER a delete on pod_members
drop trigger if exists trigger_delete_empty_pods on public.pod_members;
create trigger trigger_delete_empty_pods
after delete on public.pod_members
for each row
execute function public.delete_empty_pods();

-- ==========================================
-- 2. MANUAL CLEANUP QUERY (FOR REFERENCE)
-- ==========================================
-- You can run this manually in the SQL Editor to clear rides from yesterday
-- delete from public.pods where departure_time < now() - interval '24 hours';
