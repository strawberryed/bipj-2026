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

  async ngOnInit() {
    // Guard direct/deep-link access: without this, a user could navigate
    // straight to /book-meeting and book even without having purchased the
    // consultant add-on.
    this.minimumDate = this.toLocalDateInputValue(new Date());
    const entitlements = await firstValueFrom(this.entitlements.entitlements$);
    if (!entitlements.consultantUnlocked) {
      this.router.navigate(['/upgrade']);
      return;
    }

    const params = this.route.snapshot.queryParams;
    const inboundAdvisorName: string | undefined = params['advisorName'] || params['recommendedAdvisor'];

    if (inboundAdvisorName) {
      this.recommendedAdvisorName = inboundAdvisorName.toString().toUpperCase();
      const matched = this.advisors.find(a => a.name.toLowerCase() === inboundAdvisorName.toLowerCase());
      this.selectedAdvisor = matched ?? this.advisors[0];
    } else {
      // No advisor specified (e.g. a direct visit to this page) — fall back
      // to computing the best match from the user's profile ourselves.
      const profile = await firstValueFrom(this.profileService.userProfile$);
      const topMatch = this.matchingService.bestMatch(profile);
      this.recommendedAdvisorName = topMatch.matchScore > 0 ? topMatch.name : '';
      this.selectedAdvisor = topMatch;
    }
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
    if (this.selectedAdvisor && this.selectedSlot && this.selectedDate) {
      try {
        await this.bookingService.setBooking({
          consultantName: this.selectedAdvisor.name,
          consultantTitle: this.selectedAdvisor.title,
          bookingDate: this.selectedDate,
          timeSlot: this.selectedSlot.time,
          type: this.selectedSlot.duration
        });

        await this.presentSuccessToast(this.selectedAdvisor.name);
        this.router.navigate(['/tabs/tab1']);
      } catch (error: any) {
        await this.presentErrorToast(error.message || 'Failed to save booking. Please try again.');
      }
    }
  }
}
