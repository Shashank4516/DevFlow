<?php
/**
 * Update current user's profile images (avatar and/or cover).
 * Images are stored in MySQL (users.profile_image / users.cover_image) as data URLs
 * so they survive Railway's ephemeral filesystem.
 *
 * POST multipart/form-data:
 *   - avatar: file (jpg/png/webp)
 *   - cover:  file (jpg/png/webp)
 *
 * POST application/json:
 *   - { "avatar": "data:image/jpeg;base64,...", "cover": "data:image/png;base64,..." }
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

/** Max decoded image size (bytes) after base64 decode. */
const AVATAR_MAX_DECODED = 2097152;  // 2 MiB
const COVER_MAX_DECODED  = 3145728;  // 3 MiB

function column_needs_widen_to_longtext(string $type): bool
{
    $t = strtolower($type);
    if (strpos($t, 'longtext') !== false) {
        return false;
    }
    return strpos($t, 'varchar') !== false
        || preg_match('/^char\(/', $t)
        || strpos($t, 'text') !== false;
}

function ensure_profile_image_longtext(mysqli $conn): void
{
    $res = mysqli_query($conn, "SHOW COLUMNS FROM users WHERE Field = 'profile_image'");
    if (!$res) {
        return;
    }
    $row = mysqli_fetch_assoc($res);
    mysqli_free_result($res);
    if (!$row) {
        return;
    }
    if (column_needs_widen_to_longtext((string) ($row['Type'] ?? ''))) {
        @mysqli_query($conn, 'ALTER TABLE users MODIFY COLUMN profile_image LONGTEXT NULL');
    }
}

function ensure_cover_image_longtext(mysqli $conn): void
{
    $res = mysqli_query($conn, "SHOW COLUMNS FROM users WHERE Field = 'cover_image'");
    if (!$res) {
        return;
    }
    $row = mysqli_fetch_assoc($res);
    mysqli_free_result($res);
    if (!$row) {
        @mysqli_query($conn, 'ALTER TABLE users ADD COLUMN cover_image LONGTEXT NULL');
        return;
    }
    if (column_needs_widen_to_longtext((string) ($row['Type'] ?? ''))) {
        @mysqli_query($conn, 'ALTER TABLE users MODIFY COLUMN cover_image LONGTEXT NULL');
    }
}

ensure_profile_image_longtext($conn);
ensure_cover_image_longtext($conn);

/**
 * Validate and return normalized data URL, or [null, error].
 * @return array{0: ?string, 1: ?string}
 */
function validate_image_data_url(string $url, int $maxDecodedBytes): array
{
    $url = trim($url);
    if ($url === '') {
        return [null, 'empty'];
    }
    if (!preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+\/=\r\n]+)$/i', $url, $m)) {
        return [null, 'invalid_data_url'];
    }
    $mimeRaw = strtolower($m[1]);
    $b64 = preg_replace('/\s+/', '', $m[2]);
    $raw = base64_decode($b64, true);
    if ($raw === false) {
        return [null, 'invalid_base64'];
    }
    if (strlen($raw) > $maxDecodedBytes) {
        return [null, 'too_large'];
    }
    $mime = $mimeRaw === 'jpg' ? 'jpeg' : $mimeRaw;
    if (!in_array($mime, ['jpeg', 'png', 'webp'], true)) {
        return [null, 'unsupported_type'];
    }
    $normalized = 'data:image/' . $mime . ';base64,' . base64_encode($raw);

    return [$normalized, null];
}

/**
 * Read uploaded image file into a data: URL.
 * @return array{0: ?string, 1: ?string}
 */
function image_file_to_data_url(array $file, int $maxDecodedBytes): array
{
    if (empty($file) || !isset($file['tmp_name'], $file['name'])) {
        return [null, 'missing_file'];
    }
    if (!empty($file['error'])) {
        return [null, 'upload_error_' . (string) $file['error']];
    }
    $tmp = (string) $file['tmp_name'];
    $orig = (string) $file['name'];
    $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
        return [null, 'unsupported_type'];
    }
    $size = @filesize($tmp);
    if ($size === false || $size > $maxDecodedBytes) {
        return [null, 'file_too_large'];
    }
    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    $mime = false;
    if (class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo ? $finfo->file($tmp) : false;
    }
    if (!in_array($mime, $allowed, true)) {
        switch ($ext) {
            case 'jpg':
            case 'jpeg':
                $mime = 'image/jpeg';
                break;
            case 'png':
                $mime = 'image/png';
                break;
            case 'webp':
                $mime = 'image/webp';
                break;
            default:
                $mime = false;
        }
    }
    if (!in_array($mime, $allowed, true)) {
        return [null, 'unsupported_type'];
    }
    $binary = @file_get_contents($tmp);
    if ($binary === false || $binary === '') {
        return [null, 'read_failed'];
    }

    $mimeShort = $mime === 'image/jpeg' ? 'jpeg' : ($mime === 'image/png' ? 'png' : 'webp');

    return ['data:image/' . $mimeShort . ';base64,' . base64_encode($binary), null];
}

$updatedProfile = null;
$updatedCover = null;

$contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
$isJson = stripos($contentType, 'application/json') !== false;

if ($isJson) {
    $body = read_json_body();
    if (isset($body['avatar']) && is_string($body['avatar'])) {
        [$dataUrl, $err] = validate_image_data_url($body['avatar'], AVATAR_MAX_DECODED);
        if ($err) {
            http_response_code(400);
            json_ok(['ok' => false, 'error' => 'avatar_' . $err]);
        }
        $updatedProfile = $dataUrl;
    }
    if (isset($body['cover']) && is_string($body['cover'])) {
        [$dataUrl, $err] = validate_image_data_url($body['cover'], COVER_MAX_DECODED);
        if ($err) {
            http_response_code(400);
            json_ok(['ok' => false, 'error' => 'cover_' . $err]);
        }
        $updatedCover = $dataUrl;
    }
} else {
    if (isset($_FILES['avatar'])) {
        [$dataUrl, $err] = image_file_to_data_url($_FILES['avatar'], AVATAR_MAX_DECODED);
        if ($err) {
            http_response_code(400);
            json_ok(['ok' => false, 'error' => 'avatar_' . $err]);
        }
        $updatedProfile = $dataUrl;
    }
    if (isset($_FILES['cover'])) {
        [$dataUrl, $err] = image_file_to_data_url($_FILES['cover'], COVER_MAX_DECODED);
        if ($err) {
            http_response_code(400);
            json_ok(['ok' => false, 'error' => 'cover_' . $err]);
        }
        $updatedCover = $dataUrl;
    }
}

if ($updatedProfile === null && $updatedCover === null) {
    http_response_code(400);
    json_ok(['ok' => false, 'error' => 'no_files']);
}

if ($updatedProfile !== null && $updatedCover !== null) {
    $stmt = mysqli_prepare($conn, 'UPDATE users SET profile_image = ?, cover_image = ? WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'ssi', $updatedProfile, $updatedCover, $me);
} elseif ($updatedProfile !== null) {
    $stmt = mysqli_prepare($conn, 'UPDATE users SET profile_image = ? WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'si', $updatedProfile, $me);
} else {
    $stmt = mysqli_prepare($conn, 'UPDATE users SET cover_image = ? WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'si', $updatedCover, $me);
}

if (!$stmt || !mysqli_stmt_execute($stmt)) {
    if ($stmt) {
        mysqli_stmt_close($stmt);
    }
    http_response_code(500);
    json_ok(['ok' => false, 'error' => 'database_error']);
}
mysqli_stmt_close($stmt);

$profileUrl = $updatedProfile;
$coverUrl   = $updatedCover;

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
