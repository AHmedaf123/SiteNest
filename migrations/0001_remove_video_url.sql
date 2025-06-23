-- Remove videoUrl column from apartments table
-- This migration removes TV display functionality from SiteNest

ALTER TABLE "apartments" DROP COLUMN IF EXISTS "video_url";
