<?php

namespace Modules\Commerce\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WaiveFeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'notes' => 'required|string',
        ];
    }
}
