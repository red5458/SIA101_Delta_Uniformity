-- ---------------------------------------------------------------------------
-- Private buyer/seller conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT chat_conversations_listing_fkey
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id) ON DELETE CASCADE,
  CONSTRAINT chat_conversations_buyer_fkey
    FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT chat_conversations_seller_fkey
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT chat_conversations_participants_chk CHECK (buyer_id <> seller_id),
  CONSTRAINT chat_conversations_listing_buyer_key UNIQUE (listing_id, buyer_id)
);
CREATE INDEX IF NOT EXISTS chat_conversations_buyer_idx
  ON chat_conversations (buyer_id, last_message_at DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_conversations_seller_idx
  ON chat_conversations (seller_id, last_message_at DESC NULLS LAST, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT chat_messages_conversation_fkey
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(conversation_id) ON DELETE CASCADE,
  CONSTRAINT chat_messages_sender_fkey
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT chat_messages_body_chk CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000)
);
CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx
  ON chat_messages (conversation_id, created_at DESC, message_id DESC);
CREATE INDEX IF NOT EXISTS chat_messages_unread_idx
  ON chat_messages (conversation_id, sender_id)
  WHERE read_at IS NULL;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_chk;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_chk
  CHECK (type IN (
    'comment',
    'reply',
    'message',
    'listing_removed',
    'comment_removed',
    'suspended',
    'reinstated'
  ));
