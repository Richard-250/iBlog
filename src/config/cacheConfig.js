import NodeCache from "node-cache";

class CacheService {
  constructor(ttlSeconds = 60, checkPeriod = 120) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: checkPeriod,
      useClones: false // For better performance when storing complex object
    });
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value, ttl = undefined) {
    return this.cache.set(key, value, ttl);
  }

  del(key) {
    return this.cache.del(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  flush() {
    return this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }

  mget(keys) {
    return this.cache.mget(keys);
  }

  mset(keyValuePairs, ttl = undefined) {
    return this.cache.mset(keyValuePairs.map(({key, val}) => ({
      key,
      val,
      ttl: ttl || undefined
    })));
  }
}

// Export a factory function for creating cache instances
export default  {
  createCache: (ttl, checkPeriod) => new CacheService(ttl, checkPeriod),
  defaultCache: new CacheService()
};