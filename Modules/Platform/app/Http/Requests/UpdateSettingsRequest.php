<?php

namespace Modules\Platform\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'academy_name'  => 'sometimes|required|string|max:255',
            'primary_color' => 'nullable|string|max:20',
            'currency'      => 'nullable|string|max:10',
            'timezone'      => 'nullable|string|max:50',
            'language'      => 'nullable|string|max:10',
            'academic_year' => 'nullable|string|max:20',
            'semester'      => 'nullable|in:first,second,summer',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:30',
            'address'       => 'nullable|string',
        ];
    }
}
