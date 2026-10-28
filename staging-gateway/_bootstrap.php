<?php
declare(strict_types=1);

// Служебный обработчик staging: вне публичного каталога веб-сервера.
// Здесь находятся подпись запросов и проверка временного доступа.
// Production API не подключает этот файл.

const STAGING_UPSTREAM = 'https://uber-v3-staging.lobanov0710.workers.dev';

/**
 * Секрет читаем только из защищённого файла, путь передаёт администратор PHP-FPM.
 * Запрещаем путь внутри document root: его нельзя раскрыть через HTTP.
 */
function stagingSecret(string $variable): string
{
    // На Timeweb можно хранить секреты в соседнем с public_html каталоге
    // без настройки переменных окружения в PHP-FPM/Apache.
    // Явная переменная окружения, если задана, сохраняет приоритет.
    $defaultFiles = [
        'TS_STAGING_HMAC_SECRET_FILE' => 'staging-hmac.key',
        'TS_STAGING_TESTER_TOKEN_FILE' => 'staging-access.key',
    ];
    if (!isset($defaultFiles[$variable])) {
        throw new RuntimeException('unknown staging secret');
    }
    $configuredPath = getenv($variable);
    $path = is_string($configuredPath) && $configuredPath !== ''
        ? $configuredPath
        : __DIR__ . '/private/' . $defaultFiles[$variable];
    if ($path[0] !== '/') {
        throw new RuntimeException('invalid staging configuration');
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

/**
 * HMAC рассчитывается по ТОЧНЫМ байтам тела и пути Worker.
 * Повторное кодирование JSON после получения запроса сломало бы проверку подписи.
 */
function stagingSignature(string $secret, string $timestamp, string $path, string $body): string
{
    return hash_hmac('sha256', $timestamp . "\n" . $path . "\n" . $body, $secret);
}

/**
 * Проверяем именно JSON-объект: при декодировании в массивы пустой {}
 * неотличим от пустого [], поэтому не используем json_decode(..., true).
 * Тело запроса не преобразуем, иначе HMAC-подпись изменится.
 */
function stagingIsJsonObject(string $body): bool
{
    return is_object(json_decode($body));
}

/**
 * Authenticated staging quotas for shared hosting:
 * /calculate 30/min, /orders 10/min, /order-status 120/min.
 * File contains only counters, lives outside DOCUMENT_ROOT, uses flock.
 * If state cannot be stored, fail closed rather than forward to Worker.
 */
function stagingRateAllowed(string $path, string $directory, int $now): bool
{
    $quotas = [
        '/calculate' => 30,
        '/orders' => 10,
        '/order-status' => 120,
    ];
    if (!isset($quotas[$path])) {
        throw new RuntimeException('unknown staging route');
    }
    if (!is_dir($directory) || !is_writable($directory)) {
        throw new RuntimeException('staging rate-limit directory unavailable');
    }

    $file = @fopen($directory . '/staging-rate-limit.json', 'c+');
    if ($file === false) {
        throw new RuntimeException('staging rate-limit file unavailable');
    }

    try {
        if (!flock($file, LOCK_EX)) {
            throw new RuntimeException('staging rate-limit lock failed');
        }
        rewind($file);
        $raw = stream_get_contents($file);
        if (!is_string($raw)) {
            throw new RuntimeException('staging rate-limit read failed');
        }
        if ($raw === '') {
            $state = [];
        } else {
            $state = json_decode($raw, true);
            if (!is_array($state)) {
                throw new RuntimeException('staging rate-limit state corrupt');
            }
        }

        $bucket = $state[$path] ?? null;
        $windowStart = $now;
        $count = 0;
        if (is_array($bucket)
            && isset($bucket['start'], $bucket['count'])
            && is_int($bucket['start']) && is_int($bucket['count'])
            && $bucket['start'] <= $now
            && $now - $bucket['start'] < 60
            && $bucket['count'] >= 0) {
            $windowStart = $bucket['start'];
            $count = $bucket['count'];
        }
        $allowed = $count < $quotas[$path];
        $state[$path] = ['start' => $windowStart, 'count' => $allowed ? $count + 1 : $count];

        $encoded = json_encode($state);
        if (!is_string($encoded) || !rewind($file) || !ftruncate($file, 0)) {
            throw new RuntimeException('staging rate-limit write preparation failed');
        }
        $length = strlen($encoded);
        $written = 0;
        while ($written < $length) {
            $chunk = fwrite($file, substr($encoded, $written));
            if ($chunk === false || $chunk === 0) {
                throw new RuntimeException('staging rate-limit write failed');
            }
            $written += $chunk;
        }
        if (!fflush($file)) {
            throw new RuntimeException('staging rate-limit flush failed');
        }
        return $allowed;
    } finally {
        flock($file, LOCK_UN);
        fclose($file);
    }
}

function stagingError(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

/**
 * Закрытый шлюз Android Debug → staging Worker.
 * Сначала проверяем независимый тестовый токен, только затем читаем запрос;
 * в Worker передаётся серверная HMAC-подпись, которой нет в APK.
 */
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

    try {
        $allowed = stagingRateAllowed($path, __DIR__ . '/private', time());
    } catch (Throwable $exception) {
        stagingError(503, 'rate limiter unavailable');
    }
    if (!$allowed) {
        header('Retry-After: 60');
        stagingError(429, 'rate limited');
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
    if (!stagingIsJsonObject($body)) {
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
