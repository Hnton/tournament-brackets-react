// In-memory storage implementation for brackets-manager.js
// This replaces the need for brackets-json-db which requires Node.js fs module

export class MemoryStorage {
    private data: { [table: string]: any[] } = {};

    // Select all from table
    async select(table: string): Promise<any[] | null>;
    // Select by ID
    async select(table: string, id: number): Promise<any | null>;
    // Select with filter
    async select(table: string, filter: any): Promise<any[] | null>;
    async select(table: string, idOrFilter?: number | any): Promise<any | any[] | null> {
        if (!this.data[table]) {
            this.data[table] = [];
        }

        // If no parameter provided, return all
        if (idOrFilter === undefined) {
            return [...this.data[table]];
        }

        // If number provided, find by ID
        if (typeof idOrFilter === 'number') {
            const item = this.data[table].find(item => item.id === idOrFilter);
            return item || null;
        }

        // If object provided, use as filter
        if (typeof idOrFilter === 'object' && idOrFilter !== null) {
            return this.data[table].filter(item => {
                return Object.keys(idOrFilter).every(key => item[key] === idOrFilter[key]);
            });
        }

        return null;
    }

    // Select first match with filter
    async selectFirst(table: string, filter: any, assertUnique?: boolean): Promise<any | null> {
        const results = await this.select(table, filter) as any[];
        if (!results || results.length === 0) {
            return null;
        }

        if (assertUnique && results.length > 1) {
            throw new Error(`Expected unique result, but found ${results.length} matches`);
        }

        return results[0];
    }

    // Select last match with filter
    async selectLast(table: string, filter: any, assertUnique?: boolean): Promise<any | null> {
        const results = await this.select(table, filter) as any[];
        if (!results || results.length === 0) {
            return null;
        }

        if (assertUnique && results.length > 1) {
            throw new Error(`Expected unique result, but found ${results.length} matches`);
        }

        return results[results.length - 1];
    }

    // Insert single value (return ID) or multiple values (return boolean)
    async insert(table: string, value: any): Promise<number>;
    async insert(table: string, values: any[]): Promise<boolean>;
    async insert(table: string, valueOrValues: any | any[]): Promise<number | boolean> {
        if (!this.data[table]) {
            this.data[table] = [];
        }

        // Multiple values
        if (Array.isArray(valueOrValues)) {
            for (const item of valueOrValues) {
                // Generate ID if not provided
                if (!item.id) {
                    const maxId = this.data[table].reduce((max, curr) =>
                        Math.max(max, curr.id || 0), 0);
                    item.id = maxId + 1;
                }
                this.data[table].push({ ...item });
            }
            return true;
        }

        // Single value
        const item = { ...valueOrValues };
        if (!item.id) {
            const maxId = this.data[table].reduce((max, curr) =>
                Math.max(max, curr.id || 0), 0);
            item.id = maxId + 1;
        }

        this.data[table].push(item);
        return item.id;
    }

    // Update by ID
    async update(table: string, id: number, value: any): Promise<boolean>;
    // Update by filter
    async update(table: string, filter: any, value: any): Promise<boolean>;
    async update(table: string, idOrFilter: number | any, value: any): Promise<boolean> {
        if (!this.data[table]) {
            return false;
        }

        let updated = false;
        this.data[table] = this.data[table].map(item => {
            let matches = false;

            // If first param is number, match by ID
            if (typeof idOrFilter === 'number') {
                matches = item.id === idOrFilter;
            } else {
                // Otherwise use as filter
                matches = Object.keys(idOrFilter).every(key => item[key] === idOrFilter[key]);
            }

            if (matches) {
                updated = true;
                return { ...item, ...value };
            }
            return item;
        });

        return updated;
    }

    // Delete all from table
    async delete(table: string): Promise<boolean>;
    // Delete by filter
    async delete(table: string, filter: any): Promise<boolean>;
    async delete(table: string, filter?: any): Promise<boolean> {
        if (!this.data[table]) {
            return false;
        }

        const originalLength = this.data[table].length;

        if (!filter || Object.keys(filter).length === 0) {
            // Delete all
            this.data[table] = [];
        } else {
            // Delete matching items
            this.data[table] = this.data[table].filter(item => {
                return !Object.keys(filter).every(key => item[key] === filter[key]);
            });
        }

        return this.data[table].length < originalLength;
    }

    // Additional method to get all tables (for debugging)
    getTables(): string[] {
        return Object.keys(this.data);
    }

    // Method to get table data (for debugging)
    getTableData(table: string): any[] {
        return this.data[table] || [];
    }

    // Method to clear all data
    clear(): void {
        this.data = {};
    }
}