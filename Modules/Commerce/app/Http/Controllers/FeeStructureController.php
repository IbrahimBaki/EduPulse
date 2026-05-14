<?php

namespace Modules\Commerce\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Modules\Commerce\Http\Requests\StoreFeeStructureRequest;
use Modules\Commerce\Models\FeeStructure;

class FeeStructureController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $feeStructures = FeeStructure::orderBy('name')->get();
        return $this->ReturnSuccess($feeStructures, 'Fee structures retrieved');
    }

    public function store(StoreFeeStructureRequest $request)
    {
        $feeStructure = FeeStructure::create(
            $request->validated() + ['tenant_id' => app('tenant')->id]
        );
        return $this->ReturnSuccess($feeStructure, 'Fee structure created', 201);
    }

    public function update(StoreFeeStructureRequest $request, $id)
    {
        $feeStructure = FeeStructure::findOrFail($id);

        $hasPaidFees = $feeStructure->studentFees()->where('status', 'paid')->exists();
        if ($hasPaidFees && $request->has('amount') && $request->amount != $feeStructure->amount) {
            return $this->ReturnFailed('Cannot change amount for fee structure with paid fees', 422);
        }

        $feeStructure->update($request->validated());
        return $this->ReturnSuccess($feeStructure->fresh(), 'Fee structure updated');
    }

    public function toggleActive($id)
    {
        $feeStructure = FeeStructure::findOrFail($id);
        $feeStructure->update(['is_active' => !$feeStructure->is_active]);
        return $this->ReturnSuccess(['is_active' => $feeStructure->is_active], 'Status toggled');
    }
}
