<?php

namespace Modules\Communication\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class IncomingWebhookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'secret'     => 'required|string',
            'type'       => 'required|string',
            'user_ids'   => 'required|array',
            'user_ids.*' => 'integer',
            'title'      => 'required|string',
            'body'       => 'required|string',
            'data'       => 'nullable|array',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->secret !== env('N8N_INCOMING_SECRET')) {
                $validator->errors()->add('secret', 'Invalid webhook secret');
            }
        });
    }
}
