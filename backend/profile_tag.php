<?php
/**
 * Discord-style immutable profile tag: slug + # + 4 digits (e.g. shashank#0412).
 * Stored in users.profile_tag (UNIQUE).
 */

function devflow_profile_tag_slug(string $name): string
{
    $s = strtolower(preg_replace('/[^a-z0-9]+/i', '', $name));
    if ($s === '') {
        $s = 'user';
    }
    if (strlen($s) > 20) {
        $s = substr($s, 0, 20);
    }
    return $s;
}

/**
 * Pick a profile_tag not yet present in users.profile_tag.
 */
function devflow_generate_unique_profile_tag(mysqli $conn, string $displayName): string
{
    $slug = devflow_profile_tag_slug($displayName);
    for ($attempt = 0; $attempt < 120; $attempt++) {
        $disc = sprintf('%04d', random_int(0, 9999));
        $tag = $slug . '#' . $disc;
        $chk = mysqli_prepare($conn, 'SELECT id FROM users WHERE profile_tag = ? LIMIT 1');
        if (!$chk) {
            break;
        }
        mysqli_stmt_bind_param($chk, 's', $tag);
        mysqli_stmt_execute($chk);
        $res = mysqli_stmt_get_result($chk);
        $exists = $res && mysqli_fetch_assoc($res);
        mysqli_stmt_close($chk);
        if (!$exists) {
            return $tag;
        }
    }
    return $slug . '#' . substr(bin2hex(random_bytes(4)), 0, 8);
}

/**
 * If user has no profile_tag yet, assign one (idempotent).
 */
function devflow_ensure_user_profile_tag(mysqli $conn, int $userId, string $displayName): void
{
    if ($userId <= 0) {
        return;
    }
    $col = @mysqli_query($conn, "SHOW COLUMNS FROM users LIKE 'profile_tag'");
    if (!$col || mysqli_num_rows($col) === 0) {
        if ($col) {
            mysqli_free_result($col);
        }
        return;
    }
    mysqli_free_result($col);

    $stmt = mysqli_prepare($conn, 'SELECT profile_tag FROM users WHERE id = ? LIMIT 1');
    if (!$stmt) {
        return;
    }
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);
    $row = $res ? mysqli_fetch_assoc($res) : null;
    mysqli_stmt_close($stmt);
    if ($row && !empty($row['profile_tag'])) {
        return;
    }

    $tag = devflow_generate_unique_profile_tag($conn, $displayName !== '' ? $displayName : 'user');
    $upd = mysqli_prepare($conn, 'UPDATE users SET profile_tag = ? WHERE id = ?');
    if ($upd) {
        mysqli_stmt_bind_param($upd, 'si', $tag, $userId);
        mysqli_stmt_execute($upd);
        mysqli_stmt_close($upd);
    }
}
