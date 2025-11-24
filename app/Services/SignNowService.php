<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SignNowService
{
    protected $baseUrl;
    protected $basicToken;

    public function __construct()
    {
        // URL de Producción (api.signnow.com) donde existen tus llaves
        $this->baseUrl = env('SIGNNOW_BASE_URL', 'https://api.signnow.com');
        $this->basicToken = env('SIGNNOW_BASIC_TOKEN');
    }

    /**
     * 1. Obtener Token de Acceso
     */
    public function getToken()
    {
        $response = Http::withHeaders([
            'Authorization' => 'Basic ' . $this->basicToken,
        ])->asForm()->post($this->baseUrl . '/oauth2/token', [
            'username' => env('SIGNNOW_USER_EMAIL'),
            'password' => env('SIGNNOW_USER_PASSWORD'),
            'grant_type' => 'password',
            'scope' => '*'
        ]);

        if ($response->failed()) {
            throw new \Exception("Error SignNow Auth: " . $response->body());
        }

        return $response->json()['access_token'];
    }

    /**
     * 2. Subir PDF e Inyectar campo de firma
     * (Retorna el ID del documento)
     */
    public function uploadAndPrepare($filePath, $token, $signatureX = 200, $signatureY = 150, $pageNumber = 0, $signatureW = 200, $signatureH = 60)
    {
        // A. Subir el archivo físico
        $fileContent = fopen($filePath, 'r');
        
        $response = Http::withToken($token)
            ->attach('file', $fileContent, 'documento_tesis.pdf')
            ->post($this->baseUrl . '/document');

        if ($response->failed()) {
            throw new \Exception("Error SignNow Upload: " . $response->body());
        }

        $docId = $response->json()['id'];

        // B. Inyectar el campo de firma con coordenadas personalizadas
        $this->addSignatureField($token, $docId, $signatureX, $signatureY, $pageNumber, $signatureW, $signatureH);

        return $docId;
    }

    /**
     * Función auxiliar privada para poner el cajón de firma
     */
    private function addSignatureField($token, $docId, $x = 200, $y = 150, $pageNumber = 0, $width = 200, $height = 60)
    {
        $url = $this->baseUrl . "/document/{$docId}";
        
        // Coordenadas personalizables desde el frontend
        $fieldsPayload = [
            "fields" => [
                [
                    "x" => $x,
                    "y" => $y,
                    "width" => $width,
                    "height" => $height,
                    "type" => "signature",
                    "page_number" => $pageNumber,
                    "role" => "Signer 1",
                    "required" => true,
                    "name" => "Firma_Acta"
                ]
            ]
        ];

        $response = Http::withToken($token)->put($url, $fieldsPayload);

        if ($response->failed()) {
            Log::error("Error agregando campo de firma: " . $response->body());
        }
    }

    /**
     * 3. Generar el Link para el Iframe
     */
    public function getSigningLink($docId, $token)
    {
        $response = Http::withToken($token)
            ->post($this->baseUrl . "/link", [
                "document_id" => $docId
            ]);

        if ($response->failed()) {
            throw new \Exception("Error SignNow Link: " . $response->body());
        }

        // Devolvemos la URL que no pide registro
        return $response->json()['url_no_signup'];
    }

    /**
     * 4. Verificar si ya firmaron (Check Status)
     */
    public function checkStatus($docId, $token)
    {
        $response = Http::withToken($token)->get($this->baseUrl . "/document/{$docId}");
        
        if ($response->failed()) return false;

        $data = $response->json();
        
        // Si hay firmas en el array 'signatures', es true
        return count($data['signatures'] ?? []) > 0;
    }

    /**
     * 5. Descargar el PDF final firmado
     */
    public function downloadSigned($docId, $token)
    {
        // 'collapsed' significa que funde la firma en el PDF
        $response = Http::withToken($token)
            ->get($this->baseUrl . "/document/{$docId}/download?type=collapsed");

        if ($response->failed()) {
            throw new \Exception("Error Descarga: " . $response->body());
        }

        return $response->body();
    }
}