<?php

namespace Modules\Platform\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'logo' => 'required|image|mimes:jpg,jpeg,png|max:2048',
        ];
    }
}
