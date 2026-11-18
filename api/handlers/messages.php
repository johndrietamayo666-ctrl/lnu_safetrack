<?php
$method = $_SERVER['REQUEST_METHOD'];

if ($endpoint === 'staff-list' && $method === 'GET') {
    $user = require_login();
    $isGuest = $user['role'] === 'guest';
    $col = $isGuest ? 'thread_guest_id' : 'thread_user_id';
    $ownerId = $isGuest ? (int)$user['guest_id'] : (int)$user['id'];

    $stmt = $conn->prepare("
        SELECT u.id, u.full_name, u.profile_pic,
        (SELECT message FROM messages m 
         WHERE m.thread_staff_id = u.id AND m.$col = ? 
         ORDER BY m.id DESC LIMIT 1) AS last_message
        FROM users u 
        WHERE u.role IN ('staff', 'admin') ORDER BY u.full_name
    ");
    $stmt->execute([$ownerId]);
    $staff = $stmt->fetchAll();
    
    if (in_array($user['role'], ['staff', 'admin'])) {
        $staff = array_filter($staff, fn($s) => $s['id'] != $user['id']);
    }
    
    json_response(['ok' => true, 'staff' => array_values($staff)]);
}

if ($endpoint === 'message' && $method === 'POST') {
    $user = require_login();
    $data = input_json();
    $staffId = (int)($data['staff_id'] ?? 0);
    $msg = trim($data['message'] ?? '');
    
    $attachmentPath = null;
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
        $dir = __DIR__ . '/../../uploads/chat/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $filename = 'chat_' . time() . '_' . rand(1000,9999) . '.' . strtolower(pathinfo($_FILES['attachment']['name'], PATHINFO_EXTENSION));
        if (move_uploaded_file($_FILES['attachment']['tmp_name'], $dir . $filename)) {
            $attachmentPath = 'uploads/chat/' . $filename;
        }
    }

    if (in_array($user['role'], ['staff', 'admin'])) {
        $conn->prepare("INSERT INTO messages (sender_id, recipient_staff_id, message, attachment_path, thread_user_id, thread_staff_id, from_staff) VALUES (?,?,?,?,?,?,1)")->execute([$user['id'], $staffId, $msg, $attachmentPath, $user['id'], $staffId]);
        $conn->prepare("INSERT INTO notifications (user_id, message, action_type, action_id) VALUES (?, ?, 'message', ?)")->execute([$staffId, "New staff message from {$user['full_name']}", $user['id']]);
    } else {
        $isGuest = $user['role'] === 'guest';
        $ownerId = $isGuest ? $user['guest_id'] : $user['id'];
        $conn->prepare("INSERT INTO messages (sender_id, guest_id, recipient_staff_id, message, attachment_path, thread_user_id, thread_guest_id, thread_staff_id, from_staff) VALUES (?,?,?,?,?,?,?,?,0)")->execute([$isGuest?null:$ownerId, $isGuest?$ownerId:null, $staffId, $msg, $attachmentPath, $isGuest?null:$ownerId, $isGuest?$ownerId:null, $staffId]);
        
        $actionType = $isGuest ? 'msg_guest' : 'msg_student';
        $conn->prepare("INSERT INTO notifications (user_id, message, action_type, action_id) VALUES (?, ?, ?, ?)")->execute([$staffId, "New message from {$user['full_name']}", $actionType, $ownerId]);
        
        $threadType = $isGuest ? 'guest' : 'student';
        $conn->prepare("DELETE FROM archived_threads WHERE staff_id = ? AND thread_type = ? AND thread_id = ?")->execute([$staffId, $threadType, $ownerId]);
    }
    json_response(['ok' => true]);
}

if ($endpoint === 'messages' && $method === 'GET') {
    $staff = require_staff();
    
    $stmt = $conn->prepare("
        SELECT m.*, 
               IF(tu.role IN ('staff','admin'), 'staff', IF(m.thread_guest_id IS NOT NULL, 'guest', 'student')) AS thread_type, 
               CASE 
                   WHEN tu.role IN ('staff','admin') THEN IF(m.thread_staff_id = ?, m.thread_user_id, m.thread_staff_id)
                   ELSE IF(m.thread_guest_id IS NOT NULL, m.thread_guest_id, m.thread_user_id) 
               END AS partner_id,
               CASE 
                   WHEN tu.role IN ('staff','admin') THEN 
                       IF(m.thread_staff_id = ?, (SELECT full_name FROM users WHERE id=m.thread_user_id), (SELECT full_name FROM users WHERE id=m.thread_staff_id)) 
                   ELSE 
                       COALESCE(tu.full_name, tg.full_name, 'Unknown') 
               END AS thread_name,
               COALESCE(tu.profile_pic, tg.id_photo_path) AS partner_pic,
               IF(a.id IS NULL, 0, 1) AS is_archived
        FROM messages m 
        LEFT JOIN users tu ON tu.id=m.thread_user_id 
        LEFT JOIN guest_accounts tg ON tg.id=m.thread_guest_id 
        LEFT JOIN archived_threads a ON a.staff_id = ? 
            AND a.thread_type = IF(tu.role IN ('staff','admin'), 'staff', IF(m.thread_guest_id IS NOT NULL, 'guest', 'student'))
            AND a.thread_id = 
                CASE 
                    WHEN tu.role IN ('staff','admin') THEN IF(m.thread_staff_id = ?, m.thread_user_id, m.thread_staff_id)
                    ELSE IF(m.thread_guest_id IS NOT NULL, m.thread_guest_id, m.thread_user_id) 
                END
        WHERE (m.thread_staff_id = ? OR (m.thread_user_id = ? AND tu.role IN ('staff','admin'))) 
        ORDER BY m.id ASC
    ");
    $stmt->execute([$staff['id'], $staff['id'], $staff['id'], $staff['id'], $staff['id'], $staff['id']]);
    json_response(['ok' => true, 'messages' => $stmt->fetchAll()]);
}

if ($endpoint === 'my-messages' && $method === 'GET') {
    $user = require_login();
    $staffId = (int)$_GET['staff_id'];
    $isGuest = $user['role'] === 'guest';
    $col = $isGuest ? 'thread_guest_id' : 'thread_user_id';
    $ownerId = $isGuest ? $user['guest_id'] : $user['id'];
    $stmt = $conn->prepare("SELECT * FROM messages WHERE $col = ? AND thread_staff_id = ? ORDER BY id ASC");
    $stmt->execute([$ownerId, $staffId]);
    json_response(['ok' => true, 'messages' => $stmt->fetchAll()]);
}

if ($endpoint === 'message-reply' && $method === 'POST') {
    $staff = require_staff();
    $data = input_json(); 
    $type = $data['thread_type'] ?? ''; 
    $threadId = (int)($data['thread_id'] ?? 0); 
    $msg = trim($data['message'] ?? '');
    
    $attachmentPath = null;
    if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
        $dir = __DIR__ . '/../../uploads/chat/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $filename = 'chat_' . time() . '_' . rand(1000,9999) . '.' . strtolower(pathinfo($_FILES['attachment']['name'], PATHINFO_EXTENSION));
        if (move_uploaded_file($_FILES['attachment']['tmp_name'], $dir . $filename)) {
            $attachmentPath = 'uploads/chat/' . $filename;
        }
    }

    if ($type === 'staff') {
        $conn->prepare("INSERT INTO messages (sender_id, recipient_staff_id, message, attachment_path, thread_user_id, thread_staff_id, from_staff) VALUES (?,?,?,?,?,?,1)")->execute([$staff['id'], $threadId, $msg, $attachmentPath, $threadId, $staff['id']]);
        $conn->prepare("INSERT INTO notifications (user_id, message, action_type, action_id) VALUES (?, ?, 'message', ?)")->execute([$threadId, "New message from {$staff['full_name']}", $staff['id']]);
    } else {
        $conn->prepare("INSERT INTO messages (sender_id, recipient_staff_id, message, attachment_path, thread_user_id, thread_guest_id, thread_staff_id, from_staff) VALUES (?,?,?,?,?,?,?,1)")->execute([$staff['id'], $staff['id'], $msg, $attachmentPath, $type==='student'?$threadId:null, $type==='guest'?$threadId:null, $staff['id']]);
        $col = $type === 'guest' ? 'guest_id' : 'user_id';
        $conn->prepare("INSERT INTO notifications ($col, message, action_type, action_id) VALUES (?, ?, 'message', ?)")->execute([$threadId, "New message from {$staff['full_name']}", $staff['id']]);
    }

    $conn->prepare("DELETE FROM archived_threads WHERE staff_id = ? AND thread_type = ? AND thread_id = ?")->execute([$staff['id'], $type, $threadId]);
    
    json_response(['ok' => true]);
}

if ($endpoint === 'mark-read' && $method === 'POST') {
    $user = require_login();
    $data = input_json();
    if (in_array($user['role'], ['staff', 'admin'])) {
        $type = $data['thread_type'] ?? '';
        if ($type === 'staff') $conn->prepare("UPDATE messages SET read_at=NOW() WHERE thread_user_id=? AND thread_staff_id=? AND sender_id!=? AND read_at IS NULL")->execute([$data['thread_id'], $user['id'], $user['id']]);
        else { $col = $type==='guest'?'thread_guest_id':'thread_user_id'; $conn->prepare("UPDATE messages SET read_at=NOW() WHERE $col=? AND thread_staff_id=? AND from_staff=0 AND read_at IS NULL")->execute([$data['thread_id'], $user['id']]); }
    } else {
        $isGuest = $user['role']==='guest'; $col = $isGuest?'thread_guest_id':'thread_user_id'; $ownerId = $isGuest?$user['guest_id']:$user['id'];
        $conn->prepare("UPDATE messages SET read_at=NOW() WHERE $col=? AND thread_staff_id=? AND from_staff=1 AND read_at IS NULL")->execute([$ownerId, $data['staff_id']]);
    }
    json_response(['ok' => true]);
}

if ($endpoint === 'archive-thread' && $method === 'POST') {
    $staff = require_staff();
    $data = input_json();
    $type = $data['thread_type'] ?? '';
    $id = (int)($data['thread_id'] ?? 0);

    $conn->prepare("INSERT IGNORE INTO archived_threads (staff_id, thread_type, thread_id) VALUES (?, ?, ?)")->execute([$staff['id'], $type, $id]);
    json_response(['ok' => true]);
}