<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/_bootstrap.php';
function check(bool $ok, string $message): void {
    if (!$ok) { throw new RuntimeException($message); }
}
// Пустой JSON-объект допустим; пустой массив и некорректный JSON запрещены.
check(stagingIsJsonObject('{}'), 'empty JSON object accepted');
check(stagingIsJsonObject('{"probe":"ok"}'), 'nonempty JSON object accepted');
check(stagingIsJsonObject('{"items":[]}'), 'nested array in object accepted');
check(!stagingIsJsonObject('[]'), 'empty JSON array rejected');
check(!stagingIsJsonObject('[1,2]'), 'JSON array rejected');
check(!stagingIsJsonObject('null'), 'JSON null rejected');
check(!stagingIsJsonObject('{"'), 'invalid JSON rejected');
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
// На Timeweb переменные окружения необязательны: секрет читается из private/.
putenv('TS_STAGING_TESTER_TOKEN_FILE');
$privateDir = dirname(__DIR__) . '/private';
$defaultFile = $privateDir . '/staging-access.key';
if (!is_file($defaultFile)) {
    $createdDir = !is_dir($privateDir);
    if ($createdDir) {
        check(mkdir($privateDir, 0700), 'create private fixture directory');
    }
    try {
        check(file_put_contents($defaultFile, $secret) === strlen($secret),
            'write default secret fixture');
        $_SERVER['DOCUMENT_ROOT'] = dirname(__DIR__) . '/public';
        check(stagingSecret('TS_STAGING_TESTER_TOKEN_FILE') === $secret,
            'Timeweb private default path');
    } finally {
        @unlink($defaultFile);
        if ($createdDir) { @rmdir($privateDir); }
    }
    $rejected = false;
    try { stagingSecret('TS_STAGING_TESTER_TOKEN_FILE'); }
    catch (RuntimeException $e) { $rejected = true; }
    check($rejected, 'missing default file must fail closed');
}
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
