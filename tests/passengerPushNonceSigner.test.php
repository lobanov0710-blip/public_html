<?php

declare(strict_types=1);

// PUSH-01F: no HTTP calls, no real credentials, no production files.
$root = sys_get_temp_dir() . '/ts52_nonce_' . bin2hex(random_bytes(8));
$api = $root . '/public_html/api';
$private = $root . '/transfer-private';
mkdir($api, 0700, true);
mkdir($private, 0700, true);
$secret = 'only-for-offline-PHP-nonce-signer-tests-64-chars-long';
file_put_contents($private . '/proxy-hmac-secret.txt', $secret);
copy(__DIR__ . '/../api/_proxy_auth.php', $api . '/_proxy_auth.php');
copy(__DIR__ . '/../api/_passenger_push_proxy_auth.php', $api . '/_passenger_push_proxy_auth.php');

try {
    require $api . '/_passenger_push_proxy_auth.php';
    $path = '/passenger/push-grant';
    $body = '{"accessToken":"TEST_ONLY","installationId":"5d98e332-05e9-4e90-a4e1-bc61c1342030"}';
    $first = buildPassengerPushAuthHeaders('POST', $path, $body);
    $second = buildPassengerPushAuthHeaders('POST', $path, $body);

    if (count($first) !== 3 || count($second) !== 3) {
        throw new RuntimeException('Expected 3 signed headers');
    }
    $parse = static function (array $headers): array {
        $result = [];
        foreach ($headers as $h) {
            $parts = explode(': ', $h, 2);
            if (count($parts) !== 2) {
                throw new RuntimeException('Invalid header');
            }
            $result[$parts[0]] = $parts[1];
        }
        return $result;
    };
    $a = $parse($first);
    $b = $parse($second);
    if (!preg_match('/^[a-f0-9]{32}$/', $a['X-Proxy-Nonce'])
        || !preg_match('/^[a-f0-9]{64}$/', $a['X-Proxy-Signature'])
        || !preg_match('/^\d{10}$/', $a['X-Proxy-Timestamp'])
        || $a['X-Proxy-Nonce'] === $b['X-Proxy-Nonce']) {
        throw new RuntimeException('Missing unpredictable per-request nonce');
    }
    $expected = hash_hmac('sha256',
        "PASSENGER-PUSH-V2\nPOST\n" . $a['X-Proxy-Timestamp']
          . "\n" . $path . "\n" . $a['X-Proxy-Nonce'] . "\n" . $body,
        $secret
    );
    if (!hash_equals($expected, $a['X-Proxy-Signature'])) {
        throw new RuntimeException('Incorrect canonical HMAC');
    }
    foreach ([['GET', $path], ['DELETE', $path], ['POST', '/orders']] as [$method, $route]) {
        try {
            buildPassengerPushAuthHeaders($method, $route, $body);
            throw new RuntimeException('Invalid operation was accepted');
        } catch (InvalidArgumentException $expectedException) {
            // Correct.
        }
    }
    $delete = $parse(buildPassengerPushAuthHeaders(
        'DELETE', '/passenger/push-device', '{"grantToken":"test"}'
    ));
    if (!preg_match('/^[a-f0-9]{32}$/', $delete['X-Proxy-Nonce'])) {
        throw new RuntimeException('DELETE must have nonce');
    }

    echo "PASSENGER_PUSH_NONCE_PHP_TEST=PASS\n";
} finally {
    unlink($private . '/proxy-hmac-secret.txt');
    unlink($api . '/_proxy_auth.php');
    unlink($api . '/_passenger_push_proxy_auth.php');
    rmdir($api);
    rmdir(dirname($api));
    rmdir($private);
    rmdir($root);
}
