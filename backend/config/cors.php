<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:5173', 'http://myshopper.local',    'http://localhost:8000'],
    'allowed_headers' => ['*'],
    'supports_credentials' => true,

];
