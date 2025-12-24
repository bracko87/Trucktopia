/**
 * supabaseClient.ts
 * 
 * Mock client to handle the centralized financial system.
 * Uses localStorage to simulate Supabase tables.
 */

const getStorage = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setStorage = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

/**
 * Mock Supabase interface
 * Allows the code to use standard .from().select() syntax.
 */
export const supabase = {
  from: (table: string) => ({
    /**
     * select
     * @description Mimics Supabase select query
     */
    select: (columns: string = '*') => ({
      eq: (col: string, val: any) => ({
        order: (orderCol: string, { ascending }: { ascending: boolean }) => ({
          limit: (n: number) => {
            let data = getStorage(table);
            if (col && val) data = data.filter((item: any) => item[col] === val);
            data.sort((a: any, b: any) => {
              const res = a[orderCol] > b[orderCol] ? 1 : -1;
              return ascending ? res : -res;
            });
            return Promise.resolve({ data: data.slice(0, n), error: null });
          },
          single: () => {
             const data = getStorage(table);
             const item = data.find((i: any) => i[col] === val);
             return Promise.resolve({ data: item || null, error: item ? null : 'Not found' });
          }
        }),
        single: () => {
          const data = getStorage(table);
          const item = data.find((i: any) => i[col] === val);
          return Promise.resolve({ data: item || null, error: item ? null : 'Not found' });
        }
      }),
      single: () => {
        const data = getStorage(table);
        return Promise.resolve({ data: data[0] || null, error: null });
      }
    }),

    /**
     * insert
     * @description Mimics Supabase insert
     */
    insert: (payload: any) => {
      const data = getStorage(table);
      const newEntry = { ...payload, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      setStorage(table, [...data, newEntry]);
      return Promise.resolve({ data: newEntry, error: null });
    },

    /**
     * update
     * @description Mimics Supabase update
     */
    update: (payload: any) => ({
      eq: (col: string, val: any) => {
        const data = getStorage(table);
        const updated = data.map((item: any) => item[col] === val ? { ...item, ...payload } : item);
        setStorage(table, updated);
        return Promise.resolve({ error: null });
      }
    })
  })
};
