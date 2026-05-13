<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponser
{
    /**
     * Build a success response
     *
     * @param  string|array  $data
     * @param  string  $message
     * @param  int  $code
     * @return \Illuminate\Http\JsonResponse
     */
    protected function ReturnSuccess($data = null, $message = 'Success', $code = 200): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    /**
     * Build an error response
     *
     * @param  string  $message
     * @param  int  $code
     * @param  string|array|null  $errors
     * @return \Illuminate\Http\JsonResponse
     */
    protected function ReturnFailed($message = 'Error', $code = 400, $errors = null): JsonResponse
    {
        $response = [
            'status' => 'error',
            'message' => $message,
            'data' => null
        ];

        if (!is_null($errors)) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $code);
    }
}
