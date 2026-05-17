<?php

namespace Modules\Assessment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExamQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['teacher', 'manager']);
    }

    public function rules(): array
    {
        return [
            'question_text'  => 'sometimes|string',
            'question_type'  => 'sometimes|in:mcq,true_false,short_answer,essay',
            'options'        => 'nullable|array',
            'correct_answer' => 'sometimes|string',
            'marks'          => 'sometimes|integer|min:1|max:10',
            'explanation'    => 'nullable|string',
            'difficulty'     => 'sometimes|in:easy,medium,hard',
        ];
    }
}
