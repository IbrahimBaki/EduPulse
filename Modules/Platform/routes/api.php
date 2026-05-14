<?php

use Illuminate\Support\Facades\Route;
use Modules\Platform\Http\Controllers\SettingsController;

Route::prefix('v1/{tenant_code}')->middleware(['tenant', 'auth:sanctum'])->group(function () {
    Route::middleware('role:manager')->prefix('manager')->group(function () {
        Route::get('settings', [SettingsController::class, 'show']);
        Route::put('settings', [SettingsController::class, 'update']);
        Route::post('settings/logo', [SettingsController::class, 'uploadLogo']);
    });
});
