<?php

namespace Modules\IAM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        $id = $this->route('id') ?? $this->route('student');

        return [
            'name'            => 'sometimes|required|string|max:255',
            'email'           => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($id)],
            'phone'           => 'nullable|string|max:20',
            'password'        => 'nullable|min:8',
            'grade_level_id'  => 'sometimes|required|exists:grade_levels,id',
            'date_of_birth'   => 'nullable|date',
            'gender'          => 'nullable|in:male,female',
            'address'         => 'nullable|string',
            'enrollment_date' => 'nullable|date',
        ];
    }
}
