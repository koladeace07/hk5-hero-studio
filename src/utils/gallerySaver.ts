import { Capacitor, registerPlugin } from '@capacitor/core';

interface GallerySaverPlugin {
  savePng(options: { base64: string; fileName: string }): Promise<{
    uri: string;
    fileName: string;
    folder: string;
  }>;
}

const GallerySaver = registerPlugin<GallerySaverPlugin>('GallerySaver');

export async function savePngToDevice(dataUrl: string, fileName: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const res = await GallerySaver.savePng({ base64: dataUrl, fileName });
    return `Guardado en Galería (${res.folder})`;
  }

  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  link.click();
  return 'PNG 466×466 descargado';
}
