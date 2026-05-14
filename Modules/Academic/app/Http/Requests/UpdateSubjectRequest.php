<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        $tenantId = app('tenant')->id;
        $id = $this->route('id') ?? $this->route('subject');

        return [
            'name'        => [
                'sometimes', 'required', 'string', 'max:100',
                Rule::unique('subjects')->where('tenant_id', $tenantId)->ignore($id),
            ],
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ];
    }
}
