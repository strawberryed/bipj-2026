import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { EntitlementsService } from '../services/entitlement.service';
import { UserProfileService } from '../services/user-profile.service';
import { ConsultantMatchingService, MatchedConsultant } from '../services/consultant-matching.service';

@Component({
  selector: 'app-consultant',
  templateUrl: './connect-consultant.page.html',
  styleUrls: ['./connect-consultant.page.scss'],
  standalone: false
})
export class ConsultantPage implements OnInit, OnDestroy {
  isPaidUser: boolean = false;
  matchedConsultants: MatchedConsultant[] = [];

  private entitlementsSub!: Subscription;

  constructor(
    private router: Router,
    private entitlements: EntitlementsService,
    private profileService: UserProfileService,
    private matchingService: ConsultantMatchingService
  ) { }

  async ngOnInit() {
    // Real-time: if a purchase completes elsewhere, this updates without a reload.
    this.entitlementsSub = this.entitlements.entitlements$.subscribe(e => {
      this.isPaidUser = e.consultantUnlocked;
    });

    // Rank consultants against the user's onboarding profile (mainGoals + topConcern).
    const profile = await firstValueFrom(this.profileService.userProfile$);
    this.matchedConsultants = this.matchingService.matchConsultants(profile);
  }

  ngOnDestroy() {
    this.entitlementsSub?.unsubscribe();
  }

  upgradeUser() {
    this.router.navigate(['/upgrade']);
  }

  goToBooking(consultant: MatchedConsultant) {
    this.router.navigate(['/book-meeting'], {
      queryParams: { advisorName: consultant.name }
    });
  }
  downloadSummary() {
  this.router.navigate(['/tabs/chatbot'], {
    queryParams: { downloadSummary: 'true' }
  }); 
}
}
