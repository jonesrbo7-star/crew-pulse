# Android shell

Capacitor wrapper. The WebView loads the hosted page. This phase does not build an APK.

`server.url` comes from the environment or a local file. `capacitor.config.ts` does not contain a host.

```bash
cd android-shell
npm i
export CAP_SERVER_URL=https://jonesrbo7-star.github.io/crew-pulse/
# or: cp server.url.example server.url
npx cap add android
npx cap open android
```

Debug APK, after the Android project exists:

```bash
cd android
./gradlew assembleDebug
```

`npx cap add android` needs a local Android SDK. `npm i` and the config can be checked without it.
