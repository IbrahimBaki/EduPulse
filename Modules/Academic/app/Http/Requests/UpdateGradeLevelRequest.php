<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGradeLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        $tenantId = app('tenant')->id;
        $id = $this->route('id') ?? $this->route('grade_level');

        return [
            'name'        => 'sometimes|required|string|max:100',
            'level'       => [
                'sometimes', 'required', 'integer', 'min:1', 'max:20',
                Rule::unique('grade_levels')->where('tenant_id', $tenantId)->ignore($id),
            ],
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ];
    }
}
