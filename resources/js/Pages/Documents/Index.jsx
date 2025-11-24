import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';

export default function Index({ documents }) {
    const { data, setData, post, processing, reset } = useForm({ pdf: null });

    const submit = (e) => {
        e.preventDefault();
        post(route('documents.store'), { onSuccess: () => reset() });
    };

    return (
        <div className="min-h-screen bg-gray-100 p-10">
            <Head title="Gestión de Tesis" />
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold mb-6 text-blue-800">📄 Trazabilidad de Proyectos (Tesis)</h1>

                {/* Subida */}
                <form onSubmit={submit} className="mb-8 p-4 bg-blue-50 rounded border border-blue-100">
                    <label className="block mb-2 font-semibold text-gray-700">Subir Nueva Acta / Proyecto</label>
                    <div className="flex gap-4">
                        <input 
                            type="file" 
                            accept="application/pdf"
                            onChange={e => setData('pdf', e.target.files[0])}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <button disabled={processing} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold">
                            {processing ? 'Subiendo...' : 'Cargar'}
                        </button>
                    </div>
                </form>

                {/* Lista */}
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-500 border-b">
                            <th className="py-3">Documento</th>
                            <th className="py-3">Estado</th>
                            <th className="py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map(doc => (
                            <tr key={doc.id} className="border-b hover:bg-gray-50">
                                <td className="py-4 font-medium text-gray-800">{doc.title}</td>
                                <td className="py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${doc.status === 'signed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {doc.status === 'signed' ? 'FIRMADO' : 'PENDIENTE'}
                                    </span>
                                </td>
                                <td className="py-4 flex gap-2">
                                    {doc.status === 'pending' ? (
                                        <button 
                                            onClick={() => router.visit(route('documents.prepare', doc.id))}
                                            className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                                        >
                                            ✍️ Firmar
                                        </button>
                                    ) : (
                                        <a 
                                            href={route('documents.download', doc.id)}
                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                                        >
                                            ⬇️ Descargar Firmado
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {documents.length === 0 && (
                            <tr><td colSpan="3" className="py-4 text-center text-gray-400">No hay documentos aún.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}