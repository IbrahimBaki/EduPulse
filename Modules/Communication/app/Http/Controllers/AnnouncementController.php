<?php

namespace Modules\Communication\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponser;
use Modules\AI\Jobs\SendN8nWebhookJob;
use Modules\Communication\Http\Requests\StoreAnnouncementRequest;
use Modules\Communication\Models\Announcement;

class AnnouncementController extends Controller
{
    use ApiResponser;

    public function index()
    {
        $announcements = Announcement::with('creator')->paginate(15);
        return $this->ReturnSuccess($announcements, 'Announcements retrieved');
    }

    public function store(StoreAnnouncementRequest $request)
    {
        $announcement = Announcement::create(
            $request->validated() + [
                'tenant_id'  => app('tenant')->id,
                'created_by' => auth()->id(),
            ]
        );

        return $this->ReturnSuccess($announcement, 'Announcement created', 201);
    }

    public function publish($id)
    {
        $announcement = Announcement::findOrFail($id);
        $tenant = app('tenant');

        if (auth()->user()->hasRole('teacher') && $announcement->created_by !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $announcement->update([
            'is_published' => true,
            'published_at' => now(),
        ]);

        SendN8nWebhookJob::dispatch('announcement_published', [
            'announcement_id' => $announcement->id,
            'title'           => $announcement->title,
            'audience'        => $announcement->audience,
        ], $tenant->id);

        return $this->ReturnSuccess($announcement->fresh(), 'Announcement published');
    }

    public function destroy($id)
    {
        $announcement = Announcement::findOrFail($id);

        if (auth()->user()->hasRole('teacher') && $announcement->created_by !== auth()->id()) {
            return $this->ReturnFailed('Unauthorized', 403);
        }

        $announcement->delete();
        return $this->ReturnSuccess(null, 'Announcement deleted');
    }

    public function studentIndex()
    {
        $student = auth()->user();

        $announcements = Announcement::published()
            ->notExpired()
            ->forStudent($student)
            ->with('creator')
            ->paginate(15);

        return $this->ReturnSuccess($announcements, 'Announcements retrieved');
    }

    public function parentIndex()
    {
        $parent = auth()->user();
        $children = $parent->children;

        $courseIds = collect();
        $gradeIds = collect();

        foreach ($children as $child) {
            $gradeIds->push($child->studentProfile?->grade_level_id);
            $courseIds = $courseIds->merge(
                \Modules\Academic\Models\Enrollment::where('student_id', $child->id)->pluck('course_id')
            );
        }

        $announcements = Announcement::published()
            ->notExpired()
            ->where(function ($q) use ($gradeIds, $courseIds) {
                $q->where('audience', 'all')
                  ->orWhere(fn($q2) => $q2->where('audience', 'grade_level')->whereIn('audience_id', $gradeIds->filter()))
                  ->orWhere(fn($q2) => $q2->where('audience', 'course')->whereIn('audience_id', $courseIds));
            })
            ->with('creator')
            ->paginate(15);

        return $this->ReturnSuccess($announcements, 'Announcements retrieved');
    }
}
