package com.hk5hero.studio;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "GallerySaver")
public class GallerySaverPlugin extends Plugin {

    @PluginMethod
    public void savePng(PluginCall call) {
        String base64 = call.getString("base64");
        String fileName = call.getString("fileName", "hk5-esfera-466x466.png");

        if (base64 == null || base64.isEmpty()) {
            call.reject("Missing base64 image data");
            return;
        }

        // Strip data URL prefix if present
        int commaIdx = base64.indexOf(',');
        if (commaIdx >= 0) {
            base64 = base64.substring(commaIdx + 1);
        }

        try {
            byte[] imageBytes = Base64.decode(base64, Base64.DEFAULT);
            ContentResolver resolver = getContext().getContentResolver();

            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(
                    MediaStore.Images.Media.RELATIVE_PATH,
                    Environment.DIRECTORY_PICTURES + "/HK5 Hero Studio"
                );
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
            }

            Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) {
                call.reject("No se pudo crear el archivo en la Galería");
                return;
            }

            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) {
                    call.reject("No se pudo abrir el flujo de escritura");
                    return;
                }
                out.write(imageBytes);
                out.flush();
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(uri, done, null, null);
            }

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            result.put("fileName", fileName);
            result.put("folder", "Pictures/HK5 Hero Studio");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Error al guardar en Galería: " + e.getMessage(), e);
        }
    }
}
