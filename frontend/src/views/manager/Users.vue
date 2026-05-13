<script setup>
import { ref } from 'vue';

const activeTab = ref('students');
const tabs = [
  { id: 'students', name: 'Students' },
  { id: 'teachers', name: 'Instructors' },
  { id: 'parents', name: 'Parents' },
];

const users = ref([
  { id: 1, name: 'Khaled Omar', email: 'khaled@example.com', role: 'student', status: 'Active', joined: 'Oct 12, 2026' },
  { id: 2, name: 'Donia Sami', email: 'donia@example.com', role: 'student', status: 'Active', joined: 'Oct 14, 2026' },
  { id: 3, name: 'Dr. Tarek Youssef', email: 'tarek@example.com', role: 'teacher', status: 'Active', joined: 'Sep 01, 2026' },
  { id: 4, name: 'Youssef Ahmed', email: 'youssef@example.com', role: 'student', status: 'Inactive', joined: 'Nov 02, 2026' },
  { id: 5, name: 'Mona Ali (Parent)', email: 'mona@example.com', role: 'parent', status: 'Active', joined: 'Oct 12, 2026' },
]);

const displayedUsers = () => {
  return users.value.filter(u => u.role === activeTab.value.replace('s', '').replace('instructor', 'teacher'));
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Actions -->
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:tracking-tight">User Management</h2>
        <p class="mt-1 text-sm text-slate-500">View, invite, and manage all platform participants across roles.</p>
      </div>
      <div class="mt-4 sm:ml-4 sm:mt-0 flex gap-3">
        <button type="button" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
          Export CSV
        </button>
        <button type="button" class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          + Invite User
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div>
      <div class="sm:hidden">
        <label for="tabs" class="sr-only">Select a tab</label>
        <select id="tabs" name="tabs" v-model="activeTab" class="block w-full rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500">
          <option v-for="tab in tabs" :key="tab.id" :value="tab.id">{{ tab.name }}</option>
        </select>
      </div>
      <div class="hidden sm:block">
        <div class="border-b border-slate-200">
          <nav class="-mb-px flex space-x-8" aria-label="Tabs">
            <button 
              v-for="tab in tabs" 
              :key="tab.id" 
              @click="activeTab = tab.id"
              :class="[activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700', 'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium']">
              {{ tab.name }}
            </button>
          </nav>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Name</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Email</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Status</th>
              <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Joined</th>
              <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span class="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="person in displayedUsers()" :key="person.id" class="hover:bg-slate-50 transition-colors">
              <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6 flex items-center gap-3">
                <img :src="`https://ui-avatars.com/api/?name=${person.name}&background=random`" class="h-8 w-8 rounded-full" alt="" />
                {{ person.name }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{{ person.email }}</td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                <span :class="[person.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700', 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-green-600/20']">
                  {{ person.status }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{{ person.joined }}</td>
              <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <a href="#" class="text-indigo-600 hover:text-indigo-900">Edit <span class="sr-only">, {{ person.name }}</span></a>
              </td>
            </tr>
            <tr v-if="displayedUsers().length === 0">
              <td colspan="5" class="py-8 text-center text-sm text-slate-500">No users found in this category.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>
