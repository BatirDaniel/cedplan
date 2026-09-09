import * as React from 'react';
import * as signalR from '@microsoft/signalr';

import { API_ORIGIN } from '@/api/client';
import type { AppNotification } from '@/api/notifications';

let connection: signalR.HubConnection | null = null;
let connectPromise: Promise<void> | null = null;

function getConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_ORIGIN}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('cedplan_token') ?? '',
      })
      .withAutomaticReconnect()
      .build();
  }
  return connection;
}

async function ensureStarted(): Promise<void> {
  const conn = getConnection();
  if (conn.state === signalR.HubConnectionState.Connected) return;
  if (!connectPromise) {
    connectPromise = conn.start().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }
  return connectPromise;
}

/** Connects to the per-user notifications hub and invokes onReceive for every live notification. */
export function useNotificationsHub(enabled: boolean, onReceive: (notification: AppNotification) => void) {
  const onReceiveRef = React.useRef(onReceive);
  onReceiveRef.current = onReceive;

  React.useEffect(() => {
    if (!enabled) return;
    const conn = getConnection();

    const handler = (notification: AppNotification) => onReceiveRef.current(notification);
    conn.on('ReceiveNotification', handler);

    ensureStarted().catch(() => {});

    return () => {
      conn.off('ReceiveNotification', handler);
    };
  }, [enabled]);
}
