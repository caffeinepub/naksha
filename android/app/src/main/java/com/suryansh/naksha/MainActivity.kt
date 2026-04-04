package com.suryansh.naksha

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.getcapacitor.BridgeActivity

/**
 * Naksha MainActivity — Kotlin, Android 14 Native-Hybrid
 *
 * Extends BridgeActivity (Capacitor) instead of plain ComponentActivity
 * so the Capacitor bridge is fully initialised BEFORE the WebView renders.
 * This prevents the 'Could not write' race condition.
 *
 * On first launch:
 *   1. Requests POST_NOTIFICATIONS (Android 13+)
 *   2. Requests MANAGE_ALL_FILES_ACCESS / SAF All Files Access (Android 11+)
 */
class MainActivity : BridgeActivity() {

    // ─── Permission launchers ────────────────────────────────────────────────

    /** Notification permission launcher (Android 13 / API 33+) */
    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            // Result is informational — the WebView bridge handles UI feedback
            bridge?.webView?.evaluateJavascript(
                "window.__nakshaNotificationPermission = '${ if (granted) "granted" else "denied" }'",
                null
            )
        }

    /** SAF / All Files Access intent launcher */
    private val allFilesAccessLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            // Re-evaluate after user returns from settings
            val hasAccess = Build.VERSION.SDK_INT < Build.VERSION_CODES.R ||
                    Environment.isExternalStorageManager()
            bridge?.webView?.evaluateJavascript(
                "window.__nakshaStoragePermission = '${ if (hasAccess) "granted" else "denied" }'",
                null
            )
        }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        // CRITICAL: super.onCreate() initialises the Capacitor bridge.
        // All permission requests below happen AFTER the bridge is alive,
        // so the JS side is already running when the dialog appears.
        super.onCreate(savedInstanceState)

        requestNotificationPermissionIfNeeded()
        requestAllFilesAccessIfNeeded()
    }

    // ─── Permission helpers ──────────────────────────────────────────────────

    /**
     * Request POST_NOTIFICATIONS on Android 13+ (API 33).
     * On earlier versions the permission is granted automatically.
     */
    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return // API < 33

        val alreadyGranted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED

        if (!alreadyGranted) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    /**
     * Request MANAGE_EXTERNAL_STORAGE / All Files Access on Android 11+ (API 30).
     * Uses ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION which opens the
     * exact per-app toggle page — no general Settings navigation needed.
     *
     * On Android 14 (API 34) this is the SAF path that allows reads/writes
     * to Documents/ without being limited to the app sandbox.
     */
    private fun requestAllFilesAccessIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return // API < 30

        if (!Environment.isExternalStorageManager()) {
            val intent = Intent(
                Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                Uri.parse("package:$packageName")
            ).apply {
                // FLAG_ACTIVITY_NEW_TASK not needed — we are already in an Activity
                addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY)
            }
            try {
                allFilesAccessLauncher.launch(intent)
            } catch (e: Exception) {
                // Fallback: open general manage-all-files screen
                val fallback = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                allFilesAccessLauncher.launch(fallback)
            }
        }
    }
}
