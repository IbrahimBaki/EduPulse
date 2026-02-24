<script setup>
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center">
      <h1 class="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl tracking-tight">
        <span class="block">Welcome to</span>
        <span class="block text-indigo-600 mt-2">EduPulse Demo Academy</span>
      </h1>
      <p class="mt-4 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-6 md:max-w-3xl">
        The complete platform for students to learn, teachers to teach, and parents to track progress. Connect securely to your institution.
      </p>
      
      <div class="mt-10 mx-auto max-w-sm sm:flex sm:max-w-none sm:justify-center">
        <router-link 
          to="/login"
          class="flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
        >
          Sign In
        </router-link>
      </div>
    </div>
  </div>
</template>
