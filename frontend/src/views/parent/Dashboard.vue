<script setup>
import { computed } from 'vue';

// Accept activeChild as a prop from the ParentLayout router-view
const props = defineProps({
  activeChild: {
    type: Object,
    required: true
  }
});

// Mocked robust backend data structure 
// In reality, this would be computed or fetched based on `props.activeChild.id`
const childData = {
  1: { // Ahmed
    stats: [
      { name: 'Average Grade', stat: '88%', trend: 'up' },
      { name: 'Classes Attended', stat: '42/45', trend: 'up' },
      { name: 'Overdue Assignments', stat: '0', trend: 'neutral' },
    ],
    alerts: [],
    recentGrades: [
      { id: 101, subject: 'Math', test: 'Midterm Exam', score: '92/100', date: '2 days ago' },
      { id: 102, subject: 'Science', test: 'Lab Report 3', score: '85/100', date: '1 week ago' },
    ],
    payments: [
      { id: 501, title: 'Fall Semester Math', amount: '$450', status: 'Paid', date: 'Sept 1, 2026' },
      { id: 502, title: 'Science Lab Kit', amount: '$75', status: 'Pending', dueDate: 'Oct 15, 2026' }
    ]
  },
  2: { // Mona
    stats: [
      { name: 'Average Grade', stat: '76%', trend: 'down' },
      { name: 'Classes Attended', stat: '38/45', trend: 'down' },
      { name: 'Overdue Assignments', stat: '2', trend: 'down' },
    ],
    alerts: [
      { id: 1, type: 'academic', message: 'Mona missed 2 Math assignments this week.' },
      { id: 2, type: 'financial', message: 'Tuition installment #2 is overdue by 3 days.' }
    ],
    recentGrades: [
      { id: 201, subject: 'History', test: 'Essay Draft', score: '70/100', date: 'Yesterday' },
      { id: 202, subject: 'English', test: 'Vocabulary Quiz', score: '82/100', date: '3 days ago' },
    ],
    payments: [
      { id: 601, title: 'Tuition Installment #1', amount: '$300', status: 'Paid', date: 'Sept 1, 2026' },
      { id: 602, title: 'Tuition Installment #2', amount: '$300', status: 'Overdue', dueDate: 'Oct 1, 2026' }
    ]
  }
};

const currentData = computed(() => childData[props.activeChild.id] || childData[1]);
</script>

<template>
  <div class="space-y-8">
    
    <!-- Critical Alerts Section (UX Guideline: Due/Overdue in Red) -->
    <div v-if="currentData.alerts.length > 0" class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-bold text-red-800">Action Required</h3>
          <div class="mt-2 text-sm text-red-700">
            <ul role="list" class="list-disc pl-5 space-y-1 font-medium">
              <li v-for="alert in currentData.alerts" :key="alert.id">{{ alert.message }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- At a Glance Stats -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
      <div v-for="item in currentData.stats" :key="item.name" class="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-5">
        <dt class="text-sm font-medium text-gray-500 truncate">{{ item.name }}</dt>
        <dd class="mt-1 text-3xl font-bold text-gray-900 flex items-center">
          {{ item.stat }}
          <span v-if="item.trend === 'up'" class="ml-2 text-sm text-green-500">↑</span>
          <span v-if="item.trend === 'down'" class="ml-2 text-sm text-red-500">↓</span>
        </dd>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      
      <!-- Academic Tabular Analytics (UX Guideline) -->
      <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h3 class="text-lg leading-6 font-bold text-gray-900">Recent Academic Performance</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-white">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject & Test</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="grade in currentData.recentGrades" :key="grade.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-bold text-gray-900">{{ grade.subject }}</div>
                  <div class="text-sm text-gray-500">{{ grade.test }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                    {{ grade.score }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                  {{ grade.date }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Financials / 1-Click Payments (UX Guideline) -->
      <div class="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 class="text-lg leading-6 font-bold text-gray-900">Payments & Fees</h3>
          <a href="#" class="text-sm font-medium text-teal-600 hover:text-teal-800">View History</a>
        </div>
        <ul role="list" class="divide-y divide-gray-200">
          <li v-for="payment in currentData.payments" :key="payment.id" class="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50 transition-colors">
            <div class="flex flex-col">
              <p class="text-base font-bold text-gray-900">{{ payment.title }}</p>
              <p class="text-sm text-gray-500 mt-1">
                <span class="font-bold text-gray-900">{{ payment.amount }}</span> 
                <span class="mx-2">•</span> 
                <span v-if="payment.status === 'Paid'" class="text-green-600 font-medium">Paid on {{ payment.date }}</span>
                <span v-else-if="payment.status === 'Overdue'" class="text-red-600 font-bold">Overdue since {{ payment.dueDate }}</span>
                <span v-else class="text-gray-500 font-medium">Due: {{ payment.dueDate }}</span>
              </p>
            </div>
            
            <div class="mt-4 sm:mt-0 flex-shrink-0">
               <span v-if="payment.status === 'Paid'" class="inline-flex items-center text-sm font-bold text-green-600">
                 <svg class="mr-1.5 h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                 Cleared
               </span>
               <button v-else :class="payment.status === 'Overdue' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'" class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
                 Pay {{ payment.amount }} Now
               </button>
            </div>
          </li>
        </ul>
      </div>

    </div>
  </div>
</template>
