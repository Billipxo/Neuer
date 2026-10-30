#!/usr/bin/env bash
# Baut die Android-App (APK) aus der Offline-Einzeldatei – ohne Android Studio und ohne Downloads
# von Google: Alle Werkzeuge kommen aus den Ubuntu-/Debian-Paketen.
#
#   sudo apt install default-jdk android-sdk-platform-23 aapt zipalign apksigner dalvik-exchange
#   android/baue-apk.sh            # App zum Installieren  → android/build/TREI-Trainer.apk
#   android/baue-apk.sh --test     # Testversion (Oberfläche für automatische Tests freigegeben)
#
# Signatur: Android installiert eine neue Version nur über die alte, wenn beide mit demselben
# Schlüssel signiert sind. Den Schlüssel gibst du mit TREI_KEYSTORE (Pfad zur .jks-Datei) und
# TREI_KEYSTORE_PASS (Passwort) an. Fehlen sie, wird für diesen Bau ein neuer Schlüssel erzeugt –
# eine so gebaute neue Version lässt sich dann nur nach dem Deinstallieren der alten installieren
# (vorher in der App „Sicherung herunterladen“, danach wiederherstellen).
# Schlüssel und Passwort gehören nie ins Repository.
set -euo pipefail
cd "$(dirname "$0")/.."

TEST=false
[[ "${1:-}" == "--test" ]] && TEST=true
ANDROID_JAR=${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}
DX=$(command -v dalvik-exchange || command -v dx)
B=android/build

for werkzeug in javac keytool aapt2 zipalign apksigner python3; do
  command -v "$werkzeug" > /dev/null || { echo "Fehlt: $werkzeug (siehe Kopf dieser Datei)"; exit 1; }
done
[[ -f "$ANDROID_JAR" ]] || { echo "Fehlt: $ANDROID_JAR (Paket android-sdk-platform-23)"; exit 1; }

rm -rf "$B"
mkdir -p "$B/assets" "$B/klassen"

echo "1/5 Web-App als Einzeldatei bauen"
npm run build:offline > "$B/web.log" 2>&1 || { cat "$B/web.log"; exit 1; }
cp dist-offline/index.html "$B/assets/index.html"

echo "2/5 Ressourcen und Manifest"
# Versionsnummer steigt mit jeder Minute seit 2026 – Android verlangt bei Updates eine höhere Nummer.
VERSION_CODE=$(( ($(date -u +%s) - 1767225600) / 60 ))
VERSION_NAME=$(date -u +%Y.%m.%d-%H%M)
aapt2 compile --dir android/res -o "$B/ressourcen.zip"
LINK_OPTIONEN=()
$TEST && LINK_OPTIONEN+=(--debug-mode)
aapt2 link -o "$B/basis.apk" -I "$ANDROID_JAR" --manifest android/AndroidManifest.xml \
  --min-sdk-version 23 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -A "$B/assets" "${LINK_OPTIONEN[@]}" "$B/ressourcen.zip"

echo "3/5 Java übersetzen und für Android umwandeln"
javac --release 8 -Xlint:-options -encoding UTF-8 -classpath "$ANDROID_JAR" -d "$B/klassen" \
  $(find android/src -name '*.java')
"$DX" --dex --min-sdk-version=23 --output="$B/classes.dex" "$B/klassen"
python3 - "$B/basis.apk" "$B/classes.dex" <<'PY'
import sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'a', zipfile.ZIP_DEFLATED) as apk:
    apk.write(sys.argv[2], 'classes.dex')
PY

echo "4/5 Ausrichten"
zipalign -p -f 4 "$B/basis.apk" "$B/ausgerichtet.apk"

echo "5/5 Signieren"
KS=${TREI_KEYSTORE:-}
PASS=${TREI_KEYSTORE_PASS:-}
if [[ -z "$KS" ]]; then
  KS="$B/einmal-schluessel.jks"
  PASS=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')
  keytool -genkeypair -keystore "$KS" -storepass "$PASS" -keypass "$PASS" -alias trei \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=TREI-Trainer" > /dev/null 2>&1
  echo "   Hinweis: neuer Schlüssel nur für diesen Bau (siehe Kopf dieser Datei)."
fi
ZIEL="$B/TREI-Trainer.apk"
$TEST && ZIEL="$B/TREI-Trainer-test.apk"
apksigner sign --ks "$KS" --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --v4-signing-enabled false --out "$ZIEL" "$B/ausgerichtet.apk"
apksigner verify "$ZIEL"
rm -f "$B/einmal-schluessel.jks"

echo "Fertig: $ZIEL (Version $VERSION_NAME)"
