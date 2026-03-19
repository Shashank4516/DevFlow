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
$redirectUri = $backendBase . '/auth/google/callback.php';

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
