package io.github.burhanettiny.olcer;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.BatteryManager;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tarayıcının erişemediği Android sensörlerini (basınç, ışık, manyetik alan, sıcaklık, nem,
 * yakınlık, adım sayacı) ve pil ölçümlerini web arayüzüne aktarır.
 */
@CapacitorPlugin(
    name = "OlcerSensor",
    permissions = { @Permission(alias = "aktivite", strings = { Manifest.permission.ACTIVITY_RECOGNITION }) }
)
public class OlcerSensorPlugin extends Plugin implements SensorEventListener {

    private static final Map<String, Integer> TURLER = new LinkedHashMap<>();
    static {
        TURLER.put("basinc", Sensor.TYPE_PRESSURE);
        TURLER.put("isik", Sensor.TYPE_LIGHT);
        TURLER.put("manyetik", Sensor.TYPE_MAGNETIC_FIELD);
        TURLER.put("sicaklik", Sensor.TYPE_AMBIENT_TEMPERATURE);
        TURLER.put("nem", Sensor.TYPE_RELATIVE_HUMIDITY);
        TURLER.put("yakinlik", Sensor.TYPE_PROXIMITY);
        TURLER.put("adim", Sensor.TYPE_STEP_COUNTER);
    }

    private SensorManager sm;
    private final Map<Integer, String> aktif = new HashMap<>();

    @Override
    public void load() {
        sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    }

    @PluginMethod
    public void liste(PluginCall call) {
        JSArray dizi = new JSArray();
        for (Map.Entry<String, Integer> t : TURLER.entrySet()) {
            Sensor s = sm.getDefaultSensor(t.getValue());
            JSObject o = new JSObject();
            o.put("tur", t.getKey());
            o.put("var", s != null);
            if (s != null) {
                o.put("ad", s.getName());
                o.put("uretici", s.getVendor());
                o.put("aralik", (double) s.getMaximumRange());
                o.put("cozunurluk", (double) s.getResolution());
                o.put("guc", (double) s.getPower());
            }
            dizi.put(o);
        }
        JSObject sonuc = new JSObject();
        sonuc.put("sensorler", dizi);
        call.resolve(sonuc);
    }

    @PluginMethod
    public void baslat(PluginCall call) {
        String tur = call.getString("tur", "");
        Integer tip = TURLER.get(tur);
        if (tip == null) { call.reject("Bilinmeyen sensör: " + tur); return; }
        if (tip == Sensor.TYPE_STEP_COUNTER && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && getPermissionState("aktivite") != PermissionState.GRANTED) {
            requestPermissionForAlias("aktivite", call, "aktiviteIzni");
            return;
        }
        kaydet(call, tip, tur);
    }

    @PermissionCallback
    private void aktiviteIzni(PluginCall call) {
        if (getPermissionState("aktivite") == PermissionState.GRANTED) {
            kaydet(call, Sensor.TYPE_STEP_COUNTER, "adim");
        } else {
            call.reject("Fiziksel etkinlik izni verilmedi.", "IZIN");
        }
    }

    private void kaydet(PluginCall call, int tip, String tur) {
        Sensor s = sm.getDefaultSensor(tip);
        if (s == null) { call.reject("Bu cihazda bu sensör yok.", "YOK"); return; }
        if (!aktif.containsKey(tip)) {
            sm.registerListener(this, s, SensorManager.SENSOR_DELAY_UI);
            aktif.put(tip, tur);
        }
        call.resolve();
    }

    @PluginMethod
    public void durdur(PluginCall call) {
        Integer tip = TURLER.get(call.getString("tur", ""));
        if (tip != null && aktif.containsKey(tip)) {
            Sensor s = sm.getDefaultSensor(tip);
            if (s != null) sm.unregisterListener(this, s);
            aktif.remove(tip);
        }
        call.resolve();
    }

    @PluginMethod
    public void hepsiniDurdur(PluginCall call) {
        sm.unregisterListener(this);
        aktif.clear();
        call.resolve();
    }

    @PluginMethod
    public void pil(PluginCall call) {
        Intent i = getContext().registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (i == null) { call.reject("Pil bilgisi alınamadı."); return; }
        int seviye = i.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
        int olcek = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
        JSObject o = new JSObject();
        o.put("yuzde", seviye >= 0 && olcek > 0 ? 100.0 * seviye / olcek : -1);
        o.put("gerilim", i.getIntExtra(BatteryManager.EXTRA_VOLTAGE, -1) / 1000.0);
        o.put("sicaklik", i.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Integer.MIN_VALUE) / 10.0);
        o.put("sarj", i.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) != 0);
        BatteryManager bm = (BatteryManager) getContext().getSystemService(Context.BATTERY_SERVICE);
        if (bm != null) {
            int akim = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW);
            if (akim != Integer.MIN_VALUE && akim != 0) o.put("akim", akim / 1000.0);
        }
        call.resolve(o);
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        String tur = aktif.get(e.sensor.getType());
        if (tur == null) return;
        JSArray d = new JSArray();
        for (float f : e.values) d.put(Float.toString(f));
        JSObject o = new JSObject();
        o.put("tur", tur);
        o.put("degerler", d);
        o.put("dogruluk", e.accuracy);
        notifyListeners("veri", o);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    @Override
    protected void handleOnDestroy() {
        if (sm != null) sm.unregisterListener(this);
        aktif.clear();
    }
}
