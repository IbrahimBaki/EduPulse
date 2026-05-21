<?php

namespace Modules\Commerce\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponser;
use Illuminate\Support\Facades\DB;
use Modules\Commerce\Models\PaymentTransaction;
use Modules\Commerce\Models\StudentFee;

class FinanceDashboardController extends Controller
{
    use ApiResponser;

    public function summary()
    {
        $totals = StudentFee::selectRaw('
            SUM(amount) as total_expected,
            SUM(CASE WHEN status = "paid" THEN amount ELSE 0 END) as collected,
            SUM(CASE WHEN status = "pending" THEN amount ELSE 0 END) as pending,
            SUM(CASE WHEN status = "overdue" THEN amount ELSE 0 END) as overdue
        ')->first();

        $totalExpected = (float) ($totals->total_expected ?? 0);
        $collected = (float) ($totals->collected ?? 0);

        $collectionRate = $totalExpected > 0
            ? round(($collected / $totalExpected) * 100, 2)
            : 0;

        $overdueStudents = StudentFee::where('status', 'overdue')
            ->with('student:id,name,email')
            ->select('student_id')
            ->distinct()
            ->get()
            ->pluck('student');

        return $this->ReturnSuccess([
            'expected'         => $totalExpected,
            'collected'        => $collected,
            'pending'          => (float) ($totals->pending ?? 0),
            'overdue'          => (float) ($totals->overdue ?? 0),
            'collection_rate'  => $collectionRate,
            'overdue_students' => $overdueStudents,
        ], 'Finance summary retrieved');
    }

    public function feesByParent()
    {
        $parents = User::role('parent')
            ->whereHas('children.studentFees')
            ->with([
                'children' => function ($q) {
                    $q->whereHas('studentFees')
                      ->with([
                          'studentFees' => fn($q2) => $q2->orderByRaw(
                              "CASE status WHEN 'overdue' THEN 0 WHEN 'pending' THEN 1 WHEN 'paid' THEN 2 ELSE 3 END"
                          )
                      ])
                      ->select('users.id', 'users.name', 'users.email', 'users.avatar_url');
                }
            ])
            ->select('id', 'name', 'email')
            ->get();

        return $this->ReturnSuccess($parents, 'Fees by parent retrieved');
    }

    public function transactions()
    {
        $query = PaymentTransaction::with('studentFee.student', 'createdBy');

        if (request('student_id')) {
            $query->whereHas('studentFee', fn($q) => $q->where('student_id', request('student_id')));
        }
        if (request('status')) {
            $query->where('status', request('status'));
        }
        if (request('payment_method')) {
            $query->where('payment_method', request('payment_method'));
        }

        return $this->ReturnSuccess($query->orderByDesc('created_at')->paginate(15), 'Transactions retrieved');
    }
}
