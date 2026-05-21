<?php

namespace Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    use ApiResponser;

    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'email'         => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone'         => 'nullable|string|max:20',
            'national_id'   => 'nullable|string|max:20',
            'password'      => 'sometimes|nullable|min:8',
            'date_of_birth' => 'nullable|date',
            'gender'        => 'nullable|in:male,female,other',
            'address'       => 'nullable|string|max:500',
        ]);

        $userFields = [];
        foreach (['name', 'email', 'phone', 'national_id'] as $field) {
            if (array_key_exists($field, $validated)) {
                $userFields[$field] = $validated[$field];
            }
        }

        if (!empty($validated['password'])) {
            $userFields['password'] = Hash::make($validated['password']);
        }

        if (!empty($userFields)) {
            $user->update($userFields);
        }

        if ($user->hasRole('student') && $user->studentProfile) {
            $profileFields = [];
            foreach (['date_of_birth', 'gender', 'address'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $profileFields[$field] = $validated[$field];
                }
            }
            if (!empty($profileFields)) {
                $user->studentProfile->update($profileFields);
            }
        }

        return $this->ReturnSuccess($user->fresh(), 'Profile updated');
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|max:2048|mimes:jpeg,jpg,png,webp',
        ]);

        $user   = $request->user();
        $tenant = app('tenant');

        if ($user->avatar_url) {
            $oldPath = ltrim(str_replace('/storage/', '', $user->avatar_url), '/');
            Storage::disk('public')->delete($oldPath);
        }

        $ext      = $request->file('avatar')->getClientOriginalExtension();
        $filename = Str::uuid() . '.' . $ext;
        $dir      = "avatars/{$tenant->id}";

        $request->file('avatar')->storeAs($dir, $filename, 'public');

        $avatarUrl = "/storage/{$dir}/{$filename}";
        $user->update(['avatar_url' => $avatarUrl]);

        return $this->ReturnSuccess(['avatar_url' => $avatarUrl], 'Avatar updated');
    }

    public function deleteAvatar(Request $request)
    {
        $user = $request->user();

        if ($user->avatar_url) {
            $oldPath = ltrim(str_replace('/storage/', '', $user->avatar_url), '/');
            Storage::disk('public')->delete($oldPath);
            $user->update(['avatar_url' => null]);
        }

        return $this->ReturnSuccess(null, 'Avatar removed');
    }
}
