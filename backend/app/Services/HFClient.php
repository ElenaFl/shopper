<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 *
 * Class HFClient
 *
 * Сервис-клиент для вызова Hugging Face Inference/Chat API
 */

class HFClient
{
    protected $apiKey;
    protected $routerUrl;
    protected $model;
    protected $defaultMaxTokens;
    protected $defaultTemp;

    public function __construct()
    {
        // конфигурация/переменные окружения
        $this->apiKey = config('services.hf.key') ?? env('HF_API_KEY');
        $this->routerUrl = env('HF_ROUTER', 'https://router.huggingface.co/v1');
        $this->model = env('HF_MODEL', 'gpt2');
        $this->defaultMaxTokens = (int) env('HF_MAX_TOKENS', 400);
        $this->defaultTemp = (float) env('HF_TEMPERATURE', 0.6);
    }

    /**
     * Формирует полезную нагрузку с model + messages + переданными options.
     * Делает POST запрос на {routerUrl}/chat/completions с Authorization Bearer (Http::withToken).
     * При ошибке логирует и бросает RuntimeException с телом ответа.
     * При успешном ответе возвращает распарсенный JSON.
     */
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
