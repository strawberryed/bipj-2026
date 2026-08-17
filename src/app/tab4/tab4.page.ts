import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController } from '@ionic/angular';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { EntitlementsService } from '../services/entitlement.service';

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
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnInit, OnDestroy {
  private profileService = inject(UserProfileService);
  private router = inject(Router);
  private actionSheetCtrl = inject(ActionSheetController);
  private entitlements = inject(EntitlementsService);
  private entitlementsSub?: Subscription;
  reportUnlocked = false;
  consultantUnlocked = false;

  profile$: Observable<UserProfileData | null>;

  constructor() {
    // userProfile$ already handles auth state internally via switchMap,
    // so we use it directly without re-wrapping.
    this.profile$ = this.profileService.userProfile$;
  }

  ngOnInit() {
    // Wait for auth to resolve, then redirect only if truly not logged in
    this.profileService.authUser$.pipe(take(1)).subscribe(authUser => {
      if (!authUser) {
        // Give Firebase one more chance — it sometimes takes a tick
        setTimeout(() => {
          if (!this.profileService.currentUserId) {
            this.router.navigate(['/auth']);
          }
        }, 1000);
      }
    });
    this.entitlementsSub = this.entitlements.entitlements$.subscribe(e => {
      this.reportUnlocked = e.reportUnlocked;
      this.consultantUnlocked = e.consultantUnlocked;
    });
  }
  ngOnDestroy() {
    this.entitlementsSub?.unsubscribe();
  }

  // ── Avatar helpers ──────────────────────────────────────────

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
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  // ── Navigation ──────────────────────────────────────────────

  navigateToLandingPage() {
    this.router.navigate(['/tabs/tab1']);
  }
  navigateToRecommendations() {
    this.router.navigate(['/tabs/tab3']);
  }
  navigateToCheckout() {
    this.router.navigate(['/connect-consultant']);
  }

  navigateToEditProfile() {
    this.router.navigate(['/edit-profile']);
  }

  async openSettings() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Settings',
      buttons: [
        {
          text: 'Account Settings',
          icon: 'person-outline',
          handler: () => {
            this.router.navigate(['/edit-profile']);
          }
        },
        {
          text: 'Log Out',
          icon: 'log-out-outline',
          role: 'destructive',
          handler: async () => {
            await this.profileService.logout();
            this.router.navigate(['/auth']);
          }
        },
        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close-outline'
        }
      ]
    });
    await actionSheet.present();
  }

  async logout() {
    await this.profileService.logout();
    this.router.navigate(['/auth']);
  }
}