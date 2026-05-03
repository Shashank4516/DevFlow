<?php
/**
 * Database-backed PHP session handler.
 *
 * Stores sessions in MySQL so they survive Railway container restarts/redeploys.
 * The `php_sessions` table is created automatically on first use.
 *
 * Usage: require_once __DIR__ . '/db_session_handler.php';
 *        db_session_register($conn);   // call before session_start()
 */

function db_session_ensure_table(mysqli $conn): void
{
    mysqli_query($conn, "
        CREATE TABLE IF NOT EXISTS php_sessions (
            session_id  VARCHAR(128)     NOT NULL PRIMARY KEY,
            data        MEDIUMTEXT       NOT NULL,
            updated_at  INT UNSIGNED     NOT NULL DEFAULT 0,
            INDEX idx_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function db_session_register(mysqli $conn): void
{
    db_session_ensure_table($conn);

    $handler = new class($conn) implements SessionHandlerInterface {
        public function __construct(private mysqli $conn) {}

        public function open(string $path, string $name): bool
        {
            return true;
        }

        public function close(): bool
        {
            return true;
        }

        public function read(string $id): string|false
        {
            $stmt = mysqli_prepare($this->conn, 'SELECT data FROM php_sessions WHERE session_id = ? LIMIT 1');
            if (!$stmt) return '';
            mysqli_stmt_bind_param($stmt, 's', $id);
            mysqli_stmt_execute($stmt);
            $res = mysqli_stmt_get_result($stmt);
            $row = $res ? mysqli_fetch_assoc($res) : null;
            mysqli_stmt_close($stmt);
            return $row ? (string) $row['data'] : '';
        }

        public function write(string $id, string $data): bool
        {
            $now = time();
            $stmt = mysqli_prepare(
                $this->conn,
                'INSERT INTO php_sessions (session_id, data, updated_at) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)'
            );
            if (!$stmt) return false;
            mysqli_stmt_bind_param($stmt, 'ssi', $id, $data, $now);
            $ok = mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
            return (bool) $ok;
        }

        public function destroy(string $id): bool
        {
            $stmt = mysqli_prepare($this->conn, 'DELETE FROM php_sessions WHERE session_id = ?');
            if (!$stmt) return false;
            mysqli_stmt_bind_param($stmt, 's', $id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
            return true;
        }

        public function gc(int $max_lifetime): int|false
        {
            $cutoff = time() - $max_lifetime;
            $stmt = mysqli_prepare($this->conn, 'DELETE FROM php_sessions WHERE updated_at < ?');
            if (!$stmt) return false;
            mysqli_stmt_bind_param($stmt, 'i', $cutoff);
            mysqli_stmt_execute($stmt);
            $affected = mysqli_stmt_affected_rows($stmt);
            mysqli_stmt_close($stmt);
            return $affected >= 0 ? $affected : false;
        }
    };

    session_set_save_handler($handler, true);
}
