ALTER TABLE users
  ADD COLUMN IF NOT EXISTS show_contact_details boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cancelled', 'completed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_requests_pending_user_key
  ON account_deletion_requests (user_id)
  WHERE status = 'pending';
