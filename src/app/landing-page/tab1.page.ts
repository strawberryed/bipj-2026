import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { BookingService, Booking } from '../services/booking';
import { Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { getCurrentUser } from '../../data/app-db';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';

@Component({
  selector: 'app-landing-page',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  todayDate: Date = new Date();
  activeBooking$: Observable<Booking | null>;
  isDetailsModalOpen: boolean = false;
  currentUserName = 'Orange Tan';

  userNotes: string = '';

  // Dynamic Profile Properties
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

    // Subscribe to live profile changes
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
    // Unsubscribe to avoid memory leaks
    if (this.profileSub) {
      this.profileSub.unsubscribe();
    }
  }

  private refreshViewModel() {
    this.todayDate = new Date();
    // Prefer user profile full name if set, fallback to getCurrentUser() or default
    this.currentUserName = this.userProfile?.fullName ?? getCurrentUser()?.name ?? 'Orange Tan';
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
    this.isDetailsModalOpen = false; // Forces modal close
  }

  // Helper method for dynamic consultant recommendations based on user's main goal
  getRecommendedConsultants() {
  if (!this.userProfile?.mainGoals) {
    return [
      { name: 'Alex Ang', specialty: 'General Insurance Consultant', rating: '4.9/5' },
      { name: 'Sarah Tan', specialty: 'Wealth & Protection Specialist', rating: '4.8/5' }
    ];
  }

  const goal = this.userProfile.mainGoals; // goal is string[] or string

  // If goal is an array (or can be an array):
  if (Array.isArray(goal)) {
    if (goal.includes('Retirement') || goal.includes('Savings')) {
      return [
        { name: 'Sarah Tan', specialty: 'Retirement & Wealth Planning', rating: '4.9/5' },
        { name: 'David Lim', specialty: 'Investment & Estate Planning', rating: '4.8/5' }
      ];
    } else if (goal.includes('Health Protection') || goal.includes('Family Protection')) {
      return [
        { name: 'Rachel Wong', specialty: 'Critical Illness & Medical Coverage', rating: '4.9/5' },
        { name: 'Marcus Chen', specialty: 'Family & Term Life Protection', rating: '4.7/5' }
      ];
    }
  }

  return [
    { name: 'Alex Ang', specialty: 'Comprehensive Financial Planning', rating: '4.9/5' }
  ];
}
}
