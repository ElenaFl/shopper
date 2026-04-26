<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedItem;
use Illuminate\Http\Request;

/**
 * Class SavedItemController
 *
 * API для управления списком сохранённых пользователем товаров (wishlist).
 *
 * Поведение:
 * - index: вернуть все сохранённые элементы текущего пользователя (with product).
 * - store: добавить элемент (firstOrCreate) и вернуть его.
 * - destroy: удалить элемент, только если он принадлежит пользователю.
 * - sync: синхронизировать список product_ids (идемпотентно), вернуть актуальный список.
 *
 * Ответы:
 * - 200 OK, 201 Created, 401/403/404/422 при ошибках.
 */

class SavedItemController extends Controller {

    // GET /api/user/saved-items
    // возвращает JSON с ключом data => коллекция элементов.
    public function index(Request $request) {

     // проверяет аутентификацию и возвращает 401, если пользователь не авторизован.
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }
       // получает все SavedItem для текущего пользователя, подгружая связь product (with('product')) и сортируя по created_at по убыванию.
        $items = SavedItem::where('user_id', $user->id)
            ->with('product')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $items]);
    }


    // POST /api/user/saved-items
    //  возвращает созданный/существующий элемент с HTTP 201
    public function store(Request $request) {

        $user = $request->user();
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        $data = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'meta' => 'nullable|array',
        ]);

        // firstOrCreate: создаёт запись только если ещё не существует сочетание user_id + product_id (гарантирует уникальность на уровне приложения).
        $saved = SavedItem::firstOrCreate( [
            'user_id' => $user->id,
            'product_id' => $data['product_id']
            ],
            [
                'meta' => $data['meta'] ?? null
            ]
        );

        // загружает связь product
        $saved->load('product');

        return response()->json($saved, 201);
    }


    // DELETE /api/user/saved-items/{id}
    // удаляет запись
    public function destroy(Request $request, $id) {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        // находит запись по id; если не существует — 404.
        $item = SavedItem::find($id);

        if (! $item) {
            return response()->json([
                'message' => 'Not found'
                ], 404);
        }

        // проверяет право: запись должна принадлежать текущему пользователю;если нет — 403.
        if ($item->user_id !== $user->id) {
            return response()->json([
                'message' => 'Forbidden'
                ], 403);
        }

        // выполняет delete() и возвращает сообщение Deleted (HTTP 200).
        $item->delete();
        return response()->json([
            'message' => 'Deleted'
        ]);
    }

    // POST /api/user/saved-items/sync
    // Body: { product_ids: [1,2,3] } - merge guest -> user (idempotent)

    // синхронизация списка сохранённого (например, после авторизации объединить сохранённое гостя с учётной записью). Операция идемпотентна.
    public function sync(Request $request) {

        $user = $request->user();
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        // после validate в $data будет валидированный массив, например ['product_ids' => [1,2,3]].
        $data = $request->validate([
            // product_ids обязателен и должен быть массивом
            'product_ids' => 'required|array',
            // каждый элемент product_ids.* должен быть целым числом и соответствовать id существующего товара в таблице products
            'product_ids.*' => 'integer|exists:products,id',
        ]);

        // инициализация пустого массива
        $created = [];

        // удаление дубликатов и создание записей
        // array_unique убирает повторяющиеся id в переданном массиве, чтобы не пытаться создать одну и ту же пару несколько раз.
        //firstOrCreate ищет запись SavedItem с условиями в первом массиве (user_id + product_id). Если запись найдена — возвращает её. Если не найдена — создаёт новую запись с полями из первого массива плюс дополнительные поля из второго массива (здесь meta => null).
        foreach (array_unique($data['product_ids']) as $pid) {
            $saved = SavedItem::firstOrCreate( [
                'user_id' => $user->id,
                'product_id' => $pid
                ],
                ['meta' => null
                ]
            );

            // добавление элемента в массив $created[] = $saved
            // в результате $created будет содержать коллекцию SavedItem (существующих или новых)
            $created[] = $saved;
        }

        // $items получает все SavedItem текущего пользователя, подгружая связанных Product через with('product').
        $items = SavedItem::where('user_id', $user->id)
            ->with('product')
            ->get();

        // список возвращается клиенту
        return response()->json(['data' => $items]);
    }
}
