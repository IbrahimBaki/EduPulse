<?php

namespace Modules\Assessment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['teacher', 'manager']);
    }

    public function rules(): array
    {
        return [
            'course_id'                   => 'required|exists:courses,id',
            'lesson_ids'                  => 'required|array|min:1',
            'lesson_ids.*'                => 'exists:lessons,id',
            'title'                       => 'required|string|max:255',
            'question_types'              => 'required|array',
            'question_types.mcq'          => 'nullable|integer|min:0',
            'question_types.true_false'   => 'nullable|integer|min:0',
            'question_types.short_answer' => 'nullable|integer|min:0',
            'question_types.essay'        => 'nullable|integer|min:0',
            'difficulty_mix'              => 'required|array',
            'difficulty_mix.easy'         => 'required|integer|min:0|max:100',
            'difficulty_mix.medium'       => 'required|integer|min:0|max:100',
            'difficulty_mix.hard'         => 'required|integer|min:0|max:100',
            'duration_minutes'            => 'required|integer|min:10|max:300',
            'language'                    => 'required|in:en,ar',
        ];
    }
}
