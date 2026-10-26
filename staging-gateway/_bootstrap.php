<?php
declare(strict_types=1);

// Isolated staging gateway. This file is never part of the production API.

const STAGING_UPSTREAM = 'https://uber-v3-staging.lobanov0710.workers.dev';

function stagingSecret(string $variable): string
{
    $path = getenv($variable);
    if (!is_string($path) || $path === '' || $path[0] !== '/') {
        throw new RuntimeException('missing staging configuration');
    }
    $resolved = realpath($path);
    $root = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''));
    if ($resolved === false || !is_file($resolved) || !is_readable($resolved)) {
        throw new RuntimeException('unavailable staging secret');
    }
    if ($root !== false && ($resolved === $root ||
        str_starts_with($resolved, $root . DIRECTORY_SEPARATOR))) {
        throw new RuntimeException('staging secret inside document root');
    }
    $secret = file_get_contents($resolved);
    if (!is_string($secret) || strlen(trim($secret)) < 32) {
        throw new RuntimeException('invalid staging secret');
    }
    return trim($secret);
}

function stagingSignature(string $secret, string $timestamp, string $path, string $body): string
{
    return hash_hmac('sha256', $timestamp . "\n" . $path . "\n" . $body, $secret);
}

function stagingError(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

function stagingProxy(string $path, int $limit): never
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        stagingError(405, 'method not allowed');
    }

    try {
        $access = stagingSecret('TS_STAGING_TESTER_TOKEN_FILE');
        $hmac = stagingSecret('TS_STAGING_HMAC_SECRET_FILE');
    } catch (Throwable $exception) {
        stagingError(503, 'staging unavailable');
    }

    if (!hash_equals($access, (string) ($_SERVER['HTTP_X_STAGING_ACCESS_TOKEN'] ?? ''))) {
        stagingError(403, 'forbidden');
    }

    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > $limit) {
        stagingError(413, 'request too large');
    }
    $body = file_get_contents('php://input');
    if (!is_string($body) || trim($body) === '') {
        stagingError(400, 'empty request');
    }
    if (strlen($body) > $limit) {
        stagingError(413, 'request too large');
    }
    $json = json_decode($body, true);
    if (!is_array($json) || array_is_list($json)) {
        stagingError(400, 'invalid json object');
    }
    if (!function_exists('curl_init')) {
        stagingError(503, 'transport unavailable');
    }

    $timestamp = (string) time();
    $signature = stagingSignature($hmac, $timestamp, $path, $body);
    $curl = curl_init(STAGING_UPSTREAM . $path);
    if ($curl === false) {
        stagingError(502, 'upstream unavailable');
    }
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 7,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/json; charset=utf-8',
            'X-Proxy-Timestamp: ' . $timestamp,
            'X-Proxy-Signature: ' . $signature,
        ],
    ]);

    $response = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if (!is_string($response) || $status < 100 || $status > 599 ||
        !is_array(json_decode($response, true))) {
        stagingError(502, 'invalid upstream response');
    }
    http_response_code($status);
    echo $response;
    exit;
}
