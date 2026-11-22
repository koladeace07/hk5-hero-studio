import React, { useEffect, useRef, useState } from 'react';
import { Download, Save, Eye, EyeOff, Sparkles, Send } from 'lucide-react';
import { WatchFaceConfig } from '../types/watchface';
import { renderWatchFace, WATCH_SIZE } from '../utils/renderWatchFace';
import { UploadProgress, WatchEngineTemplate } from '../utils/sifliUploader';

interface WatchPreviewProps {
  config: WatchFaceConfig;
  backgroundOnly: boolean;
  onToggleBackgroundOnly: () => void;
  onSave: (thumbnail: string) => void;
  onExportPng: (circular: boolean) => void;
  onSendToWatch: (engine: WatchEngineTemplate) => void;
  uploadProgress: UploadProgress | null;
  uploadError: string | null;
}

export const WatchPreview: React.FC<WatchPreviewProps> = ({
  config,
  backgroundOnly,
  onToggleBackgroundOnly,
  onSave,
  onExportPng,
  onSendToWatch,
  uploadProgress,
  uploadError
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoadedKey, setImageLoadedKey] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const activeEngine: WatchEngineTemplate =
    config.engine || (config.clockMode === 'analog' ? 'analog_181' : 'digital_33');

  // Tick every second for live preview
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Load uploaded image when dataUrl changes
  useEffect(() => {
    if (!config.imageDataUrl) {
      imageRef.current = null;
      setImageLoadedKey((k) => k + 1);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoadedKey((k) => k + 1);
    };
    img.src = config.imageDataUrl;
  }, [config.imageDataUrl]);

  // Draw watchface
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderWatchFace(ctx, config, {
      backgroundOnly,
      circularMask: true,
      loadedImage: imageRef.current,
      now
    });
  }, [config, backgroundOnly, now, imageLoadedKey]);

  const handleSaveClick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const thumb = canvas.toDataURL('image/png');
    onSave(thumb);
  };

  return (
    <div className="watch-stage">
      <div className="watch-meta-pill">
        <Sparkles size={14} />
        <span>HK5 HERO · 466 × 466 AMOLED</span>
      </div>

      {/* Realistic HK5 HERO Hardware Mockup */}
      <div className="hk5-hardware" aria-label="Vista previa del reloj HK5 HERO">
        <div className="hk5-strap hk5-strap-top" />
        <div className="hk5-strap hk5-strap-bottom" />

        {/* Silver watch body & lugs */}
        <div className="hk5-case">
          {/* Buttons matching user's HK5 HERO photo */}
          <div className="hk5-btn hk5-btn-left" title="Botón lateral izquierdo" />
          <div className="hk5-btn hk5-btn-crown" title="Corona giratoria" />
          <div className="hk5-btn hk5-btn-bottom-right" title="Botón inferior derecho" />

          {/* Blue rotating metallic bezel */}
          <div className="hk5-bezel">
            <svg className="hk5-bezel-svg" viewBox="0 0 320 320" aria-hidden="true">
              <defs>
                <linearGradient id="blueBezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="45%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#0f2966" />
                </linearGradient>
              </defs>
              <circle cx="160" cy="160" r="154" fill="url(#blueBezelGrad)" stroke="#60a5fa" strokeWidth="2" />
              {/* Top triangle marker */}
              <polygon points="160,11 151,28 169,28" fill="#cbd5e1" />
              {/* Bezel numbers */}
              <text x="275" y="102" fill="#e2e8f0" fontSize="15" fontWeight="800" textAnchor="middle" transform="rotate(60 275 102)">10</text>
              <text x="275" y="232" fill="#e2e8f0" fontSize="15" fontWeight="800" textAnchor="middle" transform="rotate(120 275 232)">20</text>
              <text x="160" y="302" fill="#e2e8f0" fontSize="15" fontWeight="800" textAnchor="middle">30</text>
              <text x="45" y="232" fill="#e2e8f0" fontSize="15" fontWeight="800" textAnchor="middle" transform="rotate(-120 45 232)">40</text>
              <text x="45" y="102" fill="#e2e8f0" fontSize="15" fontWeight="800" textAnchor="middle" transform="rotate(-60 45 102)">50</text>
              {/* Minute notches on first 15 min like diver bezel */}
              {Array.from({ length: 14 }).map((_, i) => {
                const deg = (i + 1) * 6 - 90;
                const rad = (deg * Math.PI) / 180;
                const x1 = 160 + Math.cos(rad) * 138;
                const y1 = 160 + Math.sin(rad) * 138;
                const x2 = 160 + Math.cos(rad) * 149;
                const y2 = 160 + Math.sin(rad) * 149;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#cbd5e1"
                    strokeWidth={i % 5 === 4 ? 2.4 : 1.4}
                  />
                );
              })}
            </svg>

            {/* Actual 466x466 AMOLED screen canvas */}
            <div className="hk5-screen-wrap">
              <canvas
                ref={canvasRef}
                width={WATCH_SIZE}
                height={WATCH_SIZE}
                className="hk5-canvas"
              />
              <div className="hk5-glass-glare" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions under Watch */}
      <div className="preview-actions">
        <button
          type="button"
          className={`btn btn-ghost ${backgroundOnly ? 'btn-active-pill' : ''}`}
          onClick={onToggleBackgroundOnly}
          title="Oculta la hora y widgets para exportar solo el fondo y usar la hora nativa de Wearfit Pro"
        >
          {backgroundOnly ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{backgroundOnly ? 'Solo fondo (Wearfit)' : 'Vista completa'}</span>
        </button>

        <button type="button" className="btn btn-secondary" onClick={handleSaveClick}>
          <Save size={16} />
          <span>Guardar</span>
        </button>

        <button type="button" className="btn btn-secondary" onClick={() => onExportPng(false)}>
          <Download size={16} />
          <span>Galería PNG</span>
        </button>
      </div>

      {/* Direct Bluetooth Watchface Uploader for HK5 HERO */}
      <div className="direct-upload-box">
        <div className="direct-upload-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={Boolean(uploadProgress)}
            onClick={() => onSendToWatch(activeEngine)}
          >
            <Send size={16} />
            <span>
              {uploadProgress
                ? `Instalando... ${uploadProgress.percent}%`
                : `Instalar ${activeEngine === 'analog_181' ? 'Analógica' : 'Digital'} en HK5 HERO`}
            </span>
          </button>
        </div>

        {uploadProgress && (
          <div className="upload-progress-wrap">
            <div className="upload-progress-bar">
              <div
                className="upload-progress-fill"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            <span className="upload-progress-text">{uploadProgress.stage}</span>
          </div>
        )}

        {uploadError && (
          <div className="ble-alert" style={{ padding: '8px 10px', fontSize: '0.76rem' }}>
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      <p className="preview-hint">
        Vista previa <strong>100% fiel al reloj</strong>: lo que diseñas aquí (fondo, foto, marco,
        texto y {activeEngine === 'analog_181' ? 'manecillas reales' : 'dígitos en vivo'}) es
        exactamente lo que se instala en tu HK5 HERO.
      </p>
    </div>
  );
};
