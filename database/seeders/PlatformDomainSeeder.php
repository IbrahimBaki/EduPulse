<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Modules\Platform\Models\Tenant;

class PlatformDomainSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create the SUPER ADMIN (Platform Owner)
        // Note: Super admin doesn't belong to any specific tenant (tenant_id = null)
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@edupulse.com'],
            [
                'name' => 'Super Administrator',
                'password' => Hash::make('password'),
                'tenant_id' => null,
            ]
        );

        // 2. Create Dummy Academies (Tenants)
        $alphaAcademy = Tenant::firstOrCreate(
            ['code' => 'alpha-academy'],
            [
                'name' => 'Alpha International Academy',
                'status' => 'active',
            ]
        );

        $betaSchool = Tenant::firstOrCreate(
            ['code' => 'beta-school'],
            [
                'name' => 'Beta High School',
                'status' => 'active',
            ]
        );

        // 3. Seed Alpha Academy users with roles scoped to that tenant
        setPermissionsTeamId($alphaAcademy->id);

        $alphaManager = User::firstOrCreate(
            ['email' => 'manager@alpha.com'],
            [
                'name' => 'Alpha Manager',
                'password' => Hash::make('password'),
                'tenant_id' => $alphaAcademy->id,
            ]
        );
        $alphaManager->syncRoles(['manager']);

        $alphaTeacher = User::firstOrCreate(
            ['email' => 'teacher@alpha.com'],
            [
                'name' => 'Mr. Ahmed (Teacher)',
                'password' => Hash::make('password'),
                'tenant_id' => $alphaAcademy->id,
            ]
        );
        $alphaTeacher->syncRoles(['teacher']);

        $alphaStudent = User::firstOrCreate(
            ['email' => 'student@alpha.com'],
            [
                'name' => 'Omar Student',
                'password' => Hash::make('password'),
                'tenant_id' => $alphaAcademy->id,
            ]
        );
        $alphaStudent->syncRoles(['student']);

        $alphaParent = User::firstOrCreate(
            ['email' => 'parent@alpha.com'],
            [
                'name' => 'Omar Parent',
                'password' => Hash::make('password'),
                'tenant_id' => $alphaAcademy->id,
            ]
        );
        $alphaParent->syncRoles(['parent']);

        // 4. Seed Beta School users with roles scoped to that tenant
        setPermissionsTeamId($betaSchool->id);

        $betaManager = User::firstOrCreate(
            ['email' => 'manager@beta.com'],
            [
                'name' => 'Beta Manager',
                'password' => Hash::make('password'),
                'tenant_id' => $betaSchool->id,
            ]
        );
        $betaManager->syncRoles(['manager']);

        $this->command->info('✅ Platform Domain Seeder executed successfully!');
    }
}
