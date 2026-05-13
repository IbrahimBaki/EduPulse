<script setup>
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <!-- Header -->
    <div>
      <h2 class="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:tracking-tight">Academy Settings</h2>
      <p class="mt-1 text-sm text-slate-500">Manage your institution's profile, billing, and regional preferences.</p>
    </div>

    <div class="bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl md:col-span-2">
      <form action="#" method="POST">
        <div class="px-4 py-6 sm:p-8">
          <div class="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            
            <div class="col-span-full">
              <label for="academy-name" class="block text-sm font-medium leading-6 text-slate-900">Academy Name</label>
              <div class="mt-2">
                <input type="text" name="academy-name" id="academy-name" value="Alpha International Academy" class="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
              </div>
            </div>

            <div class="col-span-full">
              <label for="contact-email" class="block text-sm font-medium leading-6 text-slate-900">Support Email</label>
              <div class="mt-2">
                <input id="contact-email" name="contact-email" type="email" value="support@alpha.com" class="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" />
              </div>
              <p class="mt-3 text-sm leading-6 text-slate-500">Emails sent to students and parents will appear to come from this address.</p>
            </div>

            <div class="sm:col-span-3">
              <label for="currency" class="block text-sm font-medium leading-6 text-slate-900">Primary Currency</label>
              <div class="mt-2">
                <select id="currency" name="currency" class="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6">
                  <option>USD ($)</option>
                  <option selected>EGP (E£)</option>
                  <option>EUR (€)</option>
                </select>
              </div>
            </div>

            <div class="sm:col-span-3">
              <label for="timezone" class="block text-sm font-medium leading-6 text-slate-900">Timezone</label>
              <div class="mt-2">
                <select id="timezone" name="timezone" class="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6">
                  <option selected>Africa/Cairo</option>
                  <option>Asia/Dubai</option>
                  <option>UTC</option>
                </select>
              </div>
            </div>

          </div>
        </div>
        <div class="flex items-center justify-end gap-x-6 border-t border-slate-900/10 px-4 py-4 sm:px-8 bg-slate-50 rounded-b-xl">
          <button type="button" class="text-sm font-semibold leading-6 text-slate-900">Cancel</button>
          <button type="submit" class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Save Preferences</button>
        </div>
      </form>
    </div>
  </div>
</template>
