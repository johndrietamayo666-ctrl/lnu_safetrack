<?php
session_start();
require_once __DIR__ . '/helpers.php';

$path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts = array_values(array_filter(explode('/', $path)));
$apiPos = array_search('api', $parts);
$endpoint = '';

if ($apiPos !== false) {
    $next = $parts[$apiPos + 1] ?? '';
    if ($next === 'index.php') $endpoint = $parts[$apiPos + 2] ?? '';
    else $endpoint = $next;
}

$routes = [
    'session' => 'session.php', 'login' => 'auth.php', 'logout' => 'auth.php',
    'guest-register' => 'auth.php', 'guest-login' => 'auth.php', 'change-password' => 'auth.php',
    'update-profile' => 'auth.php',
    'incidents' => 'incidents.php', 'review' => 'incidents.php', 'remove-incident' => 'incidents.php', 'tag-party' => 'incidents.php',
    'lost-property' => 'lost.php', 'update-lost-status' => 'lost.php', 'tag-lost-owner' => 'lost.php',
    'review-lost' => 'lost.php',
    'staff-list' => 'messages.php', 'message' => 'messages.php', 'my-messages' => 'messages.php',
    'messages' => 'messages.php', 'mark-read' => 'messages.php', 'message-reply' => 'messages.php',
    'archive-thread' => 'messages.php', // NEW ROUTE
    'guests' => 'staff.php', 'remove-guest' => 'staff.php',
    'violations' => 'staff.php', 'history' => 'staff.php', 'analytics' => 'staff.php',
    'get-violation' => 'staff.php',
    'search-people' => 'staff.php',
    'admin-users' => 'admin.php',
    'notifications' => 'notifications.php', 
    'read-notifications' => 'notifications.php',
    'clear-all-notifications' => 'notifications.php',
    'mark-single-read' => 'notifications.php',
    'update-incident-status' => 'incidents.php',
    'dismiss-notification' => 'notifications.php'
    
    
];

if (!isset($routes[$endpoint])) json_response(['ok' => false, 'message' => 'Invalid API endpoint.'], 404);

$handlerFile = __DIR__ . '/handlers/' . $routes[$endpoint];
if (!file_exists($handlerFile)) json_response(['ok' => false, 'message' => 'Handler not implemented.'], 501);

require $handlerFile;