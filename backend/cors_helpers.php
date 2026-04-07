<?php
/**
 * Shared CORS for React (Vite) + PHP session cookies.
 * Allows the configured frontend_base_url and any localhost / 127.0.0.1 / ::1 dev origin.
 */
declare(strict_types=1);

/**
 * Send Access-Control-Allow-Origin for the browser request when allowed.
 *
 * @return bool True if an Allow-Origin header was sent.
 */
function devflow_cors_set_allow_origin(array $config): bool
{
    $frontendBase = rtrim((string) ($config['frontend_base_url'] ?? ''), '/');
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? trim((string) $_SERVER['HTTP_ORIGIN']) : '';
    if ($origin === '') {
        return false;
    }

    $originNorm = rtrim($origin, '/');
    if ($frontendBase !== '' && $originNorm === $frontendBase) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        return true;
    }

    $fb = parse_url($frontendBase !== '' ? $frontendBase : 'http://localhost');
    $og = parse_url($originNorm);
    $bh = strtolower((string) ($fb['host'] ?? ''));
    $oh = strtolower((string) ($og['host'] ?? ''));
    $loopbacks = ['localhost', '127.0.0.1', '::1'];
    $fromConfig = in_array($bh, $loopbacks, true);
    $fromRequest = in_array($oh, $loopbacks, true);
    if ($fromConfig && $fromRequest) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        return true;
    }

    return false;
}
