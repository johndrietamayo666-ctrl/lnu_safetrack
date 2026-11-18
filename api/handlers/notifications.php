<?php
$method = $_SERVER['REQUEST_METHOD'];
$user = require_login();

if ($endpoint === 'notifications' && $method === 'GET') {
    $col = $user['role'] === 'guest' ? 'guest_id' : 'user_id';
    $id = $user['role'] === 'guest' ? $user['guest_id'] : $user['id'];
    
    // CHANGED: Now sorted purely by newest first, regardless of severity
    $stmt = $conn->prepare("
        SELECT n.*, COALESCE(n.severity, i.severity, 'minor') AS severity 
        FROM notifications n
        LEFT JOIN incidents i ON n.action_type = 'incident' AND n.action_id = i.id
        WHERE n.$col = ? 
        ORDER BY n.created_at DESC 
        LIMIT 30
    ");
    $stmt->execute([$id]);
    $notifs = $stmt->fetchAll();
    
    $unread = 0;
    foreach ($notifs as $n) { if (!$n['is_read']) $unread++; }
    
    json_response(['ok' => true, 'notifications' => $notifs, 'unread' => $unread]);
}

if ($endpoint === 'mark-single-read' && $method === 'POST') {
    $col = $user['role'] === 'guest' ? 'guest_id' : 'user_id';
    $id = $user['role'] === 'guest' ? $user['guest_id'] : $user['id'];
    $data = input_json();
    $notifId = (int)($data['notif_id'] ?? 0);
    
    $conn->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND $col = ?")->execute([$notifId, $id]);
    json_response(['ok' => true]);
}

if ($endpoint === 'clear-all-notifications' && $method === 'POST') {
    $col = $user['role'] === 'guest' ? 'guest_id' : 'user_id';
    $id = $user['role'] === 'guest' ? $user['guest_id'] : $user['id'];
    
    $conn->prepare("DELETE FROM notifications WHERE $col = ?")->execute([$id]);
    json_response(['ok' => true]);
}

if ($endpoint === 'dismiss-notification' && $method === 'POST') {
    $col = $user['role'] === 'guest' ? 'guest_id' : 'user_id';
    $id = $user['role'] === 'guest' ? $user['guest_id'] : $user['id'];
    $data = input_json();
    $notifId = (int)($data['notif_id'] ?? 0);
    
    $conn->prepare("DELETE FROM notifications WHERE id = ? AND $col = ?")->execute([$notifId, $id]);
    json_response(['ok' => true]);
}