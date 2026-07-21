import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Booking {
  consultantName: string;
  consultantTitle: string;
  timeSlot: string;
  type: string;
  notes?: string; // Added optional notes support
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private bookingSubject = new BehaviorSubject<Booking | null>(null);
  activeBooking$ = this.bookingSubject.asObservable();

  setBooking(booking: Booking) {
    this.bookingSubject.next(booking);
  }

  // New method: Allows updating only the notes property safely
  updateBookingNotes(notes: string) {
    const currentBooking = this.bookingSubject.value;
    if (currentBooking) {
      this.bookingSubject.next({
        ...currentBooking,
        notes: notes
      });
    }
  }

  clearBooking() {
    this.bookingSubject.next(null);
  }
}
