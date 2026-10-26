<?php
declare(strict_types=1);

// Публичная точка входа staging. Секреты и HMAC-подпись обрабатываются
// исключительно в служебном файле за пределами DOCUMENT_ROOT.
require_once dirname(__DIR__, 2) . '/_bootstrap.php';
stagingProxy('/calculate', 32768);
