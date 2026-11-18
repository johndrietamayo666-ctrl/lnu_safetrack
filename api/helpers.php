<?php
require_once __DIR__ . '/connection.php';

function json_response(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function input_json(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function require_login(): array {
    if (empty($_SESSION['user'])) json_response(['ok' => false, 'message' => 'Please log in first.'], 401);
    return $_SESSION['user'];
}

function require_staff(): array {
    $u = require_login();
    if (!in_array($u['role'], ['staff', 'admin'], true)) json_response(['ok' => false, 'message' => 'Staff access required.'], 403);
    return $u;
}

function is_inside_campus($lat, $lng) {
    $polygon = LNU_CAMPUS_POLYGON;
    $inside = false;
    $n = count($polygon);
    for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
        $xi = $polygon[$i][1]; $yi = $polygon[$i][0];
        $xj = $polygon[$j][1]; $yj = $polygon[$j][0];
        $intersect = (($yi > $lat) != ($yj > $lat)) && ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi);
        if ($intersect) $inside = !$inside;
    }
    return $inside;
}

function haversine_distance($lat1, $lon1, $lat2, $lon2) {
    $earth_radius = 6371000; // meters
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2) * sin($dLon/2);
    $c = 2 * atan2(sqrt($a), sqrt(1-$a));
    return $earth_radius * $c;
}