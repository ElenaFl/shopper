<?php

namespace App\Http\Controllers;

use App\Services\HFClient;
use Illuminate\Http\Request;
use App\Models\ChatSession;
use App\Models\ChatMessage;
use Illuminate\Support\Facades\Auth;

class ChatController extends Controller
{
    protected $hf;

    public function __construct(HFClient $hf)
    {
        $this->hf = $hf;
    }

    public function createSession(Request $request)
    {
        $user = Auth::user();
        $session = ChatSession::create([
            'user_id' => $user ? $user->id : null,
            'provider' => 'hf',
            'provider_session_id' => null,
        ]);

        return response()->json($session, 201);
    }

    public function send(Request $request)
    {
        $request->validate([
            'session_id' => 'nullable|exists:chat_sessions,id',
            'content' => 'required|string',
        ]);

        $user = Auth::user();

        $session = null;
        if ($request->filled('session_id')) {
            $session = ChatSession::find($request->input('session_id'));
        }
        if (! $session) {
            $session = ChatSession::create([
                'user_id' => $user ? $user->id : null,
                'provider' => 'hf',
            ]);
        }

        $userMsg = ChatMessage::create([
            'session_id' => $session->id,
            'user_id' => $user ? $user->id : null,
            'role' => 'user',
            'content' => $request->input('content'),
        ]);

        $history = ChatMessage::where('session_id', $session->id)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($m) {
                return ['role' => $m->role, 'content' => $m->content];
            })
            ->toArray();

        $window = (int) env('CHAT_HISTORY_WINDOW', 6);
        $messages = array_merge(
            [['role' => 'system', 'content' => 'You are a helpful assistant. Answer concisely in Russian.']],
            array_slice($history, -$window)
        );

        $maxTokens = (int) env('HF_MAX_TOKENS', 300);
        $temperature = (float) env('HF_TEMPERATURE', 0.5);

        try {
            $resp = $this->hf->chat($messages, ['max_tokens' => $maxTokens, 'temperature' => $temperature]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'HF request failed', 'detail' => $e->getMessage()], 500);
        }

        $reply = null;
        if (isset($resp['choices'][0]['message']['content'])) {
            $reply = $resp['choices'][0]['message']['content'];
        } elseif (isset($resp['choices'][0]['text'])) {
            $reply = $resp['choices'][0]['text'];
        } else {
            $reply = json_encode($resp);
        }

        $botMsg = ChatMessage::create([
            'session_id' => $session->id,
            'role' => 'assistant',
            'content' => $reply,
        ]);

        return response()->json([
            'session' => $session,
            'reply' => $botMsg,
        ], 200);
    }

    public function session(Request $request, $id)
    {
        $session = ChatSession::with('messages')->findOrFail($id);
        return response()->json($session);
    }
}
