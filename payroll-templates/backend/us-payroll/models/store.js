// ─────────────────────────────────────────────────────────────
//  store.js  -  Simple JSON-file-backed data store with cache
// ─────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');

class Store {
  /**
   * @param {string} filePath - absolute or relative path to a JSON file
   */
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this._cache   = [];
    this._load();
  }

  /* ── private ─────────────────────────────────────────────── */

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this._cache = JSON.parse(raw);
        if (!Array.isArray(this._cache)) this._cache = [];
      } else {
        this._cache = [];
        this._ensureDir();
        fs.writeFileSync(this.filePath, '[]', 'utf-8');
      }
    } catch (err) {
      console.error(`[Store] Failed to load ${this.filePath}:`, err.message);
      this._cache = [];
    }
  }

  _ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /* ── public API ──────────────────────────────────────────── */

  /** Return the full array (shallow copy). */
  getAll() {
    return [...this._cache];
  }

  /**
   * Find a single record by its ID value.
   * @param {string|number} id
   * @param {string}        [idField='id'] - name of the ID property
   * @returns {object|undefined}
   */
  getById(id, idField = 'id') {
    return this._cache.find((item) => item[idField] === id) || undefined;
  }

  /**
   * Append a new item and persist.
   * @param {object} item
   * @returns {object} the added item
   */
  add(item) {
    this._cache.push(item);
    this.save();
    return item;
  }

  /**
   * Merge `data` into the record that matches `id` and persist.
   * @param {string|number} id
   * @param {object}        data    - fields to merge
   * @param {string}        [idField='id']
   * @returns {object|null} updated record, or null if not found
   */
  update(id, data, idField = 'id') {
    const idx = this._cache.findIndex((item) => item[idField] === id);
    if (idx === -1) return null;
    this._cache[idx] = { ...this._cache[idx], ...data };
    this.save();
    return this._cache[idx];
  }

  /**
   * Remove a record by ID and persist.
   * @param {string|number} id
   * @param {string}        [idField='id']
   * @returns {boolean} true if a record was removed
   */
  remove(id, idField = 'id') {
    const before = this._cache.length;
    this._cache = this._cache.filter((item) => item[idField] !== id);
    if (this._cache.length < before) {
      this.save();
      return true;
    }
    return false;
  }

  /** Write the in-memory cache to disk. */
  save() {
    try {
      this._ensureDir();
      fs.writeFileSync(this.filePath, JSON.stringify(this._cache, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[Store] Failed to save ${this.filePath}:`, err.message);
    }
  }
}

module.exports = Store;
