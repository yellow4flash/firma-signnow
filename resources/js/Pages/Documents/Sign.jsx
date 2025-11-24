import React from 'react';
import { Head, router } from '@inertiajs/react';

export default function Sign({ document, signingUrl, errors }) {
    
    const handleCheck = () => {
        router.post(route('documents.check', document.id));
    };

    return (
        <div className="h-screen flex flex-col bg-gray-900">
            <Head title={`Firmando: ${document.title}`} />
            
            {/* Barra Superior */}
            <div className="bg-white p-4 flex justify-between items-center shadow z-10">
                <div>
                    <h2 className="font-bold text-lg text-gray-800">Firmando: {document.title}</h2>
                    <p className="text-xs text-gray-500">Por favor, firma en el recuadro de abajo.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => router.visit(route('documents.index'))} className="text-gray-500 hover:text-gray-700 px-4 font-semibold">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleCheck}
                        className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 font-bold animate-pulse"
                    >
                        ✅ YA FIRMÉ, GUARDAR
                    </button>
                </div>
            </div>

            {/* Errores */}
            {Object.keys(errors).length > 0 && (
                <div className="bg-red-500 text-white text-center p-2">
                    ⚠️ {errors.error || 'Ocurrió un error al verificar.'} Intenta firmar primero.
                </div>
            )}

            {/* Iframe de SignNow */}
            <div className="flex-1 bg-gray-200 p-4">
                <iframe 
                    src={signingUrl} 
                    className="w-full h-full rounded shadow-lg bg-white"
                    title="SignNow Frame"
                />
            </div>
        </div>
    );
}