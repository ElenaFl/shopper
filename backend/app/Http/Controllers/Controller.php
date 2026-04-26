<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

/**
 *
 * Class Controller
 *
 * Базовый контроллер приложения.
 * Наследуется всеми HTTP‑контроллерами в приложении (Laravel).
 * Подключает общие трейты:
 * AuthorizesRequests — вспомогательные методы для авторизации (политики).
 * DispatchesJobs — позволяет отправлять задания в очередь (dispatch).
 * ValidatesRequests — упрощённая валидация входных данных (validate()).
 * Назначение: централизованно подключить общие возможности и облегчить создание контроллеров. */

class Controller extends BaseController
{
    use AuthorizesRequests, DispatchesJobs, ValidatesRequests;
}
