# fitness-mobile

`fitness-api` üçün Android tətbiqi — React Native + Expo (SDK 58, Expo Router). Glass dizayn, işıqlı / qaranlıq / sistem teması.

## Ekranlar

| Tab / ekran | Nə edir |
|---|---|
| **Əsas** | Həftəlik/aylıq göstəricilər, aktiv proqram və bu günün planı, əzələ xəritəsi (ön/arxa, toxunuşla seçim → hərəkətlər), həcm və məşq sayı qrafikləri, əzələ qrupları donut, şəxsi rekordlar, son məşqlər |
| **Məşqlər** | Aylar üzrə jurnal; toxun → redaktə, basıb saxla → sil |
| **Proqramlar** | Siyahı, aktiv etmə; detalda həftə seçimi və gün statusları (*Tamamlandı / Buraxıldı / Bu gün / Gələcək*), "Qeyd et" planı məşq formasına doldurur |
| **Hərəkətlər** | Kataloq + öz hərəkətləriniz, qrup filtri; hərəkətə toxun → irəliləyiş qrafiki (maks. çəki, təxmini 1RM, həcm) |
| **Profil** | Çəki/yağ ölçüləri, BMI, hədəf, profil, tema seçimi, çıxış |
| Məşq redaktoru | Hərəkət seçici (axtarış, qrup, yerində yeni hərəkət), set × təkrar × çəki, ümumi həcm |
| Proqram redaktoru | Həftəlik / aylıq (4 həftə), gün seçimi, həftəni digərlərinə köçürmə |

Token Android Keystore-da (`expo-secure-store`), tema və server ünvanı `AsyncStorage`-da saxlanılır.

## İşə salmaq

> **Node.js ≥ 22.13 lazımdır** (React Native 0.88 tələbi). `nvm install 22 && nvm use 22`.

```bash
# 1. API (layihənin kökündə)
docker compose up -d

# 2. Tətbiq
cd fitness-mobile
npm install
npx expo start          # QR kodu Expo Go ilə skan edin, və ya "a" → Android emulator
```

### Server ünvanı

Default: `http://10.0.2.2:3000/api` (Android emulatorundan kompüterə). Real telefonda giriş ekranının altındakı **Server** bölməsində kompüterin Wi-Fi IP-sini yazın, məs. `http://192.168.1.10:3000/api` → *Yoxla və saxla*. Default-u `.env`-də `EXPO_PUBLIC_API_URL` ilə də dəyişə bilərsiniz (`.env.example`-a baxın).

Telefon və kompüter eyni şəbəkədə olmalı, Windows Firewall 3000 portuna icazə verməlidir.

## APK yığmaq

EAS ilə (lokal Android Studio lazım deyil):

```bash
npx eas-cli@latest login
npm run build:apk       # eas build -p android --profile preview → quraşdırıla bilən .apk
```

Production üçün `eas build -p android --profile production` (.aab, Google Play). Lokal yığım: `npx expo run:android` (Android SDK + JDK 17 tələb edir).

API HTTPS-siz işləyirsə, `usesCleartextTraffic` artıq `app.json`-da aktivdir; production-da HTTPS istifadə edin və onu söndürün.

## Struktur

```
src/
  app/            Expo Router ekranları — (tabs)/, workout, program/[id], program/edit, exercise/[id], login, register
  components/     ui.tsx (Glass, Button, Input, Sheet, Toast...), charts.tsx (SVG qrafiklər), bodymap/, ExercisePicker
  api/            axios klienti + tiplər (fitness-web ilə eyni)
  store/          zustand: auth, settings, exercises, data (yeniləmə sayğacı), toast
  theme/          rəng tokenləri (web ilə eyni palitra), ThemeProvider
  utils/          format, draft, muscles, useAsync
```

Glass effekti: fon (`GlassBackground`) `BlurTargetView` içindədir; tab bar, toast və giriş kartı onu `expo-blur` ilə real bulanıqlaşdırır (Android 12+; köhnə versiyalarda yarımşəffaf fona keçir). Siyahı kartları performans üçün yarımşəffaf doldurma + parıltı qradiyenti istifadə edir.

## Yoxlamalar

```bash
npm run typecheck
npm run lint
npx expo-doctor
```
