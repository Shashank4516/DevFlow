import React, { useEffect } from "react";
import { useDispatch } from "react-redux";

// scss
import "./assets/scss/theme.scss";

//Route
import Routes from "./routes";
import { SessionRestoreProvider } from "./contexts/SessionRestore.Context";

// Initialize Firebase (modular SDK: app + analytics)
import "./config/firebase";
import { initFirebaseBackend } from "./helpers/firebase_helper";
import { firebaseConfig } from "./config/firebase";

import fakeBackend from "./helpers/fakeBackend";
import { changelayoutMode } from "./redux/actions";
import { LAYOUT_MODES } from "./constants";

// Disable axios mock backend for real data sources.
// If you still need it for other pages, gate it behind an env flag.
if (import.meta.env.VITE_USE_FAKE_BACKEND === "true") {
  fakeBackend();
}

// Init Firebase auth backend (compat layer for login/register)
initFirebaseBackend(firebaseConfig);

const App = () => {
  document.title = "DevFlow";
  const dispatch = useDispatch();

  // Apply device light/dark preference on load and when it changes
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      dispatch(
        changelayoutMode(media.matches ? LAYOUT_MODES.DARK : LAYOUT_MODES.LIGHT)
      );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [dispatch]);

  return (
    <SessionRestoreProvider>
      <Routes />
    </SessionRestoreProvider>
  );
};

export default App;
