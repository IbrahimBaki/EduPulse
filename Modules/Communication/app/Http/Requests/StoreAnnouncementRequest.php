<?php

namespace Modules\Communication\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['manager', 'teacher']);
    }

    public function rules(): array
    {
        return [
            'title'       => 'required|string|max:255',
            'body'        => 'required|string',
            'audience'    => 'required|in:all,grade_level,course,role',
            'audience_id' => 'required_if:audience,grade_level,course|nullable|integer',
            'expires_at'  => 'nullable|date|after:now',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->user()->hasRole('teacher') && $this->audience !== 'course') {
                $validator->errors()->add('audience', 'Teachers can only create announcements with audience=course');
            }
        });
    }
}
