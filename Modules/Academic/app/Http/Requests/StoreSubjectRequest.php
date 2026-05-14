<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSubjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        $tenantId = app('tenant')->id;

        return [
            'name'        => [
                'required', 'string', 'max:100',
                Rule::unique('subjects')->where('tenant_id', $tenantId),
            ],
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ];
    }
}
