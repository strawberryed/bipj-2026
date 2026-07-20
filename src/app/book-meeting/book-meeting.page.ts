import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BookingService } from '../services/booking';

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

  constructor(private bookingService: BookingService, private router: Router) { }

  ngOnInit() {
    this.selectedAdvisor = this.advisors[0]; // Default to the first advisor
  }

  selectAdvisor(advisor: any) { this.selectedAdvisor = advisor; }
  selectSlot(slot: any) { this.selectedSlot = slot; }

  confirmBooking() {
    if (this.selectedAdvisor && this.selectedSlot) {
      this.bookingService.setBooking({
        consultantName: this.selectedAdvisor.name,
        consultantTitle: this.selectedAdvisor.title,
        timeSlot: this.selectedSlot.time,
        type: this.selectedSlot.duration
      });

      alert(' Meeting Booked Successfully!');
      this.router.navigate(['/tabs/tab1']); // Returns directly to your dashboard tab
    }
  }
}
