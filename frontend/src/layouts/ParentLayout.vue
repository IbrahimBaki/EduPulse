<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isMobileMenuOpen = ref(false);

const user = ref({
  name: 'Sarah Parent',
  email: 'sarah.parent@demo.com',
  avatar: 'https://ui-avatars.com/api/?name=Sarah+Parent&background=0d9488&color=fff'
});

// Mocked children associated with this parent
const children = ref([
  { id: 1, name: 'Ahmed Student', grade: 'Grade 10', avatar: 'https://ui-avatars.com/api/?name=Ahmed+Student&background=6366f1&color=fff' },
  { id: 2, name: 'Mona Student', grade: 'Grade 7', avatar: 'https://ui-avatars.com/api/?name=Mona+Student&background=ec4899&color=fff' },
]);

const activeChild = ref(children.value[0]);

const setActiveChild = (child) => {
  activeChild.value = child;
  isMobileMenuOpen.value = false;
  // In a real app, this might trigger a Pinia store update to refetch dashboard data
};

const navigation = [
  { name: 'Dashboard', href: '/parent', current: true },
  { name: 'Course Progress', href: '/parent/progress', current: false },
  { name: 'Payments & Fees', href: '/parent/payments', current: false },
];

const logout = () => {
  localStorage.removeItem('access_token');
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-stone-50 flex flex-col font-sans">
    <!-- Parent specific theme: Teal / Cyan -->
    <nav class="bg-teal-700 border-b border-teal-800 pb-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <span class="text-2xl font-bold text-white tracking-tight">EduPulse <span class="text-teal-200">Guardians</span></span>
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-baseline space-x-4">
                <router-link 
                  v-for="item in navigation" 
                  :key="item.name" 
                  :to="item.href"
                  :class="[
                    $route.path === item.href || ($route.path.startsWith(item.href) && item.href !== '/parent') 
                      ? 'bg-teal-800 text-white' 
                      : 'text-teal-100 hover:bg-teal-600 hover:text-white', 
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
              
              <!-- Child Selector Dropdown -->
              <div class="relative group">
                <button class="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm border border-teal-500 flex items-center transition-colors">
                  <img class="h-5 w-5 rounded-full mr-2" :src="activeChild.avatar" alt="" />
                  Viewing: {{ activeChild.name }}
                  <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                
                <div class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block focus-within:block z-50">
                  <div class="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    Switch Child
                  </div>
                  <button 
                    v-for="child in children" 
                    :key="child.id"
                    @click="setActiveChild(child)"
                    class="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-teal-50 flex items-center transition-colors"
                  >
                    <img class="h-6 w-6 rounded-full mr-3 border border-gray-200" :src="child.avatar" alt="" />
                    <div class="flex flex-col">
                      <span class="font-bold text-gray-900">{{ child.name }}</span>
                      <span class="text-xs text-gray-500">{{ child.grade }}</span>
                    </div>
                    <svg v-if="activeChild.id === child.id" class="ml-auto h-5 w-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                  </button>
                </div>
              </div>

              <!-- Profile dropdown -->
              <div class="relative group ml-4 border-l border-teal-600 pl-4">
                <button class="max-w-xs bg-teal-700 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-teal-700 focus:ring-white">
                  <span class="sr-only">Open user menu</span>
                  <img class="h-8 w-8 rounded-full border-2 border-teal-400" :src="user.avatar" alt="" />
                </button>
                
                <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block focus-within:block z-50">
                  <div class="block px-4 py-2 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    {{ user.name }}
                  </div>
                  <hr>
                  <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile Settings</a>
                  <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Billing History</a>
                  <button @click="logout" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 font-medium">Sign out</button>
                </div>
              </div>

            </div>
          </div>
          
          <!-- Mobile menu button -->
          <div class="-mr-2 flex md:hidden">
            <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="bg-teal-700 inline-flex items-center justify-center p-2 rounded-md text-teal-200 hover:text-white hover:bg-teal-600 focus:outline-none">
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
              $route.path === item.href ? 'bg-teal-800 text-white' : 'text-teal-100 hover:bg-teal-600 hover:text-white', 
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
      <div class="max-w-7xl mx-auto pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 capitalize">
            {{ $route.name || 'Overview' }} 📈
          </h1>
          <p class="mt-1 text-sm text-gray-500 font-medium">Viewing progress for: <strong class="text-teal-700">{{ activeChild.name }}</strong></p>
        </div>
        
        <button class="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none">
          Download PDF Report
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <!-- Pass active child as a prop to child routes for reactivity -->
          <component :is="Component" :active-child="activeChild" />
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
