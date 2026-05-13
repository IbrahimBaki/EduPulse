<script setup>
import { ref } from 'vue';

const courses = ref([
  { id: 1, title: 'Advanced Mathematics 101', subject: 'Math', level: 'Grade 10', instructor: 'Dr. Tarek', students: 45, status: 'Published', price: '$120' },
  { id: 2, title: 'Physics Fundamentals', subject: 'Science', level: 'Grade 10', instructor: 'Eng. Sarah', students: 38, status: 'Published', price: '$150' },
  { id: 3, title: 'English Literature', subject: 'Languages', level: 'Grade 11', instructor: 'Mr. John', students: 22, status: 'Draft', price: '$90' },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="sm:flex sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:tracking-tight">Course Directory</h2>
        <p class="mt-1 text-sm text-slate-500">Manage academy curriculum, assign instructors, and monitor enrollments.</p>
      </div>
      <div class="mt-4 sm:ml-4 sm:mt-0 flex gap-3">
        <button type="button" class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          + Create Course
        </button>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 px-4 py-5 sm:p-6">
        <dt class="truncate text-sm font-medium text-slate-500">Total Courses</dt>
        <dd class="mt-1 text-3xl font-bold tracking-tight text-slate-900">24</dd>
      </div>
      <div class="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 px-4 py-5 sm:p-6">
        <dt class="truncate text-sm font-medium text-slate-500">Active Enrollments</dt>
        <dd class="mt-1 text-3xl font-bold tracking-tight text-indigo-600">842</dd>
      </div>
      <div class="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 px-4 py-5 sm:p-6">
        <dt class="truncate text-sm font-medium text-slate-500">Draft Courses</dt>
        <dd class="mt-1 text-3xl font-bold tracking-tight text-orange-500">3</dd>
      </div>
    </div>

    <!-- Course Grid -->
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="course in courses" :key="course.id" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group hover:shadow-md transition-all">
        <div class="h-32 bg-slate-100 flex items-center justify-center border-b border-slate-200 relative overflow-hidden group-hover:bg-indigo-50 transition-colors">
          <svg class="h-12 w-12 text-slate-300 group-hover:text-indigo-200 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span :class="[course.status === 'Published' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-orange-100 text-orange-800 border-orange-200', 'absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border']">
            {{ course.status }}
          </span>
        </div>
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{{ course.subject }}</span>
            <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{{ course.level }}</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 leading-tight mb-1">{{ course.title }}</h3>
          <p class="text-sm text-slate-500 mb-4 flex items-center gap-1.5">
            <svg class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {{ course.instructor }}
          </p>
          
          <div class="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center text-sm font-semibold text-slate-700">
               <svg class="h-4 w-4 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               {{ course.students }} Enrolled
            </div>
            <span class="font-bold text-indigo-600">{{ course.price }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
