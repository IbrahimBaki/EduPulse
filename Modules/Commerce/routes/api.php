<?php

use Illuminate\Support\Facades\Route;
use Modules\Commerce\Http\Controllers\FinanceDashboardController;
use Modules\Commerce\Http\Controllers\FeeStructureController;
use Modules\Commerce\Http\Controllers\StudentFeeController;

Route::prefix('v1/{tenant_code}')->middleware(['tenant', 'auth:sanctum'])->group(function () {
    Route::middleware('role:manager')->prefix('manager')->group(function () {
        // Fee structures
        Route::get('fee-structures', [FeeStructureController::class, 'index']);
        Route::post('fee-structures', [FeeStructureController::class, 'store']);
        Route::put('fee-structures/{id}', [FeeStructureController::class, 'update']);
        Route::patch('fee-structures/{id}/toggle', [FeeStructureController::class, 'toggleActive']);
        Route::post('fee-structures/{id}/assign-bulk', [StudentFeeController::class, 'assignBulk']);

        // Student fees
        Route::get('student-fees', [StudentFeeController::class, 'index']);
        Route::post('student-fees', [StudentFeeController::class, 'store']);
        Route::patch('student-fees/{id}/mark-paid', [StudentFeeController::class, 'markPaid']);
        Route::patch('student-fees/{id}/mark-overdue', [StudentFeeController::class, 'markOverdue']);
        Route::patch('student-fees/{id}/waive', [StudentFeeController::class, 'waive']);

        // Finance dashboard
        Route::get('finance/summary', [FinanceDashboardController::class, 'summary']);
        Route::get('finance/transactions', [FinanceDashboardController::class, 'transactions']);
        Route::get('finance/fees-by-parent', [FinanceDashboardController::class, 'feesByParent']);
    });

    // Student fees
    Route::middleware('role:student')->prefix('student')->group(function () {
        Route::get('fees', [StudentFeeController::class, 'myFees']);
    });

    // Parent fees are handled by the Academic module's ParentDashboardController
});
