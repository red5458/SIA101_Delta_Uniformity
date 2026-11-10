-- ---------------------------------------------------------------------------
-- Image and video attachments for private chat messages
-- ---------------------------------------------------------------------------
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_body_chk;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_body_chk
  CHECK (char_length(btrim(body)) <= 2000);

CREATE TABLE IF NOT EXISTS chat_attachments (
  attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  uploader_id uuid NOT NULL,
  resource_type text NOT NULL,
  url text NOT NULL,
  asset_key text NOT NULL,
  content_type text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_attachments_message_fkey
    FOREIGN KEY (message_id) REFERENCES chat_messages(message_id) ON DELETE CASCADE,
  CONSTRAINT chat_attachments_uploader_fkey
    FOREIGN KEY (uploader_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT chat_attachments_resource_type_chk
    CHECK (resource_type IN ('image', 'video')),
  CONSTRAINT chat_attachments_file_size_chk
    CHECK (file_size BETWEEN 1 AND 26214400)
);
CREATE INDEX IF NOT EXISTS chat_attachments_message_idx
  ON chat_attachments (message_id, created_at);
