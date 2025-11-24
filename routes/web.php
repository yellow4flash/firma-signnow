<?php

use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});


// 1. Redirección inicial: Si entran a la raíz, los mandamos al panel de documentos
Route::get('/', function () {
    return redirect()->route('documents.index');
});

// 2. Grupo de rutas para la gestión de documentos (Tesis)
Route::prefix('documents')->name('documents.')->group(function () {
    
    // Pantalla principal: Lista de documentos y formulario de subida
    Route::get('/', [DocumentController::class, 'index'])->name('index');
    
    // Acción: Subir un nuevo PDF (Guarda en local)
    Route::post('/', [DocumentController::class, 'store'])->name('store');
    
    // Pantalla de Preparación: Posicionar la firma en el PDF
    Route::get('/{document}/prepare', [DocumentController::class, 'prepare'])->name('prepare');
    
    // Acción: Enviar coordenadas y mostrar iframe de SignNow
    Route::post('/{document}/sign', [DocumentController::class, 'sign'])->name('sign');
    
    // Acción: Verificar si el usuario ya firmó (Botón "Ya firmé")
    Route::post('/{document}/check', [DocumentController::class, 'check'])->name('check');
    
    // Acción: Descargar el PDF final firmado desde SignNow/Local
    Route::get('/{document}/download', [DocumentController::class, 'download'])->name('download');
});

// 3. Rutas de autenticación (Login, Register) generadas por Laravel Breeze
// Si instalaste Breeze, este archivo existe en tu carpeta routes.
require __DIR__.'/auth.php';
