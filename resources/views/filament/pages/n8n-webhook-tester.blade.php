<x-filament-panels::page>
    {{-- Header controls --}}
    <div class="fi-section rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10 p-6 mb-6">
        <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/20">
                    <x-heroicon-o-signal class="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">n8n Webhook Tester</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Send test payloads directly to n8n — bypasses the queue for instant delivery</p>
                </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
                <label class="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Tenant:</label>
                <select
                    wire:model.live="selectedTenantId"
                    class="block w-48 rounded-lg border-gray-300 bg-white text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white py-2 px-3"
                >
                    <option value="0">— Select tenant —</option>
                    @foreach($this->getTenants() as $id => $name)
                        <option value="{{ $id }}" @selected($selectedTenantId == $id)>{{ $name }}</option>
                    @endforeach
                </select>

                @php $n8nUrl = env('N8N_WEBHOOK_URL', ''); @endphp
                <div @class([
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' => (bool) $n8nUrl,
                    'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'             => ! $n8nUrl,
                ])>
                    <span @class([
                        'inline-block h-1.5 w-1.5 rounded-full',
                        'bg-emerald-500' => (bool) $n8nUrl,
                        'bg-rose-500'    => ! $n8nUrl,
                    ])></span>
                    {{ $n8nUrl ? 'n8n connected' : 'N8N_WEBHOOK_URL not set' }}
                </div>
            </div>
        </div>

        {{-- Module summary chips --}}
        @php
            $definitions  = \App\Filament\Pages\N8nWebhookTester::webhookDefinitions();
            $moduleGroups = collect($definitions)->groupBy('module')->map->count();
        @endphp
        <div class="mt-4 flex flex-wrap gap-2">
            @foreach($moduleGroups as $module => $count)
                @php $mc = ['IAM' => 'blue', 'Academic' => 'green', 'AI' => 'purple', 'Assessment' => 'orange', 'Commerce' => 'yellow', 'Communication' => 'teal'][$module] ?? 'gray'; @endphp
                <span @class([
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'     => $mc === 'blue',
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' => $mc === 'green',
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' => $mc === 'purple',
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' => $mc === 'orange',
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' => $mc === 'yellow',
                    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'     => $mc === 'teal',
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'        => $mc === 'gray',
                ])>
                    {{ $module }} <span class="font-bold">{{ $count }}</span>
                </span>
            @endforeach
            <span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Total: {{ count($definitions) }} webhooks
            </span>
        </div>
    </div>

    {{-- Webhook cards --}}
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        @foreach($definitions as $def)
            @php
                $type    = $def['type'];
                $c       = $def['color'];
                $result  = $results[$type] ?? null;
            @endphp
            <div @class([
                'fi-section rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10 overflow-hidden border-l-4',
                'border-l-blue-500'   => $c === 'blue',
                'border-l-green-500'  => $c === 'green',
                'border-l-purple-500' => $c === 'purple',
                'border-l-orange-500' => $c === 'orange',
                'border-l-yellow-500' => $c === 'yellow',
                'border-l-teal-500'   => $c === 'teal',
                'border-l-gray-300'   => ! in_array($c, ['blue','green','purple','orange','yellow','teal']),
            ])>
                {{-- Card header --}}
                <div class="flex items-start gap-3 px-5 pt-5 pb-3">
                    <div class="mt-0.5 shrink-0">
                        <x-dynamic-component :component="$def['icon']" class="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2 mb-1">
                            <code class="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-200">{{ $type }}</code>
                            <span @class([
                                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                                'bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800'         => $c === 'blue',
                                'bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-800'   => $c === 'green',
                                'bg-purple-100 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800' => $c === 'purple',
                                'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800' => $c === 'orange',
                                'bg-yellow-100 text-yellow-700 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:ring-yellow-800' => $c === 'yellow',
                                'bg-teal-100 text-teal-700 ring-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:ring-teal-800'         => $c === 'teal',
                            ])>
                                {{ $def['module'] }}
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{{ $def['description'] }}</p>
                        <p class="mt-1 text-xs font-mono text-gray-400 dark:text-gray-600 truncate" title="{{ $def['trigger'] }}">
                            ↪ {{ $def['trigger'] }}
                        </p>
                    </div>
                </div>

                {{-- Result badge --}}
                @if($result)
                    <div @class([
                        'mx-5 mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' => $result['ok'],
                        'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'             => ! $result['ok'],
                    ])>
                        @if($result['ok'])
                            <x-heroicon-o-check-circle class="h-4 w-4 shrink-0" />
                        @else
                            <x-heroicon-o-x-circle class="h-4 w-4 shrink-0" />
                        @endif
                        <span>{{ $result['message'] }}</span>
                    </div>
                @endif

                {{-- Payload editor --}}
                <div class="px-5 pb-4">
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payload JSON</span>
                        <button
                            wire:click="resetPayload('{{ $type }}')"
                            class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            ↺ reset
                        </button>
                    </div>
                    <textarea
                        wire:model="payloads.{{ $type }}"
                        rows="5"
                        spellcheck="false"
                        class="block w-full rounded-lg border-gray-200 bg-gray-50 font-mono text-xs text-gray-800 shadow-none focus:border-primary-500 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 resize-y"
                        placeholder="{}"
                    ></textarea>
                </div>

                {{-- Send button --}}
                <div class="flex justify-end px-5 pb-5">
                    <x-filament::button
                        wire:click="sendTest('{{ $type }}')"
                        wire:loading.attr="disabled"
                        wire:target="sendTest('{{ $type }}')"
                        icon="heroicon-o-paper-airplane"
                    >
                        <span wire:loading.remove wire:target="sendTest('{{ $type }}')">Send Test</span>
                        <span wire:loading wire:target="sendTest('{{ $type }}')">Sending…</span>
                    </x-filament::button>
                </div>
            </div>
        @endforeach
    </div>
</x-filament-panels::page>
