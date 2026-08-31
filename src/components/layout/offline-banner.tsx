"use client";

import { WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Banner discreto quando il dispositivo è offline. Le modifiche restano
 * possibili (vengono applicate localmente, §22): questo avviso serve solo a
 * far sapere all'utente che le modifiche non stanno raggiungendo gli altri
 * dispositivi finché la connessione non torna.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-xs font-medium text-warning">
      <WifiOff className="h-3.5 w-3.5" />
      Sei offline: le modifiche restano salvate sul dispositivo e si sincronizzeranno al ritorno della connessione.
    </div>
  );
}
