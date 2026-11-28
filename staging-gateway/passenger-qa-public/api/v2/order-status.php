<?php
declare(strict_types=1);

require_once dirname(__DIR__, 3) . '/_bootstrap.php';
stagingProxy('/v2/order-status', 32768, static function (): string {
    $file = dirname(__DIR__, 3) . '/private/passenger-qa-upstream.txt';
    $value = is_file($file) ? @file_get_contents($file, false, null, 0, 256) : false;
    $origin = is_string($value) ? trim($value) : '';
    if (!preg_match('~\Ahttps://uber-v3-tz02-qa\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.workers\.dev\z~', $origin)) {
        throw new RuntimeException('QA Worker origin unavailable');
    }
    return $origin;
});
