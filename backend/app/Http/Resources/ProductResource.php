<?php

namespace App\Http\Resources;

use App\Http\Resources\CategoryResource;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request)
    {
        $discountModel = null;

        if ($this->relationLoaded('discounts')) {
            $discountModel = $this->discounts->first();
        } elseif (method_exists($this, 'activeDiscount')) {
            $discountModel = $this->activeDiscount();
        }

        $priceAfterFormatted = null;
        if ($discountModel) {
            if (method_exists($discountModel, 'priceAfter')) {
                $computed = $discountModel->priceAfter($this->price);
                $priceAfterFormatted = $computed !== null ? number_format((float)$computed, 2, '.', '') : null;
            } else {
                $pa = $discountModel->price_after ?? null;
                $priceAfterFormatted = is_numeric($pa) ? number_format((float) $pa, 2, '.', '') : null;
            }
        }

        $imgPath = $this->img ? ltrim((string)$this->img, '/') : null;

        return [
            'id'               => $this->id,
            'title'            => $this->title,
            'sku'              => $this->sku,
            'price'            => $this->price !== null ? number_format((float)$this->price, 2, '.', '') : null,
            'currency'         => $this->currency,
            'description'      => $this->description,
            'img'              => $imgPath,
            'img_path'         => $imgPath,
            'weight'           => $this->weight,
            'colours'          => $this->colours,
            'material'         => $this->material,
            'dimensions'       => $this->dimensions,
            'is_popular'       => (bool) $this->is_popular,
            'category'         => new CategoryResource($this->whenLoaded('category')),
            'views'            => (int) ($this->views ?? 0),
            'sales_count'      => (int) ($this->sales_count ?? 0),
            'reviews_count'    => (int) ($this->reviews_count ?? 0),
            'rating'           => $this->rating !== null ? (float) $this->rating : null,
            'popularity_score' => (float) ($this->popularity_score ?? 0),
            'discount' => $this->when($discountModel, function () use ($discountModel, $priceAfterFormatted) {
                return [
                    'id'         => $discountModel->id,
                    'type'       => $discountModel->type,
                    'value'      => is_numeric($discountModel->value) ? (float) $discountModel->value : $discountModel->value,
                    'currency'   => $discountModel->currency,
                    'price_after'=> $priceAfterFormatted,
                ];
            }),
        ];
    }
}
