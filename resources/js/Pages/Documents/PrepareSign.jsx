import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configurar worker de PDF.js - usando la versión exacta que necesita react-pdf 9.1.1
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export default function PrepareSign({ document }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [signaturePosition, setSignaturePosition] = useState({ x: 200, y: 150 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [error, setError] = useState(null);
    const [pdfPageSize, setPdfPageSize] = useState({ width: null, height: null }); // tamaño real (scale=1)
    const displayWidth = 800; // ancho que usamos para renderizar la página
    const containerRef = useRef(null);

    const signatureWidth = 200;
    const signatureHeight = 60;

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
        setError(null);
        // Cargar tamaño real de la página actual (scale=1) para transformar coordenadas
        loadRealPageSize(pageNumber);
    }

    // Cuando cambia pageNumber recargamos tamaño real
    useEffect(() => {
        if (numPages) {
            loadRealPageSize(pageNumber);
        }
    }, [pageNumber, numPages]);

    const loadRealPageSize = async (pageNo) => {
        try {
            const loadingTask = pdfjs.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(pageNo);
            const viewport = page.getViewport({ scale: 1 });
            setPdfPageSize({ width: viewport.width, height: viewport.height });
        } catch (e) {
            console.warn('No se pudo obtener tamaño real de página', e);
        }
    };

    function onDocumentLoadError(error) {
        console.error('Error loading PDF:', error);
        setError('No se pudo cargar el PDF. Verifica que el archivo existe.');
    }

    const handleMouseMove = useCallback((e) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        let newX = e.clientX - rect.left - dragOffset.x;
        let newY = e.clientY - rect.top - dragOffset.y;

        // Límites para no salir del contenedor
        newX = Math.max(0, Math.min(newX, rect.width - signatureWidth));
        newY = Math.max(0, Math.min(newY, rect.height - signatureHeight));

        setSignaturePosition({ x: newX, y: newY });
    }, [dragOffset.x, dragOffset.y, signatureWidth, signatureHeight]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleConfirm = () => {
        if (!pdfPageSize.width) {
            alert('Aún cargando dimensiones del PDF, intenta de nuevo.');
            return;
        }
        // Factor de escala aplicado para mostrar la página
        const scaleUsed = displayWidth / pdfPageSize.width;

        // Convertir coordenadas del contenedor (display) a coordenadas reales del PDF (scale=1)
        const realX = signaturePosition.x / scaleUsed;
        const realYTopBased = signaturePosition.y / scaleUsed; // y desde arriba
        // SignNow podría usar sistema con origen superior-izquierdo (común en APIs web). Si fuera inferior, se ajustaría.

        const realWidth = signatureWidth / scaleUsed;
        const realHeight = signatureHeight / scaleUsed;

        router.post(route('documents.sign', document.id), {
            signature_x_orig: Math.round(realX),
            signature_y_orig: Math.round(realYTopBased),
            signature_w_orig: Math.round(realWidth),
            signature_h_orig: Math.round(realHeight),
            page_number: pageNumber - 1 // índice base 0
        });
    };

    const pdfUrl = `/storage/${document.original_path}`;

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            <Head title={`Preparar firma: ${document.title}`} />
            
            {/* Barra Superior */}
            <div className="bg-white p-4 flex justify-between items-center shadow-lg z-20">
                <div>
                    <h2 className="font-bold text-xl text-gray-800">📝 Posiciona tu Firma</h2>
                    <p className="text-sm text-gray-500">Arrastra el recuadro azul donde deseas firmar</p>
                </div>
                <div className="flex gap-3 items-center">
                    {numPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                                disabled={pageNumber === 1}
                                className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50 hover:bg-gray-300"
                            >
                                ←
                            </button>
                            <span className="text-sm font-semibold">Página {pageNumber} / {numPages}</span>
                            <button 
                                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                                disabled={pageNumber === numPages}
                                className="bg-gray-200 px-3 py-1 rounded disabled:opacity-50 hover:bg-gray-300"
                            >
                                →
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={() => router.visit(route('documents.index'))} 
                        className="text-gray-500 hover:text-gray-700 px-4 py-2 font-semibold"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 font-bold transform transition hover:scale-105"
                    >
                        ✅ Confirmar y Continuar
                    </button>
                </div>
            </div>

            {/* Contenedor del PDF */}
            <div className="flex-1 p-8 flex justify-center items-start overflow-auto">
                <div 
                    ref={containerRef}
                    className="relative bg-white rounded-lg shadow-2xl"
                    style={{ minHeight: '600px', userSelect: isDragging ? 'none' : 'auto' }}
                >
                    {error ? (
                        <div className="flex items-center justify-center h-96 p-8">
                            <div className="text-center">
                                <div className="text-red-600 text-xl mb-4">⚠️ {error}</div>
                                <button 
                                    onClick={() => router.visit(route('documents.index'))}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                >
                                    Volver al inicio
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={onDocumentLoadError}
                                loading={
                                    <div className="flex items-center justify-center h-96">
                                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                                    </div>
                                }
                            >
                                <Page 
                                    pageNumber={pageNumber}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    width={displayWidth}
                                />
                            </Document>

                            {/* Campo de firma draggable */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${signaturePosition.x}px`,
                                    top: `${signaturePosition.y}px`,
                                    width: `${signatureWidth}px`,
                                    height: `${signatureHeight}px`,
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                    zIndex: 10
                                }}
                                className="border-4 border-blue-500 bg-blue-100 bg-opacity-40 rounded-lg flex items-center justify-center shadow-lg hover:border-blue-600 hover:bg-opacity-60 transition"
                                onMouseDown={handleMouseDown}
                                onDragStart={(e) => e.preventDefault()}
                            >
                                <div className="text-center pointer-events-none">
                                    <span className="text-blue-800 font-bold text-sm">✍️ FIRMA AQUÍ</span>
                                    <p className="text-xs text-blue-600 mt-1">Arrastra para mover</p>
                                    {pdfPageSize.width && (
                                        <p className="text-[10px] text-blue-500 mt-1">
                                            Escala: {(displayWidth / pdfPageSize.width).toFixed(2)} | X:{signaturePosition.x} Y:{signaturePosition.y}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-blue-50 border-t border-blue-100 p-4">
                <div className="max-w-4xl mx-auto text-center text-sm text-gray-700">
                    <p className="font-semibold">💡 Tip:</p>
                    <p>Arrastra el recuadro azul a la posición exacta donde deseas colocar tu firma digital. 
                    Luego haz clic en "Confirmar y Continuar" para proceder con la firma electrónica.</p>
                </div>
            </div>
        </div>
    );
}
