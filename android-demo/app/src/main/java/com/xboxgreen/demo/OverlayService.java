package com.xboxgreen.demo;

import android.app.Service;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.net.Uri;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class OverlayService extends Service {
    private static final String CHANNEL="xbox_demo_overlay";
    private WindowManager windows;
    private View upper,lower;
    private ToneGenerator sound;

    private int d(float n) { return (int)(n*getResources().getDisplayMetrics().density+.5f); }

    @Override public void onCreate(){
        super.onCreate();
        windows=(WindowManager)getSystemService(WINDOW_SERVICE);
        try{sound=new ToneGenerator(AudioManager.STREAM_MUSIC,20);}catch(Exception ignored){}
    }
    @Override public int onStartCommand(Intent i,int flags,int id){
        if(!Settings.canDrawOverlays(this)){stopSelf();return START_NOT_STICKY;}
        try{
            if(Build.VERSION.SDK_INT>=26){
                NotificationManager n=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
                n.createNotificationChannel(new NotificationChannel(CHANNEL,"Xbox floating overlay",NotificationManager.IMPORTANCE_LOW));
            }
            Intent home=new Intent(this,MainActivity.class);
            home.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pending=PendingIntent.getActivity(this,1,home,
                PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
            Notification.Builder nb=Build.VERSION.SDK_INT>=26?
                new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
            Notification notif=nb.setContentTitle("Xbox overlay active")
                .setContentText("Tap to return to the Xbox launcher")
                .setSmallIcon(android.R.drawable.ic_menu_manage)
                .setContentIntent(pending).setOngoing(true).build();
            if(Build.VERSION.SDK_INT>=34)
                startForeground(2208,notif,ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            else startForeground(2208,notif);
            if(upper==null)createWindows();
        }catch(Exception e){
            Toast.makeText(this,"Overlay unavailable",Toast.LENGTH_SHORT).show();
            stopSelf();
        }
        return START_NOT_STICKY;
    }
    private GradientDrawable plate(int light){
        GradientDrawable g=new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{0xF5224111,0xF5071605,0xFA000802});
        g.setCornerRadius(d(12));
        g.setStroke(d(1),light);
        return g;
    }
    private TextView label(String name,int size){
        TextView t=new TextView(this);
        t.setText(name);
        t.setTextColor(0xFFC5FF79);
        t.setTextSize(size);
        t.setTypeface(Typeface.create("sans-serif-condensed",Typeface.BOLD));
        t.setGravity(Gravity.CENTER);
        return t;
    }
    private WindowManager.LayoutParams params(int height,int gravity,int y){
        WindowManager.LayoutParams p=new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,d(height),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL|
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT);
        p.gravity=gravity;p.y=d(y);
        return p;
    }
    private void createWindows(){
        LinearLayout head=new LinearLayout(this);
        head.setGravity(Gravity.CENTER_VERTICAL);
        head.setPadding(d(10),d(4),d(10),d(4));
        head.setBackground(plate(0xFF81D33F));
        TextView dot=label("◉",26);
        head.addView(dot,new LinearLayout.LayoutParams(d(34),-1));
        TextView title=label("XBOX  /  ANDROID OVERLAY",14);
        title.setGravity(Gravity.CENTER_VERTICAL);
        head.addView(title,new LinearLayout.LayoutParams(0,-1,1));
        TextView close=label("×",28);
        close.setBackground(plate(0xFF477323));
        close.setOnClickListener(v->{click();stopSelf();});
        head.addView(close,new LinearLayout.LayoutParams(d(45),d(39)));
        upper=head;
        windows.addView(upper,params(51,Gravity.TOP|Gravity.CENTER_HORIZONTAL,9));

        LinearLayout bottom=new LinearLayout(this);
        bottom.setGravity(Gravity.CENTER);
        bottom.setPadding(d(7),d(6),d(7),d(6));
        bottom.setBackground(plate(0xFF77BA35));
        add(bottom,"HOME","home");
        add(bottom,"SPOTIFY","spotify");
        add(bottom,"FILES","files");
        add(bottom,"SETTINGS","settings");
        lower=bottom;
        windows.addView(lower,params(59,Gravity.BOTTOM|Gravity.CENTER_HORIZONTAL,18));
    }
    private void add(LinearLayout line,String text,String action){
        TextView b=label(text,12);
        b.setBackground(plate(0xFF325C1D));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,d(44),1);
        p.setMargins(d(2),0,d(2),0);
        line.addView(b,p);
        b.setOnClickListener(v->{click();open(action);});
    }
    private void click(){
        try{if(sound!=null)sound.startTone(ToneGenerator.TONE_PROP_ACK,65);}catch(Exception ignored){}
    }
    private void open(String action){
        try{
            Intent intent=null;
            if("home".equals(action)){
                intent=new Intent(this,MainActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
            }else if("spotify".equals(action)){
                intent=getPackageManager().getLaunchIntentForPackage("com.spotify.music");
                if(intent==null)Toast.makeText(this,"Spotify is not installed",Toast.LENGTH_SHORT).show();
            }else if("files".equals(action)){
                intent=getPackageManager().getLaunchIntentForPackage("com.sec.android.app.myfiles");
                if(intent==null){
                    intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.setType("*/*");intent.addCategory(Intent.CATEGORY_OPENABLE);
                }
            }else if("settings".equals(action)){
                intent=new Intent(Settings.ACTION_SETTINGS);
            }
            if(intent!=null){intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);startActivity(intent);}
        }catch(Exception e){Toast.makeText(this,"Shortcut unavailable",Toast.LENGTH_SHORT).show();}
    }
    @Override public void onDestroy(){
        if(windows!=null){
            if(upper!=null){try{windows.removeView(upper);}catch(Exception ignored){}upper=null;}
            if(lower!=null){try{windows.removeView(lower);}catch(Exception ignored){}lower=null;}
        }
        if(sound!=null){try{sound.release();}catch(Exception ignored){}sound=null;}
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent){return null;}
}