<?php
/**
 * Shared task JSON helpers (assignee display).
 */
declare(strict_types=1);

/**
 * @return array{user_id:int, name:string, firstName:string, lastName:string, profileImage:string, initials:string}|null
 */
function task_assignee_from_user_row(?array $row): ?array
{
    if ($row === null || empty($row['assignee_user_id'])) {
        return null;
    }
    $uid = (int) $row['assignee_user_id'];
    if ($uid <= 0) {
        return null;
    }
    $full = trim((string) ($row['assignee_name'] ?? ''));
    $parts = preg_split('/\s+/', $full) ?: [];
    $first = $parts[0] ?? $full;
    $last = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '';
    $initials = strtoupper(mb_substr($first, 0, 1) . mb_substr($last, 0, 1));
    if ($initials === '' || mb_strlen($initials) < 2) {
        $initials = strtoupper(mb_substr($full, 0, 2));
    }
    return [
        'user_id'      => $uid,
        'name'         => $full,
        'firstName'    => $first,
        'lastName'     => $last,
        'profileImage' => (string) ($row['assignee_profile_image'] ?? ''),
        'initials'     => $initials,
    ];
}
