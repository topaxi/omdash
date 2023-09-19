export class IndexedDBStorage {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  protected async init(): Promise<void> {
    if (!this.db) {
      const openRequest = indexedDB.open(this.dbName, 1);

      openRequest.onupgradeneeded = (event) => {
        const db = (event.target as any).result as IDBDatabase;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        openRequest.onsuccess = () =>
          resolve(openRequest.result as IDBDatabase);
        openRequest.onerror = () => reject(openRequest.error);
      });
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    await this.init();
    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    store.put(value, key);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getItem(key: string): Promise<any> {
    await this.init();
    const transaction = this.db!.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    const request = store.get(key);
    return await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(key: string): Promise<void> {
    await this.init();
    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    store.delete(key);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clear(): Promise<void> {
    await this.init();
    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    store.clear();
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
