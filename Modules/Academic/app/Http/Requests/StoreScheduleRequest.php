<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['manager', 'teacher']);
    }

    public function rules(): array
    {
        return [
            'title'       => 'required|string|max:255',
            'starts_at'   => 'required|date|after:now',
            'ends_at'     => 'required|date|after:starts_at',
            'type'        => 'required|in:online,recorded,in_person',
            'description' => 'nullable|string',
            'meeting_url' => 'nullable|url',
        ];
    }
}
