<?php

namespace Modules\Academic\Services;

use App\Models\User;
use Modules\Academic\Models\Schedule;

class JitsiTokenService
{
    /**
     * Return a signed JaaS join URL for the given user.
     * Falls back to the stored jitsi_url when JITSI_APP_ID is not configured.
     */
    public function getJoinUrl(Schedule $schedule, User $user, bool $isModerator): string
    {
        $appId      = config('services.jitsi.app_id');
        $keyId      = config('services.jitsi.key_id');
        $privateKey = config('services.jitsi.private_key');
        $baseUrl    = rtrim(config('services.jitsi.base_url', 'https://meet.jit.si'), '/');

        if (!$appId || !$privateKey) {
            return $schedule->jitsi_url ?? '';
        }

        $room = $schedule->jitsi_room
            ?? ltrim(parse_url($schedule->jitsi_url ?? '', PHP_URL_PATH) ?? '', '/');

        $now = time();

        $header = [
            'kid' => "{$appId}/{$keyId}",
            'alg' => 'RS256',
        ];

        $payload = [
            'context' => [
                'user' => [
                    'id'        => hash('sha256', 'edupulse-user-' . $user->id),
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'moderator' => $isModerator ? 'true' : 'false',
                ],
                'features' => [
                    'recording'     => 'false',
                    'livestreaming' => 'false',
                    'transcription' => 'false',
                    'outbound-call' => 'false',
                ],
            ],
            'aud'  => 'jitsi',
            'iss'  => 'chat',
            'sub'  => $appId,
            'room' => $room,
            'exp'  => $now + 7200,
            'nbf'  => $now - 10,
        ];

        $token = $this->encodeJwt($header, $payload, $privateKey);

        return "{$baseUrl}/{$appId}/{$room}?jwt={$token}";
    }

    private function encodeJwt(array $header, array $payload, string $rawKey): string
    {
        $pem = str_replace('\n', "\n", $rawKey);

        $b64url = static fn(array $data): string =>
            rtrim(strtr(base64_encode(json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)), '+/', '-_'), '=');

        $hdr   = $b64url($header);
        $pld   = $b64url($payload);
        $input = "{$hdr}.{$pld}";

        openssl_sign($input, $signature, $pem, OPENSSL_ALGO_SHA256);

        return $input . '.' . rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    }
}
