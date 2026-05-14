<?php

namespace Modules\IAM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeacherAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'subject_id'     => 'required|exists:subjects,id',
            'grade_level_id' => 'required|exists:grade_levels,id',
        ];
    }
}
