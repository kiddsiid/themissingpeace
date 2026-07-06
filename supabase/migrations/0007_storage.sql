-- Storage bucket for uploads (board images/PDFs, documents). Private; the app serves files
-- via short-lived signed URLs generated server-side with the service role.
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;
