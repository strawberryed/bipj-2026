import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BookingService } from '../services/booking';
import { ToastController } from '@ionic/angular';
import { EntitlementsService } from '../services/entitlement.service';
import { UserProfileService } from '../services/user-profile.service';
import { ConsultantMatchingService } from '../services/consultant-matching.service';
import { CONSULTANTS, ConsultantProfile } from '../consultants';

@Component({
  selector: 'app-book-meeting',
  templateUrl: './book-meeting.page.html',
  styleUrls: ['./book-meeting.page.scss'],
  standalone: false,
})
export class BookMeetingPage {
  private bookingService = inject(BookingService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private route = inject(ActivatedRoute);
  private entitlements = inject(EntitlementsService);
  private profileService = inject(UserProfileService);
  private matchingService = inject(ConsultantMatchingService);

  advisors: ConsultantProfile[] = CONSULTANTS;

  slots = [
    { time: '2pm', duration: '30min – Phone Call' },
    { time: '5pm', duration: '30min – Phone Call' },
    { time: '3.30pm', duration: '30min – Phone Call' },
    { time: '6.15pm', duration: '30min – Phone Call' }
  ];

  selectedAdvisor: ConsultantProfile | null = null;
  selectedSlot: any = null;
  selectedDate: string = '';
  recommendedAdvisorName = '';
  advisorLocked = false;
  minimumDate: string = '';
  userPhoneNumber: string = '';
  blockedDates: string[] = [];
  dateAvailabilityMessage = '';

  async ionViewWillEnter(): Promise<void> {
    // Ionic keeps tab-adjacent pages alive. Re-read the route every time this
    // view opens so a recommendation link cannot reuse an old advisor list.
    this.advisors = [...CONSULTANTS];
    this.selectedAdvisor = null;
    this.selectedSlot = null;
    this.selectedDate = '';
    this.recommendedAdvisorName = '';
    this.advisorLocked = false;
    this.minimumDate = this.toLocalDateInputValue(new Date());

    const params = this.route.snapshot.queryParams;
    const isTab3Recommendation = params['fromTab3'] === 'true';
    if (!isTab3Recommendation) {
      const entitlements = await firstValueFrom(this.entitlements.entitlements$);
      if (!entitlements.consultantUnlocked) {
        await this.router.navigate(['/upgrade']);
        return;
      }
    }

    const consultantId = String(params['consultantId'] ?? '').trim().toLowerCase();
    const inboundAdvisorName = String(params['advisorName'] ?? params['recommendedAdvisor'] ?? '').trim();
    const matched = consultantId
      ? CONSULTANTS.find(advisor => advisor.id.toLowerCase() === consultantId)
      : CONSULTANTS.find(advisor => advisor.name.toLowerCase() === inboundAdvisorName.toLowerCase());
    const profile = await firstValueFrom(this.profileService.userProfile$);
    this.userPhoneNumber = profile?.phoneNumber || '';
    const isReschedule = params['reschedule'] === 'true' || params['reschedule'] === true;

    // Any Tab 3 recommendation is a single-consultant booking. The explicit
    // flag remains supported, but fromTab3 also enforces the lock so a missing
    // or stale query parameter can never expose the full directory.
    this.advisorLocked = params['fromTab3'] === 'true' || params['lockAdvisor'] === 'true';

    if (this.advisorLocked) {
      this.advisors = matched ? [matched] : [];
      this.selectedAdvisor = matched ?? null;
      this.recommendedAdvisorName = matched?.name ?? inboundAdvisorName.toUpperCase();
      if (this.selectedAdvisor) {
        await this.refreshBlockedDates();
      }
      return;
    }

    // Fetch the profile once — used for the phone number display, and as a
    // fallback source for advisor matching below.
    if (inboundAdvisorName) {
      this.recommendedAdvisorName = inboundAdvisorName.toString().toUpperCase();
      this.selectedAdvisor = matched ?? this.advisors[0];
    } else {
      // No advisor specified (e.g. a direct visit to this page) — fall back
      // to computing the best match from the user's profile ourselves.
      const topMatch = this.matchingService.bestMatch(profile);
      this.recommendedAdvisorName = topMatch.matchScore > 0 ? topMatch.name : '';
      this.selectedAdvisor = topMatch;
    }
    if (this.selectedAdvisor) {
      await this.refreshBlockedDates();
    }

    // Reschedule flow: pre-fill the date/slot from the user's EXISTING
    // booking, so they see what they currently have instead of a blank
    // form that looks identical to booking fresh. This was previously
    // read (`reschedule` param) but never actually used anywhere.
    if (isReschedule) {
      const currentBooking = await firstValueFrom(this.bookingService.activeBooking$);
      if (currentBooking) {
        this.selectedDate = currentBooking.bookingDate;
        const matchingSlot = this.slots.find(s => s.time === currentBooking.timeSlot);
        if (matchingSlot) {
          this.selectedSlot = matchingSlot;
        }
      }
    }
  }

  async selectAdvisor(advisor: any) {
    this.selectedAdvisor = advisor;
    this.selectedSlot = null;
    this.selectedDate = '';
    this.dateAvailabilityMessage = '';
    if (this.selectedAdvisor) {
      await this.refreshBlockedDates();
    }
  }
  get selectedDateBlocked(): boolean {
    return !!this.selectedDate && this.blockedDates.includes(this.selectedDate);
  }

  selectSlot(slot: any) {
    if (this.selectedDateBlocked) {
      this.selectedSlot = null;
      this.dateAvailabilityMessage = `${this.selectedAdvisor?.name || 'This consultant'} is unavailable on that date. Please select another booking date.`;
      return;
    }
    this.selectedSlot = slot;
  }

  private async refreshBlockedDates(): Promise<void> {
    if (!this.selectedAdvisor) {
      this.blockedDates = [];
      this.dateAvailabilityMessage = '';
      return;
    }
    this.blockedDates = await this.bookingService.getBlockedDates(this.selectedAdvisor.id);
    if (this.selectedDate && this.blockedDates.includes(this.selectedDate)) {
      this.selectedDate = '';
      this.selectedSlot = null;
      this.dateAvailabilityMessage = `${this.selectedAdvisor.name} is unavailable on that date. Please choose another date.`;
    } else {
      this.dateAvailabilityMessage = '';
    }
  }

  onDateChange(event: Event) {
    const nextDate = (event.target as HTMLInputElement).value;
    this.selectedDate = nextDate;
    if (nextDate && this.blockedDates.includes(nextDate)) {
      this.selectedSlot = null;
      this.dateAvailabilityMessage = `${this.selectedAdvisor?.name || 'This consultant'} is unavailable on that date. Please select another booking date.`;
      return;
    }
    this.dateAvailabilityMessage = '';
  }

  private toLocalDateInputValue(date: Date): string {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 10);
  }

  async presentSuccessToast(advisorName: string) {
    const toast = await this.toastController.create({
      message: ` Meeting with ${advisorName} successfully scheduled!`,
      duration: 3000,
      position: 'top',
      color: 'success',
      cssClass: 'custom-booking-toast',
      buttons: [
        { text: 'Dismiss', role: 'cancel' }
      ]
    });
    await toast.present();
  }

  private async presentErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  }

  async confirmBooking() {
    if (!this.selectedAdvisor || !this.selectedSlot || !this.selectedDate) return;
    if (this.blockedDates.includes(this.selectedDate)) {
      this.dateAvailabilityMessage = `${this.selectedAdvisor.name} is unavailable on that date. Please choose another date.`;
      return;
    }

    if (this.advisorLocked) {
      await this.router.navigate(['/checkout-page'], {
        queryParams: {
          report: false,
          consultant: true,
          recommendedAdvisor: this.selectedAdvisor.name,
          consultantId: this.selectedAdvisor.id,
          consultantTitle: this.selectedAdvisor.title,
          bookingDate: this.selectedDate,
          timeSlot: this.selectedSlot.time,
          bookingType: this.selectedSlot.duration,
          fromTab3: 'true',
          lockAdvisor: 'true',
        },
      });
      return;
    }

    try {
      await this.bookingService.setBooking({
        consultantId: this.selectedAdvisor.id,
        consultantName: this.selectedAdvisor.name,
        consultantTitle: this.selectedAdvisor.title,
        bookingDate: this.selectedDate,
        timeSlot: this.selectedSlot.time,
        type: this.selectedSlot.duration
      });
      await this.presentSuccessToast(this.selectedAdvisor.name);
      await this.router.navigate(['/tabs/tab1']);
    } catch (error: any) {
      await this.presentErrorToast(error.message || 'Failed to save booking. Please try again.');
    }
  }
}
