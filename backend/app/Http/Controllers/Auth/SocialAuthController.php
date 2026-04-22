<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * SocialAuthController - обрабатывает вход через внешних OAuth‑провайдеров (GitHub и Google): перенаправляет пользователя на страницу провайдера, принимает callback с профилем, находит или создаёт пользователя в базе и выполняет логин(завершает процесс аутентификации пользователя на сервере — устанавливает для него сессионное состояние, чтобы последующие запросы от этого клиента уже считались авторизованными как от найденного/созданного пользователя)
 */
class SocialAuthController extends Controller
{
    /**
     * Редирект на страницу провайдера (github/google)
     */
    public function redirect($provider)
    {
        if (! in_array($provider, [
            'github',
            'google'
        ])) {
            abort(404);
        }

        return Socialite::driver($provider)->redirect();
    }

    /**
     * получает информацию о пользователе от провайдера и входит в систему/создает пользователя
     */
    public function callback(Request $request, $provider)
    {
        if (! in_array($provider, ['github','google'])) {
            abort(404);
        }

        try {
            $oauthUser = Socialite::driver($provider)->user();
        } catch (\Exception $e) {
            Log::error('Socialite callback error: '.$e->getMessage());
            return redirect('/login')->withErrors('Authentication error');
        }

        // 1) ищет по провайдеру/provider_id
        $user = User::where('provider', $provider)
            ->where('provider_id', $oauthUser->getId())
            ->first();

        // 2) пробует найти по электронной почте
        if (! $user && $oauthUser->getEmail()) {
            $user = User::where('email', $oauthUser->getEmail())->first();
        }

        // 3) создание или обновление пользователя
        if (! $user) {
            $user = User::create([
                'name' => $oauthUser->getName() ?: $oauthUser->getNickname() ?: 'User',
                'email' => $oauthUser->getEmail(),
                'email_verified_at' => $oauthUser->getEmail() ? now() : null,
                'password' => Hash::make(Str::random(24)),
                'provider' => $provider,
                'provider_id' => $oauthUser->getId(),
                'avatar' => $oauthUser->getAvatar(),
            ]);
            Log::info('SocialAuth: created user id='.$user->id.' via '.$provider);
        } else {
            // убеждается, что заданы поля поставщика (ссылка на учетную запись), то есть код гарантирует — в учетной записи пользователя в базе записаны сведения о внешнем OAuth‑провайдере (какой провайдер и его идентификатор), а также обновляет аватар, если он пришёл от провайдера. То есть контроллер не игнорирует провайдерские данные для уже существующего пользователя, а явно записывает/синхронизирует их
            $user->provider = $provider;
            $user->provider_id = $oauthUser->getId();
            $user->avatar = $oauthUser->getAvatar() ?? $user->avatar;
            $user->save();
            Log::info('SocialAuth: updated user id='.$user->id.' provider='.$provider);
        }

        // вход в систему и перенаправление на веб-интерфейс
        Auth::login($user, true);

        return redirect(env('FRONTEND_URL', 'http://shopper.local:5173'));
    }
}
