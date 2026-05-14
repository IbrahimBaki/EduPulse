<?php

namespace Modules\IAM\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\Academic\Models\Enrollment;
use Modules\IAM\Http\Requests\RejectEnrollmentRequest;
use Modules\IAM\Models\EnrollmentRequest;

class EnrollmentRequestController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $query = EnrollmentRequest::with('student', 'course', 'requestedBy');

        if (request('status')) {
            $query->where('status', request('status'));
        }

        return $this->ReturnSuccess($query->paginate(15), 'Enrollment requests retrieved');
    }

    public function approve($id)
    {
        $enrollmentRequest = EnrollmentRequest::where('status', 'pending')->findOrFail($id);
        $tenant = app('tenant');

        $enrollmentRequest->update([
            'status'      => 'approved',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        Enrollment::firstOrCreate([
            'tenant_id'  => $tenant->id,
            'course_id'  => $enrollmentRequest->course_id,
            'student_id' => $enrollmentRequest->student_id,
        ], [
            'enrolled_at' => now(),
            'fee_amount'  => $enrollmentRequest->fee_amount,
            'fee_paid'    => $enrollmentRequest->fee_paid,
        ]);

        SendN8nWebhookJob::dispatch('enrollment_approved', [
            'enrollment_request_id' => $enrollmentRequest->id,
            'student_id'            => $enrollmentRequest->student_id,
            'course_id'             => $enrollmentRequest->course_id,
        ], $tenant->id);

        return $this->ReturnSuccess($enrollmentRequest->fresh(), 'Enrollment approved');
    }

    public function reject(RejectEnrollmentRequest $request, $id)
    {
        $enrollmentRequest = EnrollmentRequest::where('status', 'pending')->findOrFail($id);
        $tenant = app('tenant');

        $enrollmentRequest->update([
            'status'      => 'rejected',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'notes'       => $request->notes,
        ]);

        SendN8nWebhookJob::dispatch('enrollment_rejected', [
            'enrollment_request_id' => $enrollmentRequest->id,
            'student_id'            => $enrollmentRequest->student_id,
            'course_id'             => $enrollmentRequest->course_id,
        ], $tenant->id);

        return $this->ReturnSuccess($enrollmentRequest->fresh(), 'Enrollment rejected');
    }
}
