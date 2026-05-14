<?php

namespace Modules\Commerce\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignBulkFeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'target'    => 'required|in:grade_level,course',
            'target_id' => 'required|integer',
        ];
    }
}
