<?php

namespace Modules\IAM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeacherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'name'                         => 'required|string|max:255',
            'email'                        => 'required|email|unique:users,email',
            'phone'                        => 'nullable|string|max:20',
            'password'                     => 'required|min:8',
            'national_id'                  => 'nullable|string|max:20',
            'assignments'                  => 'nullable|array',
            'assignments.*.subject_id'     => 'required_with:assignments|exists:subjects,id',
            'assignments.*.grade_level_id' => 'required_with:assignments|exists:grade_levels,id',
        ];
    }
}
