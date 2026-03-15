<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->only('name', 'email', 'password', 'password_confirmation', 'create_token');

        $validator = Validator::make($data, [
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:4|confirmed',
        ]);

        // если не прошла серверная валидация
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }


        try {
            // открывает транзакцию, чтобы операции базы данных были атомарны. При исключении откатывает транзакцию, логирует ошибку и возвращает HTTP 500
            DB::beginTransaction();
            // создаёт нового пользователя в базе
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                // хеширует пароль через Hash::make — безопасное хеширование (bcrypt/argon2, по конфигу).
                'password' => Hash::make($data['password']),
            ]);

            // Выполняет аутентификацию пользователя в рамках session-based (серверной) модели. Помечает текущую сессию как принадлежащую этому пользователю и сохраняет его идентификатор (user_id) в сессионных данных.
            //После этого в последующих запросах пользователь считается аутентифицированным (Auth::check() вернёт true, Auth::user() вернёт объект пользователя), пока сессия действительна.
            Auth::login($user);
            // регенерирует id сессии для защиты от session fixation
            $request->session()->regenerate();

            // вызывается в блоке try после успешного выполнения всех операций.
            // завершает текущую транзакцию: фиксирует (commit) все сделанные изменения в базе данных, которые были начаты ранее методом DB::beginTransaction().
            DB::commit();
            // блок обработки транзакции и ошибок при создании пользователя
            //  перехват любых исключений/ошибок, которые могли возникнуть в try-блоке.
        } catch (\Throwable $e) {
            // откатывает транзакцию: отменяет все изменения, сделанные в рамках текущей транзакции.
            // это гарантирует, что при ошибке в середине последовательности операций база не окажется в частично обновлённом состоянии.
            DB::rollBack();
            // Логирует сообщение об ошибке с уровнем error, чтобы администратор/разработчик мог увидеть причину сбоя в логах (storage/logs/laravel.log или настроенный лог-канал). e->getMessage() даёт текст ошибки;
            Log::error('Register error: ' . $e->getMessage());
            // возвращает клиенту HTTP-ответ с кодом 500 (Internal Server Error) и общим сообщением.
            return response()->json(['message' => 'Registration failed'], 500);
        }

        $response = [
            // временно скрывает чувствительные поля при сериализации в JSON
            'user' => $user->makeHidden(['password', 'remember_token']),
        ];

        // если запрос содержит create_token (boolean или строка 'true') и у модели есть метод createToken (Sanctum/Passport), создаётся personal access token и кладётся в ответ в поле token. Метод plainTextToken возвращает токен в открытом виде (показывается только при создании).
        if ($request->boolean('create_token') || $request->input('create_token') === 'true') {
            if (method_exists($user, 'createToken')) {
                $token = $user->createToken('api-token')->plainTextToken;
                $response['token'] = $token;
            }
        }

        // отправляет ответ с HTTP 201 Created(запрос успешно выполнен и привёл к созданию нового ресурса на сервере)
        return response()->json($response, 201);
    }

    public function login(Request $request)
    {
        $data = $request->only('email', 'password', 'create_token');

        $validator = Validator::make($data, [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        //ошибка валидации входных данных (например, не заполнено обязательное поле, формат email неверен, пароль слишком короткий)
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // проверка наличия и формата email и password
        $credentials = $request->only('email', 'password');

        // попытка найти пользователя по email и сравнить хеш пароля. Если неудача — возврат 401 (неавторизованный) с сообщением Invalid credentials.
        if (! Auth::attempt($credentials)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }
        // при успешном входе регенерируем сессию (session fixation защита) - новый сесионный кукки.
        $request->session()->regenerate();

        $request->session()->save();
        // получаем текущего аутентифицированного пользователя и прячем password/remember_token.
        $user = Auth::user();
        /** @var \App\Models\User $user */
        $response = [
            'user' => $user->makeHidden(['password', 'remember_token']),
        ];

        // опционально создаём персональный token(мобильные приложения, когда не используются сессии
        if ($request->boolean('create_token') || $request->input('create_token') === 'true') {
            if (method_exists($user, 'createToken')) {
                $token = $user->createToken('api-token')->plainTextToken;
                $response['token'] = $token;
            }
        }
        // возвращаем данные пользователя (и, возможно, токен) с HTTP 200 OK.
        return response()->json($response, 200);
    }

    public function logout(Request $request)
    {
        Log::debug('Logout start — session id: ' . session()->getId() . ', Auth::id(): ' . (Auth::id() ?? 'null'));
        // удаляет аутентификацию (session-based)
        try {
            Auth::logout();
            //инвалидирует (очищает) текущую сессию
            $request->session()->invalidate();
            Log::debug('Logout after invalidate — session id: ' . session()->getId() . ', Auth::id(): ' . (Auth::id() ?? 'null'));
            // генерирует новый CSRF-токен (полезно после logout)
            $request->session()->regenerateToken();
            Log::debug('Logout after regenerateToken — session id: ' . session()->getId() . ', Auth::id(): ' . (Auth::id() ?? 'null'));
            //логируется предупреждение, но пользователь получит 200 в любом случае
        } catch (\Throwable $e) {
            Log::warning('Logout issue: ' . $e->getMessage());
        }
        // возвращается 200 OK и сообщение
        return response()->json(['message' => 'Logged out'], 200);
    }

    public function me(Request $request)
    {
        Log::debug('Me called — session id: ' . session()->getId() . ', Auth::id(): ' . (Auth::id() ?? 'null'));
        // получаем текущего аутентифицированного пользователя
        $user = $request->user();
        // если неаутентифицирован — 401
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        // возвращается информацию о пользователе (безопасно - без полей password и remember_token) с HTTP 200
        return response()->json($user->makeHidden(['password', 'remember_token']), 200);
    }

}
