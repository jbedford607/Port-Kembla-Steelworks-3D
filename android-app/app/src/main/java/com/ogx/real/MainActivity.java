package com.ogx.real;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Display;
import android.os.Build;
import android.provider.Settings;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String LIVE = "https://actavis.dev/ogxweb/";
    private static final String LOCAL = "https://xbox-dashboard.local/index.html";
    private final int GREEN = Color.rgb(173, 234, 91);
    private final int DIM = Color.rgb(82, 133, 45);
    private FrameLayout root;
    private WebView web;
    private FrameLayout drawer;
    private LinearLayout pad;
    private TextView error;
    private TextView padStatus;
    private int focusedMenu = 0;
    private final String[] phoneMenus = { "APPS", "MUSIC", "FILES", "SETTINGS" };
    private boolean localBuild;
    private final List<ResolveInfo> apps = new ArrayList<>();

    private int dp(float n) { return (int)(n * getResources().getDisplayMetrics().density + .5f); }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        immersive();
        configureHighRefresh();
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(0, 8, 3));
        setContentView(root);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setTextZoom(100);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!"xbox-dashboard.local".equals(u.getHost())) return null;
                String path = u.getPath();
                if (path == null || path.equals("/")) path = "/index.html";
                if (path.contains("..") || path.contains("\\")) return null;
                try {
                    String p = "ogxweb" + path;
                    if (p.endsWith(".mp4")) {
                        byte[] b;
                        try (InputStream in = getAssets().open(p);
                             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
                            byte[] chunk = new byte[65536];
                            int n;
                            while ((n = in.read(chunk)) != -1) out.write(chunk, 0, n);
                            b = out.toByteArray();
                        }
                        String range = r.getRequestHeaders().get("Range");
                        java.util.Map<String,String> headers = new java.util.HashMap<>();
                        headers.put("Accept-Ranges","bytes");
                        if (range != null && range.startsWith("bytes=")) {
                            try {
                                String[] parts = range.substring(6).split("-",2);
                                int begin = Math.max(0,Integer.parseInt(parts[0]));
                                int end = parts.length>1 && !parts[1].isEmpty()
                                    ? Math.min(b.length-1,Integer.parseInt(parts[1]))
                                    : b.length-1;
                                if (begin <= end && end < b.length) {
                                    int len = end-begin+1;
                                    headers.put("Content-Range","bytes "+begin+"-"+end+"/"+b.length);
                                    headers.put("Content-Length",String.valueOf(len));
                                    return new WebResourceResponse("video/mp4",null,206,"Partial Content",
                                        headers,new java.io.ByteArrayInputStream(b,begin,len));
                                }
                            } catch (Exception ignored) { }
                        }
                        headers.put("Content-Length",String.valueOf(b.length));
                        return new WebResourceResponse("video/mp4",null,200,"OK",
                            headers,new java.io.ByteArrayInputStream(b));
                    }
                    InputStream stream = getAssets().open(p);
                    return new WebResourceResponse(mime(p), "utf-8", stream);
                } catch (Exception ignored) { return null; }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String host = r.getUrl().getHost();
                if ("actavis.dev".equals(host) || "xbox-dashboard.local".equals(host)) return false;
                if (!r.isForMainFrame()) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl())); } catch (Exception ignored) { }
                return true;
            }
            @Override public void onPageFinished(WebView v, String url) { error.setVisibility(View.GONE); }
            @Override public void onReceivedError(WebView v, WebResourceRequest req, android.webkit.WebResourceError e) {
                if (req.isForMainFrame()) runOnUiThread(() -> {
                    error.setText("ORIGINAL XBOX DASHBOARD\nUnable to load engine.\nConnect to the internet and press RETRY.");
                    error.setVisibility(View.VISIBLE);
                });
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        error = label("ORIGINAL XBOX DASHBOARD\nLoading genuine Theseus WebAssembly engine...", 16, true);
        error.setGravity(Gravity.CENTER);
        error.setBackgroundColor(0xE8000701);
        FrameLayout.LayoutParams ep = new FrameLayout.LayoutParams(-1, dp(150), Gravity.CENTER);
        ep.leftMargin = dp(16); ep.rightMargin=dp(16);
        root.addView(error, ep);
        initApps();
        buildDrawer();
        buildPad();
        localBuild = getAssetsContains("ogxweb/offline.ok");
        web.loadUrl(localBuild ? LOCAL : LIVE);
        web.requestFocus();
    }

    private boolean getAssetsContains(String name) {
        try (InputStream in = getAssets().open(name)) { return in.read() >= 0; }
        catch (Exception e) { return false; }
    }
    private static String mime(String name) {
        String n = name.toLowerCase(Locale.ROOT);
        if (n.endsWith(".wasm")) return "application/wasm";
        if (n.endsWith(".js") || n.endsWith(".mjs")) return "application/javascript";
        if (n.endsWith(".css")) return "text/css";
        if (n.endsWith(".html")) return "text/html";
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".woff2")) return "font/woff2";
        if (n.endsWith(".ogg")) return "audio/ogg";
        if (n.endsWith(".wav")) return "audio/wav";
        return "application/octet-stream";
    }
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
    private GradientDrawable panel(int color, int stroke, int radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color); g.setCornerRadius(dp(radius));
        g.setStroke(dp(1), stroke); return g;
    }
    private TextView label(String value, int size, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextColor(GREEN);
        t.setTextSize(size);
        t.setTypeface(Typeface.create("sans-serif-condensed",bold?Typeface.BOLD:Typeface.NORMAL));
        t.setGravity(Gravity.CENTER);
        return t;
    }
    private TextView button(String name, Runnable action) {
        TextView v = label(name, 13, true);
        v.setBackground(panel(0xD90A1909, DIM, 6));
        v.setOnClickListener(w -> action.run());
        return v;
    }
    private void initApps() {
        apps.clear();
        try {
            PackageManager pm = getPackageManager();
            Intent i = new Intent(Intent.ACTION_MAIN);
            i.addCategory(Intent.CATEGORY_LAUNCHER);
            apps.addAll(pm.queryIntentActivities(i,0));
            Collections.sort(apps,(a,b) -> String.CASE_INSENSITIVE_ORDER.compare(a.loadLabel(pm).toString(),b.loadLabel(pm).toString()));
        } catch (Exception ignored) { }
    }
    private void buildDrawer() {
        drawer = new FrameLayout(this);
        drawer.setBackgroundColor(0xF5000A03);
        drawer.setVisibility(View.GONE);
        root.addView(drawer, new FrameLayout.LayoutParams(-1,-1));
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setPadding(dp(14),dp(22),dp(14),dp(6));
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView caption = label("APPLICATIONS",21,true);
        header.addView(caption,new LinearLayout.LayoutParams(0,dp(49),1));
        TextView close = button("CLOSE",() -> toggleDrawer());
        header.addView(close,new LinearLayout.LayoutParams(dp(72),dp(45)));
        drawer.addView(header,new FrameLayout.LayoutParams(-1,dp(90),Gravity.TOP));
        EditText search = new EditText(this);
        search.setSingleLine(true);
        search.setTextColor(GREEN);search.setHintTextColor(DIM);
        search.setHint("Search installed apps...");
        search.setTextSize(17);
        search.setPadding(dp(14),0,dp(14),0);
        search.setBackground(panel(0xFF061709,DIM,8));
        FrameLayout.LayoutParams sp = new FrameLayout.LayoutParams(-1,dp(52),Gravity.TOP);
        sp.leftMargin=dp(14);sp.rightMargin=dp(14);sp.topMargin=dp(92);
        drawer.addView(search,sp);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(false);
        scroll.setVerticalScrollBarEnabled(false);
        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(3);
        grid.setPadding(dp(8),dp(8),dp(8),dp(65));
        scroll.addView(grid);
        FrameLayout.LayoutParams scp = new FrameLayout.LayoutParams(-1,-1);
        scp.topMargin=dp(152);scp.bottomMargin=dp(56);
        drawer.addView(scroll,scp);
        renderApps(grid,"");
        search.addTextChangedListener(new TextWatcher(){
            @Override public void beforeTextChanged(CharSequence s,int st,int count,int after){}
            @Override public void onTextChanged(CharSequence s,int st,int before,int count){renderApps(grid,s.toString());}
            @Override public void afterTextChanged(Editable s){}
        });
    }
    private void renderApps(GridLayout grid,String filter) {
        grid.removeAllViews();
        PackageManager pm = getPackageManager();
        int columns = 3;
        int tileWidth = (getResources().getDisplayMetrics().widthPixels-dp(36))/columns;
        int count = 0;
        for (ResolveInfo r : apps) {
            if (r.activityInfo == null || r.activityInfo.packageName.equals(getPackageName())) continue;
            String title = r.loadLabel(pm).toString();
            if (!title.toLowerCase(Locale.ROOT).contains(filter.toLowerCase(Locale.ROOT))) continue;
            LinearLayout tile = new LinearLayout(this);
            tile.setOrientation(LinearLayout.VERTICAL);
            tile.setPadding(dp(5),dp(9),dp(5),dp(5));
            tile.setGravity(Gravity.CENTER);
            tile.setBackground(panel(0xC9081909,0xFF315322,7));
            ImageView icon = new ImageView(this);
            try {
                Drawable d = r.loadIcon(pm);
                icon.setImageDrawable(d);
                icon.setColorFilter(GREEN,android.graphics.PorterDuff.Mode.SRC_IN);
            } catch (Exception ignored) {}
            tile.addView(icon,new LinearLayout.LayoutParams(dp(45),dp(45)));
            TextView name = label(title,12,false);
            name.setMaxLines(2);
            name.setEllipsize(android.text.TextUtils.TruncateAt.END);
            LinearLayout.LayoutParams np = new LinearLayout.LayoutParams(-1,dp(38));
            np.topMargin=dp(6);
            tile.addView(name,np);
            GridLayout.LayoutParams gp = new GridLayout.LayoutParams();
            gp.width = tileWidth-dp(6);gp.height=dp(104);
            gp.columnSpec=GridLayout.spec(count%columns);
            gp.rowSpec=GridLayout.spec(count/columns);
            gp.setMargins(dp(3),dp(4),dp(3),dp(4));
            grid.addView(tile,gp);
            tile.setOnClickListener(v -> {
                try {
                    Intent i = new Intent(Intent.ACTION_MAIN);
                    i.addCategory(Intent.CATEGORY_LAUNCHER);
                    i.setComponent(new ComponentName(r.activityInfo.packageName,r.activityInfo.name));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                    startActivity(i);
                    drawer.setVisibility(View.GONE);
                } catch (Exception e) { Toast.makeText(this,"Cannot open "+title,Toast.LENGTH_SHORT).show(); }
            });
            count++;
        }
        if (count==0) {
            TextView empty = label(filter.length()>0?"NO MATCHING APPS":"NO INSTALLED APPS FOUND",15,false);
            grid.addView(empty);
        }
    }
    private void toggleDrawer() {
        boolean opening=drawer.getVisibility()!=View.VISIBLE;
        drawer.setVisibility(opening?View.VISIBLE:View.GONE);
        if (!opening) {
            ((InputMethodManager)getSystemService(Context.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(drawer.getWindowToken(),0);
            web.requestFocus();
        }
        if (pad!=null) pad.setVisibility(opening ? View.GONE : View.VISIBLE);
    }

    private void buildPad() {
        // Five unobtrusive controls. Xbox geometry behind them remains the genuine 3D engine.
        pad = new LinearLayout(this);
        pad.setGravity(Gravity.CENTER);
        pad.setOrientation(LinearLayout.VERTICAL);
        pad.setBackground(panel(0xB8000C04,0xAA48772C,14));
        pad.setPadding(dp(6),dp(6),dp(6),dp(6));

        padStatus = label("APPS",11,true);
        padStatus.setTextColor(0xFFB6F073);
        padStatus.setLetterSpacing(.13f);
        pad.addView(padStatus,new LinearLayout.LayoutParams(-1,dp(21)));

        LinearLayout top = new LinearLayout(this);
        LinearLayout middle = new LinearLayout(this);
        LinearLayout bottom = new LinearLayout(this);
        top.setGravity(Gravity.CENTER);
        middle.setGravity(Gravity.CENTER);
        bottom.setGravity(Gravity.CENTER);
        addPadKey(top,"▲",KeyEvent.KEYCODE_DPAD_UP,false);
        addPadKey(middle,"◀",KeyEvent.KEYCODE_DPAD_LEFT,false);
        addPadKey(middle,"●",KeyEvent.KEYCODE_ENTER,true);
        addPadKey(middle,"▶",KeyEvent.KEYCODE_DPAD_RIGHT,false);
        addPadKey(bottom,"▼",KeyEvent.KEYCODE_DPAD_DOWN,false);
        pad.addView(top);
        pad.addView(middle);
        pad.addView(bottom);

        FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(dp(157),dp(164),Gravity.BOTTOM|Gravity.RIGHT);
        p.bottomMargin=dp(12);
        p.rightMargin=dp(12);
        root.addView(pad,p);
        pad.setVisibility(View.VISIBLE);
        pad.setContentDescription("Xbox controller: up down left right and select. Selected phone menu shown above.");
    }

    private void addPadKey(LinearLayout line,String symbol,int code,boolean select) {
        TextView key = label(symbol,select ? 25 : 19,true);
        key.setTextColor(select ? 0xFFD6FF9D : 0xFFA8DB64);
        key.setBackground(panel(select?0xDD233E12:0xB010240D,
                                select?0xFF9CD85C:0xFF466A2F,
                                select?24:8));
        key.setOnClickListener(v -> {
            v.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY);
            handlePadInput(code);
        });
        if (select) key.setOnLongClickListener(v -> {
            v.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS);
            sendKey(KeyEvent.KEYCODE_ENTER);
            return true;
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    dp(select?44:43),dp(42));
        lp.setMargins(dp(2),dp(1),dp(2),dp(1));
        line.addView(key,lp);
    }

    private void handlePadInput(int code) {
        if (drawer!=null && drawer.getVisibility()==View.VISIBLE) {
            if (code==KeyEvent.KEYCODE_ESCAPE) toggleDrawer();
            else if (code==KeyEvent.KEYCODE_ENTER) toggleDrawer();
            return;
        }
        if (code==KeyEvent.KEYCODE_DPAD_UP) {
            focusedMenu=(focusedMenu+phoneMenus.length-1)%phoneMenus.length;
            padStatus.setText(phoneMenus[focusedMenu]);
            sendKey(code);
        } else if (code==KeyEvent.KEYCODE_DPAD_DOWN) {
            focusedMenu=(focusedMenu+1)%phoneMenus.length;
            padStatus.setText(phoneMenus[focusedMenu]);
            sendKey(code);
        } else if (code==KeyEvent.KEYCODE_ENTER) {
            selectPhoneMenu();
        } else {
            // Left and right continue to move the original 3D dashboard camera.
            sendKey(code);
        }
    }

    private void selectPhoneMenu() {
        switch(focusedMenu) {
            case 0: toggleDrawer(); break;
            case 1: openMusic(); break;
            case 2: openFiles(); break;
            default: openSystemSettings(); break;
        }
    }

    private boolean launchPackage(String pkg) {
        try {
            Intent i = getPackageManager().getLaunchIntentForPackage(pkg);
            if (i == null) return false;
            startActivity(i); return true;
        } catch (Exception ignored) { return false; }
    }

    private void openMusic() {
        if (launchPackage("com.spotify.music") ||
            launchPackage("com.sec.android.app.music") ||
            launchPackage("com.google.android.apps.youtube.music")) return;
        try {
            Intent i = Intent.makeMainSelectorActivity(Intent.ACTION_MAIN,Intent.CATEGORY_APP_MUSIC);
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this,"Choose a music app",Toast.LENGTH_SHORT).show();
            toggleDrawer();
        }
    }

    private void openFiles() {
        if (launchPackage("com.sec.android.app.myfiles") ||
            launchPackage("com.google.android.apps.nbu.files")) return;
        try {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this,"No file browser available",Toast.LENGTH_SHORT).show();
        }
    }

    private void openSystemSettings() {
        try {startActivity(new Intent(Settings.ACTION_SETTINGS));}
        catch (Exception e) {Toast.makeText(this,"Settings unavailable",Toast.LENGTH_SHORT).show();}
    }

    private void configureHighRefresh() {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED |
                             WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                             WindowManager.LayoutParams.FLAG_FULLSCREEN);
        WindowManager.LayoutParams a = getWindow().getAttributes();
        if (Build.VERSION.SDK_INT >= 28)
            a.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        try {
            Display d=getWindowManager().getDefaultDisplay();
            Display.Mode active=d.getMode();
            Display.Mode best=active;
            for (Display.Mode m : d.getSupportedModes()) {
                // Match the device's native panel dimensions, not a reduced output mode.
                if (m.getPhysicalWidth()>=best.getPhysicalWidth() &&
                    m.getPhysicalHeight()>=best.getPhysicalHeight()) {
                    if (m.getPhysicalWidth()>best.getPhysicalWidth() ||
                        m.getPhysicalHeight()>best.getPhysicalHeight() ||
                        m.getRefreshRate()>best.getRefreshRate()) best=m;
                }
            }
            a.preferredDisplayModeId=best.getModeId();
        } catch (Exception ignored) {}
        getWindow().setAttributes(a);
    }

    private void sendKey(int code) {
        if (web==null) return;
        web.requestFocus();
        long time = SystemClock.uptimeMillis();
        web.dispatchKeyEvent(new KeyEvent(time,time,KeyEvent.ACTION_DOWN,code,0));
        web.dispatchKeyEvent(new KeyEvent(time,time+25,KeyEvent.ACTION_UP,code,0));
    }
    @Override public void onBackPressed() {
        if(drawer!=null&&drawer.getVisibility()==View.VISIBLE){toggleDrawer();return;}
        sendKey(KeyEvent.KEYCODE_ESCAPE);
    }
    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        if(drawer!=null) drawer.setVisibility(View.GONE);
        if (pad!=null) pad.setVisibility(View.VISIBLE);
        if (web!=null) web.requestFocus();
    }
    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immersive(); }
    @Override protected void onPause(){if(web!=null)web.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();immersive();if(web!=null)web.onResume();if (pad!=null && drawer!=null && drawer.getVisibility()!=View.VISIBLE) pad.setVisibility(View.VISIBLE);}
    @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
