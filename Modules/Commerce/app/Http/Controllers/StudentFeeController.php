<?php

namespace Modules\Commerce\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponser;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\Academic\Models\Course;
use Modules\Academic\Models\Enrollment;
use Modules\Commerce\Http\Requests\AssignBulkFeeRequest;
use Modules\Commerce\Http\Requests\MarkPaidRequest;
use Modules\Commerce\Http\Requests\StoreStudentFeeRequest;
use Modules\Commerce\Http\Requests\WaiveFeeRequest;
use Modules\Commerce\Models\FeeStructure;
use Modules\Commerce\Models\PaymentTransaction;
use Modules\Commerce\Models\StudentFee;

class StudentFeeController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $query = StudentFee::with('student', 'feeStructure', 'course');

        if (request('status')) {
            $query->where('status', request('status'));
        }
        if (request('student_id')) {
            $query->where('student_id', request('student_id'));
        }
        if (request('course_id')) {
            $query->where('course_id', request('course_id'));
        }

        return $this->ReturnSuccess($query->paginate(15), 'Student fees retrieved');
    }

    public function store(StoreStudentFeeRequest $request)
    {
        $fee = StudentFee::create(
            $request->validated() + [
                'tenant_id'  => app('tenant')->id,
                'created_by' => auth()->id(),
            ]
        );

        return $this->ReturnSuccess($fee->load('student', 'feeStructure'), 'Fee created', 201);
    }

    public function assignBulk(AssignBulkFeeRequest $request, $feeStructureId)
    {
        $feeStructure = FeeStructure::findOrFail($feeStructureId);
        $tenant = app('tenant');
        $created = 0;

        if ($request->target === 'grade_level') {
            $students = User::role('student')
                ->whereHas('studentProfile', fn($q) => $q->where('grade_level_id', $request->target_id))
                ->get();
        } else {
            $studentIds = Enrollment::where('course_id', $request->target_id)->pluck('student_id');
            $students = User::whereIn('id', $studentIds)->get();
        }

        foreach ($students as $student) {
            $exists = StudentFee::where('student_id', $student->id)
                ->where('fee_structure_id', $feeStructure->id)
                ->exists();

            if (!$exists) {
                StudentFee::create([
                    'tenant_id'        => $tenant->id,
                    'student_id'       => $student->id,
                    'fee_structure_id' => $feeStructure->id,
                    'course_id'        => $request->target === 'course' ? $request->target_id : null,
                    'description'      => $feeStructure->name,
                    'amount'           => $feeStructure->amount,
                    'currency'         => $feeStructure->currency,
                    'due_date'         => $feeStructure->due_date,
                    'created_by'       => auth()->id(),
                ]);
                $created++;
            }
        }

        SendN8nWebhookJob::dispatch('fees_assigned', [
            'fee_structure_id' => $feeStructure->id,
            'target'           => $request->target,
            'target_id'        => $request->target_id,
            'created_count'    => $created,
        ], $tenant->id);

        return $this->ReturnSuccess(['created' => $created, 'skipped' => count($students) - $created], 'Fees assigned');
    }

    public function markPaid(MarkPaidRequest $request, $id)
    {
        $fee = StudentFee::findOrFail($id);
        $tenant = app('tenant');

        $fee->update([
            'status'          => 'paid',
            'paid_at'         => now(),
            'payment_method'  => $request->payment_method,
            'transaction_ref' => $request->transaction_ref,
            'notes'           => $request->notes,
        ]);

        PaymentTransaction::create([
            'tenant_id'      => $tenant->id,
            'student_fee_id' => $fee->id,
            'amount'         => $fee->amount,
            'currency'       => $fee->currency,
            'payment_method' => $request->payment_method,
            'status'         => 'completed',
            'gateway'        => 'manual',
            'gateway_ref'    => $request->transaction_ref,
            'paid_at'        => now(),
            'created_by'     => auth()->id(),
        ]);

        SendN8nWebhookJob::dispatch('fee_paid', [
            'fee_id'     => $fee->id,
            'student_id' => $fee->student_id,
            'amount'     => $fee->amount,
        ], $tenant->id);

        return $this->ReturnSuccess($fee->fresh(), 'Fee marked as paid');
    }

    public function markOverdue($id)
    {
        $fee = StudentFee::findOrFail($id);
        $tenant = app('tenant');

        $fee->update(['status' => 'overdue']);

        SendN8nWebhookJob::dispatch('fee_overdue', [
            'fee_id'     => $fee->id,
            'student_id' => $fee->student_id,
            'amount'     => $fee->amount,
        ], $tenant->id);

        return $this->ReturnSuccess($fee->fresh(), 'Fee marked as overdue');
    }

    public function waive(WaiveFeeRequest $request, $id)
    {
        $fee = StudentFee::findOrFail($id);
        $fee->update(['status' => 'waived', 'notes' => $request->notes]);
        return $this->ReturnSuccess($fee->fresh(), 'Fee waived');
    }

    public function myFees()
    {
        $fees = StudentFee::where('student_id', auth()->id())
            ->with('feeStructure', 'course')
            ->orderByRaw("CASE status WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 WHEN 'waived' THEN 2 ELSE 3 END")
            ->paginate(15);

        return $this->ReturnSuccess($fees, 'My fees retrieved');
    }

    public function childrenFees()
    {
        $childIds = auth()->user()->children()->pluck('users.id');

        $fees = StudentFee::whereIn('student_id', $childIds)
            ->with('student', 'feeStructure', 'course')
            ->paginate(15);

        return $this->ReturnSuccess($fees, 'Children fees retrieved');
    }
}
