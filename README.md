# HK5 Hero Studio

Diseñador de esferas **466 × 466 px** e inspector **Bluetooth BLE** (solo lectura) creado a medida para el smartwatch **HK5 HERO** (`HK TWO`, versión `5.02`, ecosistema Wearfit Pro).

## Funcionalidades

- **Diseñador visual 466 × 466 px:** vista previa en tiempo real dentro del bisel azul del HK5 HERO, plantillas AMOLED, subida de fotos con zoom/encuadre, degradados, texturas, reloj digital o analógico, widgets y firma personalizada.
- **Exportación lista para Wearfit Pro:** descarga PNG exacto de `466 × 466` en modo completo o **Solo fondo** (sin hora dibujada, para evitar que se encime con la hora nativa de *Wearfit Pro → Esfera personalizada*).
- **Mis Diseños:** galería local para guardar, editar y descargar tus creaciones.
- **Inspector Bluetooth BLE (Seguro):** conecta desde Google Chrome en Android a tu `HK5 HERO` en modo solo lectura para descubrir sus servicios/características GATT reales y exportar un reporte JSON.

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abre en tu navegador: `http://localhost:5173`

## Cómo abrirlo en tu celular Android (con Bluetooth BLE)

1. Conecta tu Android por cable USB (con Depuración USB activada).
2. Ejecuta en tu PC:
   ```bash
   adb reverse tcp:5173 tcp:5173
   ```
3. Abre **Google Chrome** en tu Android y entra a `http://localhost:5173`.
4. Cierra temporalmente **Wearfit Pro** si vas a usar la pestaña **Bluetooth BLE**.

## Empaquetar como APK con Android Studio (opcional)

Como tienes Android Studio instalado, podemos agregar **Capacitor** para generar un proyecto Android nativo (`/android`) y compilar el `.apk` directamente desde Android Studio.
