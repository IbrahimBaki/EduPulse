<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// Mocked Academy Executive Data
const kpis = [
  { name: 'Total Revenue (MTD)', stat: '$12,450', change: '+14%', changeType: 'increase' },
  { name: 'Active Students', stat: '842', change: '+5.4%', changeType: 'increase' },
  { name: 'Active Instructors', stat: '18', change: '0%', changeType: 'neutral' },
  { name: 'Total Courses', stat: '45', change: '+2', changeType: 'increase' },
];

const recentSignups = ref([
  { id: 1, name: 'Khaled Omar', role: 'Student', date: '10 mins ago', status: 'Active' },
  { id: 2, name: 'Donia Sami', role: 'Student', date: '1 hr ago', status: 'Pending Payment' },
  { id: 3, name: 'Dr. Tarek', role: 'Teacher', date: '3 hrs ago', status: 'Active' },
  { id: 4, name: 'Youssef Ahmed', role: 'Student', date: '1 day ago', status: 'Active' },
]);

const revenueByCourseData = ref([
  { course: 'Advanced Mathematics', revenue: '$3,200', percentage: 45, color: 'bg-indigo-500' },
  { course: 'Physics Basics', revenue: '$1,800', percentage: 25, color: 'bg-emerald-500' },
  { course: 'English Literature', revenue: '$1,500', percentage: 20, color: 'bg-sky-500' },
  { course: 'Others', revenue: '$800', percentage: 10, color: 'bg-slate-300' },
]);
</script>

<template>
  <div class="space-y-8">
    
    <!-- KPI Stats -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="item in kpis" :key="item.name" class="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
        <dt>
          <p class="text-sm font-medium text-slate-500 truncate uppercase tracking-wider">{{ item.name }}</p>
        </dt>
        <dd class="mt-2 flex items-baseline justify-between">
          <p class="text-3xl font-bold text-slate-900">{{ item.stat }}</p>
          <div :class="[
            item.changeType === 'increase' ? 'bg-green-100 text-green-800' : 
            item.changeType === 'decrease' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800',
            'px-2 py-0.5 rounded-full text-xs font-semibold'
          ]">
            {{ item.change }}
          </div>
        </dd>
      </div>
    </div>

    <!-- Main Content Split -->
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
      
      <!-- Recent User Activity -->
      <div class="lg:col-span-2 bg-white shadow-sm rounded-xl border border-slate-200">
        <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 class="text-base font-bold text-slate-900 flex items-center">
            <svg class="h-5 w-5 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            Recent Platform Activity
          </h3>
          <router-link :to="`/${route.params.tenantCode}/manager/users`" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">Manage Users</router-link>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined At</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-100">
              <tr v-for="user in recentSignups" :key="user.id" class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-8 w-8">
                       <img class="h-8 w-8 rounded-full" :src="`https://ui-avatars.com/api/?name=${user.name}&background=random`" alt="" />
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-bold text-slate-900">{{ user.name }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                      user.role === 'Teacher' ? 'text-sky-700 bg-sky-100' : 'text-slate-600 bg-slate-100',
                      'px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md'
                  ]">
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {{ user.date }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                   <span v-if="user.status === 'Active'" class="text-green-600 text-sm font-medium flex items-center">
                     <span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span> Active
                   </span>
                   <span v-else class="text-orange-500 text-sm font-medium flex items-center">
                     <span class="w-1.5 h-1.5 bg-orange-400 rounded-full mr-2"></span> {{ user.status }}
                   </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Financial / Breakdown Widget -->
      <div class="bg-white shadow-sm rounded-xl border border-slate-200 p-6 flex flex-col h-full">
        <h3 class="text-base font-bold text-slate-900 mb-6 flex items-center">
          <svg class="h-5 w-5 text-emerald-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Revenue by Course
        </h3>
        
        <div class="space-y-4 flex-grow">
          <div v-for="item in revenueByCourseData" :key="item.course">
            <div class="flex items-center justify-between text-sm mb-1 text-slate-700 font-medium">
              <span>{{ item.course }}</span>
              <span class="text-slate-900 font-bold">{{ item.revenue }}</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2">
              <div :class="[item.color, 'h-2 rounded-full']" :style="{ width: item.percentage + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="mt-8 border-t border-slate-100 pt-6">
           <button class="w-full bg-slate-50 border border-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors text-sm">
             View Deep Financial Report &rarr;
           </button>
        </div>
      </div>

    </div>
  </div>
</template>
