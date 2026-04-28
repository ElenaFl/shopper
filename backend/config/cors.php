<?php

return [

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'login',
        'logout'
    ],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:3000',
        'http://shopper.local',
        'http://shopper.local:5173',
        'http://localhost:8000',
        'http://localhost:5173'
    ],
    'allowed_headers' => ['*'],
    'supports_credentials' => true,

];
