<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\SignNowService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DocumentController extends Controller
{
    protected $signNow;

    public function __construct(SignNowService $signNow)
    {
        $this->signNow = $signNow;
    }

    public function index()
    {
        return Inertia::render('Documents/Index', [
            'documents' => Document::orderBy('created_at', 'desc')->get()
        ]);
    }

    // 1. Subir archivo local y registrar en DB
    public function store(Request $request)
    {
        $request->validate(['pdf' => 'required|mimes:pdf|max:10000']);

        $file = $request->file('pdf');
        $path = $file->store('documents', 'public');

        Document::create([
            'title' => $file->getClientOriginalName(),
            'original_path' => $path,
            'status' => 'pending'
        ]);

        return redirect()->back();
    }

    // 2a. Mostrar pantalla de preparación (posicionar firma)
    public function prepare(Document $document)
    {
        return Inertia::render('Documents/PrepareSign', [
            'document' => $document
        ]);
    }

    // 2b. Iniciar proceso de firma con coordenadas (Enviar a SignNow)
    public function sign(Request $request, Document $document)
    {
        try {
            $request->validate([
                'signature_x_orig' => 'required|integer',
                'signature_y_orig' => 'required|integer',
                'signature_w_orig' => 'required|integer|min:10',
                'signature_h_orig' => 'required|integer|min:10',
                'page_number' => 'required|integer|min:0'
            ]);

            $token = $this->signNow->getToken();

            // Si no lo hemos subido a SignNow todavía, lo subimos con las coordenadas
            if (!$document->signnow_id) {
                $realPath = storage_path('app/public/' . $document->original_path);
                $docId = $this->signNow->uploadAndPrepare(
                    $realPath,
                    $token,
                    $request->signature_x_orig,
                    $request->signature_y_orig,
                    $request->page_number,
                    $request->signature_w_orig,
                    $request->signature_h_orig
                );
                $document->update(['signnow_id' => $docId]);
            }

            // Generar link
            $url = $this->signNow->getSigningLink($document->signnow_id, $token);

            return Inertia::render('Documents/Sign', [
                'document' => $document,
                'signingUrl' => $url
            ]);

        } catch (\Exception $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    // 3. Callback / Verificación manual (Botón "Ya firmé")
    public function check(Document $document)
    {
        $token = $this->signNow->getToken();
        $isSigned = $this->signNow->checkStatus($document->signnow_id, $token);

        if ($isSigned) {
            // Descargar el PDF final
            $pdfContent = $this->signNow->downloadSigned($document->signnow_id, $token);
            
            // Guardar en local
            $fileName = 'signed_' . time() . '_' . $document->title;
            Storage::disk('public')->put("signed/{$fileName}", $pdfContent);

            $document->update([
                'status' => 'signed',
                'signed_path' => "signed/{$fileName}"
            ]);

            return redirect()->route('documents.index');
        }

        return back()->withErrors(['error' => 'El documento aún no ha sido firmado en SignNow.']);
    }
    
    // 4. Descargar PDF final
    public function download(Document $document)
    {
        if ($document->status !== 'signed') abort(404);
        return Storage::disk('public')->download($document->signed_path);
    }
}