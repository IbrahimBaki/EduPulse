<script setup>
import { ref } from 'vue';

// Mocked Teacher Courses Data
const courses = ref([
  { 
    id: 1, 
    title: 'Advanced Mathematics', 
    subject: 'Math', 
    students: 145,
    lessons: 24,
    assignments: 5,
    revenue: '$4,500', 
    image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600&h=400',
    status: 'Published'
  },
  { 
    id: 2, 
    title: 'Physics Fundamentals', 
    subject: 'Science', 
    students: 89,
    lessons: 12,
    assignments: 3,
    revenue: '$2,800', 
    image: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&q=80&w=600&h=400',
    status: 'Published'
  },
  { 
    id: 3, 
    title: 'Calculus 101 Draft', 
    subject: 'Math', 
    students: 0,
    lessons: 4,
    assignments: 0,
    revenue: '$0', 
    image: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=600&h=400',
    status: 'Draft'
  }
]);

const getStatusColor = (status) => {
  return status === 'Published' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200';
};
</script>

<template>
  <div>
    <!-- Header Actions -->
    <div class="mb-8 flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div class="flex space-x-2">
        <button class="px-4 py-2 bg-sky-50 text-sky-700 font-medium text-sm rounded-lg hover:bg-sky-100 transition-colors">All Courses (3)</button>
        <button class="px-4 py-2 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors">Published</button>
        <button class="px-4 py-2 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors">Drafts</button>
      </div>
      <div class="mt-4 sm:mt-0 flex space-x-4">
        <div class="relative rounded-md shadow-sm max-w-xs w-full">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <svg class="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" /></svg>
          </div>
          <input type="text" class="focus:ring-sky-500 focus:border-sky-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2 border" placeholder="Search my courses..." />
        </div>
        <button class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none">
          + New Course
        </button>
      </div>
    </div>

    <!-- Courses List Grid -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="course in courses" :key="course.id" class="bg-white overflow-hidden shadow-sm rounded-2xl border border-slate-200 hover:shadow-lg transition-all duration-300 flex flex-col h-full group">
        
        <!-- Image Cover with Actions Overlay -->
        <div class="relative h-48 w-full bg-slate-200 overflow-hidden">
          <img :src="course.image" :alt="course.title" class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
          
          <div class="absolute top-4 left-4">
            <span :class="getStatusColor(course.status)" class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border shadow-sm backdrop-blur-md bg-white/90">
              {{ course.status }}
            </span>
          </div>

          <!-- Quick Actions Overlay -->
          <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4 backdrop-blur-sm">
             <button class="p-2 bg-white text-sky-600 rounded-full hover:bg-sky-50 shadow-lg transform hover:scale-110 transition-all font-bold" title="Edit Course">✏️</button>
             <button class="p-2 bg-white text-emerald-600 rounded-full hover:bg-emerald-50 shadow-lg transform hover:scale-110 transition-all font-bold" title="Manage Lessons">📚</button>
             <button class="p-2 bg-white text-rose-600 rounded-full hover:bg-rose-50 shadow-lg transform hover:scale-110 transition-all font-bold" title="Course Settings">⚙️</button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="p-6 flex-1 flex flex-col">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-xl font-bold text-slate-900 leading-tight">
              {{ course.title }}
            </h3>
          </div>
          <p class="text-sm font-medium text-sky-600 mb-6 flex-1">
            Subject: {{ course.subject }}
          </p>
          
          <!-- Metrics Footer Grid -->
          <div class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase">Enrolled</p>
              <p class="text-lg font-bold text-slate-900 flex items-center">
                👨‍🎓 {{ course.students }}
              </p>
            </div>
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase">Content</p>
              <p class="text-sm font-bold text-slate-800 mt-1">{{ course.lessons }} Lessons</p>
            </div>
            <div>
               <p class="text-xs font-medium text-slate-500 uppercase">Tasks</p>
               <p class="text-sm font-bold text-slate-800 mt-1">{{ course.assignments }} Assigs.</p>
            </div>
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase">Revenue</p>
              <p class="text-lg font-bold text-emerald-600">{{ course.revenue }}</p>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
