<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateScheduleStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['manager', 'teacher']);
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:live,completed,cancelled',
        ];
    }
}
