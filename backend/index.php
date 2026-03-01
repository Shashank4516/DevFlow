<?php
/**
 * Backend root: redirect to Google OAuth start so visiting the backend URL starts login.
 * Prevents Apache directory listing when directory index is not set.
 */
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$path = rtrim($path, '/');
if (substr($path, -10) === 'index.php') {
    $path = dirname($path);
}
$path = rtrim($path, '/');
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$redirect = $protocol . '://' . $host . $path . '/auth/google/index.php';
header('Location: ' . $redirect, true, 302);
exit;
