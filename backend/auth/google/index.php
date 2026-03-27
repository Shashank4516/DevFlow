<?php
/**
 * Start Google OAuth: redirect user to Google consent screen.
 * Request: GET /auth/google/
 */
require dirname(__DIR__, 2) . '/session_init.php';
session_start();

$config = require dirname(__DIR__, 2) . '/config.php';
$clientId = $config['google_client_id'];
$backendBase = rtrim($config['backend_base_url'], '/');

// Build callback base from the current request first, then fall back to config.
if (isset($_SERVER['HTTP_HOST'], $_SERVER['REQUEST_URI'])) {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $reqPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '';
    $basePath = preg_replace('#/auth/google/index\.php$#', '', rtrim($reqPath, '/'));
    if ($basePath === null) {
        $basePath = '';
    }
    $backendBase = $protocol . '://' . $_SERVER['HTTP_HOST'] . $basePath;
}

$redirectUri = rtrim($backendBase, '/') . '/auth/google/callback.php';

$params = [
    'client_id'     => $clientId,
    'redirect_uri'  => $redirectUri,
    'response_type' => 'code',
    'scope'         => 'openid email profile',
    'access_type'   => 'offline',
    'prompt'        => 'consent',
];
$authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);

header('Location: ' . $authUrl);
exit;
