import { Component, OnInit } from '@angular/core';
import { BookingService, BookingDetails } from '../services/booking';
import { Observable } from 'rxjs';
import { getCurrentUser } from '../../data/app-db';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  todayDate: Date = new Date();
  activeBooking$: Observable<BookingDetails | null>;
  isDetailsModalOpen: boolean = false;
  currentUserName = 'Orange Tan';

  constructor(private bookingService: BookingService) { 
    this.activeBooking$ = this.bookingService.currentBooking$;
  }

  ngOnInit() {
    this.refreshViewModel();
  }

  ionViewWillEnter() {
    this.refreshViewModel();
  }

  openDetailsModal() { this.isDetailsModalOpen = true; }
  closeDetailsModal() { this.isDetailsModalOpen = false; }

  handleCancellation() {
    if (confirm('Are you sure you want to cancel this booking? (No penalties apply)')) {
      this.bookingService.cancelBooking();
      this.closeDetailsModal();
      alert('Booking cancelled successfully without penalties.');
    }
  }

  private refreshViewModel() {
    this.todayDate = new Date();
    this.currentUserName = getCurrentUser()?.name ?? 'Orange Tan';
  }

}
