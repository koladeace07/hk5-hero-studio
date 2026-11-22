import React, { useEffect, useState } from 'react';
import { Watch, FolderHeart, Bluetooth, CheckCircle2, RefreshCw, Download } from 'lucide-react';
import { HK5_PRESETS } from './data/presets';
import { SavedDesign, WatchFaceConfig } from './types/watchface';
import { WatchPreview } from './components/WatchPreview';
import { DesignerPanel } from './components/DesignerPanel';
import { SavedGallery } from './components/SavedGallery';
import { CompanionHub } from './components/CompanionHub';
import { renderWatchFace, WATCH_SIZE } from './utils/renderWatchFace';
import { savePngToDevice } from './utils/gallerySaver';
import { UploadProgress, uploadWatchFaceBgToHk5, WatchEngineTemplate } from './utils/sifliUploader';
import { APP_VERSION, checkForAppUpdate, UpdateCheckResult } from './utils/appUpdater';

type MainTab = 'designer' | 'gallery' | 'ble';

const STORAGE_KEY = 'hk5_hero_studio_designs_v1';

async function exportWatchFacePng(
  config: WatchFaceConfig,
  backgroundOnly: boolean,
  circularMask: boolean
): Promise<string> {
  const offscreen = document.createElement('canvas');
  offscreen.width = WATCH_SIZE;
  offscreen.height = WATCH_SIZE;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return 'Error al renderizar';

  let loadedImage: HTMLImageElement | null = null;
  if (config.bgType === 'image' && config.imageDataUrl) {
    loadedImage = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = config.imageDataUrl as string;
    });
  }

  renderWatchFace(ctx, config, {
    backgroundOnly,
    circularMask,
    loadedImage,
    now: new Date()
  });

  const safeName = (config.name || 'hk5-esfera')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-|-$/g, '');
  const suffix = backgroundOnly ? '-wearfit-fondo' : '-completa';
  const fileName = `${safeName || 'hk5-esfera'}${suffix}-466x466.png`;
  return savePngToDevice(offscreen.toDataURL('image/png'), fileName);
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('designer');
  const [config, setConfig] = useState<WatchFaceConfig>({ ...HK5_PRESETS[0] });
  const [backgroundOnly, setBackgroundOnly] = useState(false);
  const [designs, setDesigns] = useState<SavedDesign[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedDesign[]) : [];
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const res = await checkForAppUpdate();
      setUpdateInfo(res);
      if (!res.hasUpdate) {
        showToast(`Ya tienes la última versión (v${res.currentVersion})`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al buscar actualización');
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
    } catch {
      // Ignore quota errors on large embedded photos
    }
  }, [designs]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const handleSaveDesign = (thumbnail: string) => {
    const entry: SavedDesign = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      thumbnail,
      config: { ...config }
    };
    setDesigns((prev) => [entry, ...prev]);
    showToast(`Esfera "${config.name || 'Sin nombre'}" guardada en Mis Diseños`);
  };

  const handleExportCurrent = async (circular: boolean) => {
    try {
      const msg = await exportWatchFacePng(config, backgroundOnly, circular);
      showToast(msg);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar PNG');
    }
  };

  const handleSendToWatch = async (engine: WatchEngineTemplate) => {
    try {
      setUploadError(null);
      setUploadProgress({ stage: 'Preparando fondo limpio 466×466...', percent: 1 });
      const offscreen = document.createElement('canvas');
      offscreen.width = WATCH_SIZE;
      offscreen.height = WATCH_SIZE;
      const ctx = offscreen.getContext('2d');
      if (!ctx) throw new Error('Error al crear canvas');

      let loadedImage: HTMLImageElement | null = null;
      if (config.bgType === 'image' && config.imageDataUrl) {
        loadedImage = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = config.imageDataUrl as string;
        });
      }

      renderWatchFace(ctx, config, {
        backgroundOnly: true,
        circularMask: false,
        loadedImage,
        now: new Date()
      });

      const msg = await uploadWatchFaceBgToHk5(offscreen, config, engine, (p) =>
        setUploadProgress(p)
      );
      showToast(msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar al HK5 HERO';
      if (!msg.toLowerCase().includes('cancel')) {
        setUploadError(msg);
        showToast(msg);
      }
    } finally {
      window.setTimeout(() => setUploadProgress(null), 1500);
    }
  };

  const handleLoadDesign = (design: SavedDesign) => {
    setConfig({ ...design.config });
    setActiveTab('designer');
    showToast(`Cargado: ${design.config.name}`);
  };

  const handleDeleteDesign = (id: string) => {
    setDesigns((prev) => prev.filter((d) => d.id !== id));
    showToast('Esfera eliminada');
  };

  const handleDownloadSaved = async (design: SavedDesign) => {
    try {
      const msg = await exportWatchFacePng(design.config, false, false);
      showToast(msg);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar PNG');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-dot" />
          <div>
            <h1>HK5 HERO Studio</h1>
            <span>v{APP_VERSION} · Diseñador &amp; BLE</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleCheckUpdate}
          disabled={checkingUpdate}
          title="Buscar actualización del APK"
        >
          <RefreshCw size={14} />
          <span>{checkingUpdate ? 'Buscando...' : 'Actualizar'}</span>
        </button>

        <nav className="desktop-nav" aria-label="Navegación principal">
          <button
            type="button"
            className={activeTab === 'designer' ? 'active' : ''}
            onClick={() => setActiveTab('designer')}
          >
            <Watch size={16} />
            <span>Diseñador</span>
          </button>
          <button
            type="button"
            className={activeTab === 'gallery' ? 'active' : ''}
            onClick={() => setActiveTab('gallery')}
          >
            <FolderHeart size={16} />
            <span>Mis Diseños ({designs.length})</span>
          </button>
          <button
            type="button"
            className={activeTab === 'ble' ? 'active' : ''}
            onClick={() => setActiveTab('ble')}
          >
            <Bluetooth size={16} />
            <span>Bluetooth BLE</span>
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeTab === 'designer' && (
          <div className="studio-layout">
            <WatchPreview
              config={config}
              backgroundOnly={backgroundOnly}
              onToggleBackgroundOnly={() => setBackgroundOnly((v) => !v)}
              onSave={handleSaveDesign}
              onExportPng={handleExportCurrent}
              onSendToWatch={handleSendToWatch}
              uploadProgress={uploadProgress}
              uploadError={uploadError}
            />
            <DesignerPanel config={config} onChange={setConfig} />
          </div>
        )}

        {activeTab === 'gallery' && (
          <SavedGallery
            designs={designs}
            onLoad={handleLoadDesign}
            onDelete={handleDeleteDesign}
            onDownload={handleDownloadSaved}
          />
        )}

        {activeTab === 'ble' && <CompanionHub />}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="mobile-nav" aria-label="Navegación móvil">
        <button
          type="button"
          className={activeTab === 'designer' ? 'active' : ''}
          onClick={() => setActiveTab('designer')}
        >
          <Watch size={20} />
          <span>Diseñador</span>
        </button>
        <button
          type="button"
          className={activeTab === 'gallery' ? 'active' : ''}
          onClick={() => setActiveTab('gallery')}
        >
          <FolderHeart size={20} />
          <span>Diseños ({designs.length})</span>
        </button>
        <button
          type="button"
          className={activeTab === 'ble' ? 'active' : ''}
          onClick={() => setActiveTab('ble')}
        >
          <Bluetooth size={20} />
          <span>Mi Reloj</span>
        </button>
      </nav>

      {updateInfo && updateInfo.hasUpdate && (
        <div className="update-banner">
          <div>
            <strong>Nueva versión v{updateInfo.latestVersion} disponible</strong>
            <p>{updateInfo.notes}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={updateInfo.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <Download size={14} />
              <span>Descargar APK</span>
            </a>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setUpdateInfo(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
