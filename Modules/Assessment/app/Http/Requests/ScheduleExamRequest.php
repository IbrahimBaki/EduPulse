<?php

namespace Modules\Assessment\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScheduleExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['teacher', 'manager']);
    }

    public function rules(): array
    {
        return [
            'scheduled_at' => 'required|date|after:now',
            'starts_at'    => 'required|date|after_or_equal:scheduled_at',
            'ends_at'      => 'required|date|after:starts_at',
        ];
    }
}
