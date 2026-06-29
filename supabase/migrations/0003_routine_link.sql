-- Optional link (e.g. a ClickUp doc) on each Daily Blueprint block, so a block
-- can point to detailed how-to instructions.
alter table routine_blocks
  add column if not exists link text;
