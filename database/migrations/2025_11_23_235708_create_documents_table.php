<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // Nombre del archivo original
            $table->string('original_path'); // Ruta en tu storage local
            $table->string('signnow_id')->nullable(); // ID en la nube de SignNow
            $table->string('status')->default('pending'); // pending, signed
            $table->string('signed_path')->nullable(); // Ruta del PDF final firmado
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
