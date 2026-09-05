<?php

declare(strict_types=1);


// =========================================
// PRIVATE SECRET
// =========================================

function getProxyHmacSecret(): string
{
    $secretPath =
        dirname(__DIR__, 2)
        . DIRECTORY_SEPARATOR
        . 'transfer-private'
        . DIRECTORY_SEPARATOR
        . 'proxy-hmac-secret.txt';

    if (
        !is_file($secretPath) ||
        !is_readable($secretPath)
    ) {
        throw new RuntimeException(
            'proxy secret unavailable'
        );
    }

    $secret =
        file_get_contents(
            $secretPath
        );

    if ($secret === false) {
        throw new RuntimeException(
            'proxy secret unavailable'
        );
    }

    $secret =
        trim($secret);

    if (
        strlen($secret) < 32
    ) {
        throw new RuntimeException(
            'invalid proxy secret'
        );
    }

    return $secret;
}


// =========================================
// HMAC HEADERS
// =========================================

function buildProxyAuthHeaders(
    string $path,
    string $body
): array {

    $timestamp =
        (string) time();

    $canonical =
        $timestamp
        . "\n"
        . $path
        . "\n"
        . $body;

    $signature =
        hash_hmac(
            'sha256',
            $canonical,
            getProxyHmacSecret()
        );

    return [
        'X-Proxy-Timestamp: '
            . $timestamp,

        'X-Proxy-Signature: '
            . $signature
    ];
}