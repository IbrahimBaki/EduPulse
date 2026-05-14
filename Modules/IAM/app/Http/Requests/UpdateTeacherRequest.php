<?php

namespace Modules\IAM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeacherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        $id = $this->route('id') ?? $this->route('teacher');

        return [
            'name'                         => 'sometimes|required|string|max:255',
            'email'                        => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($id)],
            'phone'                        => 'nullable|string|max:20',
            'password'                     => 'nullable|min:8',
            'national_id'                  => 'nullable|string|max:20',
            'is_active'                    => 'nullable|boolean',
            'assignments'                  => 'nullable|array',
            'assignments.*.subject_id'     => 'required_with:assignments|exists:subjects,id',
            'assignments.*.grade_level_id' => 'required_with:assignments|exists:grade_levels,id',
        ];
    }
}
