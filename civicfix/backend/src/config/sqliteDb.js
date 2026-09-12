import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databasePath = process.env.SQLITE_DATABASE || path.resolve(process.cwd(), "data", "civicfix.sqlite");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  );
  CREATE TABLE IF NOT EXISTS subdocuments (
    collection TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (collection, parent_id, id)
  );
`);

class SqliteDocumentSnapshot {
  constructor(id, value) {
    this.id = id;
    this._value = value;
    this.exists = value !== undefined;
  }

  data() {
    return this._value ? { ...this._value } : undefined;
  }
}

class SqliteDocumentReference {
  constructor(collectionName, id) {
    this.collectionName = collectionName;
    this.id = id;
  }

  async get() {
    const row = database.prepare("SELECT data FROM documents WHERE collection = ? AND id = ?").get(this.collectionName, this.id);
    return new SqliteDocumentSnapshot(this.id, row ? JSON.parse(row.data) : undefined);
  }

  async set(value) {
    database.prepare("INSERT OR REPLACE INTO documents (collection, id, data) VALUES (?, ?, ?)")
      .run(this.collectionName, this.id, JSON.stringify(value));
  }

  async update(value) {
    const current = await this.get();
    if (!current.exists) throw new Error(`Document ${this.id} does not exist`);
    await this.set({ ...current.data(), ...value });
  }

  collection(name) {
    return new SqliteSubcollection(name, this.id);
  }
}

class SqliteSubcollection {
  constructor(collectionName, parentId) {
    this.collectionName = collectionName;
    this.parentId = parentId;
  }

  async add(value) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    database.prepare("INSERT INTO subdocuments (collection, parent_id, id, data) VALUES (?, ?, ?, ?)")
      .run(this.collectionName, this.parentId, id, JSON.stringify(value));
    return { id };
  }
}

class SqliteQuery {
  constructor(collectionName, filters = [], sort = null, max = null) {
    this.collectionName = collectionName;
    this.filters = filters;
    this.sort = sort;
    this.max = max;
  }

  where(field, operator, value) {
    return new SqliteQuery(this.collectionName, [...this.filters, { field, operator, value }], this.sort, this.max);
  }

  orderBy(field, direction = "asc") {
    return new SqliteQuery(this.collectionName, this.filters, { field, direction }, this.max);
  }

  limit(max) {
    return new SqliteQuery(this.collectionName, this.filters, this.sort, max);
  }

  async get() {
    const rows = database.prepare("SELECT id, data FROM documents WHERE collection = ?").all(this.collectionName);
    let values = rows.map((row) => ({ id: row.id, ...JSON.parse(row.data) }));
    values = values.filter((value) => this.filters.every(({ field, operator, value: expected }) => {
      if (operator === "==") return value[field] === expected;
      if (operator === "!=") return value[field] !== expected;
      return false;
    }));

    if (this.sort) {
      const direction = this.sort.direction === "desc" ? -1 : 1;
      values.sort((a, b) => ((a[this.sort.field] || 0) > (b[this.sort.field] || 0) ? 1 : -1) * direction);
    }

    if (this.max) values = values.slice(0, this.max);
    return { docs: values.map((value) => new SqliteDocumentSnapshot(value.id, value)) };
  }
}

class SqliteCollection {
  constructor(name) {
    this.name = name;
  }

  doc(id) {
    return new SqliteDocumentReference(this.name, id);
  }

  where(field, operator, value) {
    return new SqliteQuery(this.name, [{ field, operator, value }]);
  }

  orderBy(field, direction) {
    return new SqliteQuery(this.name, [], { field, direction });
  }

  async get() {
    return new SqliteQuery(this.name).get();
  }
}

export function createSqliteDb() {
  return {
    collection(name) {
      return new SqliteCollection(name);
    },
  };
}
