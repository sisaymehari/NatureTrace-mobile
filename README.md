# 📱 NatureTrace Mobile

**The companion mobile app for [NatureTrace](https://github.com/sisaymehari/NatureTrace)**, AI-powered biodiversity reporting for the UK. Take a photo of wildlife or an environmental threat in the field, and the app identifies the species, tags your location, and adds the report to the shared NatureTrace map.

🏆 Part of the project that won **1st place at Tech4Positive Futures: Youth Voices 2026**, held at Google London.

Built with React Native and Expo for iOS and Android.

<!-- Add phone screenshots here, side by side. Example:
<p>
  <img src="docs/home.png" width="220" />
  <img src="docs/report.png" width="220" />
  <img src="docs/map.png" width="220" />
</p>
-->

---

## Why a mobile app?

Most wildlife sightings and environmental problems are spotted outdoors, not at a desk. The mobile app uses the phone's camera and GPS, so a report can be made on the spot in under a minute. It shares the same database and AI identification as the web app, so every report appears on both.

## Features

- **Camera or gallery:** take a photo in the app or pick one from your library.
- **AI species identification:** the photo is sent to the NatureTrace server, which returns the species name, a confidence score, and whether the species is invasive in the UK. The category is filled in automatically.
- **Automatic location:** GPS coordinates are captured and turned into a readable place name (OpenStreetMap Nominatim reverse geocoding).
- **Map of reports:** every report with a location appears as a pin on a native map, centred on where you are.
- **Home dashboard:** total reports, number of unique species found, categories, and the latest sightings.
- **Species guide:** a Learn tab with information about species you might come across.
- **Profile and gamification:** eco-points, badges, streaks, and a history of your own reports.
- **Accounts:** sign up and log in with Supabase Auth. Sessions are stored securely on the device with Expo SecureStore.

## Tech stack

| Layer | Tools |
|---|---|
| App | React Native 0.81, Expo SDK 54, Expo Router (file-based navigation), TypeScript |
| Device features | expo-camera, expo-image-picker, expo-location, expo-secure-store, expo-haptics |
| Maps | react-native-maps |
| Backend | Supabase (Postgres + PostGIS, Auth, Storage), shared with the web app |
| AI | NatureTrace web API (`/api/identify`), powered by Anthropic Claude |

## How it works

```
 Camera / gallery photo
        │
        ▼
 NatureTrace server /api/identify ──► Claude vision ──► species, confidence, invasive flag
        │
        ▼
 Photo ──► Supabase Storage        GPS ──► Nominatim ──► place name
        │
        ▼
 Report saved to Supabase (PostGIS point) ──► appears on the mobile map and the web app's live map
```

### Technical decisions

- **No secret keys in the app:** anything bundled into a mobile app can be extracted, so the app never talks to the AI provider directly. It calls the NatureTrace server, which holds the API key and applies the same prompt and safety rules as the web app.
- **One backend for two apps:** web and mobile share the same Supabase project, so a report made on a phone shows up on the web map, and vice versa.
- **Spatial data:** locations are stored as PostGIS points (`SRID=4326;POINT(lng lat)`), and the coordinates Supabase returns are decoded on the device to place map pins.
- **Smaller uploads:** photos are compressed before upload to keep reporting fast on mobile data.

## Running locally

You'll need Node.js and the **Expo Go** app on your phone.

```bash
git clone https://github.com/sisaymehari/NatureTrace-mobile.git
cd NatureTrace-mobile
npm install
```

Create a `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=https://naturetrace.netlify.app
```

The Supabase values must point to the same project as the web app (see the [web app's README](https://github.com/sisaymehari/NatureTrace) for the database setup). Then:

```bash
npx expo start
```

Scan the QR code with your phone's camera (iOS) or with Expo Go (Android).

> On Android, the map needs a Google Maps API key in `app.json` (`android.config.googleMaps.apiKey`).

## Project status

A working prototype, tested through Expo Go. Not yet published to the App Store or Google Play.

## Roadmap

- [ ] Show the AI's conservation note and similar species on the report screen
- [ ] Real-time map updates (already live on the web app)
- [ ] Offline reporting with sync, matching the web app
- [ ] Release builds for the App Store and Google Play

## Related

- **[NatureTrace](https://github.com/sisaymehari/NatureTrace)**: the Next.js web app and API ([live](https://naturetrace.netlify.app))

## Author

Built by **Sisay Mehari** · [Portfolio](https://sisaymehari.github.io/portfolio/) · [LinkedIn](https://www.linkedin.com/in/sisay-mehari/) · meharisisay6@gmail.com
