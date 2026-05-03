<?php
/**
 * Return current logged-in user (from session) for the React app.
 * Request: GET /auth/me.php
 * Response: JSON { user, basicDetails } or 401.
 */
require dirname(__DIR__) . '/session_init.php';
session_start();

header('Content-Type: application/json');

$config = require dirname(__DIR__) . '/config.php';
require_once dirname(__DIR__) . '/cors_helpers.php';
devflow_cors_set_allow_origin($config);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['auth_user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'not_authenticated']);
    exit;
}

$user = $_SESSION['auth_user'];
$dbProfileImage = null;
$dbCoverImage = null;
$dbProfileTag = null;

// If we have a DB user id, hydrate latest images from DB so changes reflect across devices.
if (!empty($_SESSION['user_id'])) {
    $meId = (int) $_SESSION['user_id'];
    if ($meId > 0) {
        require_once dirname(__DIR__) . '/db.php';

        // Ensure optional column exists (older DBs may not have cover_image yet).
        $hasCover = false;
        $colsRes = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'cover_image'");
        if ($colsRes) {
            $hasCover = mysqli_num_rows($colsRes) > 0;
            mysqli_free_result($colsRes);
        }

        $hasProfileTag = false;
        $tagRes = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'profile_tag'");
        if ($tagRes) {
            $hasProfileTag = mysqli_num_rows($tagRes) > 0;
            mysqli_free_result($tagRes);
        }

        $coverSel = $hasCover ? 'cover_image' : 'NULL AS cover_image';
        $tagSel = $hasProfileTag ? 'profile_tag' : 'NULL AS profile_tag';
        $sql = "SELECT profile_image, {$coverSel}, {$tagSel} FROM users WHERE id = ? LIMIT 1";
        $stmt = mysqli_prepare($conn, $sql);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, 'i', $meId);
            mysqli_stmt_execute($stmt);
            $res = mysqli_stmt_get_result($stmt);
            if ($res) {
                $row = mysqli_fetch_assoc($res);
                $dbProfileImage = $row['profile_image'] ?? null;
                $dbCoverImage = $row['cover_image'] ?? null;
                $dbProfileTag = $row['profile_tag'] ?? null;
            }
            mysqli_stmt_close($stmt);
        }

        if ($hasProfileTag && ($dbProfileTag === null || $dbProfileTag === '')) {
            require_once dirname(__DIR__) . '/profile_tag.php';
            $nm = is_array($_SESSION['basic_details'] ?? null)
                ? (string) ($_SESSION['basic_details']['fullName'] ?? '')
                : (string) ($user['displayName'] ?? '');
            if ($nm === '') {
                $nm = (string) (($user['firstName'] ?? '') . ' ' . ($user['lastName'] ?? ''));
            }
            devflow_ensure_user_profile_tag($conn, $meId, trim($nm) !== '' ? trim($nm) : 'user');
            $stmt2 = mysqli_prepare($conn, 'SELECT profile_tag FROM users WHERE id = ? LIMIT 1');
            if ($stmt2) {
                mysqli_stmt_bind_param($stmt2, 'i', $meId);
                mysqli_stmt_execute($stmt2);
                $r2 = mysqli_stmt_get_result($stmt2);
                if ($r2 && ($row2 = mysqli_fetch_assoc($r2))) {
                    $dbProfileTag = $row2['profile_tag'] ?? null;
                }
                mysqli_stmt_close($stmt2);
            }
        }
    }
}

$basicDetails = isset($_SESSION['basic_details']) ? $_SESSION['basic_details'] : [
    'firstName' => $user['firstName'] ?? '',
    'lastName'  => $user['lastName'] ?? '',
    'fullName'  => $user['displayName'] ?? '',
    'profile'   => $dbProfileImage ?? $user['profileImage'] ?? $user['photoURL'] ?? '',
    'coverImage'=> $dbCoverImage ?? '',
    'email'     => $user['email'] ?? '',
    'location'  => '',
];

// If session has basic_details, prefer DB-backed image values to avoid stale localStorage writes.
if (is_array($basicDetails)) {
    if ($dbProfileImage) $basicDetails['profile'] = $dbProfileImage;
    if ($dbCoverImage) $basicDetails['coverImage'] = $dbCoverImage;
    if ($dbProfileTag !== null && $dbProfileTag !== '') {
        $basicDetails['profileTag'] = $dbProfileTag;
    }
}

$payload = [
    'user'         => $user,
    'basicDetails' => $basicDetails,
];
$payload['user_id']         = $_SESSION['user_id'] ?? null;
$payload['github_connected'] = !empty($_SESSION['github_token']);
$payload['github_username']  = $_SESSION['github_username'] ?? null;

echo json_encode($payload);
exit;
