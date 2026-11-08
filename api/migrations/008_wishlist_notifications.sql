ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_chk;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_chk
  CHECK (type IN (
    'comment',
    'reply',
    'message',
    'wishlist',
    'listing_removed',
    'comment_removed',
    'suspended',
    'reinstated'
  ));
