import type { SearchHistoryItem, SearchResult } from '../types';

const DB_NAME = 'NexusSearchCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'search_history';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('query', 'query', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSearchToOfflineCache(item: Omit<SearchHistoryItem, 'id' | 'timestamp'> & { id?: string }): Promise<SearchHistoryItem> {
  const fullItem: SearchHistoryItem = {
    id: item.id || `history_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: Date.now(),
    offlineCached: true,
    ...item,
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fullItem);
      req.onsuccess = () => resolve(fullItem);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed, falling back to localStorage:', err);
    // Fallback to localStorage
    const existing = getLocalStorageHistory();
    const filtered = existing.filter(h => h.id !== fullItem.id);
    const updated = [fullItem, ...filtered].slice(0, 50);
    localStorage.setItem('nexus_search_history_fallback', JSON.stringify(updated));
    return fullItem;
  }
}

export async function getOfflineSearchHistory(searchKeyword = '', categoryFilter = 'all'): Promise<SearchHistoryItem[]> {
  try {
    const db = await openDB();
    const items: SearchHistoryItem[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    // Sort by timestamp desc
    items.sort((a, b) => b.timestamp - a.timestamp);

    return filterHistoryItems(items, searchKeyword, categoryFilter);
  } catch (err) {
    console.warn('IndexedDB read failed, falling back to localStorage:', err);
    return filterHistoryItems(getLocalStorageHistory(), searchKeyword, categoryFilter);
  }
}

function filterHistoryItems(items: SearchHistoryItem[], searchKeyword: string, categoryFilter: string): SearchHistoryItem[] {
  return items.filter(item => {
    const matchesKeyword = !searchKeyword.trim() || 
      item.query.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (item.aiSummaryPreview && item.aiSummaryPreview.toLowerCase().includes(searchKeyword.toLowerCase())) ||
      item.results.some(r => r.title.toLowerCase().includes(searchKeyword.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesKeyword && matchesCategory;
  });
}

function getLocalStorageHistory(): SearchHistoryItem[] {
  try {
    const data = localStorage.getItem('nexus_search_history_fallback');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function toggleFavoriteSearch(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item: SearchHistoryItem = getReq.result;
        if (item) {
          item.isFavorite = !item.isFavorite;
          store.put(item);
          resolve(item.isFavorite);
        } else {
          resolve(false);
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    const history = getLocalStorageHistory();
    const item = history.find(h => h.id === id);
    if (item) {
      item.isFavorite = !item.isFavorite;
      localStorage.setItem('nexus_search_history_fallback', JSON.stringify(history));
      return item.isFavorite;
    }
    return false;
  }
}

export async function deleteSearchHistoryItem(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    const history = getLocalStorageHistory().filter(h => h.id !== id);
    localStorage.setItem('nexus_search_history_fallback', JSON.stringify(history));
  }
}

export async function clearAllSearchHistory(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    localStorage.removeItem('nexus_search_history_fallback');
  }
}

export async function exportHistoryJSON(): Promise<string> {
  const history = await getOfflineSearchHistory();
  return JSON.stringify(history, null, 2);
}

export async function importHistoryJSON(jsonString: string): Promise<number> {
  try {
    const parsed: SearchHistoryItem[] = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) throw new Error('Invalid JSON format');
    let count = 0;
    for (const item of parsed) {
      if (item.query) {
        await saveSearchToOfflineCache(item);
        count++;
      }
    }
    return count;
  } catch (e) {
    throw new Error('Failed to import search history: invalid format');
  }
}
