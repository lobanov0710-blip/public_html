<?php

declare(strict_types=1);

// No HTTP, no private flags, no real tokens.
require_once __DIR__ . '/../api/_passenger_push_grant_validation.php';

$valid = [
    'accessToken' => 'offline-fake-token',
    'installationId' => '5d98e332-05e9-4e90-a4e1-bc61c1342030'
];
if (!isValidPassengerPushGrantPayload($valid)) {
    throw new RuntimeException('Legacy manage form unexpectedly rejected');
}
if (!isValidPassengerPushGrantPayload([...$valid, 'operation' => 'revoke'])) {
    throw new RuntimeException('Revoke-only form unexpectedly rejected');
}

$invalid = [
    [...$valid, 'operation' => 'manage'],
    [...$valid, 'operation' => 'register'],
    [...$valid, 'operation' => 'REVOKE'],
    [...$valid, 'operation' => null],
    [...$valid, 'operation' => 1],
    [...$valid, 'operation' => 'revoke', 'orderId' => 'attacker'],
    [...$valid, 'orderId' => 'attacker'],
    [...$valid, 'installationId' => 'bad-id'],
    [...$valid, 'installationId' => ''],
    [...$valid, 'accessToken' => ''],
    [...$valid, 'accessToken' => str_repeat('a', 8193)],
    [...$valid, 'accessToken' => 123],
    [],
    ['accessToken', 'installationId'],
    null
];
foreach ($invalid as $payload) {
    if (isValidPassengerPushGrantPayload($payload)) {
        throw new RuntimeException('Invalid payload was accepted');
    }
}

echo "PASSENGER_PUSH_REVOKE_GRANT_VALIDATION=PASS\n";
