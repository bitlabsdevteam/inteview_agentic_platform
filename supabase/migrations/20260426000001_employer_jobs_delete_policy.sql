create policy "Employers can delete their own jobs"
  on public.employer_jobs
  for delete
  using (auth.uid() = employer_user_id);
