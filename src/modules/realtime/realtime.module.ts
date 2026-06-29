import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ContactsModule } from '../contacts/contacts.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { PresenceModule } from '../presence/presence.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePublisher } from './realtime.publisher';

@Module({
  imports: [
    JwtModule.register({}),
    PresenceModule,
    ConversationsModule,
    MessagesModule,
    ContactsModule,
  ],
  providers: [RealtimeGateway, RealtimePublisher],
  exports: [RealtimePublisher],
})
export class RealtimeModule {}
