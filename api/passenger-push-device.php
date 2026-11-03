<?php

declare(strict_types=1);

require_once __DIR__ . '/_proxy_auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// PUSH-01C: Explicitly disabled passenger device gateway.
// Never calls staff FCM, never sends a notification or modifies an order.
const PASSENGER_DEVICE_WORKER_URL =
    'https://uber-v3.lobanov0710.workers.dev/passenger/push-device';
const PASSENGER_DEVICE_WORKER_PATH = '/passenger/push-device';
const PASSENGER_DEVICE_MAX_BODY_BYTES = 8192;

function pushDeviceError(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(
        ['ok' => false, 'error' => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method !== 'POST' && $method !== 'DELETE') {
    header('Allow: POST, DELETE');
    pushDeviceError(405, 'method not allowed');
}

// Reuse the same out-of-web-root root switch as PUSH-01B, plus a SECOND
// specific enable switch for the more sensitive FCM registration endpoint.
$private = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'transfer-private';
foreach ([
    'passenger-push-gateway-enabled.flag',
    'passenger-push-device-enabled.flag'
] as $enableFile) {
    $path = $private . DIRECTORY_SEPARATOR . $enableFile;
    if (!is_file($path) || !is_readable($path)
        || trim((string) file_get_contents($path)) !== 'enabled') {
        pushDeviceError(503, 'passenger push unavailable');
    }
}

if (!function_exists('curl_init')) {
    pushDeviceError(500, 'server transport unavailable');
}
$contentLength = filter_var(
    $_SERVER['CONTENT_LENGTH'] ?? '0',
    FILTER_VALIDATE_INT
);
if ($contentLength === false || $contentLength < 0
    || $contentLength > PASSENGER_DEVICE_MAX_BODY_BYTES) {
    pushDeviceError(413, 'request too large');
}
$body = file_get_contents('php://input');
if (!is_string($body) || trim($body) === '') {
    pushDeviceError(400, 'empty request');
}
if (strlen($body) > PASSENGER_DEVICE_MAX_BODY_BYTES) {
    pushDeviceError(413, 'request too large');
}
$payload = json_decode($body, true);
if (!is_array($payload) || array_is_list($payload)) {
    pushDeviceError(400, 'invalid json');
}

$actualKeys = array_keys($payload);
sort($actualKeys);
if ($method === 'POST') {
    if ($actualKeys !== ['grantToken', 'platform', 'token']) {
        pushDeviceError(400, 'invalid push device');
    }
} elseif ($actualKeys !== ['grantToken']) {
    pushDeviceError(400, 'invalid push device');
}

$grant = $payload['grantToken'];
if (!is_string($grant) || $grant === '' || strlen($grant) > 8192) {
    pushDeviceError(400, 'invalid push device');
}
if ($method === 'POST') {
    $token = $payload['token'];
    if ($payload['platform'] !== 'android'
        || !is_string($token) || $token === ''
        || strlen($token) > 4096 || preg_match('/\s/', $token)) {
        pushDeviceError(400, 'invalid push device');
    }
}

try {
    $proxyHeaders = buildProxyAuthHeaders(PASSENGER_DEVICE_WORKER_PATH, $body);
} catch (Throwable $error) {
    pushDeviceError(500, 'proxy authentication unavailable');
}
$connection = curl_init(PASSENGER_DEVICE_WORKER_URL);
if ($connection === false) {
    pushDeviceError(500, 'server transport unavailable');
}
curl_setopt_array($connection, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 7,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Content-Type: application/json',
        'User-Agent: TransferServis52-PassengerPushDevice/1.0',
        $proxyHeaders[0],
        $proxyHeaders[1],
    ],
]);
$response = curl_exec($connection);
$upstreamStatus = (int) curl_getinfo($connection, CURLINFO_HTTP_CODE);
curl_close($connection);

if (!is_string($response) || $upstreamStatus < 100
    || $upstreamStatus > 599) {
    pushDeviceError(502, 'upstream unavailable');
}
$parsed = json_decode($response, true);
if (!is_array($parsed) || !array_key_exists('ok', $parsed)) {
    pushDeviceError(502, 'invalid upstream response');
}
http_response_code($upstreamStatus);
echo $response;
