package de.treitrainer.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;

/**
 * TREI-Trainer als Android-App: zeigt die Offline-Einzeldatei (assets/index.html) in einer WebView.
 *
 * Die Startadresse https://appassets.androidplatform.net/ ist eine von Google für genau diesen Zweck
 * reservierte Adresse: Sie wird nie im Internet aufgerufen, sondern hier aus den App-Dateien beantwortet.
 * So hat die Seite einen festen, sicheren Ursprung, und ihre Datenbank (Lernstand) bleibt erhalten.
 *
 * Bewusst schlichtes Java ohne Lambdas: gebaut wird mit den Werkzeugen aus den Ubuntu-Paketen (dx).
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/index.html";
    private static final int ANFRAGE_SPEICHERN = 1;
    private static final int ANFRAGE_DATEI = 2;

    private WebView webView;
    /** Text, der nach „Speichern unter“ geschrieben wird */
    private String zuSpeichern;
    /** wartet auf die Dateiauswahl (Sicherung oder Fragen einlesen, Bild wählen) */
    private ValueCallback<Uri[]> dateiAuswahl;

    @Override
    protected void onCreate(Bundle gespeichert) {
        super.onCreate(gespeichert);
        webView = new WebView(this);
        webView.setBackgroundColor(istDunkel() ? 0xFF0F172A : 0xFFF8FAFC);
        setContentView(webView);

        WebSettings einstellungen = webView.getSettings();
        einstellungen.setJavaScriptEnabled(true);
        einstellungen.setDomStorageEnabled(true);
        einstellungen.setAllowFileAccess(false);
        einstellungen.setTextZoom(schriftZoom());

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            // nur in Testversionen: erlaubt automatische Tests der Oberfläche
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest anfrage) {
                Uri adresse = anfrage.getUrl();
                if (!HOST.equals(adresse.getHost())) return null;
                return ausAppDateien(adresse.getPath());
            }

            // Diese Fassung gibt es auf allen Android-Versionen; ab Android 7 ruft die neuere sie selbst auf.
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri adresse = Uri.parse(url);
                if (HOST.equals(adresse.getHost())) return false;
                // Fremde Links gibt es in der App nicht – falls doch, im Browser öffnen statt hier
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, adresse));
                } catch (ActivityNotFoundException e) {
                    // kein Browser vorhanden: Link ignorieren
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> rueckruf, FileChooserParams parameter) {
                if (dateiAuswahl != null) dateiAuswahl.onReceiveValue(null);
                dateiAuswahl = rueckruf;
                try {
                    startActivityForResult(parameter.createIntent(), ANFRAGE_DATEI);
                    return true;
                } catch (ActivityNotFoundException e) {
                    dateiAuswahl = null;
                    return false;
                }
            }
        });

        webView.addJavascriptInterface(new Bruecke(), "TreiAndroid");

        String zuletzt = gespeichert != null ? gespeichert.getString("adresse") : null;
        webView.loadUrl(zuletzt != null && zuletzt.startsWith("https://" + HOST + "/") ? zuletzt : START);
    }

    /** Beantwortet Anfragen an die App-Adresse aus den mitgelieferten Dateien (assets/). */
    private WebResourceResponse ausAppDateien(String pfad) {
        String datei = pfad == null || pfad.length() <= 1 ? "index.html" : pfad.substring(1);
        try {
            InputStream daten = getAssets().open(datei);
            return new WebResourceResponse(mimeTyp(datei), "UTF-8", daten);
        } catch (IOException e) {
            // nicht vorhanden: leere Antwort statt eines Versuchs, das Internet zu fragen
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Nicht gefunden",
                    new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mimeTyp(String datei) {
        String name = datei.toLowerCase();
        if (name.endsWith(".html")) return "text/html";
        if (name.endsWith(".js")) return "text/javascript";
        if (name.endsWith(".css")) return "text/css";
        if (name.endsWith(".svg")) return "image/svg+xml";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    private boolean istDunkel() {
        int modus = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return modus == Configuration.UI_MODE_NIGHT_YES;
    }

    /** Schriftgröße des Handys übernehmen (Einstellungen → Anzeige → Schriftgröße) */
    private int schriftZoom() {
        return Math.round(getResources().getConfiguration().fontScale * 100);
    }

    /** Wird von der Web-App aufgerufen (window.TreiAndroid, siehe src/components/android.ts). */
    private class Bruecke {
        @JavascriptInterface
        public void speichern(final String dateiname, final String inhalt, final String mimeTyp) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    speichernUnter(dateiname, inhalt, mimeTyp);
                }
            });
        }

        @JavascriptInterface
        public boolean istDunkel() {
            return MainActivity.this.istDunkel();
        }
    }

    /** Öffnet „Speichern unter“ (z. B. Downloads oder Google Drive) für eine Sicherung oder einen Export. */
    private void speichernUnter(String dateiname, String inhalt, String mimeTyp) {
        if (zuSpeichern != null) gespeichertMelden(false); // vorheriger Vorgang wird ersetzt
        zuSpeichern = inhalt;
        Intent absicht = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        absicht.addCategory(Intent.CATEGORY_OPENABLE);
        absicht.setType(mimeTyp == null || mimeTyp.length() == 0 ? "application/json" : mimeTyp);
        absicht.putExtra(Intent.EXTRA_TITLE, dateiname);
        try {
            startActivityForResult(absicht, ANFRAGE_SPEICHERN);
        } catch (ActivityNotFoundException e) {
            zuSpeichern = null;
            Toast.makeText(this, "Speichern ist auf diesem Gerät nicht möglich.", Toast.LENGTH_LONG).show();
            gespeichertMelden(false);
        }
    }

    @Override
    protected void onActivityResult(int anfrage, int ergebnis, Intent daten) {
        if (anfrage == ANFRAGE_DATEI) {
            if (dateiAuswahl != null) {
                dateiAuswahl.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(ergebnis, daten));
                dateiAuswahl = null;
            }
            return;
        }
        if (anfrage == ANFRAGE_SPEICHERN) {
            String inhalt = zuSpeichern;
            zuSpeichern = null;
            boolean ok = false;
            if (ergebnis == RESULT_OK && daten != null && daten.getData() != null && inhalt != null) {
                OutputStream aus = null;
                try {
                    aus = getContentResolver().openOutputStream(daten.getData());
                    if (aus == null) throw new IOException("kein Ziel");
                    aus.write(inhalt.getBytes("UTF-8"));
                    aus.flush();
                    ok = true;
                } catch (Exception e) {
                    ok = false;
                } finally {
                    if (aus != null) {
                        try {
                            aus.close();
                        } catch (IOException e) {
                            ok = false;
                        }
                    }
                }
                if (!ok) Toast.makeText(this, "Speichern hat nicht geklappt.", Toast.LENGTH_LONG).show();
            }
            gespeichertMelden(ok);
            return;
        }
        super.onActivityResult(anfrage, ergebnis, daten);
    }

    /** Meldet der Web-App, ob gespeichert wurde (Ereignis „trei-gespeichert“). */
    private void gespeichertMelden(boolean ok) {
        webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('trei-gespeichert',{detail:{ok:" + ok + "}}))", null);
    }

    @Override
    public void onConfigurationChanged(Configuration neu) {
        super.onConfigurationChanged(neu);
        webView.getSettings().setTextZoom(schriftZoom());
        // Hell/dunkel am Handy umgestellt: die Web-App prüft neu (Einstellung „Wie System“)
        webView.evaluateJavascript("window.dispatchEvent(new Event('trei-dunkel'))", null);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle zustand) {
        super.onSaveInstanceState(zustand);
        zustand.putString("adresse", webView.getUrl());
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}
