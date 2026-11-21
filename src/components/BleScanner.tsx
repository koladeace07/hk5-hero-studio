import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import {
  Bluetooth,
  BluetoothSearching,
  ShieldCheck,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle2,
  Battery,
  Vibrate,
  Clock,
  Activity,
  Unplug,
  BellRing
} from 'lucide-react';
import {
  BleCharacteristicReport,
  BleDiagnosticReport,
  BleServiceReport
} from '../types/watchface';

const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const OPTIONAL_WEB_SERVICES: string[] = [
  '00001800-0000-1000-8000-00805f9b34fb',
  '00001801-0000-1000-8000-00805f9b34fb',
  '0000180a-0000-1000-8000-00805f9b34fb',
  '0000180f-0000-1000-8000-00805f9b34fb',
  '0000180d-0000-1000-8000-00805f9b34fb',
  NUS_SERVICE,
  '6e400011-b5a3-f393-e0a9-e50e24dcca9e',
  '00000000-0000-0000-6473-5f696c666973'
];

const KNOWN_SERVICE_LABELS: Record<string, string> = {
  '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
  '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
  '0000180a-0000-1000-8000-00805f9b34fb': 'Device Information',
  '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
  '0000180d-0000-1000-8000-00805f9b34fb': 'Heart Rate',
  '00001812-0000-1000-8000-00805f9b34fb': 'HID (Cámara / Multimedia)',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e': 'Nordic UART (Comandos Wearfit)',
  '6e400011-b5a3-f393-e0a9-e50e24dcca9e': 'Canal de Datos / Esferas Wearfit',
  '00000000-0000-0000-6473-5f696c666973': 'SiFli SF32 (Servicio OTA / Recursos)'
};

function dataViewToHex(dv: DataView): string {
  const bytes: string[] = [];
  for (let i = 0; i < dv.byteLength; i++) {
    bytes.push(dv.getUint8(i).toString(16).padStart(2, '0').toUpperCase());
  }
  return bytes.join(' ');
}

function bytesToDataView(bytes: number[]): DataView {
  const buf = new Uint8Array(bytes);
  return new DataView(buf.buffer);
}

function dataViewToText(dv: DataView): string | undefined {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength));
    const printable = raw.replace(/[^\x20-\x7E]/g, '').trim();
    return printable.length > 0 ? printable : undefined;
  } catch {
    return undefined;
  }
}

export const BleScanner: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<BleDiagnosticReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [hasNus, setHasNus] = useState(false);
  const [notifText, setNotifText] = useState('Hola desde HK5 Hero Studio!');
  const connectedDeviceIdRef = useRef<string | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const isSupported = isNative || (typeof navigator !== 'undefined' && 'bluetooth' in navigator);

  const pushLog = (line: string) => {
    const time = new Date().toLocaleTimeString('es-ES', { hour12: false });
    setLogs((prev) => [`[${time}] ${line}`, ...prev].slice(0, 40));
  };

  const disconnectCurrent = async () => {
    const id = connectedDeviceIdRef.current;
    if (!id) return;
    connectedDeviceIdRef.current = null;
    try {
      await BleClient.stopNotifications(id, NUS_SERVICE, NUS_RX_CHAR);
    } catch {
      // ignore
    }
    try {
      await BleClient.disconnect(id);
    } catch {
      // ignore
    }
    setStatus('idle');
    pushLog('Desconectado del reloj.');
  };

  useEffect(() => {
    return () => {
      if (connectedDeviceIdRef.current) {
        BleClient.disconnect(connectedDeviceIdRef.current).catch(() => {});
      }
    };
  }, []);

  const handleScan = async (filterHk5: boolean) => {
    if (!isSupported) {
      setErrorMsg(
        'Bluetooth BLE no está disponible en este navegador. Ábrelo como app Android (APK) o en Google Chrome.'
      );
      setStatus('error');
      return;
    }

    if (connectedDeviceIdRef.current) {
      await disconnectCurrent();
    }

    setStatus('scanning');
    setErrorMsg(null);
    setReport(null);
    setLogs([]);
    setHasNus(false);

    try {
      await BleClient.initialize({ androidNeverForLocation: true });

      const device = await BleClient.requestDevice(
        filterHk5
          ? {
              namePrefix: 'HK',
              optionalServices: isNative ? undefined : OPTIONAL_WEB_SERVICES
            }
          : {
              optionalServices: isNative ? undefined : OPTIONAL_WEB_SERVICES
            }
      );

      // Auto-retry up to 3 attempts to seamlessly bypass Android BLE GATT_ERROR 133
      let connected = false;
      let lastConnectErr: unknown = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            pushLog(`Reintentando conexión (${attempt}/3)...`);
            await BleClient.disconnect(device.deviceId).catch(() => {});
            await new Promise((r) => setTimeout(r, 500));
          }
          await BleClient.connect(device.deviceId, () => {
            connectedDeviceIdRef.current = null;
            setStatus('idle');
            pushLog('El reloj cerró la conexión BLE.');
          });
          connected = true;
          break;
        } catch (connErr) {
          lastConnectErr = connErr;
          const errStr = connErr instanceof Error ? connErr.message : String(connErr);
          if (!errStr.includes('133') && !errStr.toLowerCase().includes('gatt')) {
            break;
          }
        }
      }
      if (!connected) {
        throw lastConnectErr instanceof Error
          ? lastConnectErr
          : new Error('No se pudo conectar al reloj.');
      }
      connectedDeviceIdRef.current = device.deviceId;
      pushLog(`Conectado a ${device.name || device.deviceId}`);

      const services = await BleClient.getServices(device.deviceId);
      const serviceReports: BleServiceReport[] = [];
      let batteryLevel: number | undefined;
      let foundNus = false;
      const notes: string[] = [];

      const SAFE_READ_SERVICES = new Set([
        '0000180f-0000-1000-8000-00805f9b34fb',
        '0000180a-0000-1000-8000-00805f9b34fb'
      ]);

      for (const svc of services) {
        const normalizedUuid = svc.uuid.toLowerCase();
        const canSafeRead = SAFE_READ_SERVICES.has(normalizedUuid);
        const charReports: BleCharacteristicReport[] = [];

        if (normalizedUuid === NUS_SERVICE) {
          foundNus = true;
        }

        for (const ch of svc.characteristics) {
          const props: string[] = [];
          if (ch.properties.read) props.push('read');
          if (ch.properties.write) props.push('write');
          if (ch.properties.writeWithoutResponse) props.push('writeWithoutResponse');
          if (ch.properties.notify) props.push('notify');
          if (ch.properties.indicate) props.push('indicate');

          let valueHex: string | undefined;
          let valueText: string | undefined;

          if (canSafeRead && ch.properties.read) {
            try {
              const val = await BleClient.read(device.deviceId, svc.uuid, ch.uuid);
              valueHex = dataViewToHex(val);
              valueText = dataViewToText(val);
              if (ch.uuid.toLowerCase().startsWith('00002a19') && val.byteLength > 0) {
                batteryLevel = val.getUint8(0);
              }
            } catch {
              // Skip safely
            }
          }

          charReports.push({
            uuid: ch.uuid,
            properties: props,
            valueHex,
            valueText
          });
        }

        const label = KNOWN_SERVICE_LABELS[normalizedUuid] || 'Servicio propietario / desconocido';
        if (normalizedUuid === NUS_SERVICE) {
          notes.push('Canal de comandos Wearfit (6e400001) activo y listo para pruebas.');
        }
        if (normalizedUuid.includes('6473-5f696c666973')) {
          notes.push('Chip SiFli SF32 detectado (servicio OTA/recursos).');
        }

        serviceReports.push({
          uuid: svc.uuid,
          label,
          characteristics: charReports
        });
      }

      setHasNus(foundNus);

      // Subscribe to UART responses so we can see replies from HK5 HERO
      if (foundNus) {
        try {
          await BleClient.startNotifications(device.deviceId, NUS_SERVICE, NUS_RX_CHAR, (val) => {
            pushLog(`RX ← ${dataViewToHex(val)}`);
          });
          pushLog('Escuchando respuestas en 6e400003...');
        } catch {
          pushLog('No se pudo suscribir a notificaciones en 6e400003.');
        }
      }

      setReport({
        timestamp: new Date().toISOString(),
        deviceName: device.name || 'Dispositivo sin nombre',
        deviceId: device.deviceId,
        batteryLevel,
        services: serviceReports,
        notes
      });
      setStatus('connected');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al conectar por Bluetooth.';
      if (!msg.toLowerCase().includes('cancel')) {
        setErrorMsg(msg);
        setStatus('error');
      } else {
        setStatus('idle');
      }
    }
  };

  const sendSafeCommand = async (label: string, bytes: number[]) => {
    const id = connectedDeviceIdRef.current;
    if (!id) {
      setErrorMsg('Primero conecta tu HK5 HERO.');
      return;
    }
    const dv = bytesToDataView(bytes);
    const hex = dataViewToHex(dv);
    pushLog(`TX (${label}) → ${hex}`);
    try {
      await BleClient.writeWithoutResponse(id, NUS_SERVICE, NUS_TX_CHAR, dv);
    } catch {
      try {
        await BleClient.write(id, NUS_SERVICE, NUS_TX_CHAR, dv);
      } catch (err) {
        pushLog(`Error TX: ${err instanceof Error ? err.message : 'falló escritura'}`);
      }
    }
  };

  const handleFindWatch = () => {
    // Standard Wearfit find-watch / vibrate packet
    void sendSafeCommand('Vibrar reloj', [0xab, 0x00, 0x03, 0xff, 0x71, 0x80]);
  };

  const handleSyncTime = () => {
    const d = new Date();
    const y = d.getFullYear();
    const packet = [
      0xab,
      0x00,
      0x0b,
      0xff,
      0x93,
      0x80,
      0x00,
      (y >> 8) & 0xff,
      y & 0xff,
      d.getMonth() + 1,
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds()
    ];
    void sendSafeCommand('Sincronizar hora', packet);
  };

  const handleRequestStatus = () => {
    void sendSafeCommand('Pedir estado', [0xab, 0x00, 0x03, 0xff, 0x91, 0x80]);
  };

  const handleSendNotification = () => {
    const cleanText = notifText.trim() || 'Hola HK5 HERO!';
    const encoder = new TextEncoder();
    // Keep within single BLE packet safely (max ~12 bytes text for standard 20-byte MTU)
    const msgBytes = Array.from(encoder.encode(cleanText)).slice(0, 12);
    const payloadLen = 5 + msgBytes.length; // FF 72 80 03 02 + text
    const packet = [0xab, 0x00, payloadLen, 0xff, 0x72, 0x80, 0x03, 0x02, ...msgBytes];
    void sendSafeCommand(`Notificación "${cleanText.slice(0, 12)}"`, packet);
  };

  const copyReport = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(JSON.stringify({ ...report, consoleLogs: logs }, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify({ ...report, consoleLogs: logs }, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hk5-hero-ble-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ble-container">
      <div className="ble-hero">
        <div className="ble-icon-badge">
          {status === 'scanning' ? <BluetoothSearching size={28} /> : <Bluetooth size={28} />}
        </div>
        <div>
          <h2>
            Conexión BLE — HK5 HERO{' '}
            <span className="prop-badge">{isNative ? 'Android Nativo' : 'Modo Web'}</span>
          </h2>
          <p>
            Conecta tu reloj para probar <strong>comandos seguros</strong> (vibrar, sincronizar hora)
            e inspeccionar respuestas en tiempo real por el canal Wearfit.
          </p>
        </div>
      </div>

      <div className="ble-safety-banner">
        <ShieldCheck size={18} />
        <span>
          Los comandos de prueba son <strong>100% inofensivos</strong> (no escriben firmware ni
          archivos en la memoria del reloj).
        </span>
      </div>

      {!isSupported && (
        <div className="ble-alert">
          <AlertTriangle size={18} />
          <span>
            Web Bluetooth no está disponible en este navegador. Ábrelo desde el{' '}
            <strong>APK en Android</strong> o en <strong>Google Chrome</strong>.
          </span>
        </div>
      )}

      <div className="ble-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={status === 'scanning'}
          onClick={() => handleScan(true)}
        >
          <Bluetooth size={17} />
          <span>
            {status === 'scanning'
              ? 'Buscando HK5 HERO...'
              : status === 'connected'
                ? 'Reconectar HK5 HERO'
                : 'Conectar HK5 HERO'}
          </span>
        </button>

        {status === 'connected' ? (
          <button type="button" className="btn btn-danger-ghost" onClick={disconnectCurrent}>
            <Unplug size={16} />
            <span>Desconectar</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={status === 'scanning'}
            onClick={() => handleScan(false)}
          >
            <span>Mostrar todos los BLE</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="ble-alert">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {status === 'connected' && hasNus && (
        <div className="ble-report">
          <div className="ble-report-toolbar">
            <span>Pruebas de comandos seguros (Wearfit UART)</span>
          </div>
          <div className="ble-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleFindWatch}>
              <Vibrate size={15} />
              <span>Vibrar reloj</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleSyncTime}>
              <Clock size={15} />
              <span>Sincronizar hora</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleRequestStatus}>
              <Activity size={15} />
              <span>Pedir estado</span>
            </button>
          </div>

          <div className="field">
            <label htmlFor="ble-notif-msg">Enviar mensaje al reloj (máx. 12 caracteres)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="ble-notif-msg"
                type="text"
                maxLength={12}
                value={notifText}
                onChange={(e) => setNotifText(e.target.value)}
                placeholder="Ej. Hola HK5!"
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSendNotification}
              >
                <BellRing size={15} />
                <span>Enviar</span>
              </button>
            </div>
          </div>

          <div className="ble-console">
            {logs.length === 0 ? (
              <span className="muted-code">Sin mensajes todavía...</span>
            ) : (
              logs.map((line, idx) => <div key={idx}>{line}</div>)
            )}
          </div>
        </div>
      )}

      {report && (
        <div className="ble-report">
          <div className="ble-report-header">
            <div>
              <div className="ble-connected-tag">
                <CheckCircle2 size={16} />
                <span>{status === 'connected' ? 'Conectado en vivo' : 'Última inspección'}</span>
              </div>
              <h3>{report.deviceName}</h3>
              <span className="muted-code">ID: {report.deviceId}</span>
            </div>

            {typeof report.batteryLevel === 'number' && (
              <div className="battery-pill">
                <Battery size={18} />
                <span>{report.batteryLevel}%</span>
              </div>
            )}
          </div>

          <div className="ble-notes">
            {report.notes.map((n, i) => (
              <p key={i}>• {n}</p>
            ))}
          </div>

          <div className="ble-report-toolbar">
            <span>Servicios GATT ({report.services.length})</span>
            <div className="ble-toolbar-btns">
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyReport}>
                <Copy size={14} />
                <span>{copied ? '¡Copiado!' : 'Copiar JSON + Log'}</span>
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={downloadReport}>
                <Download size={14} />
                <span>Guardar JSON</span>
              </button>
            </div>
          </div>

          <div className="service-list">
            {report.services.map((svc) => (
              <div key={svc.uuid} className="service-card">
                <div className="service-head">
                  <strong>{svc.label}</strong>
                  <code>{svc.uuid}</code>
                </div>
                <div className="char-list">
                  {svc.characteristics.map((ch) => (
                    <div key={ch.uuid} className="char-row">
                      <code className="char-uuid">{ch.uuid}</code>
                      <div className="char-props">
                        {ch.properties.map((p) => (
                          <span key={p} className="prop-badge">
                            {p}
                          </span>
                        ))}
                      </div>
                      {(ch.valueText || ch.valueHex) && (
                        <div className="char-val">
                          {ch.valueText && <span>Texto: &ldquo;{ch.valueText}&rdquo;</span>}
                          {ch.valueHex && <code>HEX: {ch.valueHex}</code>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
