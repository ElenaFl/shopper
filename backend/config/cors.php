<?php

return [

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'login',
        '/login'
    ],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://shopper.local:5173',
        'http://shopper.local',
        'http://localhost:8000',
        'http://localhost:5173'
    ],
    'allowed_headers' => ['*'],
    'supports_credentials' => true,

];
