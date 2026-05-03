<?php
/**
 * DevFlow – Full Database Setup & Migration Runner
 *
 * Creates ALL tables required by the app and runs any ALTER TABLE migrations.
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS + IF EXISTS checks).
 *
 * USAGE:
 *   Deploy your backend to Railway, then open in your browser:
 *   https://<your-railway-backend-url>/migrations/run.php
 *
 * After it shows all green ticks, delete this file for security.
 */

require_once dirname(__DIR__) . '/db.php';
header('Content-Type: text/html; charset=utf-8');

$steps = [];

// ─────────────────────────────────────────────────────────────────────────────
function run_step(mysqli $conn, string $label, string $sql): array
{
    $ok  = @mysqli_query($conn, $sql);
    $err = $ok ? null : mysqli_error($conn);
    return ['label' => $label, 'ok' => (bool) $ok, 'error' => $err];
}

function column_exists(mysqli $conn, string $table, string $column): bool
{
    $res = mysqli_query($conn, "SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
    $has = $res && mysqli_num_rows($res) > 0;
    if ($res) mysqli_free_result($res);
    return $has;
}

function table_exists(mysqli $conn, string $table): bool
{
    $res = mysqli_query($conn, "SHOW TABLES LIKE '{$table}'");
    $has = $res && mysqli_num_rows($res) > 0;
    if ($res) mysqli_free_result($res);
    return $has;
}
// ─────────────────────────────────────────────────────────────────────────────


// ══════════════════════════════════════════════════════════════════════════════
// TABLE: users
// ══════════════════════════════════════════════════════════════════════════════
$steps[] = run_step($conn, 'Create users table', "
    CREATE TABLE IF NOT EXISTS `users` (
        `id`               INT AUTO_INCREMENT PRIMARY KEY,
        `email`            VARCHAR(255) NOT NULL UNIQUE,
        `name`             VARCHAR(255) NOT NULL DEFAULT '',
        `profile_image`    LONGTEXT     NULL,
        `cover_image`      LONGTEXT     NULL,
        `last_seen_at`     TIMESTAMP    NULL DEFAULT NULL,
        `auth_provider`    VARCHAR(32)  NOT NULL DEFAULT 'google',
        `auth_provider_id` VARCHAR(255) NOT NULL DEFAULT '',
        `profile_tag`      VARCHAR(40)  NULL DEFAULT NULL,
        `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY `idx_auth_provider` (`auth_provider`, `auth_provider_id`),
        UNIQUE KEY `uniq_profile_tag` (`profile_tag`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

// Ensure existing installs have all columns (ALTER is safe when column already exists via IF NOT EXISTS guard below)
if (table_exists($conn, 'users')) {
    if (!column_exists($conn, 'users', 'cover_image')) {
        $steps[] = run_step($conn, 'Add users.cover_image column', "ALTER TABLE `users` ADD COLUMN `cover_image` LONGTEXT NULL");
    } else {
        $steps[] = run_step($conn, 'Widen users.cover_image to LONGTEXT', "ALTER TABLE `users` MODIFY COLUMN `cover_image` LONGTEXT NULL");
    }

    if (!column_exists($conn, 'users', 'last_seen_at')) {
        $steps[] = run_step($conn, 'Add users.last_seen_at column', "ALTER TABLE `users` ADD COLUMN `last_seen_at` TIMESTAMP NULL DEFAULT NULL");
    }

    // Widen profile_image so base64 data URLs fit (no-op if already LONGTEXT)
    $steps[] = run_step($conn, 'Widen users.profile_image to LONGTEXT', "ALTER TABLE `users` MODIFY COLUMN `profile_image` LONGTEXT NULL");

    if (!column_exists($conn, 'users', 'profile_tag')) {
        $steps[] = run_step($conn, 'Add users.profile_tag (Discord-style unique id)', "
            ALTER TABLE `users`
            ADD COLUMN `profile_tag` VARCHAR(40) NULL DEFAULT NULL,
            ADD UNIQUE KEY `uniq_profile_tag` (`profile_tag`)
        ");
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// TABLE: friend_requests
// ══════════════════════════════════════════════════════════════════════════════
$steps[] = run_step($conn, 'Create friend_requests table', "
    CREATE TABLE IF NOT EXISTS `friend_requests` (
        `id`           INT AUTO_INCREMENT PRIMARY KEY,
        `requester_id` INT NOT NULL,
        `addressee_id` INT NOT NULL,
        `status`       ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
        `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `uniq_pair`              (`requester_id`, `addressee_id`),
        KEY            `idx_addressee_status` (`addressee_id`, `status`),
        KEY            `idx_requester_status` (`requester_id`, `status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");


// ══════════════════════════════════════════════════════════════════════════════
// TABLE: conversations  (one row per DM pair)
// ══════════════════════════════════════════════════════════════════════════════
$steps[] = run_step($conn, 'Create conversations table', "
    CREATE TABLE IF NOT EXISTS `conversations` (
        `id`               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `conversation_key` VARCHAR(100)     NOT NULL UNIQUE,
        `user_a_id`        BIGINT UNSIGNED  NOT NULL,
        `user_b_id`        BIGINT UNSIGNED  NOT NULL,
        `created_at`       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at`       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY `idx_user_a` (`user_a_id`),
        KEY `idx_user_b` (`user_b_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");


// ══════════════════════════════════════════════════════════════════════════════
// TABLE: messages
// ══════════════════════════════════════════════════════════════════════════════
$steps[] = run_step($conn, 'Create messages table', "
    CREATE TABLE IF NOT EXISTS `messages` (
        `id`              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `conversation_id` BIGINT UNSIGNED NOT NULL,
        `sender_id`       BIGINT UNSIGNED NOT NULL,
        `receiver_id`     BIGINT UNSIGNED NOT NULL,
        `body`            TEXT            NOT NULL,
        `attachments_json` LONGTEXT       NULL,
        `is_read`         TINYINT(1)      NOT NULL DEFAULT 0,
        `is_pinned`       TINYINT(1)      NOT NULL DEFAULT 0,
        `pinned_at`       TIMESTAMP       NULL DEFAULT NULL,
        `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY `idx_conv_created`     (`conversation_id`, `created_at`),
        KEY `idx_receiver_created` (`receiver_id`, `created_at`),
        CONSTRAINT `fk_messages_conversation`
            FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

if (table_exists($conn, 'messages')) {
    if (!column_exists($conn, 'messages', 'attachments_json')) {
        $steps[] = run_step($conn, 'Add messages.attachments_json', "ALTER TABLE `messages` ADD COLUMN `attachments_json` LONGTEXT NULL AFTER `body`");
    }
    if (!column_exists($conn, 'messages', 'is_pinned')) {
        $steps[] = run_step($conn, 'Add messages.is_pinned', "ALTER TABLE `messages` ADD COLUMN `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_read`");
    }
    if (!column_exists($conn, 'messages', 'pinned_at')) {
        $steps[] = run_step($conn, 'Add messages.pinned_at', "ALTER TABLE `messages` ADD COLUMN `pinned_at` TIMESTAMP NULL DEFAULT NULL AFTER `is_pinned`");
    }
}


// ══════════════════════════════════════════════════════════════════════════════
// TABLE: projects  (Kanban boards)
// ══════════════════════════════════════════════════════════════════════════════
$steps[] = run_step($conn, 'Create projects table', "
    CREATE TABLE IF NOT EXISTS `projects` (
        `id`         INT AUTO_INCREMENT PRIMARY KEY,
        `owner_id`   INT          NOT NULL,
        `name`       VARCHAR(255) NOT NULL,
        `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY `idx_owner` (`owner_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");


// ══════════════════════════════════════════════════════════════════════════════
// TABLE: project_members
// ══════════════════════════════════════════════════════════════════════════════
$steps[] = run_step($conn, 'Create project_members table', "
    CREATE TABLE IF NOT EXISTS `project_members` (
        `project_id` INT                          NOT NULL,
        `user_id`    INT                          NOT NULL,
        `role`       ENUM('owner','member')        NOT NULL DEFAULT 'member',
        `joined_at`  TIMESTAMP                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`project_id`, `user_id`),
        KEY `idx_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");


// ══════════════════════════════════════════════════════════════════════════════
// TABLE: project_tasks  (Kanban cards)
// ══════════════════════════════════════════════════════════════════════════════
$steps[] = run_step($conn, 'Create project_tasks table', "
    CREATE TABLE IF NOT EXISTS `project_tasks` (
        `id`              INT AUTO_INCREMENT PRIMARY KEY,
        `project_id`      INT           NOT NULL,
        `title`           VARCHAR(500)  NOT NULL,
        `description`     TEXT,
        `column_key`      VARCHAR(32)   NOT NULL DEFAULT 'todo',
        `sort_order`      INT           NOT NULL DEFAULT 0,
        `progress_done`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
        `progress_total`  TINYINT UNSIGNED NOT NULL DEFAULT 0,
        `files_count`     INT UNSIGNED  NOT NULL DEFAULT 0,
        `comments_count`  INT UNSIGNED  NOT NULL DEFAULT 0,
        `badges_json`     TEXT,
        KEY `idx_project_column` (`project_id`, `column_key`, `sort_order`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

if (table_exists($conn, 'project_tasks') && !column_exists($conn, 'project_tasks', 'assignee_user_id')) {
    $steps[] = run_step($conn, 'Add project_tasks.assignee_user_id', "
        ALTER TABLE `project_tasks`
        ADD COLUMN `assignee_user_id` INT NULL DEFAULT NULL,
        ADD KEY `idx_task_assignee` (`assignee_user_id`)
    ");
}


// ══════════════════════════════════════════════════════════════════════════════
// TABLE: project_repos  (Work graph: project ↔ GitHub repos)
// ══════════════════════════════════════════════════════════════════════════════
$steps[] = run_step($conn, 'Create project_repos table', "
    CREATE TABLE IF NOT EXISTS `project_repos` (
        `id`             INT AUTO_INCREMENT PRIMARY KEY,
        `project_id`     INT           NOT NULL,
        `repo_full_name` VARCHAR(255)  NOT NULL,
        `default_branch` VARCHAR(128)  NOT NULL DEFAULT 'main',
        `sort_order`     INT           NOT NULL DEFAULT 0,
        `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `uniq_project_repo` (`project_id`, `repo_full_name`),
        KEY `idx_project` (`project_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");


// ─────────────────────────────────────────────────────────────────────────────
// Backfill profile_tag for existing users (Discord-style)
// ─────────────────────────────────────────────────────────────────────────────
if (table_exists($conn, 'users') && column_exists($conn, 'users', 'profile_tag')) {
    require_once dirname(__DIR__) . '/profile_tag.php';
    $bf = @mysqli_query($conn, "SELECT id, name FROM users WHERE profile_tag IS NULL OR profile_tag = ''");
    if ($bf) {
        while ($row = mysqli_fetch_assoc($bf)) {
            devflow_ensure_user_profile_tag($conn, (int) ($row['id'] ?? 0), (string) ($row['name'] ?? 'user'));
        }
        mysqli_free_result($bf);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Done
// ─────────────────────────────────────────────────────────────────────────────
mysqli_close($conn);

$allOk = array_reduce($steps, fn($c, $r) => $c && $r['ok'], true);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>DevFlow – DB Setup</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:monospace;background:#0f172a;color:#e2e8f0;padding:2.5rem}
    h1{color:#38bdf8;margin-bottom:1.5rem;font-size:1.4rem}
    h2{color:#94a3b8;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;margin:1.5rem 0 .5rem}
    .step{display:flex;gap:.75rem;align-items:flex-start;padding:.6rem .9rem;border-radius:6px;background:#1e293b;margin:.3rem 0}
    .step .icon{font-size:1rem;min-width:1.4rem}
    .step .label{flex:1;font-size:.92rem}
    .ok  .label{color:#86efac}
    .err .label{color:#fca5a5}
    .err .detail{color:#f87171;font-size:.82rem;margin-top:4px}
    .banner{margin-top:1.5rem;padding:1rem 1.2rem;border-radius:8px;font-size:1rem}
    .banner.success{background:#14532d;color:#bbf7d0}
    .banner.failure{background:#7f1d1d;color:#fecaca}
    .warn{margin-top:1.5rem;padding:1rem 1.2rem;border-radius:8px;background:#78350f;color:#fde68a;font-size:.9rem}
    code{background:#0f172a;padding:2px 5px;border-radius:3px}
  </style>
</head>
<body>
<h1>DevFlow – Database Setup &amp; Migration</h1>

<h2>Tables</h2>
<?php foreach ($steps as $s): ?>
<div class="step <?= $s['ok'] ? 'ok' : 'err' ?>">
  <span class="icon"><?= $s['ok'] ? '✅' : '❌' ?></span>
  <div>
    <div class="label"><?= htmlspecialchars($s['label']) ?></div>
    <?php if (!$s['ok']): ?>
      <div class="detail"><?= htmlspecialchars((string)$s['error']) ?></div>
    <?php endif ?>
  </div>
</div>
<?php endforeach ?>

<div class="banner <?= $allOk ? 'success' : 'failure' ?>">
  <?= $allOk
      ? '✅ All tables created / migrated successfully. Your Railway database is ready.'
      : '❌ One or more steps failed — check the errors above.' ?>
</div>

<div class="warn">
  ⚠️ <strong>Security:</strong> Delete or rename
  <code>backend/migrations/run.php</code> after this page shows all green.
</div>
</body>
</html>
