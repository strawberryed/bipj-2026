import { Component, OnInit } from '@angular/core';
import { BookingService, Booking } from '../services/booking';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { getCurrentUser } from '../../data/app-db';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  todayDate: Date = new Date();
  activeBooking$: Observable<Booking | null>;
  isDetailsModalOpen: boolean = false;
  currentUserName = 'Orange Tan';

  userNotes: string = '';

  constructor(private bookingService: BookingService, private router: Router) { 
    this.activeBooking$ = this.bookingService.activeBooking$.pipe(
      tap(booking => {
        if (booking) {
          this.userNotes = booking.notes || '';
        }
      })
    );
  }

  ngOnInit() {
    this.refreshViewModel();
  }

  ionViewWillEnter() {
    this.refreshViewModel();
  }

  private refreshViewModel() {
    this.todayDate = new Date();
    this.currentUserName = getCurrentUser()?.name ?? 'Orange Tan';
  }

  openDetailsModal() { 
    this.isDetailsModalOpen = true; 
  }
  closeDetailsModal() { 
    this.isDetailsModalOpen = false; 
  }

  saveNotesChange() {
    this.bookingService.updateBookingNotes(this.userNotes);
  }

  goToProfile() {
    this.closeDetailsModal();
    this.router.navigate(['/tabs/tab3']); 
  }

  rescheduleBooking(currentBooking: Booking) {
    this.closeDetailsModal();
    
    // We navigate to Tab4 and pass query params to pre-select the active advisor automatically!
    this.router.navigate(['/book-meeting'], { 
      queryParams: { 
        reschedule: true,
        advisorName: currentBooking.consultantName 
      } 
    });
  }

  handleCancellation() {
    this.bookingService.clearBooking();
    this.closeDetailsModal();
  }
}
