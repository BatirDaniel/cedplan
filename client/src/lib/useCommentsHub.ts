import * as React from 'react';
import * as signalR from '@microsoft/signalr';

import { API_ORIGIN } from '@/api/client';
import type { Comment } from '@/types';

let connection: signalR.HubConnection | null = null;
let connectPromise: Promise<void> | null = null;

function getConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_ORIGIN}/hubs/comments`, {
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

/** Joins the SignalR group for a work package and appends live comments as they arrive. */
export function useCommentsHub(workPackageId: string | undefined, onReceive: (comment: Comment) => void) {
  const onReceiveRef = React.useRef(onReceive);
  onReceiveRef.current = onReceive;

  React.useEffect(() => {
    if (!workPackageId) return;
    let cancelled = false;
    const conn = getConnection();

    const handler = (comment: Comment) => {
      if (comment.workPackageId === workPackageId) onReceiveRef.current(comment);
    };
    conn.on('ReceiveComment', handler);

    ensureStarted()
      .then(() => {
        if (!cancelled) conn.invoke('JoinWorkPackage', workPackageId).catch(() => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      conn.off('ReceiveComment', handler);
      if (conn.state === signalR.HubConnectionState.Connected) {
        conn.invoke('LeaveWorkPackage', workPackageId).catch(() => {});
      }
    };
  }, [workPackageId]);
}
