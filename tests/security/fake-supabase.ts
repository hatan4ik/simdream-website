/**
 * Minimal in-memory stand-in for the Supabase service-role client, so the
 * store's production code paths (NODE_ENV=production with Supabase configured)
 * can run in-process. Filters follow PostgREST/Postgres semantics, in particular
 * ILIKE patterns, where `%` (and PostgREST's alias `*`) match any run of
 * characters and `_` matches exactly one, with `\` as the escape character.
 */

export type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;
type Mutation = { kind: 'update'; values: Row } | { kind: 'insert' | 'upsert'; values: Row };

interface QueryResult {
  data: unknown;
  error: null;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
}

/** Translates a Postgres ILIKE pattern (with PostgREST's `*` alias) into an anchored, case-insensitive RegExp. */
export function ilikePattern(pattern: string): RegExp {
  let source = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '\\' && index + 1 < pattern.length) {
      index += 1;
      source += escapeRegExp(pattern[index]);
    } else if (char === '%' || char === '*') {
      source += '[\\s\\S]*';
    } else if (char === '_') {
      source += '[\\s\\S]';
    } else {
      source += escapeRegExp(char);
    }
  }
  return new RegExp(`^${source}$`, 'i');
}

class FakeQuery implements PromiseLike<QueryResult> {
  private readonly filters: Filter[] = [];
  private mutation: Mutation | undefined;
  private cardinality: 'many' | 'maybeSingle' | 'single' = 'many';

  constructor(private readonly rows: Row[]) {}

  select(): this {
    return this;
  }

  order(): this {
    return this;
  }

  update(values: Row): this {
    this.mutation = { kind: 'update', values };
    return this;
  }

  insert(values: Row): this {
    this.mutation = { kind: 'insert', values };
    return this;
  }

  upsert(values: Row): this {
    this.mutation = { kind: 'upsert', values };
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  is(column: string, value: null | boolean): this {
    this.filters.push((row) => (row[column] ?? null) === value);
    return this;
  }

  ilike(column: string, pattern: string): this {
    const matcher = ilikePattern(pattern);
    this.filters.push((row) => typeof row[column] === 'string' && matcher.test(row[column]));
    return this;
  }

  maybeSingle(): this {
    this.cardinality = 'maybeSingle';
    return this;
  }

  single(): this {
    this.cardinality = 'single';
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute(): QueryResult {
    let affected: Row[];
    if (this.mutation?.kind === 'insert' || this.mutation?.kind === 'upsert') {
      const { values } = this.mutation;
      const duplicate = this.mutation.kind === 'upsert' && this.rows.some((row) => row.id === values.id);
      affected = duplicate ? [] : [{ ...values }];
      this.rows.push(...affected);
    } else {
      affected = this.rows.filter((row) => this.filters.every((filter) => filter(row)));
      if (this.mutation?.kind === 'update') {
        const { values } = this.mutation;
        for (const row of affected) Object.assign(row, values);
      }
    }
    const copies = affected.map((row) => ({ ...row }));
    if (this.cardinality === 'many') return { data: copies, error: null };
    return { data: copies[0] ?? null, error: null };
  }
}

export interface FakeSupabase {
  tables: Record<string, Row[]>;
  from(table: string): FakeQuery;
}

export function createFakeSupabase(tables: Record<string, Row[]>): FakeSupabase {
  return {
    tables,
    from(table: string) {
      tables[table] ??= [];
      return new FakeQuery(tables[table]);
    },
  };
}

/** A paid guest booking row as Postgres stores it (snake_case columns, no member attached). */
export function paidGuestBookingRow(overrides: Row = {}): Row {
  return {
    id: crypto.randomUUID(),
    booking_reference: 'SD-737-PAIDGUESTROW2345',
    user_id: null,
    package_id: 'pkg-captain-60',
    package_title: "Captain's Command Flight",
    duration_minutes: 60,
    booking_date: '2026-11-04',
    start_time: '12:00:00',
    end_time: '13:00:00',
    pilot_name: 'Guest Pilot',
    pilot_email: 'guest@guests.test',
    pilot_phone: '+972501112233',
    experience_level: 'beginner',
    addons: [],
    subtotal_ils: 690,
    discount_ils: 0,
    total_ils: 690,
    voucher_code: null,
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'stripe',
    stripe_payment_intent: 'pi_test_guest_row',
    notes: 'gate code 1234',
    created_at: '2026-10-20T10:00:00.000Z',
    ...overrides,
  };
}
