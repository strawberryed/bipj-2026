import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { BookingService, Booking } from '../services/booking';
import { Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { getCurrentUser } from '../../data/app-db';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';

const AVATAR_MAP: Record<string, { icon: string; bg: string; color: string }> = {
  'avatar-1': { icon: 'person', bg: '#ede9fe', color: '#7c3aed' },
  'avatar-2': { icon: 'happy', bg: '#fce7f3', color: '#db2777' },
  'avatar-3': { icon: 'planet', bg: '#dbeafe', color: '#2563eb' },
  'avatar-4': { icon: 'leaf', bg: '#d1fae5', color: '#059669' },
  'avatar-5': { icon: 'flame', bg: '#ffedd5', color: '#ea580c' },
  'avatar-6': { icon: 'diamond', bg: '#e0e7ff', color: '#4f46e5' },
  'avatar-7': { icon: 'paw', bg: '#fef3c7', color: '#d97706' },
  'avatar-8': { icon: 'rocket', bg: '#f3e8ff', color: '#9333ea' },
  'avatar-9': { icon: 'musical-notes', bg: '#cffafe', color: '#0891b2' },
};

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  private bookingService = inject(BookingService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private userProfileService = inject(UserProfileService);
  private toastCtrl = inject(ToastController);

  todayDate: Date = new Date();
  activeBooking$: Observable<Booking | null>;
  isDetailsModalOpen: boolean = false;
  currentUserName = '';
  userNotes: string = '';
  isCancelling: boolean = false;

  // Dynamic Profile Properties for Dashboard
  userProfile: UserProfileData | null = null;
  private profileSub!: Subscription;

  constructor() {
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

  async saveNotesChange() {
    try {
      await this.bookingService.updateBookingNotes(this.userNotes);
    } catch (error: any) {
      await this.showErrorToast(error.message || 'Failed to save your notes. Please try again.');
    }
  }

  goToProfile() {
    this.closeDetailsModal();
    this.router.navigate(['/edit-profile']);
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

  async handleCancellation() {
    this.isCancelling = true;
    try {
      await this.bookingService.clearBooking();
      // Only close the modal once the cancellation is confirmed to have
      // gone through — closing it optimistically could tell the user their
      // meeting was cancelled when the Firestore write actually failed
      // (e.g. while offline).
      this.isDetailsModalOpen = false;
    } catch (error: any) {
      await this.showErrorToast(error.message || 'Failed to cancel your booking. Please check your connection and try again.');
    } finally {
      this.isCancelling = false;
      this.cdr.detectChanges();
    }
  }

  getAvatarIcon(avatarId: string): string {
    return AVATAR_MAP[avatarId]?.icon ?? 'person';
  }

  getAvatarBg(avatarId: string): string {
    return AVATAR_MAP[avatarId]?.bg ?? '#ede9fe';
  }

  getAvatarColor(avatarId: string): string {
    return AVATAR_MAP[avatarId]?.color ?? '#7c3aed';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
}