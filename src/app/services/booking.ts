import { Injectable, EnvironmentInjector, runInInjectionContext, inject } from '@angular/core';
import { Firestore, collection, doc, docData, getDoc, getDocs, query, runTransaction, setDoc, updateDoc, where, writeBatch } from '@angular/fire/firestore';
import { Auth, user, User } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface Booking {
  meetingId?: string;
  consultantId?: string;
  consultantName: string;
  consultantTitle: string;
  bookingDate: string;
  timeSlot: string;
  type: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private injector = inject(EnvironmentInjector);

  private authUser$: Observable<User | null>;
  activeBooking$: Observable<Booking | null>;

  constructor() {
    this.authUser$ = runInInjectionContext(this.injector, () => user(this.auth));

    this.activeBooking$ = this.authUser$.pipe(
      switchMap(authUser => {
        if (!authUser) return of(null);
        return runInInjectionContext(this.injector, () => {
          const bookingDocRef = doc(this.firestore, `bookings/${authUser.uid}`);
          return docData(bookingDocRef) as Observable<Booking | null>;
        });
      })
    );
  }

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user found.');
    return uid;
  }

  async setBooking(booking: Booking): Promise<void> {
    const uid = this.requireUid();
    await runInInjectionContext(this.injector, async () => {
      const now = new Date().toISOString();
      const consultantId = await this.resolveConsultantUid(booking.consultantName, booking.consultantId);
      const isBlocked = await this.isDateBlocked(consultantId, booking.bookingDate);
      if (isBlocked) throw new Error('This consultant has blocked that date. Please choose another date.');

      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      const newMeetingId = doc(collection(this.firestore, 'meetingInstances')).id;
      const slotRef = doc(this.firestore, 'bookingSlots/' + this.slotId(consultantId, booking.bookingDate, booking.timeSlot));
      const timelineDocRef = doc(collection(this.firestore, 'timeline'));

      await runTransaction(this.firestore, async transaction => {
        const slotSnapshot = await transaction.get(slotRef);
        const currentBookingSnapshot = await transaction.get(bookingDocRef);
        const current = currentBookingSnapshot.exists() ? currentBookingSnapshot.data() : null;
        const meetingId = String(current?.['meetingId'] ?? newMeetingId);
        const isExistingCurrentBooking = !!current
          && String(current['consultantId'] ?? '') === consultantId
          && String(current['bookingDate'] ?? '') === booking.bookingDate
          && String(current['timeSlot'] ?? '').trim().toLowerCase() === booking.timeSlot.trim().toLowerCase();

        if (slotSnapshot.exists() && !isExistingCurrentBooking) {
          throw new Error('This consultant is already booked at that date and time. Please choose another slot.');
        }

        if (current) {
          const oldSlotId = this.slotId(
            String(current['consultantId'] ?? ''),
            String(current['bookingDate'] ?? ''),
            String(current['timeSlot'] ?? '')
          );
          if (oldSlotId !== slotRef.id) transaction.delete(doc(this.firestore, 'bookingSlots/' + oldSlotId));
        }

        transaction.set(slotRef, { consultantId, bookingDate: booking.bookingDate, timeSlot: booking.timeSlot, customerId: uid, updatedAt: now });
        transaction.set(bookingDocRef, { ...booking, meetingId, customerId: uid, consultantId, status: 'confirmed', updatedAt: now });
        transaction.set(timelineDocRef, {
          customerId: uid,
          consultantId,
          type: 'consultation',
          channel: 'meeting',
          title: 'Consultant meeting booked',
          detail: 'Meeting with ' + booking.consultantName + ' confirmed for ' + booking.bookingDate + ' at ' + booking.timeSlot + '.',
          meetingId,
          createdAt: now,
          readBy: []
        });
      });
    });
  }

  async assertSlotAvailable(consultantId: string, bookingDate: string, timeSlot: string, consultantName = ''): Promise<void> {
    await runInInjectionContext(this.injector, async () => {
      const resolvedConsultantId = await this.resolveConsultantUid(consultantName || consultantId.replace(/-/g, ' '), consultantId);
      const slotRef = doc(this.firestore, 'bookingSlots/' + this.slotId(resolvedConsultantId, bookingDate, timeSlot));

      if (await this.isDateBlocked(resolvedConsultantId, bookingDate)) {
        throw new Error('This consultant has blocked that date. Please choose another date before paying.');
      }
      if ((await getDoc(slotRef)).exists()) {
        throw new Error('This consultant is already booked at that date and time. Please choose another slot before paying.');
      }
    });
  }

  async updateBookingNotes(notes: string): Promise<void> {
    const uid = this.requireUid();
    await runInInjectionContext(this.injector, async () => {
      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      await updateDoc(bookingDocRef, { notes });
    });
  }

  async setConsultantAvailability(consultantId: string, date: string, blocked: boolean, reason = ''): Promise<void> {
    const uid = this.requireUid();
    await runInInjectionContext(this.injector, async () => {
      const targetId = await this.resolveConsultantUid('Consultant', consultantId);
      const availabilityRef = doc(this.firestore, `consultantAvailability/${targetId}__${date}`);
      const blockedEntry = {
        consultantId: targetId,
        date,
        blocked,
        reason: blocked ? (reason || 'Consultant unavailable') : '',
        updatedAt: new Date().toISOString(),
        updatedBy: uid,
      };
      await setDoc(availabilityRef, blockedEntry, { merge: true });
    });
  }

  async getBlockedDates(consultantId: string): Promise<string[]> {
    const targetId = await this.resolveConsultantUid('Consultant', consultantId);
    const snapshot = await getDocs(
      query(collection(this.firestore, 'consultantAvailability'), where('consultantId', '==', targetId), where('blocked', '==', true))
    );
    return snapshot.docs
      .map(docSnapshot => String(docSnapshot.data()['date'] ?? ''))
      .filter(Boolean)
      .sort();
  }

  async isDateBlocked(consultantId: string, date: string): Promise<boolean> {
    if (!consultantId || !date) return false;
    const targetId = await this.resolveConsultantUid('Consultant', consultantId);
    const snapshot = await getDoc(doc(this.firestore, `consultantAvailability/${targetId}__${date}`));
    return snapshot.exists() && snapshot.data()['blocked'] === true;
  }

  async findNextAvailableConsultant(date: string, timeSlot: string): Promise<{ id: string; name: string } | null> {
    const snapshot = await getDocs(collection(this.firestore, 'users'));
    const consultants = snapshot.docs.filter(docSnapshot => String(docSnapshot.data()['role'] ?? '').toLowerCase() === 'consultant');

    for (const consultant of consultants) {
      const consultantId = consultant.id;
      const blocked = await this.isDateBlocked(consultantId, date);
      const slotRef = doc(this.firestore, 'bookingSlots/' + this.slotId(consultantId, date, timeSlot));
      const slotTaken = (await getDoc(slotRef)).exists();

      if (!blocked && !slotTaken) {
        const name = String(consultant.data()['fullName'] ?? consultant.data()['displayName'] ?? 'Consultant');
        return { id: consultantId, name };
      }
    }

    return null;
  }

  private slotId(consultantId: string, bookingDate: string, timeSlot: string): string {
    return consultantId + '__' + bookingDate + '__' + encodeURIComponent(timeSlot.trim().toLowerCase());
  }

  private async resolveConsultantUid(consultantName: string, fallbackId?: string): Promise<string> {
    const snapshot = await getDocs(collection(this.firestore, 'users'));
    const consultantDocs = snapshot.docs.filter(userDoc => String(userDoc.data()['role'] ?? '').toLowerCase() === 'consultant');
    const normalizedName = consultantName.trim().toLowerCase();
    const normalizedNameKey = normalizedName.replace(/[^a-z0-9]/g, '');

    const match = consultantDocs.find(userDoc => {
      const data = userDoc.data();
      const storedName = String(data['fullName'] ?? data['displayName'] ?? '').trim().toLowerCase();
      const emailKey = String(data['email'] ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      return storedName === normalizedName || (!!emailKey && emailKey === normalizedNameKey);
    });

    if (match) return match.id;
    if (fallbackId && consultantDocs.some(userDoc => userDoc.id === fallbackId)) return fallbackId;
    if (consultantDocs.length === 1) return consultantDocs[0].id;
    throw new Error(`No registered consultant account was found for ${consultantName}.`);
  }

  async rescheduleBooking(bookingDate: string): Promise<void> {
    const uid = this.requireUid();
    await runInInjectionContext(this.injector, async () => {
      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      const snapshot = await getDoc(bookingDocRef);
      if (!snapshot.exists()) throw new Error('No active booking was found.');

      const booking = snapshot.data() as Partial<Booking>;
      const now = new Date().toISOString();
      const consultantId = String(snapshot.data()['consultantId'] ?? '');
      const timeSlot = String(booking.timeSlot ?? '');

      if (consultantId && await this.isDateBlocked(consultantId, bookingDate)) {
        throw new Error('This consultant is unavailable on the selected date. Please choose another date.');
      }

      const oldSlotRef = doc(this.firestore, 'bookingSlots/' + this.slotId(consultantId, String(booking.bookingDate ?? ''), timeSlot));
      const newSlotRef = doc(this.firestore, 'bookingSlots/' + this.slotId(consultantId, bookingDate, timeSlot));
      const timelineDocRef = doc(collection(this.firestore, 'timeline'));

      await runTransaction(this.firestore, async transaction => {
        const newSlotSnapshot = await transaction.get(newSlotRef);
        if (newSlotSnapshot.exists() && newSlotSnapshot.data()['customerId'] !== uid) {
          throw new Error('This consultant is already booked at that date and time. Please choose another date.');
        }
        if (oldSlotRef.id !== newSlotRef.id) transaction.delete(oldSlotRef);
        transaction.set(newSlotRef, { consultantId, bookingDate, timeSlot, customerId: uid, updatedAt: now });
        transaction.update(bookingDocRef, { bookingDate, status: 'confirmed', updatedAt: now });
        transaction.set(timelineDocRef, {
          customerId: uid,
          consultantId,
          type: 'consultation',
          channel: 'meeting',
          title: 'Consultant meeting rescheduled',
          detail: 'Meeting with ' + (booking.consultantName ?? 'your consultant') + ' rescheduled to ' + bookingDate + ' at ' + (booking.timeSlot ?? 'the scheduled time') + '.',
          createdAt: now,
          readBy: []
        });
      });
    });
  }

  async clearBooking(): Promise<void> {
    const uid = this.requireUid();
    await runInInjectionContext(this.injector, async () => {
      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      const snapshot = await getDoc(bookingDocRef);
      const booking = snapshot.data() as Partial<Booking> | undefined;
      const timelineDocRef = doc(collection(this.firestore, 'timeline'));
      const batch = writeBatch(this.firestore);

      if (booking?.bookingDate && booking.timeSlot) {
        const consultantId = String(snapshot.data()?.['consultantId'] ?? booking.consultantName?.toLowerCase().replace(/\s+/g, '-') ?? '');
        batch.delete(doc(this.firestore, 'bookingSlots/' + this.slotId(consultantId, booking.bookingDate, booking.timeSlot)));
      }

      batch.delete(bookingDocRef);
      batch.set(timelineDocRef, {
        customerId: uid,
        type: 'consultation',
        channel: 'meeting',
        title: 'Consultant meeting cancelled',
        detail: booking?.consultantName
          ? `Meeting with ${booking.consultantName} was cancelled.`
          : 'The upcoming consultant meeting was cancelled.',
        createdAt: new Date().toISOString(),
        readBy: [],
      });
      await batch.commit();
    });
  }
}
