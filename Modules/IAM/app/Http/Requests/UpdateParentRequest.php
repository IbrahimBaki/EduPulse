<?php

namespace Modules\IAM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateParentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        $parentId = $this->route('id');

        return [
            'name'        => 'sometimes|string|max:255',
            'email'       => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($parentId)],
            'phone'       => 'nullable|string|max:20',
            'password'    => 'sometimes|nullable|min:8',
            'national_id' => 'nullable|string|max:20',
        ];
    }
}
