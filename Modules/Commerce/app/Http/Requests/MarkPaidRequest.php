<?php

namespace Modules\Commerce\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MarkPaidRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'payment_method'  => 'required|in:cash,bank_transfer,cheque,other',
            'transaction_ref' => 'nullable|string',
            'notes'           => 'nullable|string',
        ];
    }
}
