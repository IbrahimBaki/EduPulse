<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['manager', 'teacher']);
    }

    public function rules(): array
    {
        return [
            'attendance'              => 'required|array',
            'attendance.*.student_id' => 'required|integer|exists:users,id',
            'attendance.*.status'     => 'required|in:present,absent,late,excused',
            'attendance.*.notes'      => 'nullable|string',
        ];
    }
}
