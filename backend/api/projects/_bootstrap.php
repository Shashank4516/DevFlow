<?php
/**
 * Shared schema + access helpers for project / kanban APIs.
 */
declare(strict_types=1);

function projects_ensure_tables(mysqli $conn): void
{
    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_owner (owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS project_members (
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('owner','member') NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, user_id),
        KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS project_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        column_key VARCHAR(32) NOT NULL DEFAULT 'todo',
        sort_order INT NOT NULL DEFAULT 0,
        progress_done TINYINT UNSIGNED NOT NULL DEFAULT 0,
        progress_total TINYINT UNSIGNED NOT NULL DEFAULT 4,
        files_count INT UNSIGNED NOT NULL DEFAULT 0,
        comments_count INT UNSIGNED NOT NULL DEFAULT 0,
        badges_json TEXT,
        KEY idx_project_column (project_id, column_key, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS project_task_todos (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        text VARCHAR(500) NOT NULL,
        is_done TINYINT(1) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_task_sort (task_id, sort_order, id),
        KEY idx_task_done (task_id, is_done)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

/**
 * Recompute and store progress counters from the todo checklist.
 */
function tasks_sync_progress_from_todos(mysqli $conn, int $projectId, int $taskId): void
{
    $stmt = mysqli_prepare($conn, "
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) AS done
        FROM project_task_todos
        WHERE task_id = ?
    ");
    mysqli_stmt_bind_param($stmt, 'i', $taskId);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($res) ?: ['total' => 0, 'done' => 0];
    mysqli_stmt_close($stmt);

    $total = (int)($row['total'] ?? 0);
    $done  = (int)($row['done'] ?? 0);

    // Keep legacy defaults: if no todos exist, show 0/4.
    $progressTotal = $total > 0 ? $total : 4;
    $progressDone  = $total > 0 ? $done : 0;

    $upd = mysqli_prepare($conn, "
        UPDATE project_tasks
        SET progress_done = ?, progress_total = ?
        WHERE id = ? AND project_id = ?
        LIMIT 1
    ");
    mysqli_stmt_bind_param($upd, 'iiii', $progressDone, $progressTotal, $taskId, $projectId);
    mysqli_stmt_execute($upd);
    mysqli_stmt_close($upd);
}

function project_user_has_access(mysqli $conn, int $userId, int $projectId): bool
{
    $stmt = mysqli_prepare($conn, '
        SELECT 1 FROM project_members
        WHERE project_id = ? AND user_id = ?
        LIMIT 1
    ');
    mysqli_stmt_bind_param($stmt, 'ii', $projectId, $userId);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $ok = $res && mysqli_fetch_assoc($res);
    mysqli_stmt_close($stmt);
    return (bool) $ok;
}

/**
 * True if $a and $b are accepted friends (either direction).
 */
function users_are_friends(mysqli $conn, int $a, int $b): bool
{
    mysqli_query($conn, "CREATE TABLE IF NOT EXISTS friend_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        addressee_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_pair (requester_id, addressee_id),
        KEY idx_addressee_status (addressee_id, status),
        KEY idx_requester_status (requester_id, status)
    )");

    $stmt = mysqli_prepare($conn, '
        SELECT 1 FROM friend_requests
        WHERE status = \'accepted\'
          AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
        LIMIT 1
    ');
    mysqli_stmt_bind_param($stmt, 'iiii', $a, $b, $b, $a);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $ok = $res && mysqli_fetch_assoc($res);
    mysqli_stmt_close($stmt);
    return (bool) $ok;
}
