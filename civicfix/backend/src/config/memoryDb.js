class MemoryDocumentSnapshot {
  constructor(id, value) {
    this.id = id;
    this._value = value;
    this.exists = value !== undefined;
  }

  data() {
    return this._value ? { ...this._value } : undefined;
  }
}

class MemoryDocumentReference {
  constructor(store, id) {
    this.store = store;
    this.id = id;
  }

  async get() {
    return new MemoryDocumentSnapshot(this.id, this.store.get(this.id));
  }

  async set(value) {
    this.store.set(this.id, { ...value });
  }

  async update(value) {
    const current = this.store.get(this.id);
    if (!current) throw new Error(`Document ${this.id} does not exist`);
    this.store.set(this.id, { ...current, ...value });
  }

  collection() {
    return {
      add: async () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }),
    };
  }
}

class MemoryQuery {
  constructor(store, filters = [], sort = null, max = null) {
    this.store = store;
    this.filters = filters;
    this.sort = sort;
    this.max = max;
  }

  where(field, operator, value) {
    return new MemoryQuery(this.store, [...this.filters, { field, operator, value }], this.sort, this.max);
  }

  orderBy(field, direction = "asc") {
    return new MemoryQuery(this.store, this.filters, { field, direction }, this.max);
  }

  limit(max) {
    return new MemoryQuery(this.store, this.filters, this.sort, max);
  }

  async get() {
    let values = [...this.store.values()];
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
    return { docs: values.map((value) => new MemoryDocumentSnapshot(value.id, value)) };
  }
}

class MemoryCollection {
  constructor(store) {
    this.store = store;
  }

  doc(id) {
    return new MemoryDocumentReference(this.store, id);
  }

  where(field, operator, value) {
    return new MemoryQuery(this.store, [{ field, operator, value }]);
  }

  orderBy(field, direction) {
    return new MemoryQuery(this.store, [], { field, direction });
  }

  async get() {
    return new MemoryQuery(this.store).get();
  }
}

export function createMemoryDb() {
  const collections = new Map();
  return {
    collection(name) {
      if (!collections.has(name)) collections.set(name, new Map());
      return new MemoryCollection(collections.get(name));
    },
  };
}
