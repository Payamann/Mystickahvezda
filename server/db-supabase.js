import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const projectUrl = process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('http')
    ? `https://${process.env.SUPABASE_URL}.supabase.co`
    : process.env.SUPABASE_URL;

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USE_MOCK_SUPABASE = process.env.MOCK_SUPABASE === 'true' || process.env.NODE_ENV === 'test';

function createMockSupabaseClient() {
    const users = new Map();
    const tables = new Map();
    const now = () => new Date().toISOString();

    const tableRows = (table) => {
        if (!tables.has(table)) tables.set(table, []);
        return tables.get(table);
    };

    function makeUser(email, metadata = {}) {
        const id = `test-user-${Buffer.from(email).toString('hex').slice(0, 16)}`;
        const user = {
            id,
            email,
            user_metadata: metadata,
            created_at: now()
        };
        users.set(id, user);
        return user;
    }

    class MockQuery {
        constructor(table) {
            this.table = table;
            this.operation = 'select';
            this.payload = null;
            this.selectOptions = {};
            this.filters = [];
            this.orders = [];
            this.singleResult = false;
            this.maybeSingleResult = false;
            this.limitCount = null;
            this.rangeBounds = null;
        }

        select(_columns = '*', options = {}) {
            this.selectOptions = options || {};
            return this;
        }

        insert(payload) {
            this.operation = 'insert';
            this.payload = payload;
            return this;
        }

        update(payload) {
            this.operation = 'update';
            this.payload = payload;
            return this;
        }

        upsert(payload) {
            this.operation = 'upsert';
            this.payload = payload;
            return this;
        }

        delete() {
            this.operation = 'delete';
            return this;
        }

        eq(column, value) {
            this.filters.push({ op: 'eq', column, value });
            return this;
        }

        neq(column, value) {
            this.filters.push({ op: 'neq', column, value });
            return this;
        }

        gt(column, value) {
            this.filters.push({ op: 'gt', column, value });
            return this;
        }

        gte(column, value) {
            this.filters.push({ op: 'gte', column, value });
            return this;
        }

        lt(column, value) {
            this.filters.push({ op: 'lt', column, value });
            return this;
        }

        lte(column, value) {
            this.filters.push({ op: 'lte', column, value });
            return this;
        }

        in(column, values) {
            this.filters.push({ op: 'in', column, value: values });
            return this;
        }

        order(column, options = {}) {
            this.orders.push({
                column,
                ascending: options.ascending !== false
            });
            return this;
        }

        range(from, to) {
            this.rangeBounds = [from, to];
            return this;
        }

        limit(count) {
            this.limitCount = count;
            return this;
        }

        single() {
            this.singleResult = true;
            return this;
        }

        maybeSingle() {
            this.maybeSingleResult = true;
            return this;
        }

        then(resolve, reject) {
            return Promise.resolve(this.result()).then(resolve, reject);
        }

        result() {
            if (this.operation === 'insert' || this.operation === 'upsert') {
                const inserted = this.rowsFromPayload();
                tableRows(this.table).push(...inserted);
                return this.formatData(inserted);
            }

            if (this.operation === 'update') {
                const matching = this.filteredRows();
                for (const row of matching) Object.assign(row, this.payload || {});
                return this.formatData(matching);
            }

            if (this.operation === 'delete') {
                const rows = tableRows(this.table);
                const matching = new Set(this.filteredRows());
                tables.set(this.table, rows.filter(row => !matching.has(row)));
                return { data: [], error: null, count: 0 };
            }

            return this.formatData(this.filteredRows());
        }

        rowsFromPayload() {
            const payloadRows = Array.isArray(this.payload) ? this.payload : [this.payload];
            return payloadRows.map(source => ({
                id: source?.id || `mock-${this.table}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                created_at: source?.created_at || now(),
                ...(source || {})
            }));
        }

        filteredRows() {
            let rows = [...tableRows(this.table)];

            for (const filter of this.filters) {
                rows = rows.filter(row => this.matchesFilter(row, filter));
            }

            for (const order of this.orders) {
                rows.sort((a, b) => this.compareRows(a, b, order));
            }

            if (this.rangeBounds) {
                const [from, to] = this.rangeBounds;
                rows = rows.slice(from, to + 1);
            }

            if (typeof this.limitCount === 'number') {
                rows = rows.slice(0, this.limitCount);
            }

            return rows;
        }

        compareRows(a, b, order) {
            const left = a?.[order.column];
            const right = b?.[order.column];
            const direction = order.ascending ? 1 : -1;

            if (left == null && right == null) return 0;
            if (left == null) return 1;
            if (right == null) return -1;
            if (left < right) return -1 * direction;
            if (left > right) return 1 * direction;

            return 0;
        }

        matchesFilter(row, filter) {
            const value = row?.[filter.column];

            if (filter.op === 'eq') return value === filter.value;
            if (filter.op === 'neq') return value !== filter.value;
            if (filter.op === 'in') return Array.isArray(filter.value) && filter.value.includes(value);
            if (filter.op === 'gt') return value > filter.value;
            if (filter.op === 'gte') return value >= filter.value;
            if (filter.op === 'lt') return value < filter.value;
            if (filter.op === 'lte') return value <= filter.value;

            return true;
        }

        formatData(rows) {
            if (this.selectOptions?.head) {
                return { data: null, error: null, count: rows.length };
            }

            if (this.singleResult || this.maybeSingleResult) {
                if (rows.length === 0) {
                    return this.maybeSingleResult
                        ? { data: null, error: null }
                        : { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
                }

                return { data: rows[0], error: null };
            }

            return { data: rows, error: null, count: rows.length };
        }
    }

    return {
        from(table) {
            return new MockQuery(table);
        },
        rpc() {
            return Promise.resolve({ data: null, error: null });
        },
        auth: {
            async signUp({ email, options = {} }) {
                const user = makeUser(email, options.data || {});
                return { data: { user, session: null }, error: null };
            },
            async signInWithPassword({ email, password }) {
                if (!email || !password || password === 'wrong-password') {
                    return { data: null, error: { message: 'Invalid login credentials', status: 400 } };
                }
                const user = [...users.values()].find(existing => existing.email === email) || makeUser(email);
                return { data: { user, session: { access_token: 'mock-access-token' } }, error: null };
            },
            async resetPasswordForEmail() {
                return { data: {}, error: null };
            },
            async updateUser(payload) {
                return { data: { user: { id: 'test-user', ...payload } }, error: null };
            },
            admin: {
                async getUserById(id) {
                    return { data: { user: users.get(id) || { id, email: 'test@example.com' } }, error: null };
                },
                async updateUserById(id, payload) {
                    return { data: { user: { id, ...payload } }, error: null };
                }
            }
        }
    };
}

if (!USE_MOCK_SUPABASE && (!projectUrl || !serviceKey)) {
    if (process.env.NODE_ENV === 'production') {
        console.warn('WARNING: Supabase credentials missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Database features will fail.');
    }
    console.warn('WARNING: Supabase credentials missing in .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
} else if (!USE_MOCK_SUPABASE) {
    console.log('Supabase initialized.');
}

export const supabase = USE_MOCK_SUPABASE
    ? createMockSupabaseClient()
    : createClient(projectUrl, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
