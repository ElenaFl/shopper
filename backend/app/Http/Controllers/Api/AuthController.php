<?php
    namespace App\Http\Controllers\Api;
    use App\Http\Controllers\Controller;
    use Illuminate\Http\Request;
    use Illuminate\Support\Facades\DB;
    use Illuminate\Support\Facades\Hash;
    use Illuminate\Support\Facades\Auth;

    class AuthController extends Controller {
        public function register(Request $request){
            $request->validate([
                'name' => 'required|string',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:4|confirmed',
            ]);
            $id = DB::table('users')->insertGetId([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $user = DB::table('users')
            ->where('id', $id)->first();
            Auth::loginUsingId($id);
            $request->session()->regenerate();
            return response()->json($user, 201);
            }
            public function login(Request $request)
            {
                $request->validate([
                    'email' => 'required|email',
                    'password' => 'required',
                ]);
                $credentials = $request->only('email', 'password');
                if (! Auth::attempt($credentials)) {
                    return response()->json(['message' => 'Invalid credentials'], 401);
                }
                $request->session()->regenerate();
                $user = Auth::user();
                return response()->json($user, 200);
                }
                public function logout(Request $request) {
                    Auth::logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                    return response()->json(['message' => 'Logged out'], 200);
                }
                public function me(Request $request) {
                    $user = $request->user();
                    if (! $user) {
                        return response()->json(['message' => 'Unauthenticated'], 401);
                    }
                    return response()->json($user, 200);
} }
