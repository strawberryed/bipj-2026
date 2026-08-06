import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BookingService, Booking } from '../services/booking';
import { Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { getCurrentUser } from '../../data/app-db';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  todayDate: Date = new Date();
  activeBooking$: Observable<Booking | null>;
  isDetailsModalOpen: boolean = false;
  currentUserName = '';
  userNotes: string = '';

  // Dynamic Profile Properties for Dashboard
  userProfile: UserProfileData | null = null;
  private profileSub!: Subscription;

  constructor(
    private bookingService: BookingService, 
    private router: Router,
    private cdr: ChangeDetectorRef,
    private userProfileService: UserProfileService
  ) { 
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

    // Subscribe to userProfile$ to sync currentUserName dynamically from sign-up/onboarding
    this.profileSub = this.userProfileService.userProfile$.subscribe((profile) => {
      this.userProfile = profile;
      if (profile?.fullName) {
        this.currentUserName = profile.fullName;
      }
      this.cdr.detectChanges();
    });
  }

  ionViewWillEnter() {
    this.refreshViewModel();
  }

  ngOnDestroy() {
    if (this.profileSub) {
      this.profileSub.unsubscribe();
    }
  }

  private refreshViewModel() {
    this.todayDate = new Date();
    // Prioritize sign-up/profile full name, then local app DB user, then default fallback
    this.currentUserName = this.userProfile?.fullName ?? getCurrentUser()?.name ?? 'User';
  }

  openDetailsModal() { 
    this.isDetailsModalOpen = true; 
    this.cdr.detectChanges();
  }
  
  closeDetailsModal() { 
    this.isDetailsModalOpen = false; 
    this.cdr.detectChanges();
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
    this.router.navigate(['/book-meeting'], { 
      queryParams: { 
        reschedule: true,
        advisorName: currentBooking.consultantName 
      } 
    });
  }

  handleCancellation() {
    this.bookingService.clearBooking();
    this.isDetailsModalOpen = false; 
  }
}
