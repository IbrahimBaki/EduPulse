<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const isMobileMenuOpen = ref(false);

const tenantCode = computed(() => route.params.tenantCode);

const user = computed(() => {
  const u = authStore.user || {};
  return {
    name: u.name || 'Manager',
    email: u.email || 'admin@academy.com',
    role: authStore.roles[0] || 'Manager',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'Manager')}&background=4f46e5&color=fff`
  }
});

const navigation = computed(() => [
  { name: 'Dashboard', href: `/${tenantCode.value}/manager`, current: true },
  { name: 'Users & Roles', href: `/${tenantCode.value}/manager/users`, current: false },
  { name: 'Courses Directory', href: `/${tenantCode.value}/manager/courses`, current: false },
  { name: 'Financials', href: `/${tenantCode.value}/manager/finance`, current: false },
  { name: 'Settings', href: `/${tenantCode.value}/manager/settings`, current: false },
]);

const logout = async () => {
  await authStore.logout();
  router.push(`/${tenantCode.value}/login`);
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
    <!-- Manager specific theme: Dark Slate / Indigo -->
    <nav class="bg-slate-900 border-b border-slate-800 pb-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0 flex items-center gap-2">
              <div class="bg-indigo-600 p-1.5 rounded-lg">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </div>
              <span class="text-xl font-bold text-white tracking-tight">EduPulse <span class="text-indigo-400 font-medium text-sm ml-1 uppercase">Manager</span></span>
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                <router-link 
                  v-for="item in navigation" 
                  :key="item.name" 
                  :to="item.href"
                  :class="[
                    $route.path === item.href || ($route.path.startsWith(item.href) && item.href !== '/manager') 
                      ? 'bg-slate-800 text-white shadow-inner' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white', 
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
              <div class="flex items-center text-slate-300 text-xs font-bold uppercase tracking-wider relative">
                <span class="absolute -left-3 top-1.5 w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                {{ user.role }}
              </div>

              <!-- Notifications -->
              <button type="button" class="bg-slate-800 p-1 rounded-full text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 relative transition-colors">
                <span class="sr-only">View notifications</span>
                <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-900"></span>
                <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              <!-- Profile dropdown -->
              <div class="relative group">
                <button class="max-w-xs bg-slate-800 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white transition-shadow">
                  <span class="sr-only">Open user menu</span>
                  <img class="h-8 w-8 rounded-full border border-slate-600" :src="user.avatar" alt="" />
                </button>
                
                <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block focus-within:block z-50">
                  <div class="block px-4 py-2 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    {{ user.name }}
                  </div>
                  <hr class="border-slate-100">
                  <a href="#" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Academy Profile</a>
                  <a href="#" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">My Settings</a>
                  <button @click="logout" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 font-medium">Sign out</button>
                </div>
              </div>

            </div>
          </div>
          
          <!-- Mobile menu button -->
          <div class="-mr-2 flex md:hidden">
            <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="bg-slate-800 inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none">
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
              $route.path === item.href ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white', 
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
    <header class="bg-white shadow-sm relative z-10 -mt-24 rounded-t-xl mx-4 sm:mx-6 lg:mx-8 pt-6 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
      <div class="max-w-7xl mx-auto pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 capitalize">
            {{ $route.name || 'Academy Overview' }}
          </h1>
        </div>
        
        <div class="mt-4 sm:mt-0 flex space-x-3">
          <button class="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Export Report
          </button>
          <!-- Contextual Action -->
          <router-link v-if="$route.path.includes('/manager/users')" to="/manager/users/invite" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            + Invite User
          </router-link>
        </div>
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
