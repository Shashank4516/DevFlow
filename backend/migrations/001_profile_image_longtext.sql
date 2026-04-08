-- ============================================================
-- DevFlow – Full Database Schema for Railway MySQL
-- ============================================================
-- Run this once in Railway's built-in SQL editor:
--   Railway dashboard → your MySQL service → Data tab → Query
--
-- Or just open the PHP runner in your browser (easier):
--   https://<your-railway-backend-url>/migrations/run.php
-- ============================================================


-- ── users ────────────────────────────────────────────────────
-- Stores all registered users (Google / GitHub OAuth).
-- profile_image is LONGTEXT so it can hold base64 data URLs
-- from uploaded avatars (survives Railway ephemeral disk).
CREATE TABLE IF NOT EXISTS `users` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `email`            VARCHAR(255) NOT NULL UNIQUE,
    `name`             VARCHAR(255) NOT NULL DEFAULT '',
    `profile_image`    LONGTEXT     NULL,
    `cover_image`      LONGTEXT     NULL,
    `last_seen_at`     TIMESTAMP    NULL DEFAULT NULL,
    `auth_provider`    VARCHAR(32)  NOT NULL DEFAULT 'google',
    `auth_provider_id` VARCHAR(255) NOT NULL DEFAULT '',
    `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_auth_provider` (`auth_provider`, `auth_provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── friend_requests ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `friend_requests` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `requester_id` INT NOT NULL,
    `addressee_id` INT NOT NULL,
    `status`       ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
    `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_pair`               (`requester_id`, `addressee_id`),
    KEY            `idx_addressee_status` (`addressee_id`, `status`),
    KEY            `idx_requester_status` (`requester_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── conversations ────────────────────────────────────────────
-- One row per DM pair (keyed as "dm_<lower_id>__<higher_id>").
CREATE TABLE IF NOT EXISTS `conversations` (
    `id`               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `conversation_key` VARCHAR(100)    NOT NULL UNIQUE,
    `user_a_id`        BIGINT UNSIGNED NOT NULL,
    `user_b_id`        BIGINT UNSIGNED NOT NULL,
    `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_user_a` (`user_a_id`),
    KEY `idx_user_b` (`user_b_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `messages` (
    `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `conversation_id` BIGINT UNSIGNED NOT NULL,
    `sender_id`       BIGINT UNSIGNED NOT NULL,
    `receiver_id`     BIGINT UNSIGNED NOT NULL,
    `body`            TEXT            NOT NULL,
    `is_read`         TINYINT(1)      NOT NULL DEFAULT 0,
    `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_conv_created`     (`conversation_id`, `created_at`),
    KEY `idx_receiver_created` (`receiver_id`, `created_at`),
    CONSTRAINT `fk_messages_conversation`
        FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── projects  (Kanban boards) ────────────────────────────────
CREATE TABLE IF NOT EXISTS `projects` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `owner_id`   INT          NOT NULL,
    `name`       VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── project_members ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `project_members` (
    `project_id` INT                    NOT NULL,
    `user_id`    INT                    NOT NULL,
    `role`       ENUM('owner','member') NOT NULL DEFAULT 'member',
    `joined_at`  TIMESTAMP              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`project_id`, `user_id`),
    KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── project_tasks  (Kanban cards) ────────────────────────────
CREATE TABLE IF NOT EXISTS `project_tasks` (
    `id`             INT AUTO_INCREMENT PRIMARY KEY,
    `project_id`     INT              NOT NULL,
    `title`          VARCHAR(500)     NOT NULL,
    `description`    TEXT,
    `column_key`     VARCHAR(32)      NOT NULL DEFAULT 'todo',
    `sort_order`     INT              NOT NULL DEFAULT 0,
    `progress_done`  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `progress_total` TINYINT UNSIGNED NOT NULL DEFAULT 4,
    `files_count`    INT UNSIGNED     NOT NULL DEFAULT 0,
    `comments_count` INT UNSIGNED     NOT NULL DEFAULT 0,
    `badges_json`    TEXT,
    KEY `idx_project_column` (`project_id`, `column_key`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── Migration: widen existing profile_image if needed ────────
-- (safe no-op if column is already LONGTEXT)
-- Profile photos are stored IN the database as data:image/...;base64,... strings
-- so avatars work on Railway (no persistent disk for /uploads).
ALTER TABLE `users` MODIFY COLUMN `profile_image` LONGTEXT NULL;
ALTER TABLE `users` MODIFY COLUMN `cover_image`   LONGTEXT NULL;
