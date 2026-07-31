create index if not exists user_friends_incoming_created_idx
  on public.user_friends (friend_user_id, created_at desc);
