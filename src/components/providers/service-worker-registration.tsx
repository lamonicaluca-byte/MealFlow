"use client";

import * as React from "react";

/**
 * Registra il service worker (§22, PWA). Fallisce silenziosamente se il
 * browser non lo supporta o se la registrazione va storta: MealFlow deve
 * restare pienamente utilizzabile anche senza PWA installata.
 */
export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Nessuna azione: l'app resta funzionante anche senza service worker.
    });
  }, []);

  return null;
}
