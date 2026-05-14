<?php

namespace Modules\IAM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'name'            => 'required|string|max:255',
            'email'           => 'required|email|unique:users,email',
            'phone'           => 'nullable|string|max:20',
            'password'        => 'required|min:8',
            'grade_level_id'  => 'required|exists:grade_levels,id',
            'date_of_birth'   => 'nullable|date',
            'gender'          => 'nullable|in:male,female',
            'address'         => 'nullable|string',
            'enrollment_date' => 'nullable|date',
            'parent_id'       => 'nullable|exists:users,id',
        ];
    }
}
