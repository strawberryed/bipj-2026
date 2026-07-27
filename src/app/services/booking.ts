import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BookingDetails {
  consultantName: string;
  consultantTitle: string;
  bookingDate: string;
  timeSlot: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private currentBooking = new BehaviorSubject<BookingDetails | null>(null);
  currentBooking$ = this.currentBooking.asObservable();

  setBooking(booking: BookingDetails) {
    this.currentBooking.next(booking);
  }

  cancelBooking() {
    this.currentBooking.next(null);
  }
}
