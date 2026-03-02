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

        // 3. Create Tenant-Specific Users (Managers)
        User::firstOrCreate(
            ['email' => 'manager@alpha.com'],
            [
                'name' => 'Alpha Manager',
                'password' => Hash::make('password'),
                'tenant_id' => $alphaAcademy->id,
            ]
        );

        User::firstOrCreate(
            ['email' => 'manager@beta.com'],
            [
                'name' => 'Beta Manager',
                'password' => Hash::make('password'),
                'tenant_id' => $betaSchool->id,
            ]
        );

        // 4. Create Students and Teachers for Alpha Academy
        User::firstOrCreate(
            ['email' => 'teacher@alpha.com'],
            [
                'name' => 'Mr. Ahmed (Teacher)',
                'password' => Hash::make('password'),
                'tenant_id' => $alphaAcademy->id,
            ]
        );

        User::firstOrCreate(
            ['email' => 'student@alpha.com'],
            [
                'name' => 'Omar Student',
                'password' => Hash::make('password'),
                'tenant_id' => $alphaAcademy->id,
            ]
        );

        User::firstOrCreate(
            ['email' => 'parent@alpha.com'],
            [
                'name' => 'Omar Parent',
                'password' => Hash::make('password'),
                'tenant_id' => $alphaAcademy->id,
            ]
        );

        $this->command->info('✅ Platform Domain Seeder executed successfully!');
    }
}
