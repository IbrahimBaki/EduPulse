<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TestController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// =============================================
// 🧪 Diagnostic / Test Routes (remove in prod)
// =============================================
Route::prefix('v1/{tenant_code}/test')->middleware('tenant')->group(function () {
    Route::get('/ping', [TestController::class, 'ping']);
    Route::get('/tenant', [TestController::class, 'tenant']);
    Route::post('/user-check', [TestController::class, 'userCheck']);
});
