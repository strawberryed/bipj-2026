import { EnvironmentInjector, Injectable, runInInjectionContext, inject } from '@angular/core';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { Firestore, collection, collectionData, doc, getDoc, getDocs, onSnapshot, query, runTransaction, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfileData } from './user-profile.service';

export type UserRole = 'customer' | 'consultant';
export type TimelineType = 'aichat' | 'consultation' | 'proposal' | 'document' | 'email' | 'direct-message';
export interface UserRecord extends UserProfileData { id: string; role: UserRole; name: string; createdAt: string; financialPriorities?: string[]; lifeStage?: string; riskAppetite?: string; }
export interface TimelineRecord { id: string; customerId: string; consultantId?: string; type: TimelineType; channel: string; title: string; detail: string; policyOptions?: string[]; meetingId?: string; meetingDate?: string; questionId?: string; createdAt: string; readBy: string[]; }
export interface MeetingRecord { id: string; customerId: string; consultantId?: string; consultantName: string; consultantTitle: string; specialty: string; date: string; time: string; channel: string; status: 'confirmed' | 'change-pending' | 'completed' | 'cancelled'; updatedAt: string; }
export type ApplicationStatus = 'pending-review' | 'approved' | 'rejected';
export interface ApplicationSubmission { id: string; reference: string; planName: string; consultantName: string; submittedAt: string; status: ApplicationStatus; customerId?: string; customerName?: string; consultantId?: string; updatedAt?: string; }

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private injector = inject(EnvironmentInjector);

  readonly currentUser$: Observable<UserRecord | null>;

  constructor() {
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
            role: String(profile.role ?? '').toLowerCase() === 'consultant' ? 'consultant' : 'customer',
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
          return { id: snapshotDoc.id, customerId: String(data['customerId'] ?? ''), consultantId: data['consultantId'] ? String(data['consultantId']) : undefined, type: String(data['type'] ?? 'document') as TimelineType, channel: String(data['channel'] ?? 'system'), title: String(data['title'] ?? 'Timeline update'), detail: String(data['detail'] ?? ''), policyOptions: Array.isArray(data['policyOptions']) ? data['policyOptions'].map(String) : undefined, meetingId: data['meetingId'] ? String(data['meetingId']) : undefined, meetingDate: data['meetingDate'] ? String(data['meetingDate']) : undefined, questionId: data['questionId'] ? String(data['questionId']) : undefined, createdAt: this.toIsoString(data['createdAt']), readBy: Array.isArray(data['readBy']) ? data['readBy'].map(String) : [] };
        }).filter(event => event.type !== 'aichat')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        this.writeCache(cacheKey, events);
        observer.next(events);
      }, error => observer.error(error));
    });
  }

  meetingsFor(account: UserRecord): Observable<MeetingRecord[]> {
    const convert = (data: Record<string, unknown>, id: string): MeetingRecord => ({ id: String(data['meetingId'] ?? id), customerId: String(data['customerId'] ?? id), consultantId: data['consultantId'] ? String(data['consultantId']) : undefined, consultantName: String(data['consultantName'] ?? 'Consultant'), consultantTitle: String(data['consultantTitle'] ?? 'Financial Consultant'), specialty: String(data['specialty'] ?? data['type'] ?? 'Insurance planning consultation'), date: String(data['date'] ?? data['bookingDate'] ?? ''), time: String(data['time'] ?? data['timeSlot'] ?? ''), channel: String(data['channel'] ?? data['type'] ?? 'Consultation'), status: (data['status'] ?? 'confirmed') as MeetingRecord['status'], updatedAt: this.toIsoString(data['updatedAt']) });
    return new Observable<MeetingRecord[]>(observer => {
      const cacheKey = `workspace-meetings:${account.role}:${account.id}`;
      const cached = this.readCache<MeetingRecord[]>(cacheKey);
      if (cached) observer.next(cached);
      if (account.role === 'customer') return onSnapshot(doc(this.firestore, `bookings/${account.id}`), snapshot => {
        const meetings = snapshot.exists() ? [convert(snapshot.data(), snapshot.id)] : [];
        this.writeCache(cacheKey, meetings);
        observer.next(meetings);
      }, error => observer.error(error));
      let uidMeetings = new Map<string, MeetingRecord>();
      let nameMeetings = new Map<string, MeetingRecord>();
      const uidQuery = query(collection(this.firestore, 'bookings'), where('consultantId', '==', account.id));
      const nameQuery = query(collection(this.firestore, 'bookings'), where('consultantName', '==', account.name));
      const publish = () => {
        const meetings = [...new Map([...nameMeetings, ...uidMeetings]).values()].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
        this.writeCache(cacheKey, meetings);
        observer.next(meetings);
      };
      const unsubscribeUid = onSnapshot(uidQuery, snapshot => {
        uidMeetings = new Map(snapshot.docs.map(snapshotDoc => [snapshotDoc.id, convert(snapshotDoc.data(), snapshotDoc.id)]));
        publish();
      }, error => observer.error(error));
      const unsubscribeName = onSnapshot(nameQuery, snapshot => {
        nameMeetings = new Map(snapshot.docs.map(snapshotDoc => [snapshotDoc.id, convert(snapshotDoc.data(), snapshotDoc.id)]));
        publish();
      }, error => observer.error(error));
      return () => { unsubscribeUid(); unsubscribeName(); };
    });
  }
  customers(): Observable<UserRecord[]> {
    return runInInjectionContext(this.injector, () => collectionData(collection(this.firestore, 'users'), { idField: 'id' }) as Observable<Array<UserProfileData & { id: string; role?: UserRole; createdAt?: string }>>).pipe(map(users => users.filter(item => String(item.role ?? 'customer').toLowerCase() !== 'consultant').map(item => ({ ...item, role: 'customer', name: item.fullName || item.displayName || 'Customer', createdAt: item.createdAt || '', financialPriorities: item.mainGoals ?? [] } as UserRecord))));
  }

  applicationsFor(account: UserRecord): Observable<ApplicationSubmission[]> {
    const convertSnapshot = (snapshot: any): ApplicationSubmission[] => snapshot.docs.map((snapshotDoc: any) => {
        const data = snapshotDoc.data();
        return {
          id: snapshotDoc.id,
          reference: String(data['reference'] ?? ''),
          planName: String(data['planName'] ?? 'Plan application'),
          consultantName: String(data['consultantName'] ?? 'Consultant'),
          submittedAt: this.toIsoString(data['submittedAt']),
          status: this.applicationStatus(data['status']),
          customerId: data['customerId'] ? String(data['customerId']) : undefined,
          customerName: data['customerName'] ? String(data['customerName']) : undefined,
          consultantId: data['consultantId'] ? String(data['consultantId']) : undefined,
          updatedAt: data['updatedAt'] ? this.toIsoString(data['updatedAt']) : undefined,
        };
      });
    if (account.role === 'customer') {
      const customerQuery = query(collection(this.firestore, 'applications'), where('customerId', '==', account.id));
      return new Observable<ApplicationSubmission[]>(observer => onSnapshot(customerQuery, snapshot => observer.next(convertSnapshot(snapshot).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))), error => observer.error(error)));
    }
    return new Observable<ApplicationSubmission[]>(observer => {
      let uidApplications = new Map<string, ApplicationSubmission>();
      let nameApplications = new Map<string, ApplicationSubmission>();
      const publish = () => observer.next([...new Map([...nameApplications, ...uidApplications]).values()].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
      const uidQuery = query(collection(this.firestore, 'applications'), where('consultantId', '==', account.id));
      const nameQuery = query(collection(this.firestore, 'applications'), where('consultantName', '==', account.name));
      const unsubscribeUid = onSnapshot(uidQuery, snapshot => { uidApplications = new Map(convertSnapshot(snapshot).map(item => [item.id, item])); publish(); }, error => observer.error(error));
      const unsubscribeName = onSnapshot(nameQuery, snapshot => { nameApplications = new Map(convertSnapshot(snapshot).map(item => [item.id, item])); publish(); }, error => observer.error(error));
      return () => { unsubscribeUid(); unsubscribeName(); };
    });
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
  private applicationStatus(value: unknown): ApplicationStatus {
    const status = String(value ?? '').toLowerCase();
    if (status === 'approved' || status === 'rejected') return status;
    return 'pending-review';
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
    const resolvedConsultantId = await this.resolveConsultantUid(consultantName, consultantId);
    const applicationRef = doc(collection(this.firestore, 'applications'));
    const timelineRef = doc(collection(this.firestore, 'timeline'));
    const submittedAt = new Date().toISOString();
    const reference = `APP-${applicationRef.id.slice(0, 8).toUpperCase()}`;
    const submission: ApplicationSubmission = { id: applicationRef.id, reference, planName, consultantName, submittedAt, status: 'pending-review', consultantId: resolvedConsultantId };
    const batch = writeBatch(this.firestore);
    batch.set(applicationRef, { ...submission, customerId: customer.id, customerName: customer.name, consultantId: resolvedConsultantId, customerAccepted: true, acceptedByCustomerAt: submittedAt, updatedAt: submittedAt });
    batch.set(timelineRef, { customerId: customer.id, consultantId: resolvedConsultantId, type: 'proposal', channel: 'application', title: 'Plan application sent', detail: `${customer.name} submitted an application for ${planName} to ${consultantName}.`, policyOptions: [planName], applicationId: applicationRef.id, createdAt: submittedAt, readBy: [customer.id] });
    await batch.commit();
    return submission;
  }
  async submitMeetingQuestion(customer: UserRecord, meeting: MeetingRecord, question: string, planName = ''): Promise<void> {
    const consultantId = await this.resolveConsultantUid(meeting.consultantName, meeting.consultantId);

    const questionRef = doc(collection(this.firestore, 'meetingQuestions'));
    const timelineRef = doc(collection(this.firestore, 'timeline'));
    const createdAt = new Date().toISOString();
    const cleanQuestion = question.trim();
    if (!cleanQuestion) throw new Error('Please enter a question before sending it.');
    const batch = writeBatch(this.firestore);
    batch.set(questionRef, { customerId: customer.id, customerName: customer.name, consultantId, consultantName: meeting.consultantName, meetingId: meeting.id, meetingDate: meeting.date, meetingTime: meeting.time, planName, question: cleanQuestion, status: 'pending', createdAt });
    batch.set(timelineRef, { customerId: customer.id, consultantId, type: 'direct-message', channel: 'meeting-question', title: `Question for ${meeting.date || 'upcoming meeting'}`, detail: cleanQuestion, policyOptions: planName ? [planName] : [], meetingId: meeting.id, questionId: questionRef.id, createdAt, readBy: [customer.id] });
    await batch.commit();
  }
  async reviewApplication(application: ApplicationSubmission, consultant: UserRecord, status: 'approved' | 'rejected', signature = ''): Promise<void> {
    const assignedByUid = application.consultantId === consultant.id;
    const assignedByLegacyName = application.consultantName.trim().toLowerCase() === consultant.name.trim().toLowerCase();
    if (consultant.role !== 'consultant' || (!assignedByUid && !assignedByLegacyName)) {
      throw new Error('You can only review applications assigned to your consultant account.');
    }
    if (!application.customerId) throw new Error('This application has no customer attached.');
    const cleanSignature = signature.trim();
    if (status === 'approved' && cleanSignature.toLowerCase() !== consultant.name.trim().toLowerCase()) {
      throw new Error(`Type ${consultant.name} to sign this approval.`);
    }
    const updatedAt = new Date().toISOString();
    const applicationRef = doc(this.firestore, `applications/${application.id}`);
    await runTransaction(this.firestore, async transaction => {
      const currentApplication = await transaction.get(applicationRef);
      if (!currentApplication.exists()) throw new Error('This application is no longer available.');
      if (status === 'approved' && String(currentApplication.data()['status'] ?? '').toLowerCase() === 'approved') {
        throw new Error('This application has already been approved.');
      }
      transaction.update(applicationRef, {
        status, consultantId: consultant.id, reviewedBy: consultant.id, reviewedAt: updatedAt, updatedAt,
        ...(status === 'approved' ? { consultantSignature: cleanSignature, consultantSignedAt: updatedAt } : {})
      });
    });
    const batch = writeBatch(this.firestore);
    const applicationTimeline = await getDocs(query(collection(this.firestore, 'timeline'), where('applicationId', '==', application.id)));
    const originalTimeline = applicationTimeline.docs.find(item => item.data()['channel'] === 'application') ?? applicationTimeline.docs[0];
    if (originalTimeline) {
      const existingReadBy = Array.isArray(originalTimeline.data()['readBy']) ? originalTimeline.data()['readBy'].map(String) : [];
      batch.update(originalTimeline.ref, {
        consultantId: consultant.id,
        channel: 'application',
        title: status === 'approved' ? 'Plan application approved' : 'Plan application needs attention',
        detail: `${consultant.name} ${status === 'approved' ? 'signed and approved' : 'requested changes to'} your application for ${application.planName}.`,
        policyOptions: [application.planName],
        applicationId: application.id,
        createdAt: updatedAt,
        readBy: [...new Set([...existingReadBy, consultant.id])]
      });
      applicationTimeline.docs
        .filter(item => item.id !== originalTimeline.id && item.data()['channel'] === 'application-review')
        .forEach(item => batch.delete(item.ref));
    } else {
      batch.set(doc(collection(this.firestore, 'timeline')), {
        customerId: application.customerId,
        consultantId: consultant.id,
        type: 'proposal',
        channel: 'application',
        title: status === 'approved' ? 'Plan application approved' : 'Plan application needs attention',
        detail: `${consultant.name} ${status === 'approved' ? 'signed and approved' : 'requested changes to'} your application for ${application.planName}.`,
        policyOptions: [application.planName],
        applicationId: application.id,
        createdAt: updatedAt,
        readBy: [consultant.id]
      });
    }
    await batch.commit();
  }
  async compactApplicationTimeline(application: ApplicationSubmission): Promise<void> {
    if (!application.id || !application.customerId) return;
    const timelineSnapshot = await getDocs(query(collection(this.firestore, 'timeline'), where('applicationId', '==', application.id)));
    if (timelineSnapshot.empty) return;
    const originalTimeline = timelineSnapshot.docs.find(item => item.data()['channel'] === 'application') ?? timelineSnapshot.docs[0];
    const batch = writeBatch(this.firestore);
    const readBy = Array.isArray(originalTimeline.data()['readBy']) ? originalTimeline.data()['readBy'].map(String) : [];
    batch.update(originalTimeline.ref, {
      channel: 'application',
      title: application.status === 'approved' ? 'Plan application approved' : application.status === 'rejected' ? 'Plan application needs attention' : 'Plan application sent',
      detail: application.status === 'approved'
        ? `${application.consultantName} signed and approved your application for ${application.planName}.`
        : application.status === 'rejected'
          ? `${application.consultantName} requested changes to your application for ${application.planName}.`
          : `${application.customerName || 'The customer'} submitted an application for ${application.planName} to ${application.consultantName}.`,
      policyOptions: [application.planName],
      createdAt: application.updatedAt || application.submittedAt,
      readBy
    });
    timelineSnapshot.docs
      .filter(item => item.id !== originalTimeline.id && item.data()['channel'] === 'application-review')
      .forEach(item => batch.delete(item.ref));
    await batch.commit();
  }
  private async resolveConsultantUid(consultantName: string, fallbackId?: string): Promise<string> {
    const allUsers = await getDocs(collection(this.firestore, 'users'));
    const consultantUsers = allUsers.docs.filter(userDoc => String(userDoc.data()['role'] ?? '').toLowerCase() === 'consultant');
    const normalizedName = consultantName.trim().toLowerCase();
    const normalizedNameKey = normalizedName.replace(/[^a-z0-9]/g, '');
    const consultantAccount = consultantUsers.find(userDoc => {
      const data = userDoc.data();
      const storedName = String(data['fullName'] ?? data['displayName'] ?? '').trim().toLowerCase();
      const emailKey = String(data['email'] ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      return storedName === normalizedName || (!!emailKey && emailKey === normalizedNameKey);
    });
    if (consultantAccount) return consultantAccount.id;
    if (fallbackId && consultantUsers.some(userDoc => userDoc.id === fallbackId)) return fallbackId;
    if (consultantUsers.length === 1) return consultantUsers[0].id;
    throw new Error(`No registered consultant account was found for ${consultantName}.`);
  }
  async markTimelineRead(userId: string, events: TimelineRecord[]): Promise<void> { await Promise.all(events.filter(event => !event.readBy?.includes(userId)).map(event => runInInjectionContext(this.injector, () => updateDoc(doc(this.firestore, `timeline/${event.id}`), { readBy: [...(event.readBy ?? []), userId] })))); }
  logout(): Promise<void> { return signOut(this.auth); }
}
