<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

/**
 * Class ChatWidgetController
 *
 * Контроллер управляет состоянием виджета чата для текущего пользователя(виден ли он)
 */

class ChatWidgetController extends Controller
{
    // GET /api/chat/widget-state
    // возвращает, доступен ли чат (enabled) и скрыт ли он для текущего пользователя (hidden). Для неавторизованных возвращает enabled:false, hidden:true
    public function getState(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['enabled' => false, 'hidden' => true], 200);
        }

        return response()->json([
            'enabled' => true,
            'hidden' => (bool) $user->chat_hidden,
        ], 200);
    }


    // POST /api/chat/widget-state
    // устанавливает флаг сокрытия виджета (hidden) для авторизованного пользователя; возвращает обновлённый флаг. Для неавторизованных возвращает 401.
    public function setState(Request $request)
    {
        $request->validate([
            'hidden' => 'required|boolean',
        ]);

        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user->chat_hidden = $request->input('hidden');
        $user->save();

        return response()->json([
            'ok' => true,
            'hidden' => (bool) $user->chat_hidden,
        ], 200);
    }
}
