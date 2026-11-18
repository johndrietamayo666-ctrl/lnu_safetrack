<?php
if ($endpoint === 'session') {
    $u = $_SESSION['user'] ?? null;
    if ($u && $u['role'] === 'guest') {
        $stmt = $conn->prepare("SELECT status FROM guest_accounts WHERE id = ? LIMIT 1");
        $stmt->execute([(int)$u['guest_id']]);
        if ($stmt->fetchColumn() !== 'verified') { $_SESSION = []; $u = null; }
    }
    json_response(['ok' => true, 'user' => $u]);
}