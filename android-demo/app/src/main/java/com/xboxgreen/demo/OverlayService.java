package com.xboxgreen.demo;

import android.app.Service;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.InputStream;

/**
 * Renders the user-controlled floating toolbar as an actual WebGL 2
 * transparent 3D viewport, not Android 2D buttons or a static image.
 */
public class OverlayService extends Service {
    private static final String CHANNEL="xbox_true3d_overlay";
    private WindowManager windows;
    private WebView overlay;
    private int dp(float x) { return (int)(getResources().getDisplayMetrics().density*x+.5f); }

    @Override public void onCreate() {
        super.onCreate();
        windows=(WindowManager)getSystemService(WINDOW_SERVICE);
    }

    @Override public int onStartCommand(Intent intent,int flags,int id) {
        if(!Settings.canDrawOverlays(this)) {
            Toast.makeText(this,"Allow Display over other apps",Toast.LENGTH_SHORT).show();
            stopSelf();return START_NOT_STICKY;
        }
        try {
            if(Build.VERSION.SDK_INT>=26) {
                NotificationChannel channel=new NotificationChannel(CHANNEL,"Xbox 3D overlay",NotificationManager.IMPORTANCE_LOW);
                ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
            }
            Intent launcher=new Intent(this,MainActivity.class);
            launcher.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pending=PendingIntent.getActivity(this,6,launcher,
               PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder builder=Build.VERSION.SDK_INT>=26?
                new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
            Notification notif=builder.setContentTitle("Xbox 3D overlay")
                .setContentText("Real-time 3D controls. Tap to return to the launcher.")
                .setSmallIcon(android.R.drawable.ic_menu_manage)
                .setContentIntent(pending).setOngoing(true).build();
            if(Build.VERSION.SDK_INT>=34) {
                startForeground(3107,notif,ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            } else {
                startForeground(3107,notif);
            }
            if(overlay==null) create3DOverlay();
        } catch(Exception e) {
            Toast.makeText(this,"Could not start 3D overlay",Toast.LENGTH_SHORT).show();
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private String mime(String p) {
        if(p.endsWith(".html"))return "text/html";
        if(p.endsWith(".js"))return "application/javascript";
        if(p.endsWith(".png"))return "image/png";
        if(p.endsWith(".css"))return "text/css";
        return "application/octet-stream";
    }

    private void create3DOverlay() {
        overlay = new WebView(this);
        overlay.setBackgroundColor(Color.TRANSPARENT);
        overlay.setLayerType(WebView.LAYER_TYPE_HARDWARE,null);
        overlay.setVerticalScrollBarEnabled(false);
        overlay.setHorizontalScrollBarEnabled(false);
        WebSettings webSettings=overlay.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(false);
        webSettings.setAllowContentAccess(false);
        webSettings.setSupportZoom(false);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        overlay.addJavascriptInterface(new Bridge(),"Android");
        overlay.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req) {
                Uri uri=req.getUrl();
                if(!"xboxgreen.local".equals(uri.getHost()))return null;
                String p=uri.getPath();
                if(p==null||p.contains("..")||p.contains("\\"))return null;
                try {
                    InputStream in=getAssets().open(p.substring(1));
                    return new WebResourceResponse(mime(p),null,in);
                }catch(Exception ignored){return null;}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req) {
                return !"xboxgreen.local".equals(req.getUrl().getHost());
            }
        });
        int type=WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        WindowManager.LayoutParams p=new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,dp(88),type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL|
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN|
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT);
        p.gravity=Gravity.BOTTOM|Gravity.CENTER_HORIZONTAL;
        p.y=dp(18);
        windows.addView(overlay,p);
        overlay.loadUrl("https://xboxgreen.local/demo/overlay3d.html");
    }

    private class Bridge {
        @JavascriptInterface public void action(String name) {
            android.os.Handler handler=new android.os.Handler(getMainLooper());
            handler.post(()-> {
                if("close".equals(name)) {stopSelf();return;}
                try {
                    Intent i=null;
                    if("home".equals(name)) {
                        i=new Intent(OverlayService.this,MainActivity.class);
                        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    } else if("spotify".equals(name)) {
                        i=getPackageManager().getLaunchIntentForPackage("com.spotify.music");
                    } else if("files".equals(name)) {
                        i=getPackageManager().getLaunchIntentForPackage("com.sec.android.app.myfiles");
                        if(i==null) {
                            i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                            i.addCategory(Intent.CATEGORY_OPENABLE);
                            i.setType("*/*");
                        }
                    } else if("settings".equals(name)) {
                        i=new Intent(Settings.ACTION_SETTINGS);
                    }
                    if(i!=null) {
                        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(i);
                    } else {
                        Toast.makeText(OverlayService.this,"App unavailable",Toast.LENGTH_SHORT).show();
                    }
                } catch(Exception e) {
                    Toast.makeText(OverlayService.this,"Android blocked this shortcut",Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override public void onDestroy() {
        if(overlay!=null) {
            try { windows.removeView(overlay); }catch(Exception ignored){}
            overlay.stopLoading();
            overlay.destroy();
            overlay=null;
        }
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent i){return null;}
}