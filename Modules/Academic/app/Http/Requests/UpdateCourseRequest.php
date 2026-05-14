<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'name'           => 'sometimes|required|string|max:255',
            'subject_id'     => 'sometimes|required|exists:subjects,id',
            'grade_level_id' => 'sometimes|required|exists:grade_levels,id',
            'teacher_id'     => 'sometimes|required|exists:users,id',
            'description'    => 'nullable|string',
            'start_date'     => 'nullable|date',
            'end_date'       => 'nullable|date|after:start_date',
            'max_students'   => 'nullable|integer|min:1',
        ];
    }
}
