module.exports = {
    default: class RedisStore {
        constructor() {
            this.hits = {};
        }
        async increment(key) {
            this.hits[key] = (this.hits[key] || 0) + 1;
            return { totalHits: this.hits[key], resetTime: new Date(Date.now() + 10000) };
        }
        async decrement(key) {
            if (this.hits[key]) this.hits[key]--;
        }
        async resetKey(key) {
            delete this.hits[key];
        }
    },
    RedisStore: class RedisStore {
        constructor() {
            this.hits = {};
        }
        async increment(key) {
            this.hits[key] = (this.hits[key] || 0) + 1;
            return { totalHits: this.hits[key], resetTime: new Date(Date.now() + 10000) };
        }
        async decrement(key) {
            if (this.hits[key]) this.hits[key]--;
        }
        async resetKey(key) {
            delete this.hits[key];
        }
    },
};
