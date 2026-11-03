<?php

declare(strict_types=1);

// PUSH-01F: versioned, nonce-bound signing exclusively for passenger push.
// The existing API v1 _proxy_auth.php / buildProxyAuthHeaders remain untouched.
require_once __DIR__ . '/_proxy_auth.php';

/**
 * Sign an exact method, path, timestamp, random one-use nonce and raw body.
 * No user-supplied nonce/signature is accepted. Do not log any of these values.
 *
 * @return array<int,string> Three literal HTTP headers
 */
function buildPassengerPushAuthHeaders(
    string $method,
    string $path,
    string $body
): array {
    if (!in_array($method, ['POST', 'DELETE'], true)
        || !in_array($path, [
            '/passenger/push-grant',
            '/passenger/push-device'
        ], true)
        || ($path === '/passenger/push-grant' && $method !== 'POST')) {
        throw new InvalidArgumentException('invalid passenger push operation');
    }

    $timestamp = (string) time();
    $nonce = bin2hex(random_bytes(16)); // 128-bit unpredictable, lowercase
    $canonical = 'PASSENGER-PUSH-V2' . "\n"
        . $method . "\n"
        . $timestamp . "\n"
        . $path . "\n"
        . $nonce . "\n"
        . $body;

    $signature = hash_hmac('sha256', $canonical, getProxyHmacSecret());

    return [
        'X-Proxy-Timestamp: ' . $timestamp,
        'X-Proxy-Nonce: ' . $nonce,
        'X-Proxy-Signature: ' . $signature,
    ];
}
