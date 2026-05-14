<?php

namespace Modules\IAM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFeeStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'fee_status'   => 'required|in:paid,pending,overdue',
            'fee_due_date' => 'nullable|date',
        ];
    }
}
