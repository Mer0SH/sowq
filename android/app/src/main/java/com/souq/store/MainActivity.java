package com.souq.store;

import android.graphics.Color;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import androidx.activity.OnBackPressedCallback;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private CoordinatorLayout contentRoot;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        super.onCreate(savedInstanceState);
        if (getBridge() == null) return;

        if ((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0)
            WebView.setWebContentsDebuggingEnabled(true);
        WebView webView = getBridge().getWebView();
        ViewGroup parent = (ViewGroup) webView.getParent();
        contentRoot = (CoordinatorLayout) parent;
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
        applySystemBarTheme(false);
        ViewCompat.setOnApplyWindowInsetsListener(contentRoot, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(contentRoot);
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void setDark(boolean dark) {
                runOnUiThread(() -> applySystemBarTheme(dark));
            }
        }, "SouqSystemBars");
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                webView.evaluateJavascript("(function(){var e=new Event('souq-before-back',{cancelable:true});if(!window.dispatchEvent(e))return 'overlay';var s=history.state||{};return (s.souqIndex>0||location.pathname.startsWith('/admin')&&history.length>1)?'history':'exit';})()", value -> {
                    if ("\"history\"".equals(value)) webView.evaluateJavascript("window.history.back()", null);
                    else if ("\"exit\"".equals(value)) finish();
                });
            }
        });
    }

    private void applySystemBarTheme(boolean dark) {
        int background = dark ? Color.rgb(26, 32, 27) : Color.WHITE;
        getWindow().getDecorView().setBackgroundColor(background);
        if (contentRoot != null) contentRoot.setBackgroundColor(background);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(!dark);
        controller.setAppearanceLightNavigationBars(!dark);
    }

}
