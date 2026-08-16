import { Injectable, EnvironmentInjector, runInInjectionContext, inject } from '@angular/core';
import { Firestore, collection, doc, docData, getDoc, updateDoc, writeBatch } from '@angular/fire/firestore';
import { Auth, user, User } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface Booking {
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
      const consultantId = booking.consultantName.toLowerCase().replace(/\s+/g, '-');
      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      const timelineDocRef = doc(collection(this.firestore, 'timeline'));
      const batch = writeBatch(this.firestore);
      batch.set(bookingDocRef, {
        ...booking,
        customerId: uid,
        consultantId,
        status: 'confirmed',
        updatedAt: now,
      });
      batch.set(timelineDocRef, {
        customerId: uid,
        consultantId,
        type: 'consultation',
        channel: 'meeting',
        title: 'Consultant meeting booked',
        detail: `Meeting with ${booking.consultantName} confirmed for ${booking.bookingDate} at ${booking.timeSlot}.`,
        createdAt: now,
        readBy: [],
      });
      await batch.commit();
    });
  }

  async updateBookingNotes(notes: string): Promise<void> {
    const uid = this.requireUid();
    await runInInjectionContext(this.injector, async () => {
      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      await updateDoc(bookingDocRef, { notes });
    });
  }

  async rescheduleBooking(bookingDate: string): Promise<void> {
    const uid = this.requireUid();
    await runInInjectionContext(this.injector, async () => {
      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      const snapshot = await getDoc(bookingDocRef);
      if (!snapshot.exists()) throw new Error('No active booking was found.');
      const booking = snapshot.data() as Partial<Booking>;
      const now = new Date().toISOString();
      const timelineDocRef = doc(collection(this.firestore, 'timeline'));
      const batch = writeBatch(this.firestore);
      batch.update(bookingDocRef, { bookingDate, status: 'confirmed', updatedAt: now });
      batch.set(timelineDocRef, {
        customerId: uid,
        consultantId: String(snapshot.data()['consultantId'] ?? ''),
        type: 'consultation',
        channel: 'meeting',
        title: 'Consultant meeting rescheduled',
        detail: `Meeting with ${booking.consultantName ?? 'your consultant'} rescheduled to ${bookingDate} at ${booking.timeSlot ?? 'the scheduled time'}.`,
        createdAt: now,
        readBy: [],
      });
      await batch.commit();
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
