<?php
/**
 * Search users by name (Instagram-style).
 * GET ?q=trader%20guy
 * Returns JSON array of { id, name, profile_image }.
 */
require dirname(__DIR__, 2) . '/session_init.php';
session_start();

header('Content-Type: application/json');

$config = require dirname(__DIR__, 2) . '/config.php';
$frontendBase = rtrim($config['frontend_base_url'], '/');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
if ($origin !== '') {
    $originNormalized = rtrim($origin, '/');
    $allow = ($originNormalized === $frontendBase);

    // Dev convenience: allow any localhost:* origin if configured frontend is localhost.
    $fb = parse_url($frontendBase);
    $og = parse_url($originNormalized);
    if (!$allow && ($fb['host'] ?? '') === 'localhost' && ($og['host'] ?? '') === 'localhost') {
        $allow = true;
    }

    if ($allow) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
}
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

$q = isset($_GET['q']) ? trim($_GET['q']) : '';
if (strlen($q) < 2) {
    echo json_encode([]);
    exit;
}

require_once dirname(__DIR__, 2) . '/db.php';

$term = '%' . $q . '%';
$stmt = mysqli_prepare($conn, "
    SELECT id, name, profile_image
    FROM users
    WHERE name LIKE ? OR email LIKE ?
    ORDER BY name
    LIMIT 20
");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'database_error']);
    exit;
}
mysqli_stmt_bind_param($stmt, 'ss', $term, $term);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

$profiles = [];
while ($row = mysqli_fetch_assoc($result)) {
    $profiles[] = [
        'id'             => (int) $row['id'],
        'name'           => $row['name'] ?? '',
        'profile_image'  => $row['profile_image'] ?? '',
    ];
}
mysqli_stmt_close($stmt);

echo json_encode($profiles);
