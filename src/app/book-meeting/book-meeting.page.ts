import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService } from '../services/booking';
import { ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-book-meeting',
  templateUrl: './book-meeting.page.html',
  styleUrls: ['./book-meeting.page.scss'],
  standalone: false,
})
export class BookMeetingPage implements OnInit {
  advisors = [
    { name: 'SARAH LIM', title: 'Financial and health advisor – 8 years', avatar: 'assets/cat1.png' },
    { name: 'BRANDON', title: 'Senior Prudential FA – 10 years', avatar: 'assets/cat2.png' },
    { name: 'JOHNNY LEE', title: 'Prudential FA – 5 years', avatar: 'assets/cat3.png' }
  ];

  slots = [
    { time: '2pm', duration: '30min – Phone Call' },
    { time: '5pm', duration: '30min – Phone Call' },
    { time: '3.30pm', duration: '30min – Phone Call' },
    { time: '6.15pm', duration: '30min – Phone Call' }
  ];

  selectedAdvisor: any = null;
  selectedSlot: any = null;
  selectedDate: string = '';
  recommendedAdvisorName = '';

  constructor(private bookingService: BookingService, private router: Router, private toastController: ToastController, private route: ActivatedRoute) { }

  ngOnInit() {
    this.selectedAdvisor = this.advisors[0]; // Default to the first advisor

    this.route.queryParams.subscribe(params => {
      this.recommendedAdvisorName = (params['recommendedAdvisor'] || '').toString().toUpperCase();
      const inboundAdvisorName = params['advisorName'] || this.recommendedAdvisorName;

      if (inboundAdvisorName) {
        // Find matching object reference array elements
        const matched = this.advisors.find(a => a.name.toLowerCase() === inboundAdvisorName.toLowerCase());
        if (matched) {
          this.selectedAdvisor = matched;
          return;
        }
      }
      // Default safe execution fallback fallback case
    this.selectedAdvisor = this.advisors[0];
    });
  }

      selectAdvisor(advisor: any) { this.selectedAdvisor = advisor; }
      selectSlot(slot: any) { this.selectedSlot = slot; }

  async presentSuccessToast(advisorName: string) {
        const toast = await this.toastController.create({
          message: ` Meeting with ${advisorName} successfully scheduled!`,
          duration: 3000,
          position: 'top',
          color: 'success',
          cssClass: 'custom-booking-toast',
          buttons: [
            {
              text: 'Dismiss',
              role: 'cancel'
            }
          ]
        });
        await toast.present();
      }

      confirmBooking() {
        if (this.selectedAdvisor && this.selectedSlot && this.selectedDate) {
          this.bookingService.setBooking({
            consultantName: this.selectedAdvisor.name,
            consultantTitle: this.selectedAdvisor.title,
            bookingDate: this.selectedDate,
            timeSlot: this.selectedSlot.time,
            type: this.selectedSlot.duration
          });

          this.presentSuccessToast(this.selectedAdvisor.name);
          this.router.navigate(['/tabs/tab1']); // Returns directly to your dashboard tab
        }
      }
    }
