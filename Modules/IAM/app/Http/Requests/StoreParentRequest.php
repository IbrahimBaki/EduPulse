<?php

namespace Modules\IAM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreParentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'name'          => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'phone'         => 'nullable|string|max:20',
            'password'      => 'required|min:8',
            'national_id'   => 'nullable|string|max:20',
            'student_ids'   => 'nullable|array',
            'student_ids.*' => 'exists:users,id',
        ];
    }
}
