<?php

declare(strict_types=1);

require_once __DIR__
    . '/_proxy_auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');


const WORKER_URL =
    'https://uber-v3.lobanov0710.workers.dev/calculate';

const MAX_BODY_BYTES = 32768;


// =========================================
// RESPONSE
// =========================================

function sendJson(
    array $data,
    int $status
): never {

    http_response_code(
        $status
    );

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}


// =========================================
// METHOD
// =========================================

if (
    ($_SERVER['REQUEST_METHOD'] ?? '') !==
    'POST'
) {

    header(
        'Allow: POST'
    );

    sendJson(
        [
            'ok' => false,
            'error' =>
                'method not allowed'
        ],
        405
    );
}


// =========================================
// CURL
// =========================================

if (
    !function_exists(
        'curl_init'
    )
) {

    sendJson(
        [
            'ok' => false,
            'error' =>
                'server transport unavailable'
        ],
        500
    );
}


// =========================================
// INPUT SIZE
// =========================================

$contentLength =
    (int) (
        $_SERVER['CONTENT_LENGTH'] ??
        0
    );

if (
    $contentLength >
    MAX_BODY_BYTES
) {

    sendJson(
        [
            'ok' => false,
            'error' =>
                'request too large'
        ],
        413
    );
}


// =========================================
// BODY
// =========================================

$body =
    file_get_contents(
        'php://input'
    );

if (
    $body === false ||
    trim($body) === ''
) {

    sendJson(
        [
            'ok' => false,
            'error' =>
                'empty request'
        ],
        400
    );
}

if (
    strlen($body) >
    MAX_BODY_BYTES
) {

    sendJson(
        [
            'ok' => false,
            'error' =>
                'request too large'
        ],
        413
    );
}


// =========================================
// JSON VALIDATION
// =========================================

$decoded =
    json_decode(
        $body,
        true
    );

if (
    !is_array(
        $decoded
    )
) {

    sendJson(
        [
            'ok' => false,
            'error' =>
                'invalid json'
        ],
        400
    );
}


// =========================================
// PROXY AUTH
// =========================================

try {

    $proxyAuthHeaders =
        buildProxyAuthHeaders(
            '/calculate',
            $body
        );

} catch (
    Throwable $error
) {

    sendJson(
        [
            'ok' => false,
            'error' =>
                'proxy authentication unavailable'
        ],
        500
    );
}


// =========================================
// UPSTREAM
// =========================================

$ch =
    curl_init(
        WORKER_URL
    );

curl_setopt_array(
    $ch,
    [
        CURLOPT_POST =>
            true,

        CURLOPT_POSTFIELDS =>
            $body,

        CURLOPT_RETURNTRANSFER =>
            true,

        CURLOPT_FOLLOWLOCATION =>
            false,

        CURLOPT_CONNECTTIMEOUT =>
            7,

        CURLOPT_TIMEOUT =>
            25,

        CURLOPT_SSL_VERIFYPEER =>
            true,

        CURLOPT_SSL_VERIFYHOST =>
            2,

        CURLOPT_HTTPHEADER =>
            [
                'Accept: application/json',

                'Content-Type: application/json',

                'User-Agent: TransferService52-Timeweb-Proxy/1.0',

                $proxyAuthHeaders[0],

                $proxyAuthHeaders[1]
            ]
    ]
);


$response =
    curl_exec(
        $ch
    );

$curlErrno =
    curl_errno(
        $ch
    );

$status =
    (int) curl_getinfo(
        $ch,
        CURLINFO_HTTP_CODE
    );

curl_close(
    $ch
);


// =========================================
// TRANSPORT ERROR
// =========================================

if (
    $response === false
) {

    sendJson(
        [
            'ok' => false,
            'error' =>
                'upstream unavailable',

            'transportCode' =>
                $curlErrno
        ],
        502
    );
}


// =========================================
// STATUS VALIDATION
// =========================================

if (
    $status < 100 ||
    $status > 599
) {

    sendJson(
        [
            'ok' => false,
            'error' =>
                'invalid upstream response'
        ],
        502
    );
}


// =========================================
// UPSTREAM JSON CHECK
// =========================================

$upstreamJson =
    json_decode(
        $response,
        true
    );

if (
    !is_array(
        $upstreamJson
    )
) {

    sendJson(
        [
            'ok' => false,
            'error' =>
                'invalid upstream response'
        ],
        502
    );
}


// =========================================
// PASS RESPONSE THROUGH
// =========================================

http_response_code(
    $status
);

echo $response;