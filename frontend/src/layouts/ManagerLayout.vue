<script setup>
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const sidebarOpen = ref(false);

const tenantCode = computed(() => authStore.tenantCode);

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
  { name: 'Dashboard', href: `/manager`, icon: 'HomeIcon' },
  { name: 'User Management', href: `/manager/users`, icon: 'UsersIcon' },
  { name: 'Courses Directory', href: `/manager/courses`, icon: 'BookOpenIcon' },
  { name: 'Academy Settings', href: `/manager/settings`, icon: 'CogIcon' },
]);

const logout = async () => {
  const code = tenantCode.value || 'alpha';
  await authStore.logout();
  router.push(`/${code}/login`);
};

// Simple active route checker
const isActive = (href) => {
    if (href.endsWith('/manager')) {
        return route.path === href;
    }
    return route.path.startsWith(href);
};
</script>

<template>
  <div class="h-screen flex overflow-hidden bg-slate-50 font-sans">
    
    <!-- Mobile sidebar backdrop -->
    <div v-show="sidebarOpen" class="fixed inset-0 z-40 bg-slate-900 bg-opacity-50 transition-opacity lg:hidden" @click="sidebarOpen = false"></div>

    <!-- Sidebar component -->
    <div :class="[sidebarOpen ? 'translate-x-0' : '-translate-x-full', 'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col']">
      
      <!-- Brand Logo -->
      <div class="flex items-center justify-center h-16 bg-slate-950 shrink-0 shadow-md">
        <div class="flex items-center gap-2">
          <div class="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
            <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span class="text-xl font-bold tracking-tight">EduPulse <span class="text-indigo-400 text-sm font-medium uppercase ml-1">Mgr</span></span>
        </div>
      </div>

      <!-- User Info Snippet -->
      <div class="px-6 py-5 border-b border-slate-800">
        <div class="flex items-center">
          <img class="h-10 w-10 rounded-full border-2 border-indigo-500 shadow-sm" :src="user.avatar" alt="User avatar" />
          <div class="ml-3">
            <p class="text-sm font-bold text-white leading-tight capitalize">{{ user.name }}</p>
            <p class="text-xs text-slate-400 mt-0.5 capitalize">{{ user.role }}</p>
          </div>
        </div>
      </div>

      <!-- Nav Links -->
      <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <router-link 
          v-for="item in navigation" 
          :key="item.name" 
          :to="item.href"
          :class="[
            isActive(item.href) ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200'
          ]"
        >
          <!-- Dashboard Icon -->
          <svg v-if="item.icon === 'HomeIcon'" :class="[isActive(item.href) ? 'text-indigo-100' : 'text-slate-400 group-hover:text-slate-300', 'flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <!-- Users Icon -->
          <svg v-if="item.icon === 'UsersIcon'" :class="[isActive(item.href) ? 'text-indigo-100' : 'text-slate-400 group-hover:text-slate-300', 'flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <!-- Course Icon -->
          <svg v-if="item.icon === 'BookOpenIcon'" :class="[isActive(item.href) ? 'text-indigo-100' : 'text-slate-400 group-hover:text-slate-300', 'flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <!-- Settings Icon -->
          <svg v-if="item.icon === 'CogIcon'" :class="[isActive(item.href) ? 'text-indigo-100' : 'text-slate-400 group-hover:text-slate-300', 'flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>

          {{ item.name }}
        </router-link>
      </nav>

      <!-- Logout Component -->
      <div class="p-4 border-t border-slate-800">
        <button @click="logout" class="flex w-full items-center px-4 py-2.5 text-sm font-medium text-slate-300 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors group">
          <svg class="mr-3 h-5 w-5 text-slate-400 group-hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>

    <!-- Main Content Area Wrapper -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      
      <!-- Mobile Top Navbar -->
      <div class="lg:hidden border-b border-slate-200 bg-white shadow-sm flex items-center justify-between p-4 shrink-0">
        <div class="flex items-center gap-2">
           <div class="bg-indigo-600 p-1.5 rounded text-white">
             <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
           </div>
           <span class="font-bold text-slate-900 tracking-tight text-lg">EduPulse <span class="text-indigo-600">Mgr</span></span>
        </div>
        <button @click="sidebarOpen = true" class="text-slate-500 hover:text-slate-700 focus:outline-none p-1 shrink-0 rounded-md">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <!-- Scrollable Main View Container -->
      <main class="flex-1 relative z-0 overflow-y-auto focus:outline-none">
        <!-- Optional Breadcrumb / Header area -->
        <div class="bg-white px-6 py-4 border-b border-slate-200 shadow-sm flex items-center justify-between hidden lg:flex sticky top-0 z-10">
          <h1 class="text-xl font-bold text-slate-900 capitalize">{{ route.name?.replace('Manager', 'Manager ') || 'Dashboard' }}</h1>
          
          <div class="flex items-center gap-4">
             <!-- Status indicator -->
             <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
               <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
               System Operational
             </span>
             
             <!-- Notifications -->
             <button class="text-slate-400 hover:text-slate-600 transition-colors relative">
                <span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
             </button>
          </div>
        </div>

        <div class="p-4 sm:p-6 lg:p-8">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>

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
  transform: translateY(5px);
}
</style>
