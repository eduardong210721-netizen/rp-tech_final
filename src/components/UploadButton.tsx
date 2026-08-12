'use client';

import { useState } from 'react';
import { UploadButton as UTButton } from '@/lib/uploadthing';

interface UploadButtonProps {
  onUploadComplete: (url: string) => void;
}

export default function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo supera el límite de 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);
      onUploadComplete(dataUrl);
      setError(null);
    };
    reader.onerror = () => {
      setError('Error al leer la imagen seleccionada');
    };
    reader.readAsDataURL(file);
  };

  const handleUploadThingError = (err: Error) => {
    console.warn('UploadThing error, activating local fallback:', err.message);
    setError(err.message);
    // Automatically switch to local file picker if token is missing
    if (err.message.toLowerCase().includes('token') || err.message.toLowerCase().includes('config')) {
      setUseLocalFallback(true);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {!preview ? (
        <div className="w-full border-2 border-dashed border-gray-300 hover:border-[#2ba5b2] rounded-xl p-6 text-center transition-all bg-gray-50 hover:bg-white flex flex-col items-center justify-center">
          {!useLocalFallback ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <UTButton
                endpoint="comprobante"
                onClientUploadComplete={(res) => {
                  if (res && res[0]) {
                    setPreview(res[0].url);
                    onUploadComplete(res[0].url);
                    setError(null);
                  }
                }}
                onUploadError={handleUploadThingError}
                appearance={{
                  button: "bg-[#2ba5b2] text-white hover:bg-[#20838e] px-6 py-2 rounded-lg font-medium shadow-sm transition-all",
                  allowedContent: "text-gray-500 text-xs mt-2"
                }}
                content={{
                  button({ ready }) {
                    if (ready) return <div>Subir comprobante de pago</div>;
                    return "Cargando...";
                  },
                  allowedContent({ ready, isUploading }) {
                    if (!ready) return "PNG, JPG hasta 4MB";
                    if (isUploading) return "Subiendo...";
                    return `PNG, JPG hasta 4MB`;
                  },
                }}
              />

              {error && (
                <div className="mt-2 text-center">
                  <p className="text-amber-700 text-xs bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 inline-block mb-2">
                    ⚠️ Token de UploadThing no detectado. Puedes subir directamente desde tu dispositivo:
                  </p>
                  <button
                    type="button"
                    onClick={() => setUseLocalFallback(true)}
                    className="block mx-auto text-xs text-[#2ba5b2] font-semibold hover:underline"
                  >
                    👉 Usar selector directo de imagen local
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="w-12 h-12 rounded-full bg-[#2ba5b2]/10 text-[#2ba5b2] flex items-center justify-center font-bold text-xl">
                📷
              </div>
              <p className="text-sm font-semibold text-gray-700">Seleccionar imagen del comprobante</p>
              <label className="cursor-pointer bg-[#2ba5b2] hover:bg-[#20838e] text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all">
                Examinar archivo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLocalFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400">Archivos PNG, JPG o JPEG hasta 5MB</p>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 relative flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Comprobante" className="w-full h-full object-cover rounded-lg border border-gray-200 shadow-sm" />
              <div className="absolute -top-1.5 -right-1.5 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-sm font-bold text-green-900">Comprobante adjuntado con éxito</span>
              <span className="text-xs text-green-700 truncate max-w-[250px]">
                {preview.startsWith('data:') ? 'Imagen local lista para registrar' : preview}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => {
              setPreview(null);
              onUploadComplete('');
              setError(null);
            }}
            className="text-gray-400 hover:text-red-500 p-2 transition-colors flex-shrink-0"
            title="Quitar comprobante"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}
    </div>
  );
}

