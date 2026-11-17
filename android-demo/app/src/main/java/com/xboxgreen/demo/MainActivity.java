package com.xboxgreen.demo;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.BatteryManager;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.Display;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {
    private WebView browser;
    private boolean pendingOverlay = false;
    private static final String BASE = "https://xboxgreen.local/";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED |
                             WindowManager.LayoutParams.FLAG_FULLSCREEN |
                             WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immersive();
        preferNativeHighRefresh();
        browser = new WebView(this);
        browser.setBackgroundColor(0xFF000600);
        browser.setOverScrollMode(View.OVER_SCROLL_NEVER);
        browser.setVerticalScrollBarEnabled(false);
        browser.setHorizontalScrollBarEnabled(false);
        browser.setLayerType(View.LAYER_TYPE_HARDWARE,null);
        WebSettings settings=browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setTextZoom(100);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        browser.addJavascriptInterface(new Bridge(),"Android");
        browser.setWebChromeClient(new WebChromeClient());
        browser.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest req) {
                Uri uri=req.getUrl();
                if(!"xboxgreen.local".equals(uri.getHost()))return null;
                String path=uri.getPath();
                if(path==null || path.equals("/"))path="/index.html";
                if(path.contains("..")||path.indexOf('\\')>=0)return null;
                String filename="demo"+path;
                try {
                    InputStream f=getAssets().open(filename);
                    return new WebResourceResponse(mime(filename),null,f);
                } catch(Exception ignored) { return null; }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                return !"xboxgreen.local".equals(request.getUrl().getHost());
            }
        });
        setContentView(browser);
        browser.loadUrl(BASE+"index.html");
    }
    private static String mime(String file){
        if(file.endsWith(".png"))return "image/png";
        if(file.endsWith(".jpg")||file.endsWith(".jpeg"))return "image/jpeg";
        if(file.endsWith(".js"))return "application/javascript";
        if(file.endsWith(".css"))return "text/css";
        if(file.endsWith(".wav"))return "audio/wav";
        if(file.endsWith(".svg"))return "image/svg+xml";
        return "text/html";
    }
    private void immersive(){
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        if(Build.VERSION.SDK_INT>=28){
            WindowManager.LayoutParams a=getWindow().getAttributes();
            a.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(a);
        }
    }
    private void preferNativeHighRefresh(){
        try{
            Display display=getWindowManager().getDefaultDisplay();
            Display.Mode original=display.getMode(),best=original;
            for(Display.Mode mode:display.getSupportedModes()){
                if(mode.getPhysicalWidth()!=original.getPhysicalWidth()||
                   mode.getPhysicalHeight()!=original.getPhysicalHeight())continue;
                if(mode.getRefreshRate()>best.getRefreshRate())best=mode;
            }
            WindowManager.LayoutParams a=getWindow().getAttributes();
            a.preferredDisplayModeId=best.getModeId();
            getWindow().setAttributes(a);
        }catch(Exception ignored){}
    }
    @Override public void onWindowFocusChanged(boolean hasFocus){
        super.onWindowFocusChanged(hasFocus);
        if(hasFocus)immersive();
    }
    @Override protected void onResume(){
        super.onResume();
        immersive();
        if(browser!=null)browser.onResume();
        if(pendingOverlay&&Settings.canDrawOverlays(this)){
            pendingOverlay=false;
            launchOverlay();
        }
    }
    @Override protected void onPause(){
        if(browser!=null)browser.onPause();
        super.onPause();
    }
    @Override protected void onDestroy(){
        if(browser!=null)browser.destroy();
        super.onDestroy();
    }
    @Override public void onBackPressed(){
        if(browser!=null)browser.evaluateJavascript("window.xboxBack&&window.xboxBack()",null);
    }
    private boolean openPackage(String name){
        try{
            Intent i=getPackageManager().getLaunchIntentForPackage(name);
            if(i==null)return false;
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            return true;
        }catch(Exception e){return false;}
    }
    private void warn(String s){Toast.makeText(this,s,Toast.LENGTH_SHORT).show();}
    public void openAction(String action){
        try{
            switch(action){
                case "spotify":
                case "music":
                    if(!openPackage("com.spotify.music"))warn("Spotify is not installed");
                    break;
                case "settings":
                    startActivity(new Intent(Settings.ACTION_SETTINGS));break;
                case "files":
                    if(openPackage("com.sec.android.app.myfiles")||openPackage("com.google.android.apps.nbu.files"))break;
                    Intent file=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    file.addCategory(Intent.CATEGORY_OPENABLE);file.setType("*/*");
                    startActivity(file);break;
                case "phone":
                    startActivity(new Intent(Intent.ACTION_DIAL));break;
                case "messages":
                    startActivity(new Intent(Intent.ACTION_SENDTO,Uri.parse("smsto:")));break;
                case "camera":
                    if(!openPackage("com.sec.android.app.camera"))
                        startActivity(new Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA));
                    break;
                case "overlay":requestOverlay();break;
                case "overlayOff":
                    stopService(new Intent(this,OverlayService.class));break;
                case "playpause":mediaKey(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE);break;
                case "previous":mediaKey(KeyEvent.KEYCODE_MEDIA_PREVIOUS);break;
                case "next":mediaKey(KeyEvent.KEYCODE_MEDIA_NEXT);break;
                case "wifi":startActivity(new Intent(Settings.ACTION_WIFI_SETTINGS));break;
                case "display":startActivity(new Intent(Settings.ACTION_DISPLAY_SETTINGS));break;
                case "sound":startActivity(new Intent(Settings.ACTION_SOUND_SETTINGS));break;
                default:warn("Unsupported action");
            }
        }catch(Exception e){warn("Unable to open "+action);}
    }
    private void mediaKey(int code){
        AudioManager audio=(AudioManager)getSystemService(Context.AUDIO_SERVICE);
        if(audio==null)return;
        long now=android.os.SystemClock.uptimeMillis();
        audio.dispatchMediaKeyEvent(new KeyEvent(now,now,KeyEvent.ACTION_DOWN,code,0));
        audio.dispatchMediaKeyEvent(new KeyEvent(now,now+25,KeyEvent.ACTION_UP,code,0));
    }
    private void requestOverlay(){
        if(Settings.canDrawOverlays(this)){launchOverlay();warn("Xbox overlay enabled");return;}
        pendingOverlay=true;
        try{
            Intent i=new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName()));
            startActivity(i);
        }catch(Exception e){pendingOverlay=false;warn("Overlay permission screen unavailable");}
    }
    private void launchOverlay(){
        try{
            Intent i=new Intent(this,OverlayService.class);
            if(Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);
        }catch(Exception e){warn("Overlay service could not start");}
    }
    private String installedApps(){
        JSONArray result=new JSONArray();
        try{
            PackageManager pm=getPackageManager();
            Intent q=new Intent(Intent.ACTION_MAIN);
            q.addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> list=new ArrayList<>(pm.queryIntentActivities(q,0));
            Collections.sort(list,(a,b)->String.CASE_INSENSITIVE_ORDER.compare(a.loadLabel(pm).toString(),b.loadLabel(pm).toString()));
            for(ResolveInfo ri:list){
                if(ri.activityInfo==null||getPackageName().equals(ri.activityInfo.packageName))continue;
                JSONObject app=new JSONObject();
                app.put("name",ri.loadLabel(pm).toString());
                app.put("pkg",ri.activityInfo.packageName);
                app.put("cls",ri.activityInfo.name);
                result.put(app);
            }
        }catch(Exception ignored){}
        return result.toString();
    }
    private void launchApp(String pkg,String cls){
        try{
            Intent i=new Intent(Intent.ACTION_MAIN);
            i.addCategory(Intent.CATEGORY_LAUNCHER);
            i.setComponent(new ComponentName(pkg,cls));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            startActivity(i);
        }catch(Exception e){warn("Cannot open app");}
    }
    public final class Bridge {
        @JavascriptInterface public void action(String name){
            runOnUiThread(()->openAction(name));
        }
        @JavascriptInterface public void app(String pkg,String cls){
            runOnUiThread(()->launchApp(pkg,cls));
        }
        @JavascriptInterface public String apps(){return installedApps();}
        @JavascriptInterface public boolean overlayAllowed(){return Settings.canDrawOverlays(MainActivity.this);}
        @JavascriptInterface public int battery(){
            BatteryManager b=(BatteryManager)getSystemService(Context.BATTERY_SERVICE);
            return b==null?0:b.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
        }
        @JavascriptInterface public void haptic(){
            runOnUiThread(()->browser.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY));
        }
    }
}