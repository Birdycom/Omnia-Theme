<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = ['name', 'price', 'featured'];

    /** Monthly price including 21% VAT. */
    public function priceWithVat(float $rate = 0.21): float
    {
        return round($this->price * (1 + $rate), 2);
    }
}
