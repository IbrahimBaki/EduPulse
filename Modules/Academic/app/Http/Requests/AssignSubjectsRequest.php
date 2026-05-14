<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignSubjectsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'subject_ids'   => 'required|array',
            'subject_ids.*' => 'integer|exists:subjects,id',
        ];
    }
}
