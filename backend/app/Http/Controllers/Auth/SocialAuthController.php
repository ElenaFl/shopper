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

class SocialAuthController extends Controller
{
    /**
     * Redirect the user to the provider authentication page.
     */
    public function redirect($provider)
    {
        if (! in_array($provider, ['github','google'])) {
            abort(404);
        }

        return Socialite::driver($provider)->redirect();
    }

    /**
     * Obtain the user information from provider and login/create user.
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

        // 1) try find by provider/provider_id
        $user = User::where('provider', $provider)
            ->where('provider_id', $oauthUser->getId())
            ->first();

        // 2) try find by email if not found
        if (! $user && $oauthUser->getEmail()) {
            $user = User::where('email', $oauthUser->getEmail())->first();
        }

        // 3) create or update user
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
            // ensure provider fields are set (link account)
            $user->provider = $provider;
            $user->provider_id = $oauthUser->getId();
            $user->avatar = $oauthUser->getAvatar() ?? $user->avatar;
            $user->save();
            Log::info('SocialAuth: updated user id='.$user->id.' provider='.$provider);
        }

        // login and redirect to frontend
        Auth::login($user, true);

        return redirect(env('FRONTEND_URL', 'http://shopper.local:5173'));
    }
}
