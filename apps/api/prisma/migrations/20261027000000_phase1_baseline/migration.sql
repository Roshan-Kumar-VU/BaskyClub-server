-- BaskyCLub Phase 1 baseline (28 tables). Generated 27 Oct 2026 from prisma/schema.prisma, plus phase1_extras.sql.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" TEXT,
    "home_district_code" TEXT,
    "photo_url" TEXT,
    "cover_photo_url" TEXT,
    "bio" TEXT,
    "instagram" TEXT,
    "youtube" TEXT,
    "pinned_post_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "signup_ip" TEXT,
    "last_login_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "granted_by" UUID,
    "from_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "to_at" TIMESTAMP(3),

    CONSTRAINT "platform_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parental_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_name" TEXT NOT NULL,
    "parent_email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "parental_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_log" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before_value" JSONB,
    "after_value" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "states" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "zones" (
    "code" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hq_district_code" TEXT,
    "is_provisional" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "districts" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "lgd_code" TEXT,
    "alt_name" TEXT,
    "short_code" TEXT,
    "zone_code" TEXT,
    "association_id" UUID,
    "is_provisional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "level" TEXT NOT NULL,
    "parent_id" UUID,
    "state_code" TEXT,
    "page_status" TEXT NOT NULL DEFAULT 'draft',
    "registration_no" TEXT,
    "logo_url" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "claimed_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "access_level" TEXT NOT NULL,
    "granted_by" UUID,
    "from_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "to_at" TIMESTAMP(3),

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_bearers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "photo_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "term_from" DATE NOT NULL,
    "term_to" DATE,
    "entered_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_bearers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "record_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "body" TEXT,
    "winner" TEXT,
    "runner_up" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_media" (
    "id" UUID NOT NULL,
    "legacy_record_id" UUID NOT NULL,
    "media_type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "legacy_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'club',
    "district_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "motto" TEXT,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "basky_number" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_memberships" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "is_player" BOOLEAN NOT NULL DEFAULT true,
    "is_coach" BOOLEAN NOT NULL DEFAULT false,
    "is_referee" BOOLEAN NOT NULL DEFAULT false,
    "primary_position" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "approved_by" UUID,

    CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_roles" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "granted_by" UUID,
    "from_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "to_at" TIMESTAMP(3),

    CONSTRAINT "club_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coaches" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "photo_url" TEXT,
    "role" TEXT NOT NULL DEFAULT 'assistant',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliations" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "tnba_number" TEXT,
    "valid_from" DATE,
    "valid_until" DATE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_by" TEXT NOT NULL,
    "requested_by" UUID,
    "decided_by" UUID,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_badges" (
    "id" UUID NOT NULL,
    "club_id" UUID,
    "user_id" UUID,
    "badge" TEXT NOT NULL DEFAULT 'basky_verified',
    "status" TEXT NOT NULL DEFAULT 'active',
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "verification_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" UUID NOT NULL,
    "club_id" UUID,
    "name" TEXT NOT NULL,
    "district_code" TEXT NOT NULL,
    "indoor" BOOLEAN NOT NULL DEFAULT false,
    "surface" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "image_urls" TEXT[],
    "ai_validated" BOOLEAN NOT NULL DEFAULT false,
    "ai_validation_data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_court_timings" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "is_full_day" BOOLEAN NOT NULL DEFAULT false,
    "morning_start" TEXT,
    "morning_end" TEXT,
    "evening_start" TEXT,
    "evening_end" TEXT,

    CONSTRAINT "club_court_timings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "club_id" UUID,
    "organization_id" UUID,
    "district_code" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "content" TEXT,
    "moderation_status" TEXT NOT NULL DEFAULT 'published',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "media_type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'visible',

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "content" TEXT NOT NULL,
    "moderation_status" TEXT NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL,
    "follower_user_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_cases" (
    "id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "ai_score" DECIMAL(4,3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "reported_by" UUID,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "sender_org_id" UUID,
    "sender_club_id" UUID,
    "audience" TEXT NOT NULL,
    "district_code" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "show_in_feed" BOOLEAN NOT NULL DEFAULT false,
    "feed_post_id" UUID,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_pinned_post_id_key" ON "users"("pinned_post_id");

-- CreateIndex
CREATE INDEX "users_home_district_code_idx" ON "users"("home_district_code");

-- CreateIndex
CREATE INDEX "platform_roles_user_id_to_at_idx" ON "platform_roles"("user_id", "to_at");

-- CreateIndex
CREATE UNIQUE INDEX "parental_consents_token_hash_key" ON "parental_consents"("token_hash");

-- CreateIndex
CREATE INDEX "parental_consents_user_id_idx" ON "parental_consents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "change_log_entity_entity_id_idx" ON "change_log"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "districts_state_code_idx" ON "districts"("state_code");

-- CreateIndex
CREATE INDEX "districts_association_id_idx" ON "districts"("association_id");

-- CreateIndex
CREATE INDEX "organizations_level_state_code_idx" ON "organizations"("level", "state_code");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_to_at_idx" ON "organization_members"("organization_id", "to_at");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE INDEX "office_bearers_organization_id_term_to_idx" ON "office_bearers"("organization_id", "term_to");

-- CreateIndex
CREATE INDEX "legacy_records_organization_id_year_idx" ON "legacy_records"("organization_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_basky_number_key" ON "clubs"("basky_number");

-- CreateIndex
CREATE INDEX "clubs_district_code_status_idx" ON "clubs"("district_code", "status");

-- CreateIndex
CREATE INDEX "clubs_kind_idx" ON "clubs"("kind");

-- CreateIndex
CREATE INDEX "club_memberships_club_id_status_idx" ON "club_memberships"("club_id", "status");

-- CreateIndex
CREATE INDEX "club_memberships_user_id_status_idx" ON "club_memberships"("user_id", "status");

-- CreateIndex
CREATE INDEX "club_roles_club_id_role_to_at_idx" ON "club_roles"("club_id", "role", "to_at");

-- CreateIndex
CREATE INDEX "club_roles_user_id_idx" ON "club_roles"("user_id");

-- CreateIndex
CREATE INDEX "coaches_club_id_ended_at_idx" ON "coaches"("club_id", "ended_at");

-- CreateIndex
CREATE INDEX "affiliations_club_id_status_idx" ON "affiliations"("club_id", "status");

-- CreateIndex
CREATE INDEX "affiliations_organization_id_status_idx" ON "affiliations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "verification_badges_club_id_status_idx" ON "verification_badges"("club_id", "status");

-- CreateIndex
CREATE INDEX "verification_badges_user_id_status_idx" ON "verification_badges"("user_id", "status");

-- CreateIndex
CREATE INDEX "courts_district_code_status_idx" ON "courts"("district_code", "status");

-- CreateIndex
CREATE UNIQUE INDEX "club_court_timings_club_id_day_of_week_key" ON "club_court_timings"("club_id", "day_of_week");

-- CreateIndex
CREATE INDEX "posts_district_code_created_at_idx" ON "posts"("district_code", "created_at");

-- CreateIndex
CREATE INDEX "posts_club_id_created_at_idx" ON "posts"("club_id", "created_at");

-- CreateIndex
CREATE INDEX "posts_author_user_id_created_at_idx" ON "posts"("author_user_id", "created_at");

-- CreateIndex
CREATE INDEX "posts_moderation_status_created_at_idx" ON "posts"("moderation_status", "created_at");

-- CreateIndex
CREATE INDEX "post_media_post_id_sort_order_idx" ON "post_media"("post_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_id_user_id_key" ON "post_likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "post_comments_post_id_parent_id_created_at_idx" ON "post_comments"("post_id", "parent_id", "created_at");

-- CreateIndex
CREATE INDEX "follows_target_type_target_id_idx" ON "follows"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_user_id_target_type_target_id_key" ON "follows"("follower_user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_cases_status_created_at_idx" ON "moderation_cases"("status", "created_at");

-- CreateIndex
CREATE INDEX "moderation_cases_target_type_target_id_idx" ON "moderation_cases"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "announcements_feed_post_id_key" ON "announcements"("feed_post_id");

-- CreateIndex
CREATE INDEX "announcements_sender_org_id_sent_at_idx" ON "announcements"("sender_org_id", "sent_at");

-- CreateIndex
CREATE INDEX "announcements_sender_club_id_sent_at_idx" ON "announcements"("sender_club_id", "sent_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_home_district_code_fkey" FOREIGN KEY ("home_district_code") REFERENCES "districts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_pinned_post_id_fkey" FOREIGN KEY ("pinned_post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_roles" ADD CONSTRAINT "platform_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_roles" ADD CONSTRAINT "platform_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parental_consents" ADD CONSTRAINT "parental_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_log" ADD CONSTRAINT "change_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_state_code_fkey" FOREIGN KEY ("state_code") REFERENCES "states"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_hq_district_code_fkey" FOREIGN KEY ("hq_district_code") REFERENCES "districts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_state_code_fkey" FOREIGN KEY ("state_code") REFERENCES "states"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_zone_code_fkey" FOREIGN KEY ("zone_code") REFERENCES "zones"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_state_code_fkey" FOREIGN KEY ("state_code") REFERENCES "states"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_bearers" ADD CONSTRAINT "office_bearers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_bearers" ADD CONSTRAINT "office_bearers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_bearers" ADD CONSTRAINT "office_bearers_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_records" ADD CONSTRAINT "legacy_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_records" ADD CONSTRAINT "legacy_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_media" ADD CONSTRAINT "legacy_media_legacy_record_id_fkey" FOREIGN KEY ("legacy_record_id") REFERENCES "legacy_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_district_code_fkey" FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_memberships" ADD CONSTRAINT "club_memberships_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_roles" ADD CONSTRAINT "club_roles_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_roles" ADD CONSTRAINT "club_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_roles" ADD CONSTRAINT "club_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_badges" ADD CONSTRAINT "verification_badges_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_badges" ADD CONSTRAINT "verification_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_badges" ADD CONSTRAINT "verification_badges_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_district_code_fkey" FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_court_timings" ADD CONSTRAINT "club_court_timings_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_district_code_fkey" FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_user_id_fkey" FOREIGN KEY ("follower_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_sender_org_id_fkey" FOREIGN KEY ("sender_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_sender_club_id_fkey" FOREIGN KEY ("sender_club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_district_code_fkey" FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_feed_post_id_fkey" FOREIGN KEY ("feed_post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============ Extra database rules (phase1_extras.sql) ============
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
