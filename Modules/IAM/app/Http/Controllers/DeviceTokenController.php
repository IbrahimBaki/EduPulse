<?php

namespace Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\IAM\Models\DeviceToken;

class DeviceTokenController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'token'    => 'required|string|max:512',
            'platform' => 'required|in:ios,android',
        ]);

        DeviceToken::updateOrCreate(
            ['user_id' => $request->user()->id, 'token' => $request->token],
            ['platform' => $request->platform]
        );

        return $this->ReturnSuccess(null, 'Device token registered');
    }

    public function destroy(Request $request)
    {
        $request->validate(['token' => 'required|string|max:512']);

        DeviceToken::where('user_id', $request->user()->id)
            ->where('token', $request->token)
            ->delete();

        return $this->ReturnSuccess(null, 'Device token removed');
    }
}
