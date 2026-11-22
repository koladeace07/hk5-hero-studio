package com.hk5hero.studio;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.HashSet;
import java.util.Set;

public class Hk5NotificationListener extends NotificationListenerService {

    public static final String PREFS_NAME = "hk5_companion_prefs";
    public static final String KEY_ENABLED_PKGS = "enabled_packages";
    public static final String KEY_FORWARD_ALL = "forward_all";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        String pkg = sbn.getPackageName();
        if (pkg == null || pkg.equals(getPackageName())) return;
        if (sbn.isOngoing()) return;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean forwardAll = prefs.getBoolean(KEY_FORWARD_ALL, false);
        Set<String> enabled = prefs.getStringSet(KEY_ENABLED_PKGS, new HashSet<>());

        if (!forwardAll && (enabled == null || !enabled.contains(pkg))) {
            return;
        }

        Notification notif = sbn.getNotification();
        if (notif == null || notif.extras == null) return;

        Bundle extras = notif.extras;
        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);

        String title = titleCs != null ? titleCs.toString().trim() : "";
        String text = textCs != null ? textCs.toString().trim() : "";
        if (title.isEmpty() && text.isEmpty()) return;

        Hk5CompanionPlugin.dispatchNotification(pkg, title, text);
    }
}
