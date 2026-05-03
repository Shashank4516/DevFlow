<?php
/**
 * Shared GitHub REST helpers (user OAuth token in session).
 */
declare(strict_types=1);

/**
 * @return array{code:int, body:string, json:mixed}
 */
function devflow_github_get(string $token, string $url): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: token ' . $token,
            'Accept: application/vnd.github+json',
            'User-Agent: DevFlow-App',
        ],
    ]);
    $raw = (string) curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = json_decode($raw, true);

    return ['code' => $code, 'body' => $raw, 'json' => $json];
}
