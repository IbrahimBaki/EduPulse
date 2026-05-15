<?php

define('LARAVEL_START', microtime(true));
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Modules\Academic\Models\Schedule;
use Modules\Academic\Services\JitsiTokenService;

// Find the most recent online schedule
$schedule = Schedule::where('type', 'online')
    ->whereNotNull('jitsi_url')
    ->latest()
    ->first();

if (!$schedule) {
    echo "No online schedule found in DB" . PHP_EOL;
    exit(1);
}

echo "=== Schedule ===" . PHP_EOL;
echo "id         : {$schedule->id}" . PHP_EOL;
echo "jitsi_room : " . ($schedule->jitsi_room ?? '(null)') . PHP_EOL;
echo "jitsi_url  : {$schedule->jitsi_url}" . PHP_EOL;
echo "status     : {$schedule->status}" . PHP_EOL . PHP_EOL;

// Find a teacher user
$teacher = \App\Models\User::role('teacher')->first();
if (!$teacher) {
    echo "No teacher found" . PHP_EOL;
    exit(1);
}
echo "=== Teacher ===" . PHP_EOL;
echo "id    : {$teacher->id}" . PHP_EOL;
echo "name  : {$teacher->name}" . PHP_EOL;
echo "email : {$teacher->email}" . PHP_EOL . PHP_EOL;

// Generate the join URL via the service
$jitsi = new JitsiTokenService();
$url   = $jitsi->getJoinUrl($schedule, $teacher, true);

// Split and decode the JWT
$parts = explode('?jwt=', $url);
echo "=== Generated URL ===" . PHP_EOL;
echo "base : {$parts[0]}" . PHP_EOL;

if (!isset($parts[1])) {
    echo "No JWT in URL — JITSI_APP_ID not configured" . PHP_EOL;
    exit(1);
}

$token    = $parts[1];
$segments = explode('.', $token);
$header   = json_decode(base64_decode(strtr($segments[0], '-_', '+/')), true);
$payload  = json_decode(base64_decode(strtr($segments[1], '-_', '+/')), true);

echo PHP_EOL . "=== JWT Header ===" . PHP_EOL;
echo json_encode($header, JSON_PRETTY_PRINT) . PHP_EOL;

echo PHP_EOL . "=== JWT Payload ===" . PHP_EOL;
echo json_encode($payload, JSON_PRETTY_PRINT) . PHP_EOL;

echo PHP_EOL . "=== Claim Checks ===" . PHP_EOL;

$appId   = config('services.jitsi.app_id');
$keyId   = config('services.jitsi.key_id');
$baseUrl = rtrim(config('services.jitsi.base_url'), '/');

$checks = [
    'aud == jitsi'              => ($payload['aud'] ?? '') === 'jitsi',
    'iss == chat'               => ($payload['iss'] ?? '') === 'chat',
    'sub == appId'              => ($payload['sub'] ?? '') === $appId,
    'kid == appId/keyId'        => ($header['kid'] ?? '') === "{$appId}/{$keyId}",
    'alg == RS256'              => ($header['alg'] ?? '') === 'RS256',
    'exp in future'             => ($payload['exp'] ?? 0) > time(),
    'nbf in past'               => ($payload['nbf'] ?? 0) <= time(),
    'room set'                  => !empty($payload['room']),
    'user.id length >= 16'      => strlen($payload['context']['user']['id'] ?? '') >= 16,
    'moderator == true(string)' => ($payload['context']['user']['moderator'] ?? '') === 'true',
    'url starts with base/appId'=> str_starts_with($parts[0], "{$baseUrl}/{$appId}/"),
];

// Check URL room vs JWT room (case comparison)
$urlRoom   = basename($parts[0]);
$jwtRoom   = $payload['room'] ?? '';
$checks["url room '{$urlRoom}' matches JWT room '{$jwtRoom}' (case-insensitive)"]
    = strtolower($urlRoom) === strtolower($jwtRoom);
$checks["url room '{$urlRoom}' matches JWT room '{$jwtRoom}' (case-SENSITIVE)"]
    = $urlRoom === $jwtRoom;

$pass = 0; $fail = 0;
foreach ($checks as $label => $result) {
    echo ($result ? '[PASS]' : '[FAIL]') . " {$label}" . PHP_EOL;
    $result ? $pass++ : $fail++;
}

echo PHP_EOL . "Result: {$pass} passed, {$fail} failed" . PHP_EOL;

if ($fail === 0) {
    echo PHP_EOL . "All JWT claims look correct." . PHP_EOL;
    echo "If auth still fails, the issue is likely the public key in JaaS dashboard." . PHP_EOL;
}
