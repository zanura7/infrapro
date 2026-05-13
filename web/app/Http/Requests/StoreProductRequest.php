<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:64'],
            'category' => ['nullable', 'string', 'max:120'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:8'],
            'description' => ['nullable', 'string', 'max:5000'],
            'usp' => ['nullable', 'array', 'max:10'],
            'usp.*' => ['nullable', 'string', 'max:120'],
            'target_audience' => ['nullable', 'string', 'max:255'],
            'pain_point' => ['nullable', 'string', 'max:2000'],
            'brand_voice' => ['nullable', 'array'],
            'brand_voice.tone' => ['nullable', 'array'],
            'brand_voice.tone.*' => ['string', 'max:40'],
            'brand_voice.formality' => ['nullable', 'integer', 'min:0', 'max:100'],
            'brand_voice.dos' => ['nullable', 'array'],
            'brand_voice.dos.*' => ['string', 'max:500'],
            'brand_voice.donts' => ['nullable', 'array'],
            'brand_voice.donts.*' => ['string', 'max:500'],
            'brand_voice.samples' => ['nullable', 'array'],
            'brand_voice.samples.*' => ['string', 'max:2000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'usp' => $this->input('usp') ? array_values(array_filter($this->input('usp'), fn ($v) => trim((string) $v) !== '')) : null,
        ]);
    }
}
