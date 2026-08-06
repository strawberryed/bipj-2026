import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnInit {
  private profileService = inject(UserProfileService);
  private router = inject(Router);

  // Directly observe the current logged-in user's profile from Firestore
  profile$: Observable<UserProfileData | null>;

  constructor() {
    this.profile$ = this.profileService.userProfile$;
  }

  ngOnInit() {
    // If no user is logged in, redirect back to login page
    if (!this.profileService.currentUserId) {
      this.router.navigate(['/auth']);
    }
  }

  navigateToLandingPage() {
    this.router.navigate(['/tabs/tab1']);
  }

  navigateToEditProfile() {
    this.router.navigate(['/edit-profile']);
  }

  async logout() {
    await this.profileService.logout();
    this.router.navigate(['/auth']);
  }
}
