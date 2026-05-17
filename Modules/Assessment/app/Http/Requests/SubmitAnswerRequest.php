<?php

namespace Modules\Assessment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('student');
    }

    public function rules(): array
    {
        return [
            'question_id'    => 'required|exists:exam_questions,id',
            'student_answer' => 'required|string',
        ];
    }
}
