-- =============================================================================
-- BaskyCLub Phase 1: database rules Prisma cannot express          PROPOSAL, 26 Oct 2026
-- Appended to the end of the single baseline migration (after Prisma's tables).
-- =============================================================================

-- 1. One open membership per person per club (#17, #63).
--    Old "left" / "removed" / "rejected" rows stay as history, so rejoining works.
CREATE UNIQUE INDEX club_memberships_one_open
  ON club_memberships (club_id, user_id)
  WHERE status IN ('pending', 'active');

-- 2. One current holder of each club role per person, and one current owner per club (#44).
CREATE UNIQUE INDEX club_roles_one_current
  ON club_roles (club_id, user_id, role)
  WHERE to_at IS NULL;
CREATE UNIQUE INDEX club_roles_one_owner
  ON club_roles (club_id)
  WHERE role = 'owner' AND to_at IS NULL;

-- 3. One current power level per person per association, and per platform role.
CREATE UNIQUE INDEX organization_members_one_current
  ON organization_members (organization_id, user_id)
  WHERE to_at IS NULL;
CREATE UNIQUE INDEX platform_roles_one_current
  ON platform_roles (user_id, role)
  WHERE to_at IS NULL;

-- 4. One head coach per club at a time.
CREATE UNIQUE INDEX coaches_one_head
  ON coaches (club_id)
  WHERE is_primary = TRUE AND ended_at IS NULL;

-- 5. One open or active affiliation per club per association (renewals add a new row after the old one ends).
CREATE UNIQUE INDEX affiliations_one_open
  ON affiliations (club_id, organization_id)
  WHERE status IN ('pending', 'active');

-- 6. Replies are one level deep: a reply's parent must be a top-level comment.
CREATE FUNCTION check_comment_depth() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM post_comments p WHERE p.id = NEW.parent_id AND p.parent_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Replies are one level deep: reply to the top-level comment instead';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER post_comments_depth BEFORE INSERT OR UPDATE OF parent_id ON post_comments
  FOR EACH ROW EXECUTE FUNCTION check_comment_depth();

-- 7. Like and comment counts kept by the database (REQUIREMENTS section 8).
CREATE FUNCTION bump_like_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER post_likes_count AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION bump_like_count();

-- Comment count = visible comments: a new comment adds 1; soft delete (deleted_at set) removes 1.
CREATE FUNCTION bump_comment_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER post_comments_count AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION bump_comment_count();

-- 8. Place codes follow one pattern: "TN", "TN-VELLORE", "TN-Z-CHN".
ALTER TABLE states    ADD CONSTRAINT states_code_format    CHECK (code ~ '^[A-Z]{2}$');
ALTER TABLE districts ADD CONSTRAINT districts_code_format CHECK (code ~ '^[A-Z]{2}-[A-Z0-9-]+$');
ALTER TABLE zones     ADD CONSTRAINT zones_code_format     CHECK (code ~ '^[A-Z]{2}-Z-[A-Z0-9-]+$');

-- 9. A badge belongs to exactly one club or one user (#35, #73).
ALTER TABLE verification_badges ADD CONSTRAINT verification_badges_one_owner
  CHECK ((club_id IS NULL) <> (user_id IS NULL));
