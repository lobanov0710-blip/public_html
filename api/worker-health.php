<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$upstream =
    'https://uber-v3.lobanov0710.workers.dev/';

if (!function_exists('curl_init')) {

    http_response_code(500);

    echo json_encode(
        [
            'ok' => false,
            'stage' => 'php',
            'error' => 'PHP cURL extension is unavailable'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

$ch = curl_init($upstream);

curl_setopt_array(
    $ch,
    [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,

        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,

        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,

        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: TransferService52-Timeweb-Proxy/1.0'
        ]
    ]
);

$body =
    curl_exec($ch);

$curlError =
    curl_error($ch);

$curlErrno =
    curl_errno($ch);

$status =
    (int) curl_getinfo(
        $ch,
        CURLINFO_HTTP_CODE
    );

curl_close($ch);

if ($body === false) {

    http_response_code(502);

    echo json_encode(
        [
            'ok' => false,
            'stage' => 'upstream',
            'curlErrno' => $curlErrno,
            'error' => $curlError
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

http_response_code(
    $status >= 100
        ? $status
        : 502
);

echo $body;