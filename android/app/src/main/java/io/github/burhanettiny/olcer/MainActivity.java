package io.github.burhanettiny.olcer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OlcerSensorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
