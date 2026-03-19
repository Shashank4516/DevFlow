<?php
/**
 * Shared PHP session initialization.
 *
 * Railway often runs frontend + backend on different domains. For `fetch(..., { credentials: "include" })`
 * to send the session cookie back to PHP, the cookie must allow cross-site usage:
 * - SameSite=None
 * - Secure=true (required by browsers when SameSite=None)
 */

if (!isset($GLOBALS['DEVFLOW_SESSION_INIT_DONE'])) {
    $GLOBALS['DEVFLOW_SESSION_INIT_DONE'] = true;

    // Best-effort detection of HTTPS behind proxies (Railway).
    $isSecure =
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower((string)$_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');

    // SameSite=None + Secure is required for cross-site cookie usage.
    $sameSite = $isSecure ? 'None' : 'Lax';

    // Use cookies only (avoid URL-based sessions).
    ini_set('session.use_only_cookies', '1');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        // Leave domain empty to default to the current host.
        'domain' => '',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => $sameSite,
    ]);
}

