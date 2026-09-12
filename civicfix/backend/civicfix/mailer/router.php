<?php

declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($path === '/send.php') {
    require __DIR__ . '/send.php';
    return;
}

http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'Not found']);
