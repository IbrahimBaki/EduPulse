<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\IAM\Models\TeacherAssignment;

class StoreCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'name'           => 'required|string|max:255',
            'subject_id'     => 'required|exists:subjects,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
            'teacher_id'     => 'required|exists:users,id',
            'description'    => 'nullable|string',
            'start_date'     => 'nullable|date',
            'end_date'       => 'nullable|date|after:start_date',
            'max_students'   => 'nullable|integer|min:1',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $hasAssignment = TeacherAssignment::where('teacher_id', $this->teacher_id)
                ->where('subject_id', $this->subject_id)
                ->where('grade_level_id', $this->grade_level_id)
                ->where('is_active', true)
                ->exists();

            if (!$hasAssignment) {
                $validator->errors()->add('teacher_id', 'Teacher is not assigned to this subject and grade level');
            }
        });
    }
}
