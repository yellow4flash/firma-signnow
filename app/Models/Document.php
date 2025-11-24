<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    // Permite asignación masiva de estos campos al usar Document::create([...])
    protected $fillable = [
        'title',
        'original_path',
        'signnow_id',
        'status',
        'signed_path'
    ];
}
