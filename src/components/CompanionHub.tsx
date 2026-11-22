import React, { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import {
  Bluetooth,
  BluetoothSearching,
  Unplug,
  Vibrate,
  Clock,
  Battery,
  HeartPulse,
  CloudSun,
  BellRing,
  Sliders,
  AlarmClock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import {
  buildAlarmPacket,
  buildDndPacket,
  buildFindWatchPacket,
  buildHealthSyncPacket,
  buildNotificationPackets,
  buildRaiseToWakePacket,
  buildTimeFormatPacket,
  buildTimeSyncPacket,
  fetchLiveWeatherForHk5,
  mapPackageToAppId,
  parseWearfitRx,
  POPULAR_APPS,
  WEARFIT_RX_CHAR,
  WEARFIT_SERVICE,
  writeWearfitPackets
} from '../utils/wearfitProtocol';

interface Hk5CompanionPlugin {
  isNotificationAccessEnabled(): Promise<{ enabled: boolean }>;
  openNotificationAccessSettings(): Promise<void>;
  setNotificationFilter(opts: { forwardAll: boolean; packages: string[] }): Promise<void>;
  addListener(
    eventName: 'watchNotification',
    cb: (data: { packageName: string; title: string; text: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const Hk5Companion = registerPlugin<Hk5CompanionPlugin>('Hk5Companion');

const PREFS_KEY = 'hk5_companion_settings_v2';

interface CompanionSettings {
  city: string;
  raiseToWake: boolean;
  use12Hour: boolean;
  dndEnabled: boolean;
  alarmEnabled: boolean;
  alarmTime: string;
  forwardAllApps: boolean;
  enabledPackages: string[];
}

const DEFAULT_SETTINGS: CompanionSettings = {
  city: 'Barranquilla',
  raiseToWake: true,
  use12Hour: false,
  dndEnabled: false,
  alarmEnabled: false,
  alarmTime: '07:00',
  forwardAllApps: false,
  enabledPackages: ['com.whatsapp', 'com.whatsapp.w4b', 'org.telegram.messenger', 'com.instagram.android', 'com.nequi.MobileApp']
};

export const CompanionHub: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'connected' | 'error'>('idle');
  const [deviceName, setDeviceName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [weatherInfo, setWeatherInfo] = useState<string | null>(null);
  const [notifAccess, setNotifAccess] = useState(false);
  const [testMsg, setTestMsg] = useState('Hola desde HK5 Hero Studio v2!');
  const [logs, setLogs] = useState<string[]>([]);
  const [settings, setSettings] = useState<CompanionSettings>(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<CompanionSettings>) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const deviceIdRef = useRef<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  const pushLog = (line: string) => {
    const t = new Date().toLocaleTimeString('es-ES', { hour12: false });
    setLogs((prev) => [`[${t}] ${line}`, ...prev].slice(0, 30));
  };

  // Persist settings & sync notification filter to native Android service
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
    if (isNative) {
      Hk5Companion.setNotificationFilter({
        forwardAll: settings.forwardAllApps,
        packages: settings.enabledPackages
      }).catch(() => {});
    }
  }, [settings, isNative]);

  // Check notification permission & listen for incoming Android notifications
  useEffect(() => {
    if (!isNative) return;
    let removeFn: (() => Promise<void>) | null = null;

    const refreshPerm = () => {
      Hk5Companion.isNotificationAccessEnabled()
        .then((r) => setNotifAccess(r.enabled))
        .catch(() => {});
    };
    refreshPerm();
    window.addEventListener('focus', refreshPerm);

    Hk5Companion.addListener('watchNotification', (n) => {
      const id = deviceIdRef.current;
      if (!id) return;
      const appId = mapPackageToAppId(n.packageName);
      const formatted = [n.title, n.text].filter(Boolean).join(': ');
      const pkts = buildNotificationPackets(appId, formatted);
      writeWearfitPackets(id, pkts)
        .then(() => pushLog(`Notificación enviada → ${formatted.slice(0, 32)}`))
        .catch(() => {});
    })
      .then((handle) => {
        removeFn = handle.remove;
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('focus', refreshPerm);
      if (removeFn) void removeFn();
    };
  }, [isNative]);

  const disconnect = async () => {
    const id = deviceIdRef.current;
    if (!id) return;
    deviceIdRef.current = null;
    try {
      await BleClient.stopNotifications(id, WEARFIT_SERVICE, WEARFIT_RX_CHAR);
    } catch {}
    try {
      await BleClient.disconnect(id);
    } catch {}
    setStatus('idle');
    pushLog('Desconectado del reloj.');
  };

  const handleConnect = async () => {
    if (deviceIdRef.current) await disconnect();
    setStatus('scanning');
    setErrorMsg(null);

    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      const device = await BleClient.requestDevice({ namePrefix: 'HK' });

      let connected = false;
      let lastErr: unknown = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            await BleClient.disconnect(device.deviceId).catch(() => {});
            await new Promise((r) => setTimeout(r, 450));
          }
          await BleClient.connect(device.deviceId, () => {
            deviceIdRef.current = null;
            setStatus('idle');
            pushLog('Conexión BLE cerrada.');
          });
          connected = true;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!connected) {
        throw lastErr instanceof Error ? lastErr : new Error('No se pudo conectar');
      }

      deviceIdRef.current = device.deviceId;
      setDeviceName(device.name || 'HK5 HERO');
      setStatus('connected');
      pushLog(`Conectado a ${device.name || device.deviceId}`);

      await BleClient.startNotifications(device.deviceId, WEARFIT_SERVICE, WEARFIT_RX_CHAR, (dv) => {
        const raw = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
        const parsed = parseWearfitRx(raw);
        if (typeof parsed.battery === 'number') setBattery(parsed.battery);
        if (typeof parsed.heartRate === 'number') setHeartRate(parsed.heartRate);
      });

      // Auto-sync time + request health telemetry on connect
      await writeWearfitPackets(device.deviceId, [buildTimeSyncPacket(), buildHealthSyncPacket()]);
      pushLog('Hora y telemetría sincronizadas.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión BLE';
      if (!msg.toLowerCase().includes('cancel')) {
        setErrorMsg(msg);
        setStatus('error');
      } else {
        setStatus('idle');
      }
    }
  };

  const sendSingle = async (label: string, pkt: number[]) => {
    const id = deviceIdRef.current;
    if (!id) {
      setErrorMsg('Conecta primero tu HK5 HERO.');
      return;
    }
    setErrorMsg(null);
    await writeWearfitPackets(id, [pkt]);
    pushLog(`${label} enviado.`);
  };

  const handleSyncWeather = async () => {
    const id = deviceIdRef.current;
    if (!id) {
      setErrorMsg('Conecta primero tu HK5 HERO.');
      return;
    }
    setErrorMsg(null);
    try {
      pushLog(`Consultando clima de ${settings.city}...`);
      const res = await fetchLiveWeatherForHk5(settings.city);
      await writeWearfitPackets(id, res.packets);
      setWeatherInfo(`${res.city}: ${res.tempC}°C (Máx ${res.maxC}° / Mín ${res.minC}°)`);
      pushLog(`Clima enviado → ${res.city} ${res.tempC}°C`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error obteniendo clima');
    }
  };

  const handleSendTestNotif = async () => {
    const id = deviceIdRef.current;
    if (!id) {
      setErrorMsg('Conecta primero tu HK5 HERO.');
      return;
    }
    const pkts = buildNotificationPackets(0x20, testMsg || 'Hola HK5 HERO!');
    await writeWearfitPackets(id, pkts);
    pushLog(`Mensaje enviado (${pkts.length} paq.): "${testMsg}"`);
  };

  const togglePackage = (pkg: string) => {
    setSettings((prev) => {
      const exists = prev.enabledPackages.includes(pkg);
      return {
        ...prev,
        enabledPackages: exists
          ? prev.enabledPackages.filter((p) => p !== pkg)
          : [...prev.enabledPackages, pkg]
      };
    });
  };

  const handleToggleRaise = async (checked: boolean) => {
    setSettings((s) => ({ ...s, raiseToWake: checked }));
    if (deviceIdRef.current) {
      await sendSingle(`Levantar muñeca: ${checked ? 'ON' : 'OFF'}`, buildRaiseToWakePacket(checked));
    }
  };

  const handleToggle12h = async (checked: boolean) => {
    setSettings((s) => ({ ...s, use12Hour: checked }));
    if (deviceIdRef.current) {
      await sendSingle(`Formato ${checked ? '12h' : '24h'}`, buildTimeFormatPacket(checked));
    }
  };

  const handleToggleDnd = async (checked: boolean) => {
    setSettings((s) => ({ ...s, dndEnabled: checked }));
    if (deviceIdRef.current) {
      await sendSingle(`No Molestar: ${checked ? 'ON' : 'OFF'}`, buildDndPacket(checked));
    }
  };

  const handleApplyAlarm = async (enabled: boolean, timeStr = settings.alarmTime) => {
    const [hh, mm] = timeStr.split(':').map((n) => parseInt(n, 10) || 0);
    setSettings((s) => ({ ...s, alarmEnabled: enabled, alarmTime: timeStr }));
    if (deviceIdRef.current) {
      await sendSingle(
        `Alarma ${timeStr} (${enabled ? 'ON' : 'OFF'})`,
        buildAlarmPacket(0, enabled, hh, mm)
      );
    }
  };

  return (
    <div className="ble-container">
      {/* 1. Connection & Health Card */}
      <div className="ble-hero">
        <div className="ble-icon-badge">
          {status === 'scanning' ? <BluetoothSearching size={26} /> : <Bluetooth size={26} />}
        </div>
        <div style={{ flex: 1 }}>
          <h2>
            Mi HK5 HERO{' '}
            <span className="prop-badge">{status === 'connected' ? 'Conectado' : 'Desconectado'}</span>
          </h2>
          <p>
            {status === 'connected'
              ? `${deviceName} activo — recibe notificaciones, clima y ajustes directo desde tu app.`
              : 'Conecta tu reloj para controlar notificaciones, clima, salud y ajustes sin Wearfit Pro.'}
          </p>
        </div>
      </div>

      <div className="ble-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={status === 'scanning'}
          onClick={handleConnect}
        >
          <Bluetooth size={16} />
          <span>
            {status === 'scanning'
              ? 'Conectando...'
              : status === 'connected'
                ? 'Reconectar'
                : 'Conectar HK5 HERO'}
          </span>
        </button>

        {status === 'connected' && (
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void sendSingle('Vibrar reloj', buildFindWatchPacket())}
            >
              <Vibrate size={15} />
              <span>Buscar</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void sendSingle('Sincronizar hora', buildTimeSyncPacket())}
            >
              <Clock size={15} />
              <span>Hora</span>
            </button>
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={disconnect}>
              <Unplug size={15} />
            </button>
          </>
        )}
      </div>

      {errorMsg && (
        <div className="ble-alert">
          <AlertTriangle size={17} />
          <span>{errorMsg}</span>
        </div>
      )}

      {status === 'connected' && (
        <div className="telemetry-grid">
          <div className="telemetry-card">
            <Battery size={20} color="#4ade80" />
            <div>
              <strong>{battery !== null ? `${battery}%` : '—'}</strong>
              <span>Batería real</span>
            </div>
          </div>
          <div className="telemetry-card">
            <HeartPulse size={20} color="#fb7185" />
            <div>
              <strong>{heartRate !== null ? `${heartRate} BPM` : '—'}</strong>
              <span>Último pulso</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Live App Notifications Card */}
      <div className="ble-report">
        <div className="ble-report-toolbar">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <BellRing size={16} color="#38bdf8" />
            Notificaciones de tus apps
          </span>
          {isNative && (
            <button
              type="button"
              className={`btn btn-sm ${notifAccess ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => void Hk5Companion.openNotificationAccessSettings()}
            >
              <ShieldCheck size={14} />
              <span>{notifAccess ? 'Permiso activo' : 'Activar permiso'}</span>
            </button>
          )}
        </div>

        <label className="toggle-item">
          <span>Reenviar TODAS las apps al reloj</span>
          <input
            type="checkbox"
            checked={settings.forwardAllApps}
            onChange={(e) => setSettings((s) => ({ ...s, forwardAllApps: e.target.checked }))}
          />
        </label>

        {!settings.forwardAllApps && (
          <div className="app-chip-grid">
            {POPULAR_APPS.map((app) => {
              const active = settings.enabledPackages.includes(app.packageName);
              return (
                <button
                  key={app.id}
                  type="button"
                  className={`btn btn-sm ${active ? 'btn-active-pill' : 'btn-ghost'}`}
                  onClick={() => togglePackage(app.packageName)}
                >
                  {app.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="field">
          <label htmlFor="test-notif-input">Probar notificación larga en el reloj</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="test-notif-input"
              type="text"
              maxLength={85}
              value={testMsg}
              onChange={(e) => setTestMsg(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void handleSendTestNotif()}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>

      {/* 3. Live Weather Card */}
      <div className="ble-report">
        <div className="ble-report-toolbar">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <CloudSun size={16} color="#38bdf8" />
            Clima en vivo para la esfera
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text)'
            }}
            value={settings.city}
            onChange={(e) => setSettings((s) => ({ ...s, city: e.target.value }))}
            placeholder="Tu ciudad (ej. Barranquilla)"
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleSyncWeather()}>
            Actualizar clima
          </button>
        </div>
        {weatherInfo && <span className="muted-code">{weatherInfo}</span>}
      </div>

      {/* 4. Watch Settings & Alarm Card */}
      <div className="ble-report">
        <div className="ble-report-toolbar">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Sliders size={16} color="#38bdf8" />
            Ajustes y Alarma del HK5 HERO
          </span>
        </div>

        <div className="toggle-list">
          <label className="toggle-item">
            <span>Levantar muñeca para encender pantalla</span>
            <input
              type="checkbox"
              checked={settings.raiseToWake}
              onChange={(e) => void handleToggleRaise(e.target.checked)}
            />
          </label>
          <label className="toggle-item">
            <span>Formato 12 horas (AM/PM)</span>
            <input
              type="checkbox"
              checked={settings.use12Hour}
              onChange={(e) => void handleToggle12h(e.target.checked)}
            />
          </label>
          <label className="toggle-item">
            <span>No Molestar (22:00 – 07:00)</span>
            <input
              type="checkbox"
              checked={settings.dndEnabled}
              onChange={(e) => void handleToggleDnd(e.target.checked)}
            />
          </label>
        </div>

        <div className="toggle-item">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <AlarmClock size={16} color="#38bdf8" />
            Alarma diaria
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="time"
              value={settings.alarmTime}
              onChange={(e) => void handleApplyAlarm(settings.alarmEnabled, e.target.value)}
              style={{
                background: '#060a13',
                color: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 8px'
              }}
            />
            <input
              type="checkbox"
              checked={settings.alarmEnabled}
              onChange={(e) => void handleApplyAlarm(e.target.checked)}
            />
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="ble-console">
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
};
