<?php

return [
    'name' => 'AI',

    'gemini' => [
        'api_key'  => env('GEMINI_API_KEY'),
        'model'    => 'gemini-2.5-flash',
        'endpoint' => 'https://generativelanguage.googleapis.com/v1beta/models',
    ],

    'chunk_size'           => 200,
    'chunk_overlap'        => 30,
    'max_chunks'           => 5,
    'quiz_pass_threshold'  => 70,
];
