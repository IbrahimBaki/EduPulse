<script setup>
import { ref } from 'vue';

// Mocked enrolled courses data
const courses = ref([
  { 
    id: 1, 
    title: 'Advanced Mathematics', 
    subject: 'Math', 
    instructor: 'Dr. Hassan', 
    progress: 65, 
    image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600&h=400',
    status: 'In Progress',
    color: 'bg-indigo-500'
  },
  { 
    id: 2, 
    title: 'Physics Fundamentals', 
    subject: 'Science', 
    instructor: 'Eng. Sarah', 
    progress: 32, 
    image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&q=80&w=600&h=400',
    status: 'In Progress',
    color: 'bg-emerald-500' 
  },
  { 
    id: 3, 
    title: 'English Literature', 
    subject: 'Languages', 
    instructor: 'Mr. David', 
    progress: 100, 
    image: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600&h=400',
    status: 'Completed',
    color: 'bg-green-500' 
  },
  { 
    id: 4, 
    title: 'World History', 
    subject: 'Humanities', 
    instructor: 'Ms. Alice', 
    progress: 0, 
    image: 'https://images.unsplash.com/photo-1447069387366-2a67bc4acfff?auto=format&fit=crop&q=80&w=600&h=400',
    status: 'Not Started',
    color: 'bg-gray-400' 
  },
]);

const getStatusBadge = (status) => {
  switch (status) {
    case 'Completed': return 'bg-green-100 text-green-800';
    case 'In Progress': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
</script>

<template>
  <div>
    <!-- Filters / Breadcrumbs Placeholder -->
    <div class="mb-8 flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div class="flex space-x-2">
        <button class="px-4 py-2 bg-indigo-50 text-indigo-700 font-medium text-sm rounded-lg hover:bg-indigo-100 transition-colors">All Courses</button>
        <button class="px-4 py-2 text-gray-600 font-medium text-sm rounded-lg hover:bg-gray-50 transition-colors">In Progress</button>
        <button class="px-4 py-2 text-gray-600 font-medium text-sm rounded-lg hover:bg-gray-50 transition-colors">Completed</button>
      </div>
      <div class="mt-4 sm:mt-0 relative rounded-md shadow-sm max-w-xs w-full">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </div>
        <input type="text" class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-2 border" placeholder="Search courses..." />
      </div>
    </div>

    <!-- Course Grid -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div v-for="course in courses" :key="course.id" class="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 group flex flex-col h-full cursor-pointer hover:-translate-y-1">
        
        <!-- Image Cover -->
        <div class="relative h-48 w-full bg-gray-200 overflow-hidden">
          <img :src="course.image" :alt="course.title" class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute top-4 left-4">
            <span :class="getStatusBadge(course.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm bg-white/90">
              {{ course.status }}
            </span>
          </div>
          <div class="absolute bottom-4 right-4 bg-gray-900/70 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm shadow-sm flex items-center">
            {{ course.subject }}
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-6 flex-1 flex flex-col">
          <h3 class="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
            {{ course.title }}
          </h3>
          <p class="text-sm text-gray-500 mb-4 font-medium flex-1">
            Instructor: {{ course.instructor }}
          </p>
          
          <!-- Progress Stats -->
          <div class="mt-auto pt-4 border-t border-gray-50">
            <div class="flex items-center justify-between text-sm font-bold mb-2">
              <span class="text-gray-900">Progress</span>
              <span :class="course.progress === 100 ? 'text-green-600' : 'text-indigo-600'">{{ course.progress }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div :class="[course.color, 'h-2 rounded-full transition-all duration-1000 ease-out']" :style="{ width: course.progress + '%' }"></div>
            </div>
            <div class="mt-4">
               <button class="w-full text-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                 {{ course.progress === 0 ? 'Start Course' : course.progress === 100 ? 'Review Material' : 'Resume Learning' }}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
