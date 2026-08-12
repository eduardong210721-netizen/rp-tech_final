'use client';

import { useState } from 'react';
import { UploadButton as UTButton } from '@/lib/uploadthing';

interface UploadButtonProps {
  onUploadComplete: (url: string) => void;
}

export default function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full flex flex-col gap-4">
      {!preview ? (
        <div className="w-full border-2 border-dashed border-gray-300 hover:border-secondary rounded-xl p-6 text-center transition-all bg-gray-50 hover:bg-white flex flex-col items-center justify-center">
          <UTButton
            endpoint="comprobante"
            onClientUploadComplete={(res) => {
              if (res && res[0]) {
                setPreview(res[0].url);
                onUploadComplete(res[0].url);
              }
            }}
            onUploadError={(error: Error) => {
              setError(error.message);
            }}
            appearance={{
              button: "bg-secondary text-white hover:bg-secondary/90 px-6 py-2 rounded-lg font-medium",
              allowedContent: "text-gray-500 text-sm mt-2"
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
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      ) : (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 relative flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Comprobante" className="w-full h-full object-cover rounded-lg border border-gray-200" />
              <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-green-800">Carga exitosa</span>
              <span className="text-xs text-gray-400 truncate max-w-[200px]">{preview}</span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => {
              setPreview(null);
              onUploadComplete('');
            }}
            className="text-gray-400 hover:text-red-500 p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}
    </div>
  );
}
