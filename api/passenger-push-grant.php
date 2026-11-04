<?php

declare(strict_types=1);

require_once __DIR__ . '/_passenger_push_proxy_auth.php';
require_once __DIR__ . '/_passenger_push_grant_validation.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// PUSH-01B only issues a short-lived, order-scoped grant.
// It does NOT register FCM tokens, modify orders or send notifications.
// Endpoint is disabled until the owner explicitly enables it via a file
// OUTSIDE public_html and Worker PASSENGER_PUSH_API_ENABLED=true.

const PASSENGER_PUSH_WORKER_URL =
    'https://uber-v3.lobanov0710.workers.dev/passenger/push-grant';
const PASSENGER_PUSH_WORKER_PATH = '/passenger/push-grant';
const MAX_BODY_BYTES = 8192;

function pushGrantReply(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(
        ['ok' => false, 'error' => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    pushGrantReply(405, 'method not allowed');
}

// Fail closed on every environment unless an out-of-web-root file is
// deliberately provisioned with exactly the text "enabled".
$enablePath = dirname(__DIR__, 2)
    . DIRECTORY_SEPARATOR . 'transfer-private'
    . DIRECTORY_SEPARATOR . 'passenger-push-gateway-enabled.flag';
if (!is_file($enablePath)
    || !is_readable($enablePath)
    || trim((string) file_get_contents($enablePath)) !== 'enabled') {
    pushGrantReply(503, 'passenger push unavailable');
}

if (!function_exists('curl_init')) {
    pushGrantReply(500, 'server transport unavailable');
}

$contentLength = filter_var(
    $_SERVER['CONTENT_LENGTH'] ?? '0',
    FILTER_VALIDATE_INT
);
if ($contentLength === false || $contentLength < 0
    || $contentLength > MAX_BODY_BYTES) {
    pushGrantReply(413, 'request too large');
}

$body = file_get_contents('php://input');
if (!is_string($body) || trim($body) === '') {
    pushGrantReply(400, 'empty request');
}
if (strlen($body) > MAX_BODY_BYTES) {
    pushGrantReply(413, 'request too large');
}

$payload = json_decode($body, true);
if (!is_array($payload) || array_is_list($payload)) {
    pushGrantReply(400, 'invalid json');
}
if (!isValidPassengerPushGrantPayload($payload)) {
    pushGrantReply(400, 'invalid push grant request');
}

// Sign the EXACT raw body with the exact upstream path. Never forward
// a browser-supplied HMAC header and never include the token in the URL.
try {
    $proxyHeaders = buildPassengerPushAuthHeaders('POST', PASSENGER_PUSH_WORKER_PATH, $body);
} catch (Throwable $error) {
    pushGrantReply(500, 'proxy authentication unavailable');
}

$connection = curl_init(PASSENGER_PUSH_WORKER_URL);
if ($connection === false) {
    pushGrantReply(500, 'server transport unavailable');
}

curl_setopt_array($connection, [
    CURLOPT_POST => true,
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
        'User-Agent: TransferServis52-PassengerPushGrant/1.0',
        $proxyHeaders[0],
        $proxyHeaders[1],
        $proxyHeaders[2],
    ],
]);

$response = curl_exec($connection);
$upstreamStatus = (int) curl_getinfo($connection, CURLINFO_HTTP_CODE);
curl_close($connection);

if (!is_string($response) || $upstreamStatus < 100
    || $upstreamStatus > 599) {
    pushGrantReply(502, 'upstream unavailable');
}
$upstreamBody = json_decode($response, true);
if (!is_array($upstreamBody) || !array_key_exists('ok', $upstreamBody)) {
    pushGrantReply(502, 'invalid upstream response');
}

http_response_code($upstreamStatus);
echo $response;
