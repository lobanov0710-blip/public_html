<?php

declare(strict_types=1);

// PUSH-01I: isolated, strict payload validation with no network/secret access.
// Two-field legacy manage form; a third field permits only operation="revoke".
function isValidPassengerPushGrantPayload(mixed $payload): bool
{
    if (!is_array($payload) || array_is_list($payload)) {
        return false;
    }
    $keys = array_keys($payload);
    sort($keys);
    $legacy = ['accessToken', 'installationId'];
    $revoke = ['accessToken', 'installationId', 'operation'];
    if ($keys !== $legacy && $keys !== $revoke) {
        return false;
    }
    if ($keys === $revoke && $payload['operation'] !== 'revoke') {
        return false;
    }
    $accessToken = $payload['accessToken'];
    $installationId = $payload['installationId'];
    return is_string($accessToken) && $accessToken !== ''
        && strlen($accessToken) <= 8192
        && is_string($installationId)
        && preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
            $installationId
        ) === 1;
}
