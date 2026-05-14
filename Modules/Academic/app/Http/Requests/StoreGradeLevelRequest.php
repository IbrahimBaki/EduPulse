<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGradeLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        $tenantId = app('tenant')->id;

        return [
            'name'        => 'required|string|max:100',
            'level'       => [
                'required', 'integer', 'min:1', 'max:20',
                Rule::unique('grade_levels')->where('tenant_id', $tenantId),
            ],
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ];
    }
}
