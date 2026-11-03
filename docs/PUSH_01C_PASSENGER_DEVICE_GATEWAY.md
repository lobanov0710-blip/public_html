# PUSH-01C — HMAC gateway пассажирских FCM устройств

**Статус:** Draft. Ни один enable-файл не создан, файлы сайта не опубликованы.

Добавлен `api/passenger-push-device.php`. Методы: **POST** регистрация (`grantToken`, `platform=android`, `token`) и **DELETE** отзыв (`grantToken`). Ни одного `orderId` из тела, staff JWT или прежней passenger read capability этот маршрут не принимает.

При любом запросе, кроме разрешённых методов, HTTP 405. Для включения нужны **оба** файла вне веб-корня `transfer-private/passenger-push-gateway-enabled.flag` и `transfer-private/passenger-push-device-enabled.flag` со строго `enabled`. По умолчанию 503. После включения дополнительно Worker требует `PASSENGER_PUSH_API_ENABLED` и `PASSENGER_PUSH_DEVICES_ENABLED` (оба `true`) и отдельный ключ grant.

Ограничение 8192 байт, строгий whitelist полей, TLS verify, запрет redirect, no-store, HMAC вычисляется по **точному пути `/passenger/push-device` и сырому body**. Не использовать публичный URL Worker в APK, секреты HMAC/FCM не логировать.

CI: `php -l`, локальная проверка GET=405/POST=503/DELETE=503 при отсутствии приватных флагов. Реальный вызов Worker/D1 не выполняется.

**Недостаточно для production:** WAF/rate limits на входе PHP, согласование replay-политики, Firebase client, контролируемое хранение токенов, статусные очистки и авторизационные E2E. Без отдельного согласия владельца не включать, не сливать, не деплоить.
