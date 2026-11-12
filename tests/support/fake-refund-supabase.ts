import { vi } from 'vitest';

/**
 * A minimal stand-in for the Supabase service-role client that understands exactly what the refund
 * repository does with `refund_requests` (insert + select + single, select by column, update,
 * ordered listing) and enforces the table's two unique constraints with Postgres error code 23505.
 * It also answers the `consume_rate_limit` RPC so the real limiter runs in production mode.
 */
type Row = Record<string, unknown>;

export interface FakeRefundDatabase {
  rows: Row[];
  /** Fails the next insert with a database error, as an outage would. */
  failNextInsert: boolean;
}

class Query implements PromiseLike<{ data: unknown; error: { code: string; message: string } | null }> {
  private filters: Array<(row: Row) => boolean> = [];
  private mutation: { kind: 'insert' | 'update'; values: Row } | null = null;
  private cardinality: 'many' | 'single' | 'maybeSingle' = 'many';
  private limitTo = Infinity;

  constructor(private readonly database: FakeRefundDatabase) {}

  insert(values: Row) {
    this.mutation = { kind: 'insert', values };
    return this;
  }
  update(values: Row) {
    this.mutation = { kind: 'update', values };
    return this;
  }
  select() {
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  order() {
    return this;
  }
  limit(count: number) {
    this.limitTo = count;
    return this;
  }
  single() {
    this.cardinality = 'single';
    return this;
  }
  maybeSingle() {
    this.cardinality = 'maybeSingle';
    return this;
  }

  private run() {
    const { rows } = this.database;
    if (this.mutation?.kind === 'insert') {
      if (this.database.failNextInsert) {
        this.database.failNextInsert = false;
        return { data: null, error: { code: '08006', message: 'connection failure: Key (contact_email)=(secret@example.test)' } };
      }
      const values = this.mutation.values;
      for (const column of ['reference', 'client_request_id']) {
        if (rows.some((row) => row[column] === values[column])) {
          return {
            data: null,
            error: { code: '23505', message: `duplicate key value violates unique constraint "refund_requests_${column}_key"` },
          };
        }
      }
      const row: Row = {
        id: crypto.randomUUID(),
        status: 'new',
        submitted_at: new Date().toISOString(),
        staff_notified_at: null,
        customer_acknowledged_at: null,
        ...values,
      };
      rows.unshift(row);
      return { data: row, error: null };
    }
    const matched = rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.mutation?.kind === 'update') {
      for (const row of matched) Object.assign(row, this.mutation.values);
      return { data: matched, error: null };
    }
    const limited = matched.slice(0, this.limitTo);
    if (this.cardinality === 'many') return { data: limited, error: null };
    return { data: limited[0] ?? null, error: null };
  }

  then<TResult1, TResult2 = never>(
    onfulfilled?: ((value: ReturnType<Query['run']>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

/** Mocks `@/lib/db/supabase-admin` with a fake database. Call before `loadApp`; `vi.doUnmock` afterwards. */
export function mockFakeRefundSupabase(): FakeRefundDatabase {
  const database: FakeRefundDatabase = { rows: [], failNextInsert: false };
  const client = {
    from: (table: string) => {
      if (table !== 'refund_requests') throw new Error(`Unexpected table ${table}`);
      return new Query(database);
    },
    rpc: async () => ({ data: [{ allowed: true, retry_after_seconds: 1 }], error: null }),
  };
  vi.doMock('@/lib/db/supabase-admin', () => ({
    getSupabaseAdmin: () => client,
    requireSupabaseAdmin: () => client,
  }));
  return database;
}
