<?php

use Illuminate\Support\Facades\Route;
use Modules\Communication\Http\Controllers\CommunicationController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('communications', CommunicationController::class)->names('communication');
});
