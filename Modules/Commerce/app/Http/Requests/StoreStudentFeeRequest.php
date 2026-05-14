<?php

namespace Modules\Commerce\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentFeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('manager');
    }

    public function rules(): array
    {
        return [
            'student_id'       => 'required|exists:users,id',
            'fee_structure_id' => 'nullable|exists:fee_structures,id',
            'course_id'        => 'nullable|exists:courses,id',
            'description'      => 'required|string|max:255',
            'amount'           => 'required|numeric|min:0',
            'currency'         => 'nullable|string|max:10',
            'due_date'         => 'nullable|date',
        ];
    }
}
