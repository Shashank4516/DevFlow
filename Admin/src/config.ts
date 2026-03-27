const config = {
  // Base URL for backend APIs (PHP backend in this repo).
  // Example in `Admin/.env`: VITE_BACKEND_URL=http://localhost/devflow-backend/backend
  API_URL: (import.meta.env.VITE_BACKEND_URL as string) || "http://localhost:3000/",
  AUTH_BACKEND: "Dummy",
  FIRE_BASE: {
    API_KEY: import.meta.env.VITE_APIKEY,
    AUTH_DOMAIN: import.meta.env.VITE_AUTHDOMAIN,
    DATABASEURL: import.meta.env.VITE_DATABASEURL,
    PROJECTID: import.meta.env.VITE_PROJECTID,
    STORAGEBUCKET: import.meta.env.VITE_STORAGEBUCKET,
    MESSAGINGSENDERID: import.meta.env.VITE_MESSAGINGSENDERID,
    APPID: import.meta.env.VITE_APPID,
    MEASUREMENTID: import.meta.env.VITE_MEASUREMENTID,
  },
  GOOGLE: {
    API_KEY: import.meta.env.VITE_GOOGLE_API_KEY,
    CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    SECRET: import.meta.env.VITE_GOOGLE_SECRET_KEY,
  },
  FACEBOOK: {
    APP_ID: import.meta.env.VITE_FACEBOOK_APP_ID,
  },
};

export default config;
