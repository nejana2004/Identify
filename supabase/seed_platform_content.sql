-- Full cleanup script for the boards/posts/cards platform.
-- Run this after the schema reset to remove all old platform data and auth users.
-- After this, the app starts empty and you can create boards, invites, and content manually.

BEGIN;

TRUNCATE TABLE
  public.notifications,
  public.transactions,
  public.product_cards,
  public.thread_replies,
  public.threads,
  public.board_invitations,
  public.board_join_requests,
  public.board_members,
  public.board_followers,
  public.pins,
  public.profile_views,
  public.user_links,
  public.profiles,
  public.boards,
  public.users
RESTART IDENTITY CASCADE;

DELETE FROM auth.users;

COMMIT;
