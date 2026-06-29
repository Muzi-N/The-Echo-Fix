import { Logger, UseFilters } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../../common/guards/jwt.strategy';
import { ContactsService } from '../contacts/contacts.service';
import { ConversationsService } from '../conversations/conversations.service';
import { SendMessageDto } from '../messages/dto/message.dto';
import { MessagesService } from '../messages/messages.service';
import { PresenceService } from '../presence/presence.service';
import { RealtimePublisher } from './realtime.publisher';
import { WsEvents } from './ws-events';

// Socket carrying the authenticated user id, set during handshake.
interface AuthedSocket extends Socket {
  userId: string;
  username: string;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly presence: PresenceService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly contacts: ContactsService,
    private readonly publisher: RealtimePublisher,
  ) {}

  afterInit(server: Server) {
    this.publisher.bindServer(server);
    this.logger.log('Realtime gateway initialised');
  }

  /**
   * Handshake authentication. The JWT is read from the Socket.IO auth payload
   * (client passes { auth: { token } }). Invalid or missing tokens are
   * rejected before the connection is allowed to do anything. Fails closed.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        this.fromHeader(client);
      if (!token) {
        throw new Error('Missing token');
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });
      const authed = client as AuthedSocket;
      authed.userId = payload.sub;
      authed.username = payload.username;

      await authed.join(RealtimePublisher.userRoom(payload.sub));
      const becameOnline = await this.presence.addSocket(
        payload.sub,
        client.id,
      );
      if (becameOnline) {
        await this.broadcastPresence(payload.sub, true);
      }
      this.logger.debug(`Socket connected: ${payload.username}`);
    } catch {
      client.emit(WsEvents.Error, { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const authed = client as AuthedSocket;
    if (!authed.userId) return;
    const becameOffline = await this.presence.removeSocket(
      authed.userId,
      client.id,
    );
    if (becameOffline) {
      await this.broadcastPresence(authed.userId, false);
    }
  }

  @SubscribeMessage(WsEvents.ConversationJoin)
  async onJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.conversations.assertMember(data.conversationId, client.userId);
    // Mark prior messages as delivered now that this recipient is present.
    await this.messages.markDelivered(data.conversationId, client.userId);
    const participants = await this.conversations.getParticipantUserIds(
      data.conversationId,
    );
    await this.publisher.publish({
      targetUserIds: participants.filter((id) => id !== client.userId),
      event: WsEvents.MessageStatus,
      payload: { conversationId: data.conversationId, status: 'delivered' },
    });
    return { joined: data.conversationId };
  }

  @SubscribeMessage(WsEvents.MessageSend)
  async onMessageSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    const message = await this.messages.send(client.userId, data);
    const participants = await this.conversations.getParticipantUserIds(
      data.conversationId,
    );
    // Deliver to everyone in the conversation, including the sender's other
    // devices, so all clients converge on the same state.
    await this.publisher.publish({
      targetUserIds: participants,
      event: WsEvents.MessageNew,
      payload: message,
    });
    return message;
  }

  @SubscribeMessage(WsEvents.MessageRead)
  async onMessageRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    await this.messages.markRead(
      client.userId,
      data.conversationId,
      data.messageId,
    );
    const participants = await this.conversations.getParticipantUserIds(
      data.conversationId,
    );
    await this.publisher.publish({
      targetUserIds: participants.filter((id) => id !== client.userId),
      event: WsEvents.MessageStatus,
      payload: {
        conversationId: data.conversationId,
        messageId: data.messageId,
        status: 'read',
        readerId: client.userId,
      },
    });
  }

  @SubscribeMessage(WsEvents.TypingStart)
  async onTypingStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.emitTyping(client, data.conversationId, true);
  }

  @SubscribeMessage(WsEvents.TypingStop)
  async onTypingStop(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.emitTyping(client, data.conversationId, false);
  }

  private async emitTyping(
    client: AuthedSocket,
    conversationId: string,
    typing: boolean,
  ) {
    await this.conversations.assertMember(conversationId, client.userId);
    const participants = await this.conversations.getParticipantUserIds(
      conversationId,
    );
    await this.publisher.publish({
      targetUserIds: participants.filter((id) => id !== client.userId),
      event: WsEvents.TypingUpdate,
      payload: { conversationId, userId: client.userId, typing },
    });
  }

  private async broadcastPresence(userId: string, online: boolean) {
    // Notify this user's contacts of the presence change.
    const contacts = await this.contacts.list(userId);
    await this.publisher.publish({
      targetUserIds: contacts.map((c) => c.contactUserId),
      event: WsEvents.PresenceUpdate,
      payload: { userId, online, at: new Date().toISOString() },
    });
  }

  private fromHeader(client: Socket): string | undefined {
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return undefined;
  }
}
