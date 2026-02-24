<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isMobileMenuOpen = ref(false);

const user = ref({
  name: 'Mr. Teacher',
  email: 'teacher@demo.com',
  role: 'Senior Instructor',
  avatar: 'https://ui-avatars.com/api/?name=Mr+Teacher&background=0284c7&color=fff'
});

const navigation = [
  { name: 'Dashboard', href: '/teacher', current: true },
  { name: 'My Courses', href: '/teacher/courses', current: false },
  { name: 'Students & Grading', href: '/teacher/grading', current: false },
  { name: 'Live Sessions', href: '/teacher/live', current: false },
];

const logout = () => {
  localStorage.removeItem('access_token');
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
    <!-- Teacher specific theme: Slate/Sky Blue -->
    <nav class="bg-sky-700 border-b border-sky-800 pb-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <span class="text-2xl font-bold text-white tracking-tight">EduPulse <span class="text-sky-200">Instructor</span></span>
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                <router-link 
                  v-for="item in navigation" 
                  :key="item.name" 
                  :to="item.href"
                  :class="[
                    $route.path === item.href || ($route.path.startsWith(item.href) && item.href !== '/teacher') 
                      ? 'bg-sky-800 text-white' 
                      : 'text-sky-100 hover:bg-sky-600 hover:text-white', 
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors'
                  ]"
                >
                  {{ item.name }}
                </router-link>
              </div>
            </div>
          </div>
          <div class="hidden md:block">
            <div class="ml-4 flex items-center md:ml-6 space-x-4">
              
              <!-- Role Badge -->
              <div class="flex items-center bg-sky-600 text-white px-3 py-1 rounded-md text-xs font-bold shadow-sm uppercase tracking-wider border border-sky-500">
                {{ user.role }}
              </div>

              <!-- Notifications -->
              <button type="button" class="bg-sky-700 p-1 rounded-full text-sky-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-700 focus:ring-white relative">
                <span class="sr-only">View notifications</span>
                <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-sky-700"></span>
                <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              <!-- Profile dropdown -->
              <div class="relative group">
                <button class="max-w-xs bg-sky-700 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-700 focus:ring-white">
                  <span class="sr-only">Open user menu</span>
                  <img class="h-8 w-8 rounded-full border-2 border-sky-400" :src="user.avatar" alt="" />
                </button>
                
                <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block focus-within:block z-50">
                  <div class="block px-4 py-2 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    {{ user.name }}
                  </div>
                  <hr>
                  <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile & Settings</a>
                  <button @click="logout" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 font-medium">Sign out</button>
                </div>
              </div>

            </div>
          </div>
          
          <!-- Mobile menu button -->
          <div class="-mr-2 flex md:hidden">
            <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="bg-sky-700 inline-flex items-center justify-center p-2 rounded-md text-sky-200 hover:text-white hover:bg-sky-600 focus:outline-none">
              <span class="sr-only">Open main menu</span>
              <svg v-if="!isMobileMenuOpen" class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg v-else class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-show="isMobileMenuOpen" class="md:hidden">
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <router-link 
            v-for="item in navigation" 
            :key="item.name" 
            :to="item.href"
            :class="[
              $route.path === item.href ? 'bg-sky-800 text-white' : 'text-sky-100 hover:bg-sky-600 hover:text-white', 
              'block px-3 py-2 rounded-md text-base font-medium'
            ]"
            @click="isMobileMenuOpen = false"
          >
            {{ item.name }}
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Content Header -->
    <header class="bg-white shadow relative z-10 -mt-24 rounded-t-3xl mx-4 sm:mx-6 lg:mx-8 pt-6 px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div class="max-w-7xl mx-auto pb-4 flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900 capitalize">
          {{ $route.name || 'Overview' }} 📊
        </h1>
        
        <!-- Contextual Header Action (e.g. Create Course) -->
        <router-link v-if="$route.path.includes('/teacher/courses')" to="/teacher/courses/new" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none">
          + Create New Course
        </router-link>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
