<?php require __DIR__ . '/vendor/autoload.php'; $config = require __DIR__ . '/config/app.php'; echo in_array(App\Providers\RouteServiceProvider::class, $config['providers']) ? 'yes' : 'no';
