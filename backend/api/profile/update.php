<?php
/**
 * Update current user's profile images (avatar and/or cover).
 *
 * POST multipart/form-data:
 * - avatar: file (jpg/png/webp)
 * - cover:  file (jpg/png/webp)
 *
 * Response: { ok: true, profile_image: string|null, cover_image: string|null }
 */
require dirname(__DIR__, 2) . '/session_init.php';
require dirname(__DIR__) . '/friends/_common.php';

cors_preflight_and_start('POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    json_ok(['ok' => false, 'error' => 'method_not_allowed']);
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    http_response_code(401);
    json_ok(['ok' => false, 'error' => 'not_authenticated']);
}

$me = (int) $_SESSION['user_id'];
if ($me <= 0) {
    http_response_code(400);
    json_ok(['ok' => false, 'error' => 'invalid_user']);
}

require_once dirname(__DIR__, 2) . '/db.php';
$config = require dirname(__DIR__, 2) . '/config.php';
$backendBase = rtrim((string)($config['backend_base_url'] ?? ''), '/');

function ensure_cover_column(mysqli $conn): void {
    $res = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'cover_image'");
    $has = $res && mysqli_num_rows($res) > 0;
    if ($res) mysqli_free_result($res);
    if ($has) return;
    // Best-effort: older schemas won't have this.
    @mysqli_query($conn, "ALTER TABLE users ADD COLUMN cover_image TEXT NULL");
}

ensure_cover_column($conn);

function save_upload(array $file, string $subdir, string $prefix): array {
    if (empty($file) || !isset($file['tmp_name'], $file['name'])) {
        return [null, 'missing_file'];
    }
    if (!empty($file['error'])) {
        return [null, 'upload_error_' . (string)$file['error']];
    }

    $tmp = (string)$file['tmp_name'];
    $orig = (string)$file['name'];
    $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg','jpeg','png','webp'], true)) {
        return [null, 'unsupported_type'];
    }

    $baseDir = dirname(__DIR__, 2) . '/uploads/' . $subdir;
    if (!is_dir($baseDir)) {
        @mkdir($baseDir, 0775, true);
    }
    if (!is_dir($baseDir) || !is_writable($baseDir)) {
        return [null, 'upload_dir_not_writable'];
    }

    $safeExt = $ext === 'jpeg' ? 'jpg' : $ext;
    $name = $prefix . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $safeExt;
    $dest = $baseDir . '/' . $name;
    if (!move_uploaded_file($tmp, $dest)) {
        return [null, 'move_failed'];
    }

    $publicPath = '/uploads/' . $subdir . '/' . $name;
    return [$publicPath, null];
}

$updatedProfile = null;
$updatedCover = null;

if (isset($_FILES['avatar'])) {
    [$path, $err] = save_upload($_FILES['avatar'], 'profile', 'avatar');
    if ($err) {
        http_response_code(400);
        json_ok(['ok' => false, 'error' => 'avatar_' . $err]);
    }
    $updatedProfile = $path;
}

if (isset($_FILES['cover'])) {
    [$path, $err] = save_upload($_FILES['cover'], 'profile', 'cover');
    if ($err) {
        http_response_code(400);
        json_ok(['ok' => false, 'error' => 'cover_' . $err]);
    }
    $updatedCover = $path;
}

if ($updatedProfile === null && $updatedCover === null) {
    http_response_code(400);
    json_ok(['ok' => false, 'error' => 'no_files']);
}

// Update DB
if ($updatedProfile !== null && $updatedCover !== null) {
    $stmt = mysqli_prepare($conn, "UPDATE users SET profile_image = ?, cover_image = ? WHERE id = ?");
    mysqli_stmt_bind_param($stmt, 'ssi', $updatedProfile, $updatedCover, $me);
} elseif ($updatedProfile !== null) {
    $stmt = mysqli_prepare($conn, "UPDATE users SET profile_image = ? WHERE id = ?");
    mysqli_stmt_bind_param($stmt, 'si', $updatedProfile, $me);
} else {
    $stmt = mysqli_prepare($conn, "UPDATE users SET cover_image = ? WHERE id = ?");
    mysqli_stmt_bind_param($stmt, 'si', $updatedCover, $me);
}

if (!$stmt || !mysqli_stmt_execute($stmt)) {
    if ($stmt) mysqli_stmt_close($stmt);
    http_response_code(500);
    json_ok(['ok' => false, 'error' => 'database_error']);
}
mysqli_stmt_close($stmt);

// Return absolute URLs for frontend convenience
$profileUrl = $updatedProfile ? ($backendBase ? $backendBase . $updatedProfile : $updatedProfile) : null;
$coverUrl   = $updatedCover ? ($backendBase ? $backendBase . $updatedCover : $updatedCover) : null;

// Update session snapshot so /auth/me.php reflects instantly.
if (!isset($_SESSION['basic_details']) || !is_array($_SESSION['basic_details'])) {
    $_SESSION['basic_details'] = [];
}
if ($profileUrl) {
    $_SESSION['basic_details']['profile'] = $profileUrl;
    if (isset($_SESSION['auth_user']) && is_array($_SESSION['auth_user'])) {
        $_SESSION['auth_user']['profileImage'] = $profileUrl;
        $_SESSION['auth_user']['photoURL'] = $profileUrl;
    }
}
if ($coverUrl) {
    $_SESSION['basic_details']['coverImage'] = $coverUrl;
}

json_ok([
    'ok' => true,
    'profile_image' => $profileUrl,
    'cover_image' => $coverUrl,
]);

