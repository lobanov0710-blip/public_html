# PUSH-01I — PHP gateway: revoke-only grant без повышения полномочий

Дата: 04.11.2026. Статус: Draft, base public_html PUSH-01F / PR №8.
Зависимость: uber-v3 PUSH-01I / PR №21. Никаких изменений размещённого сайта или production.

- Прежний точный JSON {accessToken, installationId} остаётся поддержанным.
- Дополнительно допускается {accessToken, installationId, operation:"revoke"}, строго без других полей; подписывается неизменённый raw body HMAC v2 nonce для /passenger/push-grant.
- PHP не делает авторизационных выводов из operation и не выдаёт grant сам. Только Worker по подписанной capability определяет scope; PHP валидирует формат и пересылает.
- Новый чистый PHP helper не имеет сети и секретов. Unit тест отказывает для operation=manage/register/REVOKE/null, orderId, невалидных токенов/UUID.
- При отсутствии приватного enable-файла PHP endpoint всегда 503 до чтения/проксирования.
- Существующие /api/order.php, /api/calculate.php, /api/order-status.php, staff / FCM, D1 и реальные заказы не затронуты.
- CI: syntax + unit PHP + fail-closed HTTP tests. Полноценный реальный цикл PHP → Worker с обновлёнными кодами нужно отдельно проверить в безопасном local loopback; pin у прежних тестов пока остаётся на PR №8.

Не объединять в main, не выгружать на production, не изменять enabled flags до отдельного согласия владельца.
