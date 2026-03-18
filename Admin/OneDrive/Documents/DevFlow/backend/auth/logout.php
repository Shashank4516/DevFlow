<?php
/**
 * Log out: destroy session and redirect to frontend login.
 * Request: GET /auth/logout.php
 */
session_start();

$config = require dirname(__DIR__) . '/config.php';
$frontendBase = rtrim($config['frontend_base_url'], '/');

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();

header('Location: ' . $frontendBase . '/auth-login');
exit;
