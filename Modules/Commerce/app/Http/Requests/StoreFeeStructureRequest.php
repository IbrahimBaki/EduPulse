<?php

namespace Modules\Commerce\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFeeStructureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'name'        => 'required|string|max:255',
            'type'        => 'required|in:registration,monthly,semester,annual,course',
            'amount'      => 'required|numeric|min:0',
            'currency'    => 'nullable|string|max:10',
            'due_date'    => 'nullable|date',
            'description' => 'nullable|string',
        ];
    }
}
