'use client';

import React, { useState } from 'react';
import { Box, Rotate3d, Layers, Eye } from 'lucide-react';

export function ModelViewer3D({
  glbUrl,
  productName,
  dimensionsMm,
  material,
}: {
  glbUrl: string;
  productName: string;
  dimensionsMm: string;
  material: string;
}) {
  const [activated, setActivated] = useState(false);
  const [angleY, setAngleY] = useState(28);
  const [angleX, setAngleX] = useState(14);
  const [showSlicerLayers, setShowSlicerLayers] = useState(true);

  const loadExternalModelViewer = () => {
    setActivated(true);
    if (typeof window !== 'undefined' && !document.getElementById('google-model-viewer-script')) {
      const script = document.createElement('script');
      script.id = 'google-model-viewer-script';
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
      document.head.appendChild(script);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3EFFA] text-[#563487]">
            <Rotate3d className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#24232A]">
              Inspeção tridimensional da geometria
            </p>
            <p className="text-xs text-[#5A5863]">
              Volume: {dimensionsMm} • Material: {material}
            </p>
          </div>
        </div>

        {!activated ? (
          <button
            type="button"
            onClick={loadExternalModelViewer}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#563487] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#462970]"
          >
            <Box className="h-4 w-4" />
            <span>Abrir visualização 3D</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowSlicerLayers((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E2DA] bg-[#FCFBF8] px-3 py-1.5 text-xs font-medium text-[#24232A] hover:bg-[#F2EFE9]"
          >
            <Layers className="h-3.5 w-3.5 text-[#563487]" />
            <span>{showSlicerLayers ? 'Ocultar linhas de camada' : 'Ver linhas de camada'}</span>
          </button>
        )}
      </div>

      {activated && (
        <div className="relative flex h-72 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-[#E6E2DA] bg-[#F2EFE9] p-4">
          <div
            className="transition-transform duration-150"
            style={{
              transform: `perspective(700px) rotateX(${angleX}deg) rotateY(${angleY}deg)`,
            }}
          >
            <svg viewBox="0 0 260 280" className="h-48 w-48 drop-shadow-md">
              <defs>
                <linearGradient id="glbGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#563487" />
                  <stop offset="100%" stopColor="#8B68BA" />
                </linearGradient>
                {showSlicerLayers && (
                  <pattern id="slicerLinesLight" width="260" height="5" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="2" x2="260" y2="2" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  </pattern>
                )}
              </defs>
              <polygon
                points="130,20 220,75 195,245 65,245 40,75"
                fill="url(#glbGradLight)"
                stroke="#462970"
                strokeWidth="2"
              />
              {showSlicerLayers && (
                <polygon
                  points="130,20 220,75 195,245 65,245 40,75"
                  fill="url(#slicerLinesLight)"
                />
              )}
              <polyline
                points="130,20 130,245 M40,75 220,75 M65,160 195,160"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>

          <div className="absolute right-3 bottom-3 left-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E6E2DA] bg-white/95 px-3 py-2 text-xs text-[#24232A] backdrop-blur-xs">
            <div className="flex items-center gap-2 text-[#5A5863]">
              <Eye className="h-3.5 w-3.5 text-[#563487]" />
              <span>Giro: {angleY}° | Inclinação: {angleX}°</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5">
                <span>Girar:</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={angleY}
                  onChange={(e) => setAngleY(Number(e.target.value))}
                  className="accent-[#563487]"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span>Inclinar:</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={angleX}
                  onChange={(e) => setAngleX(Number(e.target.value))}
                  className="accent-[#563487]"
                />
              </label>
              <a
                href={glbUrl}
                download
                className="font-semibold text-[#563487] underline hover:text-[#462970]"
              >
                Baixar modelo ({productName.slice(0, 16)})
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
