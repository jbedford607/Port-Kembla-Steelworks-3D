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
    private LinearLayout toolbar;
    private FrameLayout drawer;
    private LinearLayout pad;
    private TextView error;
    private boolean localBuild;
    private final List<ResolveInfo> apps = new ArrayList<>();

    private int dp(float n) { return (int)(n * getResources().getDisplayMetrics().density + .5f); }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        immersive();
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
        buildToolbar();
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
    private void buildToolbar() {
        toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setGravity(Gravity.CENTER);
        toolbar.setPadding(dp(6),dp(5),dp(6),dp(8));
        toolbar.setBackgroundColor(0xDC000701);
        for (String name : new String[]{"APPS","PAD","RETRY","SETTINGS"}) {
            Runnable action;
            if ("APPS".equals(name)) action = () -> toggleDrawer();
            else if ("PAD".equals(name)) action = () -> { pad.setVisibility(pad.getVisibility()==View.VISIBLE?View.GONE:View.VISIBLE); web.requestFocus(); };
            else if ("RETRY".equals(name)) action = () -> { error.setVisibility(View.GONE); web.loadUrl(localBuild ? LOCAL : LIVE); };
            else action = () -> { try {startActivity(new Intent(Settings.ACTION_SETTINGS));} catch (Exception ignored){} };
            TextView b = button(name,action);
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(0,dp(42),1);
            p.leftMargin=dp(3);p.rightMargin=dp(3);
            toolbar.addView(b,p);
        }
        FrameLayout.LayoutParams tp = new FrameLayout.LayoutParams(-1, dp(56),Gravity.BOTTOM);
        root.addView(toolbar,tp);
    }
    private void initApps() {
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
        if (pad!=null) pad.setVisibility(View.GONE);
    }
    private void buildPad() {
        pad = new LinearLayout(this);
        pad.setGravity(Gravity.CENTER);
        pad.setOrientation(LinearLayout.VERTICAL);
        pad.setBackground(panel(0xE4000A04,DIM,9));
        pad.setPadding(dp(6),dp(6),dp(6),dp(7));
        LinearLayout a = new LinearLayout(this);
        LinearLayout b = new LinearLayout(this);
        LinearLayout c = new LinearLayout(this);
        a.setGravity(Gravity.CENTER);b.setGravity(Gravity.CENTER);c.setGravity(Gravity.CENTER);
        makePadButton(a,"UP",KeyEvent.KEYCODE_DPAD_UP);
        makePadButton(b,"LEFT",KeyEvent.KEYCODE_DPAD_LEFT);
        makePadButton(b,"A",KeyEvent.KEYCODE_ENTER);
        makePadButton(b,"RIGHT",KeyEvent.KEYCODE_DPAD_RIGHT);
        makePadButton(c,"DOWN",KeyEvent.KEYCODE_DPAD_DOWN);
        makePadButton(c,"B",KeyEvent.KEYCODE_ESCAPE);
        pad.addView(a);pad.addView(b);pad.addView(c);
        FrameLayout.LayoutParams p = new FrameLayout.LayoutParams(dp(218),dp(174), Gravity.BOTTOM|Gravity.RIGHT);
        p.bottomMargin=dp(62);p.rightMargin=dp(8);
        root.addView(pad,p);
        pad.setVisibility(View.GONE);
    }
    private void makePadButton(LinearLayout line,String name,int key) {
        TextView t = button(name,()->sendKey(key));
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(dp(name.equals("LEFT")||name.equals("RIGHT")?69:58),dp(49));
        p.setMargins(dp(2),dp(3),dp(2),dp(3));
        line.addView(t,p);
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
        if(pad!=null&&pad.getVisibility()==View.VISIBLE){pad.setVisibility(View.GONE);return;}
        sendKey(KeyEvent.KEYCODE_ESCAPE);
    }
    @Override protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        if(drawer!=null) drawer.setVisibility(View.GONE);
        if (web!=null) web.requestFocus();
    }
    @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immersive(); }
    @Override protected void onPause(){if(web!=null)web.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
