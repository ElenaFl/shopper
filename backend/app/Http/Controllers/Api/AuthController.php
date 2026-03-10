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

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            // log the user in (session-based)
            Auth::login($user);
            $request->session()->regenerate();

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Register error: ' . $e->getMessage());
            return response()->json(['message' => 'Registration failed'], 500);
        }

        $response = [
            'user' => $user->makeHidden(['password', 'remember_token']),
        ];

        if ($request->boolean('create_token') || $request->input('create_token') === 'true') {
            if (method_exists($user, 'createToken')) {
                $token = $user->createToken('api-token')->plainTextToken;
                $response['token'] = $token;
            }
        }

        return response()->json($response, 201);
    }

    public function login(Request $request)
    {
        $data = $request->only('email', 'password', 'create_token');

        $validator = Validator::make($data, [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $credentials = $request->only('email', 'password');

        if (! Auth::attempt($credentials)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $request->session()->regenerate();
        $user = Auth::user();
        /** @var \App\Models\User $user */
        $response = [
            'user' => $user->makeHidden(['password', 'remember_token']),
        ];

        if ($request->boolean('create_token') || $request->input('create_token') === 'true') {
            if (method_exists($user, 'createToken')) {
                $token = $user->createToken('api-token')->plainTextToken;
                $response['token'] = $token;
            }
        }

        return response()->json($response, 200);
    }

    public function logout(Request $request)
    {
        try {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        } catch (\Throwable $e) {
            Log::warning('Logout issue: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Logged out'], 200);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        return response()->json($user->makeHidden(['password', 'remember_token']), 200);
    }
}
