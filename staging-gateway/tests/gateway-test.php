<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
function check(bool $ok, string $message): void {
    if (!$ok) { throw new RuntimeException($message); }
}
$secret = str_repeat('s', 48);
$body = '{"from":"test"}';
$stamp = '1793000000';
check(
    stagingSignature($secret, $stamp, '/calculate', $body) ===
    hash_hmac('sha256', $stamp . "\n/calculate\n" . $body, $secret),
    'HMAC canonical string'
);
check(stagingSignature($secret, $stamp, '/orders', $body) !==
    stagingSignature($secret, $stamp, '/calculate', $body), 'HMAC path binding');
putenv('TS_STAGING_TESTER_TOKEN_FILE');
$rejected = false;
try { stagingSecret('TS_STAGING_TESTER_TOKEN_FILE'); }
catch (RuntimeException $e) { $rejected = true; }
check($rejected, 'missing configuration must fail closed');
$temp = tempnam(sys_get_temp_dir(), 'tss');
check(is_string($temp), 'temp file');
try {
    file_put_contents($temp, $secret);
    $_SERVER['DOCUMENT_ROOT'] = dirname(__DIR__);
    putenv('TS_STAGING_TESTER_TOKEN_FILE=' . $temp);
    check(stagingSecret('TS_STAGING_TESTER_TOKEN_FILE') === $secret, 'secret read');
    $_SERVER['DOCUMENT_ROOT'] = dirname($temp);
    $rejected = false;
    try { stagingSecret('TS_STAGING_TESTER_TOKEN_FILE'); }
    catch (RuntimeException $e) { $rejected = true; }
    check($rejected, 'document-root secret rejected');
} finally {
    unlink($temp);
    putenv('TS_STAGING_TESTER_TOKEN_FILE');
}
echo "STAGING GATEWAY TESTS PASSED\n";
