import { Component, OnInit } from '@angular/core';
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
export class BookMeetingPage implements OnInit {
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

  constructor(
    private bookingService: BookingService,
    private router: Router,
    private toastController: ToastController,
    private route: ActivatedRoute,
    private entitlements: EntitlementsService,
    private profileService: UserProfileService,
    private matchingService: ConsultantMatchingService
  ) { }

  ngOnInit(): void { }

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

    // Any Tab 3 recommendation is a single-consultant booking. The explicit
    // flag remains supported, but fromTab3 also enforces the lock so a missing
    // or stale query parameter can never expose the full directory.
    this.advisorLocked = params['fromTab3'] === 'true' || params['lockAdvisor'] === 'true';

    if (this.advisorLocked) {
      this.advisors = matched ? [matched] : [];
      this.selectedAdvisor = matched ?? null;
      this.recommendedAdvisorName = matched?.name ?? inboundAdvisorName.toUpperCase();
      return;
    }

    if (matched) {
      this.selectedAdvisor = matched;
      this.recommendedAdvisorName = matched.name;
      return;
    }

    const profile = await firstValueFrom(this.profileService.userProfile$);
    const topMatch = this.matchingService.bestMatch(profile);
    this.recommendedAdvisorName = topMatch.matchScore > 0 ? topMatch.name : '';
    this.selectedAdvisor = topMatch;
  }
      selectAdvisor(advisor: any) {
        this.selectedAdvisor = advisor;
      }
      selectSlot(slot: any) { this.selectedSlot = slot; }

      onDateChange(event: Event) {
        this.selectedDate = (event.target as HTMLInputElement).value;
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
