# Transfer Servis staging PHP gateway

Status: source code only. NOT deployed. Never replace the production api/*.php files.

Deploy only as the document root of an independent HTTPS staging virtual host. It implements the existing Android routes: POST /api/calculate.php, /api/order.php and /api/order-status.php; they forward to the fixed uber-v3-staging Worker.

## Secrets and access control

Configure two **separate** PHP-FPM environment variables with absolute file paths outside the vhost document root:

- TS_STAGING_HMAC_SECRET_FILE: exact value of the staging Worker's PROXY_HMAC_SECRET.
- TS_STAGING_TESTER_TOKEN_FILE: independent short-lived random tester token of at least 32 characters.

Never reuse a production HMAC file, production token or live customer data. Both files must be unreadable over HTTP and readable only by the PHP process. With missing configuration the gateway fails closed with HTTP 503. With missing or invalid X-Staging-Access-Token it responds HTTP 403.

Before making the vhost public, restrict source IPs or protect it with equivalent network access control AND add rate limiting. The temporary tester token also needs to be configured locally for the Android Debug build; it is embedded in the Debug APK and therefore must be rotated after tests. Do not distribute the Debug APK. No production secrets are placed in the APK.

The original staging HMAC value is only known to the local development PowerShell session; if no longer available, rotate the staging Worker HMAC separately, then put that exact new value in the staging PHP secret file. Never write secret values to Git, public web directories or chat.

## Release boundary

1. php -l for all PHP source; php staging-gateway/tests/gateway-test.php.
2. Obtain explicit approval before installing the staging vhost, TLS, files or modifying server configuration.
3. Confirm no-credential calls fail and only the staging Worker receives requests.
4. Complete Android Debug E2E tests, then rotate the temporary tester token.
5. Production PHP handlers, Worker, orders and Telegram/FCM must remain unchanged.

This PR does not deploy anything, create orders, or change live site files.
