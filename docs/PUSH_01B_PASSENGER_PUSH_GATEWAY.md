# PUSH-01B — пассажирский PHP HMAC-шлюз для выдачи grant

**Дата:** 03.11.2026. **Статус:** feature-ветка; не развёрнуто на хостинге.  
**Зависимость:** backend `uber-v3` [PUSH-01B](https://github.com/lobanov0710-blip/uber-v3/pulls) и [PUSH-01A PR №13](https://github.com/lobanov0710-blip/uber-v3/pull/13). Android [PUSH-00 PR №25](https://github.com/lobanov0710-blip/TransferServis/pull/25) отдельно.  
**API v1:** не меняется.

Добавлен только `api/passenger-push-grant.php`, который в будущем сможет проксировать **POST** к `/passenger/push-grant` Worker через существующий `buildProxyAuthHeaders()`. HMAC подписывает точное тело и точный путь, с валидной подписью backend подтверждает владение заказом по отдельной пассажирской read capability и выдаёт краткосрочный `passenger_push:manage` grant, связанный с `installationId`. PHP не является источником авторизации и не разрешает регистрацию FCM.

**Два независимых условия включения (оба отсутствуют по умолчанию):**

1. Файл `transfer-private/passenger-push-gateway-enabled.flag` вне `public_html` со строго `enabled`; отсутствие файла даёт HTTP 503.
2. Worker `env.PASSENGER_PUSH_API_ENABLED === "true"` и отдельный `PASSENGER_PUSH_GRANT_SECRET` (отличный от staff JWT, `PASSENGER_ORDER_SECRET` и HMAC). Отсутствие даёт HTTP 503.

Изменение этих условий — отдельная операторская операция **только после разрешения владельца**. Этот PR **не создаёт flag, не загружает секрет и не меняет Worker**.

Свойства: HTTPS, проверка размера запроса (8192 байт), точных `accessToken/installationId` без клиентских `orderId`, ответ `Cache-Control: no-store`, запрет redirects, TLS verify, отсутствие логов содержимого и возвращение ответа Worker только после проверки JSON. Нет FCM registration/write, real push или changes в existing `api/order.php`, `api/order-status.php`, `api/calculate.php`.

Проверка: `php -l` обоих PHP-файлов и локальный тест **503 при отсутствии приватного флага**. Настоящая связка PHP→Worker→D1 ещё не тестировалась и не является условием merge этого подготовительного PR. Перед эксплуатацией обязательны авторизационные негативные тесты, rate-limit, аудит replay/nonce и политика срока жизни grant/регистрации.

**Слияние и deployment в production НЕ выполнялись.**
