<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HFClient
{
    protected $apiKey;
    protected $routerUrl;
    protected $model;
    protected $defaultMaxTokens;
    protected $defaultTemp;

    public function __construct()
    {
        $this->apiKey = config('services.hf.key') ?? env('HF_API_KEY');
        $this->routerUrl = env('HF_ROUTER', 'https://router.huggingface.co/v1');
        $this->model = env('HF_MODEL', 'gpt2');
        $this->defaultMaxTokens = (int) env('HF_MAX_TOKENS', 400);
        $this->defaultTemp = (float) env('HF_TEMPERATURE', 0.7);
    }

    public function chat(array $messages, array $options = [])
    {
        $payload = array_merge([
            'model' => $this->model,
            'messages' => $messages,
        ], $options);

        $resp = Http::withToken($this->apiKey)
            ->post($this->routerUrl . '/chat/completions', $payload);

        if (! $resp->ok()) {
            Log::error('HF API raw error', ['status' => $resp->status(), 'body' => $resp->body()]);
            throw new \RuntimeException('HF API error: ' . $resp->body());
        }

        return $resp->json();
    }
}
