<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isMobileMenuOpen = ref(false);

const user = ref({
  name: 'Ahmed Student',
  email: 'ahmed@demo.com',
  points: 1250,
  avatar: 'https://ui-avatars.com/api/?name=Ahmed+Student&background=6366f1&color=fff'
});

const navigation = [
  { name: 'Dashboard', href: '/student', current: true },
  { name: 'My Courses', href: '/student/courses', current: false },
  { name: 'Assignments', href: '/student/assignments', current: false },
  { name: 'Badges & Rewards', href: '/student/rewards', current: false },
];

const logout = () => {
  // Clear mock tokens and redirect
  localStorage.removeItem('access_token');
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <nav class="bg-indigo-600 border-b border-indigo-700 pb-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <span class="text-2xl font-bold text-white tracking-tight">EduPulse <span class="text-indigo-200">Student</span></span>
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                <router-link 
                  v-for="item in navigation" 
                  :key="item.name" 
                  :to="item.href"
                  :class="[
                    $route.path === item.href || ($route.path.startsWith(item.href) && item.href !== '/student') 
                      ? 'bg-indigo-700 text-white' 
                      : 'text-indigo-100 hover:bg-indigo-500 hover:text-white', 
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
              
              <!-- Points Badge -->
              <div class="flex items-center bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path></svg>
                {{ user.points }} XP
              </div>

              <!-- Profile dropdown -->
              <div class="relative group">
                <button class="max-w-xs bg-indigo-600 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white">
                  <span class="sr-only">Open user menu</span>
                  <img class="h-8 w-8 rounded-full border-2 border-indigo-400" :src="user.avatar" alt="" />
                </button>
                
                <!-- Dropdown menu -->
                <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block focus-within:block z-50">
                  <div class="block px-4 py-2 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    {{ user.name }}
                  </div>
                  <hr>
                  <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Your Profile</a>
                  <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                  <button @click="logout" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 font-medium">Sign out</button>
                </div>
              </div>

            </div>
          </div>
          
          <!-- Mobile menu button -->
          <div class="-mr-2 flex md:hidden">
            <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="bg-indigo-600 inline-flex items-center justify-center p-2 rounded-md text-indigo-200 hover:text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white">
              <span class="sr-only">Open main menu</span>
              <svg v-if="!isMobileMenuOpen" class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg v-else class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
              $route.path === item.href ? 'bg-indigo-700 text-white' : 'text-indigo-100 hover:bg-indigo-500 hover:text-white', 
              'block px-3 py-2 rounded-md text-base font-medium'
            ]"
            @click="isMobileMenuOpen = false"
          >
            {{ item.name }}
          </router-link>
        </div>
        <div class="pt-4 pb-3 border-t border-indigo-700">
          <div class="flex items-center px-5">
            <div class="flex-shrink-0">
              <img class="h-10 w-10 rounded-full" :src="user.avatar" alt="" />
            </div>
            <div class="ml-3">
              <div class="text-base font-medium leading-none text-white">{{ user.name }}</div>
              <div class="text-sm font-medium leading-none text-indigo-300 mt-1">{{ user.email }}</div>
            </div>
          </div>
          <div class="mt-3 px-2 space-y-1">
            <button @click="logout" class="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-indigo-100 hover:text-white hover:bg-indigo-500">Sign out</button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Content Header -->
    <header class="bg-white shadow relative z-10 -mt-24 rounded-t-3xl mx-4 sm:mx-6 lg:mx-8 pt-6 px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <div class="max-w-7xl mx-auto pb-4">
        <h1 class="text-3xl font-bold text-gray-900 capitalize">
          {{ $route.name || 'Dashboard' }} 🚀
        </h1>
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
