<?php
declare(strict_types=1);

$qaRoot = dirname(__DIR__, 3) . '/passenger-qa';
require_once $qaRoot . '/_bootstrap.php';
stagingProxy('/v2/order-status', 32768, static function () use ($qaRoot): string {
    $file = $qaRoot . '/private/passenger-qa-upstream.txt';
    $value = realpath($file) === $file ? @file_get_contents($file, false, null, 0, 256) : false;
    $origin = is_string($value) ? trim($value) : '';
    if ($origin !== 'https://uber-v3-tz02-qa.lobanov0710.workers.dev') {
        throw new RuntimeException('QA Worker origin unavailable');
    }
    return $origin;
});
