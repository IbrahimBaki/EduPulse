<script setup>
import { ref } from 'vue';

// Mocked Teacher Dashboard Data
const stats = [
  { name: 'Active Courses', stat: '5', change: '+2', changeType: 'increase' },
  { name: 'Total Students Enrolled', stat: '1,240', change: '+120', changeType: 'increase' },
  { name: 'Pending Submissions', stat: '45', change: '-12', changeType: 'decrease' },
  { name: 'Avg. Course Rating', stat: '4.8/5.0', change: '+0.1', changeType: 'increase' },
];

const recentSubmissions = ref([
  { id: 1, student: 'Ahmed Ali', course: 'Advanced Mathematics', assignment: 'Calculus Quiz 1', date: '2 hours ago', status: 'Pending Review' },
  { id: 2, student: 'Mona Hassan', course: 'Physics Fundamentals', assignment: 'Lab Report', date: '5 hours ago', status: 'Pending Review' },
  { id: 3, student: 'Omar Zayed', course: 'Advanced Mathematics', assignment: 'Algebra Homework', date: '1 day ago', status: 'Graded (95%)' },
]);
</script>

<template>
  <div class="space-y-8">
    
    <!-- KPI Stats -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="item in stats" :key="item.name" class="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow-sm rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
        <dt>
          <p class="text-sm font-medium text-slate-500 truncate">{{ item.name }}</p>
        </dt>
        <dd class="pb-6 flex items-baseline sm:pb-7">
          <p class="text-3xl font-bold text-slate-900">{{ item.stat }}</p>
          <p :class="[item.changeType === 'increase' ? 'text-green-600' : 'text-red-600', 'ml-2 flex items-baseline text-sm font-semibold']">
            <svg v-if="item.changeType === 'increase'" class="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
            <svg v-else class="self-center flex-shrink-0 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
            <span class="sr-only"> {{ item.changeType === 'increase' ? 'Increased' : 'Decreased' }} by </span>
            {{ item.change }}
          </p>
          <div class="absolute bottom-0 inset-x-0 bg-slate-50 px-4 py-4 sm:px-6 border-t border-slate-100">
            <div class="text-sm">
              <a href="#" class="font-medium text-sky-600 hover:text-sky-500"> View all<span class="sr-only"> {{ item.name }} stats</span></a>
            </div>
          </div>
        </dd>
      </div>
    </div>

    <!-- Submissions & Quick Actions -->
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
      
      <!-- Recent Submissions Table -->
      <div class="lg:col-span-2 bg-white shadow-sm rounded-xl border border-slate-200">
        <div class="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
          <h3 class="text-lg leading-6 font-bold text-slate-900">Needs Grading</h3>
          <router-link to="/teacher/grading" class="text-sm font-medium text-sky-600 hover:text-sky-800">View All</router-link>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assignment</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" class="relative px-6 py-3"><span class="sr-only">Grade</span></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              <tr v-for="sub in recentSubmissions" :key="sub.id" class="hover:bg-slate-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-8 w-8">
                       <img class="h-8 w-8 rounded-full" :src="`https://ui-avatars.com/api/?name=${sub.student}&background=random`" alt="" />
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-slate-900">{{ sub.student }}</div>
                      <div class="text-sm text-slate-500">{{ sub.date }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-slate-900 font-medium">{{ sub.assignment }}</div>
                  <div class="text-sm text-slate-500">{{ sub.course }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    sub.status.includes('Pending') ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800',
                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full'
                  ]">
                    {{ sub.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href="#" class="text-sky-600 hover:text-sky-900">{{ sub.status.includes('Pending') ? 'Grade Now' : 'Review' }}</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Actions / Announcements -->
      <div class="bg-white shadow-sm rounded-xl border border-slate-200 p-6 h-full">
        <h3 class="text-lg leading-6 font-bold text-slate-900 mb-4">Quick Actions</h3>
        
        <div class="space-y-3">
          <router-link to="/teacher/courses/new" class="group flex items-center p-3 text-sm font-medium rounded-lg text-sky-700 bg-sky-50 shadow-sm hover:bg-sky-100 border border-sky-100 transition-colors">
            <span class="bg-white p-2 rounded-md shadow-sm mr-3 text-sky-600 group-hover:bg-sky-50">➕</span>
            Draft New Course
          </router-link>
          
          <button class="w-full group flex items-center p-3 text-sm font-medium rounded-lg text-emerald-700 bg-emerald-50 shadow-sm hover:bg-emerald-100 border border-emerald-100 transition-colors text-left">
            <span class="bg-white p-2 rounded-md shadow-sm mr-3 text-emerald-600 group-hover:bg-emerald-50">📹</span>
            Schedule Live Class
          </button>
          
          <button class="w-full group flex items-center p-3 text-sm font-medium rounded-lg text-purple-700 bg-purple-50 shadow-sm hover:bg-purple-100 border border-purple-100 transition-colors text-left">
            <span class="bg-white p-2 rounded-md shadow-sm mr-3 text-purple-600 group-hover:bg-purple-50">📢</span>
            Send Announcement
          </button>
        </div>

        <div class="mt-8 border-t border-slate-100 pt-6">
           <h4 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Upcoming Schedule</h4>
           <div class="text-sm border-l-2 border-sky-500 pl-3 py-1 mb-3">
             <p class="font-bold text-slate-800">Advanced Math - Live Q&A</p>
             <p class="text-slate-500">Today, 2:00 PM - 3:30 PM</p>
           </div>
           <div class="text-sm border-l-2 border-emerald-500 pl-3 py-1">
             <p class="font-bold text-slate-800">Physics Lab Introduction</p>
             <p class="text-slate-500">Tomorrow, 10:00 AM</p>
           </div>
        </div>
      </div>

    </div>
  </div>
</template>
