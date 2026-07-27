import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UserProfile {
  name: string;
  age: string;
  occupation: string;
  monthlyIncome: string;
  maritalStatus: string;
  hasInsurance: boolean | null;
  mainGoal: string;
  insuranceBudget: number;
  topConcern: string;
}

@Injectable({
  providedIn: 'root'  // available everywhere in the app
})
export class ProfileService {

  // BehaviorSubject so teammates can subscribe to live changes
  private profileSubject = new BehaviorSubject<UserProfile>({
    name: '',
    age: '',
    occupation: '',
    monthlyIncome: '',
    maritalStatus: '',
    hasInsurance: null,
    mainGoal: '',
    insuranceBudget: 300,
    topConcern: '',
  });

  // Teammates subscribe to this to get live profile updates
  profile$ = this.profileSubject.asObservable();

  // Shaufin's screens call this to save
  setProfile(profile: Partial<UserProfile>) {
    this.profileSubject.next({ ...this.profileSubject.value, ...profile });
  }

  // Teammates call this to read once
  getProfile(): UserProfile {
    return this.profileSubject.value;
  }
}

/*
  ═══════════════════════════════════════════════════════
  HOW TEAMMATES USE THIS SERVICE:
  ═══════════════════════════════════════════════════════

  1. Import in their component:
     import { ProfileService, UserProfile } from '../services/profile.service';

  2. Inject in constructor:
     constructor(private profileService: ProfileService) {}

  3. Read once:
     const profile = this.profileService.getProfile();
     console.log(profile.mainGoal);     // "Health Protection, Savings"
     console.log(profile.insuranceBudget); // 300

  4. OR subscribe to live updates:
     this.profileService.profile$.subscribe(profile => {
       this.userProfile = profile;
     });

  ═══════════════════════════════════════════════════════
*/
