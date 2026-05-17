<?php

namespace Modules\Assessment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['teacher', 'manager']);
    }

    public function rules(): array
    {
        return [
            'title'              => 'sometimes|string|max:255',
            'description'        => 'nullable|string',
            'duration_minutes'   => 'sometimes|integer|min:10|max:300',
            'passing_percentage' => 'sometimes|integer|min:1|max:100',
        ];
    }
}
