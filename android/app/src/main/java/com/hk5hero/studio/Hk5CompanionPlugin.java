package com.hk5hero.studio;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "Hk5Companion")
public class Hk5CompanionPlugin extends Plugin {

    private static Hk5CompanionPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void dispatchNotification(String pkg, String title, String text) {
        if (instance == null) return;
        JSObject payload = new JSObject();
        payload.put("packageName", pkg);
        payload.put("title", title);
        payload.put("text", text);
        payload.put("timestamp", System.currentTimeMillis());
        instance.notifyListeners("watchNotification", payload);
    }

    @PluginMethod
    public void isNotificationAccessEnabled(PluginCall call) {
        String flat = Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );
        boolean enabled = false;
        if (!TextUtils.isEmpty(flat)) {
            String myPkg = getContext().getPackageName();
            String[] names = flat.split(":");
            for (String name : names) {
                ComponentName cn = ComponentName.unflattenFromString(name);
                if (cn != null && myPkg.equals(cn.getPackageName())) {
                    enabled = true;
                    break;
                }
            }
        }
        JSObject res = new JSObject();
        res.put("enabled", enabled);
        call.resolve(res);
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void setNotificationFilter(PluginCall call) {
        boolean forwardAll = call.getBoolean("forwardAll", false);
        JSArray arr = call.getArray("packages");
        Set<String> pkgs = new HashSet<>();
        if (arr != null) {
            try {
                for (int i = 0; i < arr.length(); i++) {
                    String p = arr.getString(i);
                    if (p != null && !p.isEmpty()) pkgs.add(p);
                }
            } catch (Exception ignored) {}
        }

        SharedPreferences prefs = getContext().getSharedPreferences(
            Hk5NotificationListener.PREFS_NAME,
            Context.MODE_PRIVATE
        );
        prefs.edit()
            .putBoolean(Hk5NotificationListener.KEY_FORWARD_ALL, forwardAll)
            .putStringSet(Hk5NotificationListener.KEY_ENABLED_PKGS, pkgs)
            .apply();

        call.resolve();
    }
}
