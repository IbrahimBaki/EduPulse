<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;

class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use \Laravel\Sanctum\HasApiTokens, HasFactory, Notifiable, \App\Traits\BelongsToTenant, \Spatie\Permission\Traits\HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'national_id',
        'is_active',
        'tenant_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the children associated with the parent (if user is a Parent).
     */
    public function children()
    {
        return $this->belongsToMany(User::class, 'parent_student', 'parent_id', 'student_id')
            ->withTimestamps();
    }

    /**
     * Get the parents associated with the child (if user is a Student).
     */
    public function parents()
    {
        return $this->belongsToMany(User::class, 'parent_student', 'student_id', 'parent_id')
            ->withTimestamps();
    }

    public function studentProfile()
    {
        return $this->hasOne(\Modules\IAM\Models\StudentProfile::class, 'student_id');
    }

    public function teacherAssignments()
    {
        return $this->hasMany(\Modules\IAM\Models\TeacherAssignment::class, 'teacher_id');
    }

    public function weakTopics()
    {
        return $this->hasMany(\Modules\AI\Models\WeakTopic::class, 'student_id');
    }

    public function quizAttempts()
    {
        return $this->hasMany(\Modules\AI\Models\QuizAttempt::class, 'student_id');
    }

    /**
     * Determine if the user can access the Filament admin panel.
     */
    public function canAccessPanel(Panel $panel): bool
    {
        // Only allow superadmin for now
        return str_ends_with($this->email, '@edupulse.com') && $this->tenant_id === null;
    }
}
