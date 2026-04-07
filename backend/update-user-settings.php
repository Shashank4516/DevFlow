<?php
/**
 * PUT /update-user-settings.php
 * Save a single settings field for the current user.
 * Body: { "field": "basicDetails", "value": { ... } }
 */
require __DIR__ . '/session_init.php';
session_start();

header('Content-Type: application/json');

$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/cors_helpers.php';
devflow_cors_set_allow_origin($config);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

if (empty($_SESSION['logged_in'])) {
    http_response_code(401);
    echo json_encode(['error' => 'not_authenticated']);
    exit;
}

$raw = file_get_contents('php://input');
$body = $raw ? (json_decode($raw, true) ?? []) : [];
$field = $body['field'] ?? null;
$value = $body['value'] ?? null;

if ($field === null) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_field']);
    exit;
}

// Persist in session
if (!isset($_SESSION['user_settings']) || !is_array($_SESSION['user_settings'])) {
    $_SESSION['user_settings'] = [];
}

if ($field === 'basicDetails' && is_array($value)) {
    $current = is_array($_SESSION['basic_details'] ?? null) ? $_SESSION['basic_details'] : [];
    $merged  = array_merge($current, $value);
    $_SESSION['basic_details'] = $merged;
    $_SESSION['user_settings']['basicDetails'] = $merged;

    // Also update auth_user snapshot so /auth/me.php stays in sync.
    if (isset($merged['profile']) && $merged['profile']) {
        if (isset($_SESSION['auth_user']) && is_array($_SESSION['auth_user'])) {
            $_SESSION['auth_user']['profileImage'] = $merged['profile'];
            $_SESSION['auth_user']['photoURL']     = $merged['profile'];
        }
    }

    // Persist profile/cover images to DB if available
    $meId = (int) ($_SESSION['user_id'] ?? 0);
    if ($meId > 0) {
        $updates = [];
        $params  = '';
        $args    = [];

        if (!empty($merged['profile'])) {
            $updates[] = 'profile_image = ?';
            $params   .= 's';
            $args[]    = $merged['profile'];
        }
        if (array_key_exists('coverImage', $merged)) {
            // Ensure column exists
            require_once __DIR__ . '/db.php';
            $colRes = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'cover_image'");
            $hasCol = $colRes && mysqli_num_rows($colRes) > 0;
            if ($colRes) mysqli_free_result($colRes);
            if (!$hasCol) @mysqli_query($conn, "ALTER TABLE users ADD COLUMN cover_image TEXT NULL");

            $updates[] = 'cover_image = ?';
            $params   .= 's';
            $args[]    = $merged['coverImage'];
        }

        if ($updates) {
            if (!isset($conn)) require_once __DIR__ . '/db.php';
            $params .= 'i';
            $args[]  = $meId;
            $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
            $stmt = mysqli_prepare($conn, $sql);
            if ($stmt) {
                mysqli_stmt_bind_param($stmt, $params, ...$args);
                mysqli_stmt_execute($stmt);
                mysqli_stmt_close($stmt);
            }
        }
    }
} else {
    $_SESSION['user_settings'][$field] = $value;
}

echo json_encode(['ok' => true, 'field' => $field]);
exit;
