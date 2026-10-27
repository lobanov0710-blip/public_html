# Staging PHP Gateway — Transfer Servis

**Статус: черновик. На хостинге не развёрнут.**

## Зачем нужен шлюз

Android-приложение использует PHP API для подписи запросов к Cloudflare Worker. Секрет HMAC нельзя передавать на телефон, поэтому **отдельный тестовый сервер** подписывает обращения к `uber-v3-staging`. Production API и его секреты не затрагиваем.

## Размещение на Timeweb (виртуальный хостинг)

На Timeweb для отдельного сайта `ts52_staging` уже настроен HTTPS и `public_html`.
Код для этого поддомена нужно **разложить по каталогам**, а не копировать весь репозиторий в `public_html`:

```text
ts52_staging/
├── _bootstrap.php                     <-- staging-gateway/_bootstrap.php
├── private/                           <-- только на сервере, НЕ в Git
│   ├── staging-hmac.key                <-- отдельный staging Worker HMAC
│   └── staging-access.key              <-- независимый тестовый токен
└── public_html/                       <-- DOCUMENT_ROOT staging сайта
    └── api/
        ├── calculate.php               <-- staging-gateway/public/api/calculate.php
        ├── order.php                   <-- staging-gateway/public/api/order.php
        └── order-status.php            <-- staging-gateway/public/api/order-status.php
```

**Никогда не копировать `private/`, `_bootstrap.php`, `tests/` или README внутрь `public_html`.**
`_bootstrap.php` должен лежать рядом с `public_html`: публичные API подключают его через
`dirname(__DIR__, 2) . '/_bootstrap.php'`.
Не публиковать этот код на основном сайте `transfer-servis52.ru`.

## Изолированные секреты

По умолчанию шлюз читает **два текстовых файла** в `ts52_staging/private/`.
Переменные окружения **не обязательны на Timeweb**:

- `staging-hmac.key` — значение **только staging** Worker `PROXY_HMAC_SECRET`;
- `staging-access.key` — другой случайный тестовый токен (минимум 32 символа),
  передаваемый в запросе `X-Staging-Access-Token`.

Для окружений с управлением PHP-FPM можно явно задать `TS_STAGING_HMAC_SECRET_FILE`
и `TS_STAGING_TESTER_TOKEN_FILE`: значения — **абсолютные пути** к секретным файлам вне
DOCUMENT_ROOT, они имеют приоритет перед путями Timeweb. Если файл отсутствует, пуст,
не читается, слишком короткий или находится внутри публичного каталога — API возвращает
`503 staging unavailable` без раскрытия деталей.

Секреты не добавлять в репозиторий, APK, сообщения чата, скриншоты или логи.
Для `staging-hmac.key` использовать **то же значение**, что у staging Worker
`PROXY_HMAC_SECRET`, но **никогда не копировать ключ production**.
Если staging HMAC утрачен, ротировать только staging Worker и соответствующий файл.
Права доступа к файлам ограничить владельцем сайта/PHP; убедиться, что PHP может их читать.

Сеть: до использования API с внешними устройствами предусмотреть ACL/IP-ограничение
или эквивалентную защиту, ограничение частоты запросов и действующий HTTPS.
Токен Debug APK временный: не распространять APK, после тестирования ротировать токен.

## Проверка и граница ответственности

1. CI проверяет `php -l` и `php staging-gateway/tests/gateway-test.php`; это модульная, не E2E-проверка.
2. После разрешения владельца разместить файлы по схеме Timeweb выше; подтвердить, что DOCUMENT_ROOT — именно `ts52_staging/public_html`, а не его родительский каталог.
3. Проверить отказ без токена (403), ошибку при отсутствии конфигурации (503) и некорректный JSON (400) на staging.
4. Проверить только staging API: расчёт, заказ, сохранение, идемпотентность, чтение собственного заказа и Android-перезапуск.
5. После приёмки удалить/перевыпустить тестовый токен.

**Ни один production-обработчик `api/*.php`, серверный секрет, production Worker или production D1 этим PR не изменяется. Слияние и публикация требуют отдельного решения владельца.**
