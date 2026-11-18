<?php
$method = $_SERVER['REQUEST_METHOD'];

if ($endpoint === 'search-people' && $method === 'GET') {
    require_login(); 
    $q = trim($_GET['q'] ?? '');
    if (strlen($q) < 2) json_response(['ok' => true, 'results' => []]);

    $stmt = $conn->prepare("SELECT id, full_name, 'user' as type FROM users WHERE role = 'student' AND full_name LIKE ? LIMIT 5");
    $stmt->execute(["%$q%"]);
    $users = $stmt->fetchAll();

    $stmt = $conn->prepare("SELECT id, full_name, 'guest' as type FROM guest_accounts WHERE full_name LIKE ? LIMIT 5");
    $stmt->execute(["%$q%"]);
    $guests = $stmt->fetchAll();

    json_response(['ok' => true, 'results' => array_merge($users, $guests)]);
}

if ($endpoint === 'guests' && $method === 'GET') {
    require_staff();
    $stmt = $conn->query("SELECT * FROM guest_accounts WHERE status = 'pending' ORDER BY created_at DESC");
    json_response(['ok' => true, 'guests' => $stmt->fetchAll()]);
}

if ($endpoint === 'guests' && $method === 'POST') {
    require_staff();
    $data = input_json();
    $guestId = (int)$data['guest_id'];
    $status = $data['status'];

    $conn->prepare("UPDATE guest_accounts SET status=? WHERE id=?")->execute([$status, $guestId]);
    $conn->prepare("DELETE FROM notifications WHERE action_type = 'guest' AND action_id = ?")->execute([$guestId]);
    
    json_response(['ok' => true]);
}

if ($endpoint === 'remove-guest' && $method === 'POST') {
    require_staff();
    $data = input_json();
    $conn->prepare("UPDATE guest_accounts SET status='blocked' WHERE id=?")->execute([$data['guest_id']]);
    json_response(['ok' => true]);
}

if ($endpoint === 'history' && $method === 'GET') {
    require_staff();
    $search = strtolower(trim($_GET['q'] ?? ''));
    if (!$search) json_response(['ok' => true, 'results' => []]);
    
    if ($search === 'student') {
        $stmt = $conn->query("SELECT id, full_name, 'user' as type FROM users WHERE role = 'student'");
        $users = $stmt->fetchAll();
        $guests = [];
    } elseif ($search === 'guest') {
        $stmt = $conn->query("SELECT id, full_name, 'guest' as type FROM guest_accounts");
        $guests = $stmt->fetchAll();
        $users = [];
    } else {
        $stmt = $conn->prepare("SELECT id, full_name, 'user' as type FROM users WHERE role IN ('student', 'staff') AND (full_name LIKE ? OR username LIKE ?) LIMIT 10"); 
        $stmt->execute(["%$search%", "%$search%"]);
        $users = $stmt->fetchAll();
        
        $stmt = $conn->prepare("SELECT id, full_name, 'guest' as type FROM guest_accounts WHERE full_name LIKE ? OR valid_id LIKE ? LIMIT 10"); 
        $stmt->execute(["%$search%", "%$search%"]);
        $guests = $stmt->fetchAll();
    }
    
    json_response(['ok' => true, 'results' => array_merge($users, $guests)]);
}

if ($endpoint === 'history' && $method === 'POST') {
    require_staff();
    $data = input_json(); 
    $type = $data['type']; 
    $id = (int)$data['id'];
    
    if ($type === 'guest') { 
        $iCol = 'guest_id'; $vCol = 'guest_id'; $pCol = 'guest_id'; $loCol = 'guest_id'; $loOwner = 'owner_guest_id'; 
        // ADDED id_photo_path here
        $stmt = $conn->prepare("SELECT full_name, valid_id as username, email, phone, id_photo_path, status, created_at, 'Guest' as role, NULL as profile_pic FROM guest_accounts WHERE id = ?"); 
    } else { 
        $iCol = 'reporter_id'; $vCol = 'user_id'; $pCol = 'user_id'; $loCol = 'reporter_id'; $loOwner = 'owner_id'; 
        // ADDED profile_pic here
        $stmt = $conn->prepare("SELECT full_name, username, email, phone, profile_pic, role, status, created_at FROM users WHERE id = ?"); 
    }
    
    $stmt->execute([$id]); 
    $profile = $stmt->fetch();
    if (!$profile) json_response(['ok' => false, 'message' => 'User not found.'], 404);
    
    $stmt = $conn->prepare("SELECT v.*, u.full_name AS staff_name FROM violations v JOIN users u ON u.id = v.issued_by WHERE v.$vCol = ? ORDER BY v.created_at DESC"); 
    $stmt->execute([$id]); 
    $violations = $stmt->fetchAll();
    
    $stmt = $conn->prepare("SELECT DISTINCT i.*, IF(i.$iCol = ?, 'Reporter', ip.role) AS involvement FROM incidents i LEFT JOIN incident_parties ip ON ip.incident_id = i.id AND ip.$pCol = ? WHERE i.$iCol = ? OR ip.id IS NOT NULL ORDER BY i.created_at DESC"); 
    $stmt->execute([$id, $id, $id]); 
    $incidents = $stmt->fetchAll();
    
    $stmt = $conn->prepare("SELECT DISTINCT lp.*, IF(lp.$loCol = ?, 'Reported', 'Owned') AS involvement FROM lost_property lp WHERE lp.$loCol = ? OR lp.$loOwner = ? ORDER BY lp.created_at DESC"); 
    $stmt->execute([$id, $id, $id]); 
    $lost = $stmt->fetchAll();
    
    json_response(['ok' => true, 'profile' => $profile, 'incidents' => $incidents, 'lost' => $lost, 'violations' => $violations]);
}

if ($endpoint === 'violations' && $method === 'POST') {
    $staff = require_staff();
    $data = input_json(); 
    $type = $data['type']; 
    $id = (int)$data['id']; 
    $vType = $data['violation_type']; 
    $desc = trim($data['description']);

    if (!$id || !$desc) json_response(['ok' => false, 'message' => 'Invalid violation data.'], 422);

    $col = $type === 'guest' ? 'guest_id' : 'user_id';
    $conn->prepare("INSERT INTO violations ($col, issued_by, violation_type, description) VALUES (?,?,?,?)")->execute([$id, $staff['id'], $vType, $desc]);
    
    // GET THE NEW VIOLATION ID
    $violationId = $conn->lastInsertId();

    $count = $conn->prepare("SELECT COUNT(*) FROM violations WHERE $col = ?"); 
    $count->execute([$id]);
    $total = (int)$count->fetchColumn();
    
    $msg = "WARNING: You have received a $vType. Please be reminded that accumulating 3 strikes will result in an automatic block.";
    if ($total == 2) $msg = "FINAL WARNING: You now have 2 strikes. 1 more strike will result in an automatic block. Please report to the SAO immediately.";
    if ($total >= 3) $msg = "CRITICAL: You have reached 3 strikes. Your account has been flagged for blocking. Please report to the SAO immediately.";

    // SAVE THE VIOLATION ID IN action_id
    if ($type === 'guest') $conn->prepare("INSERT INTO notifications (guest_id, message, action_type, action_id) VALUES (?, ?, 'strike', ?)")->execute([$id, $msg, $violationId]);
    else $conn->prepare("INSERT INTO notifications (user_id, message, action_type, action_id) VALUES (?, ?, 'strike', ?)")->execute([$id, $msg, $violationId]);
    
    json_response(['ok' => true, 'message' => 'Violation recorded successfully.']);
}

// ADD THIS NEW ENDPOINT BLOCK
if ($endpoint === 'get-violation' && $method === 'GET') {
    $user = require_login();
    $id = (int)($_GET['id'] ?? 0);
    $col = $user['role'] === 'guest' ? 'guest_id' : 'user_id';
    $userId = $user['role'] === 'guest' ? $user['guest_id'] : $user['id'];
    
    // Ensure the user can only fetch their own violations
    $stmt = $conn->prepare("SELECT v.*, u.full_name as staff_name FROM violations v JOIN users u ON u.id = v.issued_by WHERE v.id = ? AND v.$col = ?");
    $stmt->execute([$id, $userId]);
    $violation = $stmt->fetch();
    
    if (!$violation) json_response(['ok' => false, 'message' => 'Record not found.'], 404);
    json_response(['ok' => true, 'violation' => $violation]);
}

if ($endpoint === 'analytics' && $method === 'GET') {
    require_staff();
    $totalIncidents = $conn->query("SELECT COUNT(*) FROM incidents WHERE status <> 'rejected'")->fetchColumn();
    $totalLost = $conn->query("SELECT COUNT(*) FROM lost_property")->fetchColumn();
    $totalGuests = $conn->query("SELECT COUNT(*) FROM guest_accounts WHERE status = 'verified'")->fetchColumn();
    
    $catStmt = $conn->query("SELECT category, COUNT(*) as count FROM incidents WHERE status <> 'rejected' GROUP BY category ORDER BY count DESC");
    
    json_response([
        'ok' => true, 
        'totalIncidents' => $totalIncidents, 
        'totalLost' => $totalLost, 
        'totalGuests' => $totalGuests, 
        'categories' => $catStmt->fetchAll()
    ]);
}