import { fetchData } from './helpers.js';

const TABLE_CONFIG = {
    classes: { idField: 'class_id', stateKey: 'classesData' },
    users: { idField: 'user_id', stateKey: 'usersData' },
    students: { idField: 'student_id', stateKey: 'studentsData' },
    teachers: { idField: 'teacher_id', stateKey: 'teachersData' },
    courses: { idField: 'course_id', stateKey: 'courseData' },
    grades: { idField: 'grade_id', stateKey: 'gradesData' }
};

class SchemaCache {
    constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
        this.cache = new Map();
        this.promises = new Map(); // In-flight request deduplication
        this.ttl = ttl;
    }

    isExpired(entry) {
        return Date.now() - entry.timestamp > this.ttl;
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry || this.isExpired(entry)) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    set(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    getOrFetch(key, fetchFn) {
        // Return cached if valid
        const cached = this.get(key);
        if (cached) return Promise.resolve(cached);

        // Return in-flight promise if exists
        if (this.promises.has(key)) {
            return this.promises.get(key);
        }

        // Create new promise
        const promise = fetchFn()
            .then(data => {
                this.set(key, data);
                this.promises.delete(key);
                return data;
            })
            .catch(error => {
                this.promises.delete(key);
                throw error;
            });

        this.promises.set(key, promise);
        return promise;
    }

    invalidate(key) {
        if (key) {
            this.cache.delete(key);
            this.promises.delete(key);
        } else {
            this.cache.clear();
            this.promises.clear();
        }
    }

    cleanup() {
        for (const [key, entry] of this.cache.entries()) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
            }
        }
    }
}

const schemaCache = new SchemaCache();

// Cleanup expired entries periodically
setInterval(() => schemaCache.cleanup(), 60000); // Every minute

const getTableNames = () => Object.keys(TABLE_CONFIG);

const fetchTableSchema = async (tableName) => {
    return schemaCache.getOrFetch(tableName, async () => {
        const authToken = localStorage.getItem('authToken');
        const data = await fetchData(tableName, authToken);
        if (!data?.length) {
            return [];
            // throw new Error(`No data found for table: ${tableName}`);
        }
        
        const config = TABLE_CONFIG[tableName];
        return {
            tableName,
            columns: Object.keys(data[0]),
            idField: config?.idField || 'id',
            stateKey: config?.stateKey,
            fetchedAt: Date.now()
        };
    });
};

export const getSchema = async (tableName) => {
    if (tableName) {
        return await fetchTableSchema(tableName);
    }
    
    const schemas = {};
    const results = await Promise.allSettled(
        getTableNames().map(async (name) => ({
            name,
            schema: await fetchTableSchema(name)
        }))
    );
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            schemas[result.value.name] = result.value.schema;
        } else {
            console.error(`Schema fetch failed:`, result.reason);
        }
    });
    
    return schemas;
};

export const getIdField = (tableName) => {
    return TABLE_CONFIG[tableName]?.idField || 'id';
};

export const getStateKey = (tableName) => {
    return TABLE_CONFIG[tableName]?.stateKey;
};

export const clearSchemaCache = (tableName = null) => {
    schemaCache.invalidate(tableName);
};

export const setCacheTTL = (ttl) => {
    schemaCache.ttl = ttl;
};
