<?php

namespace App\Http\Controllers;

use App\Services\HFClient;
use Illuminate\Http\Request;
use App\Models\ChatSession;
use App\Models\ChatMessage;
use Illuminate\Support\Facades\Auth;

/**
 *  ChatController  - управляет сессиями чат‑бота и пересылкой сообщений к внешнему HF (генеративному) сервису («Hugging Face» — платформа с моделями ИИ)
 *  createSession: создаёт новую сессию чата (опционально привязанную к пользователю).
 *  send: отправляет сообщение пользователя, формирует контекст (history) и запрашивает ответ у HF
 *  session: возвращает сессию с сообщениями.
 * */

class ChatController extends Controller
{

    // свойство класса, в котором хранится экземпляр клиента для работы с внешним HF‑сервисом
    protected $hf;

    // конструктор принимает объект типа HFClient; Laravel автоматически создаёт/вставляет этот экземпляр из service container
    public function __construct(HFClient $hf)
    {
        $this->hf = $hf;
    }

    // создаёт новую чат‑сессию (связана с текущим пользователем).
    // возвращает созданную модель с HTTP 201
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

    // принимает сообщение пользователя (по session_id), сохраняет его, собирает последние N сообщений и системную подсказку, отправляет контекст в HFClient, сохраняет ответ ассистента в БД и возвращает его клиенту
    public function send(Request $request)
    {
        $request->validate([
            'session_id' => 'nullable|exists:chat_sessions,id',
            'content' => 'required|string',
        ]);

        $user = Auth::user();

        // находит сессию по session_id, если передан; иначе создает новую (привязав к текущему пользователю, если есть).
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

        // сохраняет входящее сообщение пользователя в таблицу сообщений (role = 'user')
        $userMsg = ChatMessage::create([
            'session_id' => $session->id,
            'user_id' => $user ? $user->id : null,
            'role' => 'user',
            'content' => $request->input('content'),
        ]);


        // загружает всю историю сообщений сессии в хронологическом порядке и преобразует в массив {role, content} для отправки в HF
        $history = ChatMessage::where('session_id', $session->id)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($m) {
                return ['role' => $m->role, 'content' => $m->content];
            })
            ->toArray();

        // формирует окно истории: берет системное сообщение + последние N сообщений (CHAT_HISTORY_WINDOW) для контекста при запросе к HF
        $window = (int) env('CHAT_HISTORY_WINDOW', 6);
        $messages = array_merge(
            [['role' => 'system', 'content' => 'You are a helpful assistant. Answer concisely in Russian.']],
            array_slice($history, -$window)
        );

        // параметры генерации для HF: максимальное число токенов в ответе (HF_MAX_TOKENS - предел длины ответа 200-250 слов) и температура (HF_TEMPERATURE — управляет случайностью/креативностью - разнообразие ответов от 0.0 до 1.0)
        $maxTokens = (int) env('HF_MAX_TOKENS', 300);
        $temperature = (float) env('HF_TEMPERATURE', 0.5);

        // вызываем внешний HF клиент для генерации ответа по сформированным сообщениям. В случае любой ошибки (сеть, таймаут, 5xx от провайдера и т.п.) ловим исключение и // возвращаем HTTP 500 с сообщением об ошибке — чтобы клиент понял, что запрос к LLM не удался.
        try {
            $resp = $this->hf->chat($messages, ['max_tokens' => $maxTokens, 'temperature' => $temperature]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'HF request failed', 'detail' => $e->getMessage()], 500);
        }

        // извлекает текст ответа из структуры, возвращённой HFClient.  Поддерживает несколько форматов ответа: modern chat format (choices[][message][content]) и legacy (choices[][text]).  Если ожидаемых полей нет — сериализует весь ответ в JSON (чтобы не терять данные).
        $reply = null;
        if (isset($resp['choices'][0]['message']['content'])) {
            $reply = $resp['choices'][0]['message']['content'];
        } elseif (isset($resp['choices'][0]['text'])) {
            $reply = $resp['choices'][0]['text'];
        } else {
            $reply = json_encode($resp);
        }

        // сохраняет ответ ассистента в БД как сообщение роли "assistant"
        $botMsg = ChatMessage::create([
            'session_id' => $session->id,
            'role' => 'assistant',
            'content' => $reply,
        ]);

        // возвращает фронтенду объект сессии и только что созданное сообщение-ответ (HTTP 200); клиент(браузер) получает session (для последующих запросов) и reply (ответ ассистента).
        return response()->json([
            'session' => $session,
            'reply' => $botMsg,
        ], 200);
    }

    // возвращает указанную чат‑сессию вместе со всеми сообщениями (messages). Если сессии с таким id нет — возвращается 404 (findOrFail)
    public function session(Request $request, $id)
    {
        $session = ChatSession::with('messages')->findOrFail($id);

        return response()->json($session);
    }
}
