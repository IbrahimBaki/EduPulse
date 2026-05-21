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
        $parent   = auth()->user();
        $children = $parent->children;

        $courseIds    = collect();
        $gradeIds     = collect();
        $childByCourse = [];
        $childByGrade  = [];

        foreach ($children as $child) {
            $gradeId = $child->studentProfile?->grade_level_id;
            if ($gradeId) {
                $gradeIds->push($gradeId);
                $childByGrade[$gradeId] = $child->name;
            }
            $childCourseIds = \Modules\Academic\Models\Enrollment::where('student_id', $child->id)->pluck('course_id');
            foreach ($childCourseIds as $cid) {
                $courseIds->push($cid);
                $childByCourse[$cid] = $child->name;
            }
        }

        $gradeLevels = $gradeIds->isNotEmpty()
            ? \Modules\Academic\Models\GradeLevel::whereIn('id', $gradeIds->filter()->unique())->pluck('name', 'id')
            : collect();

        $courses = $courseIds->isNotEmpty()
            ? \Modules\Academic\Models\Course::whereIn('id', $courseIds->unique())->pluck('name', 'id')
            : collect();

        $announcements = Announcement::published()
            ->notExpired()
            ->where(function ($q) use ($gradeIds, $courseIds) {
                $q->where('audience', 'all')
                  ->orWhere(fn($q2) => $q2->where('audience', 'grade_level')->whereIn('audience_id', $gradeIds->filter()))
                  ->orWhere(fn($q2) => $q2->where('audience', 'course')->whereIn('audience_id', $courseIds));
            })
            ->latest('published_at')
            ->get()
            ->map(fn($a) => [
                'id'          => $a->id,
                'title'       => $a->title,
                'body'        => $a->body,
                'scope'       => match ($a->audience) {
                    'grade_level' => 'grade',
                    'course'      => 'course',
                    default       => 'school',
                },
                'scope_label' => match ($a->audience) {
                    'grade_level' => $gradeLevels[$a->audience_id] ?? 'Grade',
                    'course'      => $courses[$a->audience_id] ?? 'Course',
                    default       => 'School-wide',
                },
                'child_name'  => match ($a->audience) {
                    'grade_level' => $childByGrade[$a->audience_id] ?? null,
                    'course'      => $childByCourse[$a->audience_id] ?? null,
                    default       => null,
                },
                'created_at'  => $a->created_at->toIso8601String(),
                'is_read'     => false,
            ]);

        return $this->ReturnSuccess(['announcements' => $announcements], 'Announcements retrieved');
    }
}
