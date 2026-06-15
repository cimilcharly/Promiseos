import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, orderBy, Firestore } from 'firebase/firestore';
import { Commitment, Meeting, NotificationLog } from './types';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Helper to initialize Firebase from a config string (JSON)
export function initFirebase(configStr: string): boolean {
  try {
    if (!configStr || !configStr.trim()) return false;
    let config: any = null;

    try {
      config = JSON.parse(configStr);
    } catch (e) {
      console.warn('⚠️ Firebase config string is not valid JSON');
      return false;
    }

    if (!config || typeof config !== 'object') return false;

    // Check if it has the required client configuration properties
    const hasClientKeys = config.apiKey && config.projectId;

    if (hasClientKeys) {
      if (getApps().length === 0) {
        app = initializeApp(config);
      } else {
        app = getApp();
      }
      db = getFirestore(app);
      console.log('🔥 Firebase initialized successfully');
      return true;
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
  }
  return false;
}

export function isFirebaseReady(): boolean {
  return db !== null;
}

// ── Commitments API ──
export async function getCommitmentsDb(): Promise<Commitment[]> {
  if (db) {
    try {
      const q = query(collection(db, 'commitments'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items: Commitment[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Commitment);
      });
      return items;
    } catch (error) {
      console.error('Error fetching commitments from Firebase:', error);
    }
  }
  // Fallback to localStorage
  const saved = localStorage.getItem('promiseos_commitments');
  return saved ? JSON.parse(saved) : [];
}

export async function saveCommitmentDb(c: Commitment): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, 'commitments', c.id), c);
      return;
    } catch (error) {
      console.error('Error writing commitment to Firebase:', error);
    }
  }
  // Fallback to localStorage
  const saved = localStorage.getItem('promiseos_commitments');
  const current: Commitment[] = saved ? JSON.parse(saved) : [];
  localStorage.setItem('promiseos_commitments', JSON.stringify([c, ...current]));
}

export async function updateCommitmentDb(id: string, updates: Partial<Commitment>): Promise<void> {
  if (db) {
    try {
      await updateDoc(doc(db, 'commitments', id), updates);
      return;
    } catch (error) {
      console.error('Error updating commitment in Firebase:', error);
    }
  }
  // Fallback to localStorage
  const saved = localStorage.getItem('promiseos_commitments');
  if (saved) {
    const current: Commitment[] = JSON.parse(saved);
    const updated = current.map((c) => (c.id === id ? { ...c, ...updates } : c));
    localStorage.setItem('promiseos_commitments', JSON.stringify(updated));
  }
}

export async function deleteCommitmentDb(id: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'commitments', id));
      return;
    } catch (error) {
      console.error('Error deleting commitment in Firebase:', error);
    }
  }
  // Fallback to localStorage
  const saved = localStorage.getItem('promiseos_commitments');
  if (saved) {
    const current: Commitment[] = JSON.parse(saved);
    const updated = current.filter((c) => c.id !== id);
    localStorage.setItem('promiseos_commitments', JSON.stringify(updated));
  }
}

// ── Meetings API ──
export async function getMeetingsDb(): Promise<Meeting[]> {
  if (db) {
    try {
      const q = query(collection(db, 'meetings'), orderBy('uploadedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items: Meeting[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Meeting);
      });
      return items;
    } catch (error) {
      console.error('Error fetching meetings from Firebase:', error);
    }
  }
  // Fallback to localStorage
  const saved = localStorage.getItem('promiseos_meetings');
  return saved ? JSON.parse(saved) : [];
}

export async function saveMeetingDb(m: Meeting): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, 'meetings', m.id), m);
      return;
    } catch (error) {
      console.error('Error writing meeting to Firebase:', error);
    }
  }
  // Fallback to localStorage
  const saved = localStorage.getItem('promiseos_meetings');
  const current: Meeting[] = saved ? JSON.parse(saved) : [];
  localStorage.setItem('promiseos_meetings', JSON.stringify([m, ...current]));
}

// ── Notifications API ──
export async function getNotificationsDb(): Promise<NotificationLog[]> {
  if (db) {
    try {
      const q = query(collection(db, 'notifications'), orderBy('sentAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const items: NotificationLog[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as NotificationLog);
      });
      return items;
    } catch (error) {
      console.error('Error fetching notifications from Firebase:', error);
    }
  }
  // Fallback to localStorage
  const saved = localStorage.getItem('promiseos_notifications');
  return saved ? JSON.parse(saved) : [];
}

export async function saveNotificationDb(n: NotificationLog): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, 'notifications', n.id), n);
      return;
    } catch (error) {
      console.error('Error writing notification to Firebase:', error);
    }
  }
  // Fallback to localStorage
  const saved = localStorage.getItem('promiseos_notifications');
  const current: NotificationLog[] = saved ? JSON.parse(saved) : [];
  localStorage.setItem('promiseos_notifications', JSON.stringify([n, ...current]));
}
