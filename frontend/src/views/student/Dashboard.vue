<script setup>
import { ref } from 'vue';

// Mocked Dashboard Data for initial UX showcase
const stats = [
  { name: 'Enrolled Courses', stat: '4', icon: '📚', color: 'bg-blue-100 text-blue-600' },
  { name: 'Completed Lessons', stat: '28', icon: '✅', color: 'bg-green-100 text-green-600' },
  { name: 'Pending Assignments', stat: '2', icon: '📝', color: 'bg-orange-100 text-orange-600' },
  { name: 'Current Rank', stat: 'Gold Scholar', icon: '🏆', color: 'bg-yellow-100 text-yellow-600' },
];

const activeCourses = ref([
  { id: 1, title: 'Advanced Mathematics', instructor: 'Dr. Hassan', progress: 65, color: 'bg-indigo-500' },
  { id: 2, title: 'Physics Fundamentals', instructor: 'Eng. Sarah', progress: 32, color: 'bg-emerald-500' },
  { id: 3, title: 'English Literature', instructor: 'Mr. David', progress: 89, color: 'bg-rose-500' },
]);

const recentBadges = ref([
  { id: 1, name: 'First Assignment', icon: '🌟', date: '2 days ago' },
  { id: 2, name: 'Quick Learner', icon: '⚡', date: '1 week ago' },
  { id: 3, name: 'Math Quiz Pro', icon: '🧮', date: '2 weeks ago' },
]);
</script>

<template>
  <div class="space-y-8">
    
    <!-- Top Stats Row -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="item in stats" :key="item.name" class="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl" :class="item.color">
              {{ item.icon }}
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">{{ item.name }}</dt>
                <dd>
                  <div class="text-2xl font-bold text-gray-900">{{ item.stat }}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Split -->
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
      
      <!-- My Active Courses (takes 2 col on Desktop) -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
          <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <h3 class="text-lg leading-6 font-bold text-gray-900">Continue Learning</h3>
            <router-link to="/student/courses" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View All &rarr;</router-link>
          </div>
          <div class="divide-y divide-gray-100">
            <div v-for="course in activeCourses" :key="course.id" class="p-6 hover:bg-gray-50 transition-colors cursor-pointer">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <h4 class="text-base font-bold text-gray-900">{{ course.title }}</h4>
                  <p class="text-sm text-gray-500">with {{ course.instructor }}</p>
                </div>
                <div class="text-sm font-bold text-gray-700">{{ course.progress }}%</div>
              </div>
              
              <!-- Progress Bar -->
              <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div :class="course.color" class="h-2.5 rounded-full transition-all duration-500" :style="{ width: course.progress + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Gamification / Recent Badges -->
      <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 h-full p-6">
        <div class="text-center mb-6">
          <div class="inline-block p-4 rounded-full bg-indigo-100 mb-3">
            <span class="text-4xl">🏆</span>
          </div>
          <h3 class="text-xl font-bold text-gray-900">Your Achievements</h3>
          <p class="text-sm text-gray-500 mt-1">Keep learning to unlock more!</p>
        </div>

        <ul role="list" class="divide-y divide-indigo-100/50">
          <li v-for="badge in recentBadges" :key="badge.id" class="py-4 flex items-center">
            <div class="flex-shrink-0 w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center text-xl border border-indigo-50">
              {{ badge.icon }}
            </div>
            <div class="ml-3 flex-1">
              <p class="text-sm font-bold text-gray-900">{{ badge.name }}</p>
              <p class="text-xs text-gray-500">{{ badge.date }}</p>
            </div>
          </li>
        </ul>

        <div class="mt-6">
          <button type="button" class="w-full inline-flex justify-center items-center px-4 py-2 border border-indigo-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
            View All Badges
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
