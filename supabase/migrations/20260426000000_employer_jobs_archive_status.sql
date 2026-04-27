alter table public.employer_jobs
drop constraint if exists employer_jobs_status_check;

alter table public.employer_jobs
add constraint employer_jobs_status_check
check (status in ('draft', 'needs_review', 'published', 'closed', 'archived'));
