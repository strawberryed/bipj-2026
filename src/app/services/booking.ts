import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Firestore, doc, docData, setDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
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
  private authUser$: Observable<User | null>;
  activeBooking$: Observable<Booking | null>;

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private injector: EnvironmentInjector
  ) {
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
      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      await setDoc(bookingDocRef, booking);
    });
  }

  async updateBookingNotes(notes: string): Promise<void> {
    const uid = this.requireUid();
    await runInInjectionContext(this.injector, async () => {
      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      await updateDoc(bookingDocRef, { notes });
    });
  }

  async clearBooking(): Promise<void> {
    const uid = this.requireUid();
    await runInInjectionContext(this.injector, async () => {
      const bookingDocRef = doc(this.firestore, `bookings/${uid}`);
      await deleteDoc(bookingDocRef);
    });
  }
}
