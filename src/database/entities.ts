import { Contact } from '../modules/contacts/contact.entity';
import { ConversationParticipant } from '../modules/conversations/conversation-participant.entity';
import { Conversation } from '../modules/conversations/conversation.entity';
import { Message } from '../modules/messages/message.entity';
import { OtpCode } from '../modules/auth/otp-code.entity';
import { RefreshToken } from '../modules/auth/refresh-token.entity';
import { User } from '../modules/users/user.entity';

// Single source of truth for the entity set, consumed by both the runtime
// TypeOrm module and the CLI data-source used for migrations.
export const entities = [
  User,
  RefreshToken,
  OtpCode,
  Contact,
  Conversation,
  ConversationParticipant,
  Message,
];
