import {Platform} from 'react-native';

/* ================= BASE URL =================
   Local dev: Android emulators reach the host machine's `localhost`
   through the special `10.0.2.2` alias, while the iOS simulator uses
   `localhost` directly. For a physical device use your machine's LAN IP.
   To go live, just uncomment the production line below. */
const LOCAL_HOST = Platform.select({
  android: '10.0.2.2',
  ios: 'localhost',
  default: 'localhost',
});

let APL_LINK: string = `http://${LOCAL_HOST}:5050/`; // 🛠 local dev
APL_LINK = 'https://carefingernodejs.onrender.com/'; // 🔥 production

/* ================= PATIENT (USER APP) LINK ================= */
export const API_BASE_URL: string = APL_LINK + 'api/patient';

export const AUTH_CONFIG = {
  defaultCountryCode: '+91',
} as const;
