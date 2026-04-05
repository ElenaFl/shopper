<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChatWidgetController extends Controller
{
    // GET /api/chat/widget-state
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
