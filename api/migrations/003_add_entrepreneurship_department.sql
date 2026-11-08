ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_department_chk;

ALTER TABLE users
  ADD CONSTRAINT users_department_chk
  CHECK (
    department IS NULL OR department IN (
      'CSD', 'ENGINEERING', 'NURSING', 'TECHNOLOGY', 'EDUCATION',
      'ENTREPRENEURSHIP'
    )
  );

ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_department_chk;

ALTER TABLE listings
  ADD CONSTRAINT listings_department_chk
  CHECK (department IN (
    'CSD', 'ENGINEERING', 'NURSING', 'TECHNOLOGY', 'EDUCATION',
    'ENTREPRENEURSHIP'
  ));
