import { EnvironmentInjector, Injectable, runInInjectionContext } from '@angular/core';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { Firestore, collection, collectionData, doc, getDoc, onSnapshot, query, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfileData } from './user-profile.service';

export type UserRole = 'customer' | 'consultant';
export type TimelineType = 'aichat' | 'consultation' | 'proposal' | 'document' | 'email' | 'direct-message';
export interface UserRecord extends UserProfileData { id: string; role: UserRole; name: string; createdAt: string; financialPriorities?: string[]; lifeStage?: string; riskAppetite?: string; }
export interface TimelineRecord { id: string; customerId: string; consultantId?: string; type: TimelineType; channel: string; title: string; detail: string; policyOptions?: string[]; createdAt: string; readBy: string[]; }
export interface MeetingRecord { id: string; customerId: string; consultantId?: string; consultantName: string; consultantTitle: string; specialty: string; date: string; time: string; channel: string; status: 'confirmed' | 'change-pending'; updatedAt: string; }
export interface ApplicationSubmission { id: string; reference: string; planName: string; consultantName: string; submittedAt: string; status: 'sent'; }

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly currentUser$: Observable<UserRecord | null>;

  constructor(private firestore: Firestore, private auth: Auth, private injector: EnvironmentInjector) {
    this.currentUser$ = new Observable<UserRecord | null>(observer => {
      const unsubscribe = onAuthStateChanged(this.auth, async authUser => {
        if (!authUser) {
          observer.next(null);
          return;
        }
        try {
          const snapshot = await getDoc(doc(this.firestore, `users/${authUser.uid}`));
          const profile: UserProfileData & { role?: UserRole; createdAt?: string } = snapshot.exists()
            ? snapshot.data() as UserProfileData & { role?: UserRole; createdAt?: string }
            : { fullName: '' };
          observer.next({
            ...profile,
            id: authUser.uid,
            role: profile.role ?? 'customer',
            name: profile.fullName || profile.displayName || authUser.displayName || authUser.email?.split('@')[0] || 'User',
            email: profile.email || authUser.email || '',
            createdAt: profile.createdAt || authUser.metadata.creationTime || new Date().toISOString(),
            financialPriorities: profile.mainGoals ?? [],
          } as UserRecord);
        } catch (error) {
          observer.error(error);
        }
      }, error => observer.error(error));
      return unsubscribe;
    });
  }

  timelineFor(account: UserRecord): Observable<TimelineRecord[]> {
    return new Observable<TimelineRecord[]>(observer => {
      const cacheKey = `workspace-timeline:${account.role}:${account.id}`;
      const cached = this.readCache<TimelineRecord[]>(cacheKey);
      if (cached) observer.next(cached);
      const field = account.role === 'customer' ? 'customerId' : 'consultantId';
      const timelineQuery = query(collection(this.firestore, 'timeline'), where(field, '==', account.id));
      return onSnapshot(timelineQuery, snapshot => {
        const events = snapshot.docs.map(snapshotDoc => {
          const data = snapshotDoc.data() as Record<string, unknown>;
          return { id: snapshotDoc.id, customerId: String(data['customerId'] ?? ''), consultantId: data['consultantId'] ? String(data['consultantId']) : undefined, type: String(data['type'] ?? 'document') as TimelineType, channel: String(data['channel'] ?? 'system'), title: String(data['title'] ?? 'Timeline update'), detail: String(data['detail'] ?? ''), policyOptions: Array.isArray(data['policyOptions']) ? data['policyOptions'].map(String) : undefined, createdAt: this.toIsoString(data['createdAt']), readBy: Array.isArray(data['readBy']) ? data['readBy'].map(String) : [] };
        }).filter(event => event.type !== 'aichat')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        this.writeCache(cacheKey, events);
        observer.next(events);
      }, error => observer.error(error));
    });
  }

  meetingsFor(account: UserRecord): Observable<MeetingRecord[]> {
    const convert = (data: Record<string, unknown>, id: string): MeetingRecord => ({ id, customerId: String(data['customerId'] ?? id), consultantId: data['consultantId'] ? String(data['consultantId']) : undefined, consultantName: String(data['consultantName'] ?? 'Consultant'), consultantTitle: String(data['consultantTitle'] ?? 'Financial Consultant'), specialty: String(data['specialty'] ?? data['type'] ?? 'Insurance planning consultation'), date: String(data['date'] ?? data['bookingDate'] ?? ''), time: String(data['time'] ?? data['timeSlot'] ?? ''), channel: String(data['channel'] ?? data['type'] ?? 'Consultation'), status: (data['status'] ?? 'confirmed') as MeetingRecord['status'], updatedAt: this.toIsoString(data['updatedAt']) });
    return new Observable<MeetingRecord[]>(observer => {
      const cacheKey = `workspace-meetings:${account.role}:${account.id}`;
      const cached = this.readCache<MeetingRecord[]>(cacheKey);
      if (cached) observer.next(cached);
      if (account.role === 'customer') return onSnapshot(doc(this.firestore, `bookings/${account.id}`), snapshot => {
        const meetings = snapshot.exists() ? [convert(snapshot.data(), snapshot.id)] : [];
        this.writeCache(cacheKey, meetings);
        observer.next(meetings);
      }, error => observer.error(error));
      const bookingsQuery = query(collection(this.firestore, 'bookings'), where('consultantId', '==', account.id));
      return onSnapshot(bookingsQuery, snapshot => {
        const meetings = snapshot.docs.map(snapshotDoc => convert(snapshotDoc.data(), snapshotDoc.id));
        this.writeCache(cacheKey, meetings);
        observer.next(meetings);
      }, error => observer.error(error));
    });
  }
  customers(): Observable<UserRecord[]> {
    return runInInjectionContext(this.injector, () => collectionData(collection(this.firestore, 'users'), { idField: 'id' }) as Observable<Array<UserProfileData & { id: string; role?: UserRole; createdAt?: string }>>).pipe(map(users => users.filter(item => (item.role ?? 'customer') === 'customer').map(item => ({ ...item, role: 'customer', name: item.fullName || item.displayName || 'Customer', createdAt: item.createdAt || '', financialPriorities: item.mainGoals ?? [] } as UserRecord))));
  }

  private toIsoString(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    if (value instanceof Date) return value.toISOString();
    return new Date().toISOString();
  }
  chatCount(userId: string): Observable<number> {
    const cacheKey = `workspace-chat-count:${userId}`;
    return new Observable<number>(observer => {
      const cached = this.readCache<number>(cacheKey);
      if (cached !== null) observer.next(cached);
      const subscription = runInInjectionContext(this.injector, () => collectionData(collection(this.firestore, `users/${userId}/chatHistory`))).pipe(
        map(items => items.some(item => item['role'] === 'user' && (String(item['content'] ?? '').trim() || item['attachment'])) ? 1 : 0)
      ).subscribe({ next: count => { this.writeCache(cacheKey, count); observer.next(count); }, error: error => observer.error(error) });
      return () => subscription.unsubscribe();
    });
  }

  private readCache<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      return value === null ? null : JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private writeCache(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private browsing; live data still works.
    }
  }
  async submitPlanApplication(customer: UserRecord, planName: string, consultantId: string, consultantName: string): Promise<ApplicationSubmission> {
    const applicationRef = doc(collection(this.firestore, 'applications'));
    const timelineRef = doc(collection(this.firestore, 'timeline'));
    const submittedAt = new Date().toISOString();
    const reference = `APP-${applicationRef.id.slice(0, 8).toUpperCase()}`;
    const submission: ApplicationSubmission = { id: applicationRef.id, reference, planName, consultantName, submittedAt, status: 'sent' };
    const batch = writeBatch(this.firestore);
    batch.set(applicationRef, { ...submission, customerId: customer.id, customerName: customer.name, consultantId, updatedAt: submittedAt });
    batch.set(timelineRef, { customerId: customer.id, consultantId, type: 'proposal', channel: 'application', title: 'Plan application sent', detail: `${customer.name} submitted an application for ${planName} to ${consultantName}.`, policyOptions: [planName], applicationId: applicationRef.id, createdAt: submittedAt, readBy: [customer.id] });
    await batch.commit();
    return submission;
  }
  async markTimelineRead(userId: string, events: TimelineRecord[]): Promise<void> { await Promise.all(events.filter(event => !event.readBy?.includes(userId)).map(event => runInInjectionContext(this.injector, () => updateDoc(doc(this.firestore, `timeline/${event.id}`), { readBy: [...(event.readBy ?? []), userId] })))); }
  logout(): Promise<void> { return signOut(this.auth); }
}
