<?php
/**
 * Return current logged-in user (from session) for the React app.
 * Request: GET /auth/me.php
 * Response: JSON { user, basicDetails } or 401.
 */
session_start();

header('Content-Type: application/json');

$config = require dirname(__DIR__) . '/config.php';
$frontendBase = rtrim($config['frontend_base_url'], '/');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($origin === $frontendBase) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
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
$basicDetails = isset($_SESSION['basic_details']) ? $_SESSION['basic_details'] : [
    'firstName' => $user['firstName'] ?? '',
    'lastName'  => $user['lastName'] ?? '',
    'fullName'  => $user['displayName'] ?? '',
    'profile'   => $user['profileImage'] ?? $user['photoURL'] ?? '',
    'email'     => $user['email'] ?? '',
    'location'  => '',
];

$payload = [
    'user'         => $user,
    'basicDetails' => $basicDetails,
];
$payload['user_id']         = $_SESSION['user_id'] ?? null;
$payload['github_connected'] = !empty($_SESSION['github_token']);
$payload['github_username']  = $_SESSION['github_username'] ?? null;

echo json_encode($payload);
exit;
