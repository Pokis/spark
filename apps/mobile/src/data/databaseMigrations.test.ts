import {
  CURRENT_DATABASE_SCHEMA_VERSION,
  DATABASE_MIGRATION_VERSIONS
} from './database';

describe('database migration coverage', () => {
  it('keeps a contiguous migration for every released local schema', () => {
    expect(DATABASE_MIGRATION_VERSIONS).toEqual(
      Array.from({ length: CURRENT_DATABASE_SCHEMA_VERSION }, (_, index) => index + 1)
    );
  });
});
