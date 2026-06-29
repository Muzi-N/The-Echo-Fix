/**
 * Canonical event names for the realtime protocol. Centralised so the client
 * SDK and server never drift. Inbound = client to server, Outbound = server
 * to client.
 */
export const WsEvents = {
  // Inbound
  MessageSend: 'message:send',
  MessageRead: 'message:read',
  TypingStart: 'typing:start',
  TypingStop: 'typing:stop',
  ConversationJoin: 'conversation:join',

  // Outbound
  MessageNew: 'message:new',
  MessageStatus: 'message:status',
  TypingUpdate: 'typing:update',
  PresenceUpdate: 'presence:update',
  Error: 'error',
} as const;

// Redis pub/sub channel that carries cross-instance realtime events.
export const REALTIME_CHANNEL = 'echo:realtime';

export interface RealtimeEnvelope {
  // Target user ids to deliver to; the publishing instance does local fan-out,
  // every other instance does the same for its own connected sockets.
  targetUserIds: string[];
  event: string;
  payload: unknown;
}
