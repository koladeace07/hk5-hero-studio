import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hk5hero.studio',
  appName: 'HK5 Hero Studio',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: 'Buscando tu HK5 HERO...',
        cancel: 'Cancelar',
        availableDevices: 'Dispositivos BLE cercanos',
        noDeviceFound: 'No se encontró ningún dispositivo BLE'
      }
    }
  }
};

export default config;
