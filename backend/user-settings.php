<?php
/**
 * GET /user-settings.php
 * Returns the current user's settings (basicDetails, status, theme, privacy, security).
 * Used by the Admin React app when the real PHP backend is active.
 */
require __DIR__ . '/session_init.php';
session_start();

header('Content-Type: application/json');

$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/cors_helpers.php';
devflow_cors_set_allow_origin($config);
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (empty($_SESSION['logged_in'])) {
    http_response_code(401);
    echo json_encode(['error' => 'not_authenticated']);
    exit;
}

// Hydrate profile image from DB if available
$dbProfileImage = null;
$dbCoverImage   = null;
if (!empty($_SESSION['user_id'])) {
    $meId = (int) $_SESSION['user_id'];
    if ($meId > 0) {
        require_once __DIR__ . '/db.php';

        $hasCover = false;
        $colsRes = mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'cover_image'");
        if ($colsRes) {
            $hasCover = mysqli_num_rows($colsRes) > 0;
            mysqli_free_result($colsRes);
        }

        $sql = $hasCover
            ? "SELECT profile_image, cover_image FROM users WHERE id = ? LIMIT 1"
            : "SELECT profile_image, NULL AS cover_image FROM users WHERE id = ? LIMIT 1";
        $stmt = mysqli_prepare($conn, $sql);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, 'i', $meId);
            mysqli_stmt_execute($stmt);
            $res = mysqli_stmt_get_result($stmt);
            if ($res && ($row = mysqli_fetch_assoc($res))) {
                $dbProfileImage = $row['profile_image'] ?? null;
                $dbCoverImage   = $row['cover_image'] ?? null;
            }
            mysqli_stmt_close($stmt);
        }
    }
}

$user = $_SESSION['auth_user'] ?? [];
$savedBasic = $_SESSION['basic_details'] ?? [];

$basicDetails = [
    'firstName'  => $savedBasic['firstName']  ?? $user['firstName']  ?? '',
    'lastName'   => $savedBasic['lastName']   ?? $user['lastName']   ?? '',
    'fullName'   => $savedBasic['fullName']   ?? $user['displayName'] ?? '',
    'profile'    => $dbProfileImage ?? $savedBasic['profile']    ?? $user['profileImage'] ?? $user['photoURL'] ?? '',
    'coverImage' => $dbCoverImage   ?? $savedBasic['coverImage'] ?? '',
    'email'      => $savedBasic['email']      ?? $user['email']      ?? '',
    'location'   => $savedBasic['location']   ?? '',
];

$savedSettings = isset($_SESSION['user_settings']) ? $_SESSION['user_settings'] : [];

$response = [
    'basicDetails' => $basicDetails,
    'status'       => $savedSettings['status']  ?? 'Active',
    'theme'        => $savedSettings['theme']   ?? ['image' => 'bgimg-radio5'],
    'privacy'      => $savedSettings['privacy'] ?? [
        'displayprofilePhoto' => 'selected',
        'displayLastSeen'     => true,
        'displayStatus'       => 'everyone',
        'readReceipts'        => true,
        'displayGroups'       => 'everyone',
    ],
    'security'     => $savedSettings['security'] ?? ['securityNotification' => false],
];

echo json_encode($response);
exit;
