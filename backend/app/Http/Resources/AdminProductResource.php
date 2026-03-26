<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class AdminProductResource extends JsonResource
{
    /**
     * Админская сериализация продукта — включает служебные поля.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        return [
            'id'               => $this->id,
            'title'            => $this->title,
            'sku'              => $this->sku,
            'price'            => $this->price,
            'currency'         => $this->currency,
            'img'              => $this->img,
            'dimensions'       => $this->dimensions,
            'is_popular'       => (bool) ($this->is_popular ?? false),
            'sales_count'      => $this->when($request->user() && $request->user()->is_admin, $this->sales_count ?? 0),
            'popularity_score' => $this->popularity_score ?? 0,
            'reviews_count'    => $this->reviews_count ?? 0,
            'rating'           => $this->rating,
            'category'         => new CategoryResource($this->whenLoaded('category')),
            'created_at'       => $this->created_at ? $this->created_at->toISOString() : null,
            'updated_at'       => $this->updated_at ? $this->updated_at->toISOString() : null,
            'discount'         => $this->when(
                $this->relationLoaded('discounts') || $this->activeDiscount(),
                function () {
                    $d = $this->relationLoaded('discounts') ? $this->discounts->first() : $this->activeDiscount();
                    if (! $d) {
                        return null;
                    }

                    $value = (float) $d->value;
                    $priceAfter = null;
                    if ($d->type === 'percent') {
                        $priceAfter = round($this->price * (1 - $value / 100), 2);
                    } else {
                        $priceAfter = round($this->price - $value, 2);
                    }

                    return [
                        'id'         => $d->id,
                        'type'       => $d->type,
                        'value'      => $value,
                        'currency'   => $d->currency,
                        'price_after'=> $priceAfter,
                    ];
                }
            ),
        ];
    }
}
