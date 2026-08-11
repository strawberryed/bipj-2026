import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfileService, UserProfileData, ExistingPlan } from '../services/user-profile.service';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';

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
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: false,
})
export class EditProfilePage implements OnInit {
  private profileService = inject(UserProfileService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  loaded = false;
  isSaving = false;

  // Account details
  displayName = '';
  fullName = '';
  email = '';

  // Personal info
  age: number | null = null;
  maritalStatus = '';
  occupation = '';
  monthlyIncome: number | null = null;
  dependents: number = 0;

  // Insurance needs
  mainGoal = '';
  topConcern = '';
  monthlyBudget = 300;
  hasExistingInsurance: boolean | null = null;

  // Avatar / photo
  selectedAvatar = '';
  uploadedPhotoBase64: string | null = null;
  readonly MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

  avatarOptions = Object.entries(AVATAR_MAP).map(([id, v]) => ({
    id,
    icon: v.icon,
    bg: v.bg,
    iconColor: v.color,
  }));

  async ngOnInit() {
    try {
      const profile = await this.profileService.getCurrentProfile();
      if (profile) this.populateForm(profile);
    } catch (e) {
      this.showToast('Could not load profile.');
    } finally {
      this.loaded = true;
    }
  }

  private populateForm(p: UserProfileData) {
    this.displayName = p.displayName ?? p.fullName ?? '';
    this.fullName = p.fullName ?? '';
    this.email = p.email ?? '';
    this.age = p.age ?? null;
    this.maritalStatus = p.maritalStatus ?? '';
    this.occupation = p.occupation ?? '';
    this.monthlyIncome = p.monthlyIncome ?? null;
    this.dependents = p.dependents ?? 0;
    this.mainGoal = p.mainGoals?.[0] ?? '';
    this.topConcern = p.topConcern ?? '';
    this.monthlyBudget = p.monthlyBudget ?? 300;
    this.hasExistingInsurance = p.hasExistingInsurance ?? null;
    this.selectedAvatar = p.avatar ?? 'avatar-1';
    this.uploadedPhotoBase64 = p.profilePhoto ?? null;
  }

  // ── Avatar / Photo ───────────────────────────────────────────

  getAvatarIcon(id: string) { return AVATAR_MAP[id]?.icon ?? 'person'; }
  getAvatarBg(id: string) { return AVATAR_MAP[id]?.bg ?? '#ede9fe'; }
  getAvatarColor(id: string) { return AVATAR_MAP[id]?.color ?? '#7c3aed'; }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  selectAvatar(id: string) {
    this.uploadedPhotoBase64 = null;
    this.selectedAvatar = id;
    this.resetFileInput();
  }

  pickPhoto() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.showToast('Please choose a JPG or PNG image.');
      this.resetFileInput();
      return;
    }
    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      this.showToast('Image is too large. Please choose one under 5 MB.');
      this.resetFileInput();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 200;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const sw = img.width * scale;
        const sh = img.height * scale;
        ctx.drawImage(img, (SIZE - sw) / 2, (SIZE - sh) / 2, sw, sh);
        this.uploadedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
        this.selectedAvatar = '';
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  private resetFileInput() {
    if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
  }

  // ── Save ─────────────────────────────────────────────────────

  async save() {
    if (!this.displayName.trim()) {
      this.showToast('Please enter a display name.');
      return;
    }

    this.isSaving = true;
    const loader = await this.loadingCtrl.create({ message: 'Saving...' });
    await loader.present();

    try {
      const update: Record<string, any> = {
        displayName: this.displayName.trim(),
        fullName: this.fullName.trim(),
        age: this.age ? Number(this.age) : null,
        maritalStatus: this.maritalStatus,
        occupation: this.occupation,
        monthlyIncome: this.monthlyIncome ? Number(this.monthlyIncome) : null,
        dependents: Number(this.dependents),
        mainGoals: this.mainGoal ? [this.mainGoal] : [],
        topConcern: this.topConcern,
        monthlyBudget: this.monthlyBudget,
        hasExistingInsurance: this.hasExistingInsurance,
      };

      if (this.uploadedPhotoBase64) {
        update['profilePhoto'] = this.uploadedPhotoBase64;
        update['avatar'] = null;
      } else {
        update['avatar'] = this.selectedAvatar || 'avatar-1';
        update['profilePhoto'] = null;
      }

      await this.profileService.updateProfile(update);
      await loader.dismiss();
      this.showToast('Profile updated.');
      this.router.navigate(['/tabs/tab4']);
    } catch (e: any) {
      await loader.dismiss();
      this.showToast(e.message || 'Failed to save.');
    } finally {
      this.isSaving = false;
    }
  }

  // ── Navigation / Auth ─────────────────────────────────────────

  goBack() {
    this.router.navigate(['/tabs/tab4']);
  }

  async confirmLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Log Out',
      message: 'Are you sure you want to log out?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Log Out',
          role: 'destructive',
          handler: async () => {
            await this.profileService.logout();
            this.router.navigate(['/auth']);
          }
        }
      ]
    });
    await alert.present();
  }

  async confirmDeleteAccount() {
    // Two-step confirmation — first alert warns, second requires typing "DELETE"
    const alert1 = await this.alertCtrl.create({
      header: 'Delete Account',
      message: 'This will permanently delete your account and all your data. This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Continue',
          role: 'destructive',
          handler: () => this.requireDeleteConfirmation()
        }
      ]
    });
    await alert1.present();
  }

  private async requireDeleteConfirmation() {
    const alert2 = await this.alertCtrl.create({
      header: 'Are you sure?',
      message: 'Type DELETE to confirm.',
      inputs: [
        {
          name: 'confirm',
          type: 'text',
          placeholder: 'DELETE',
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete My Account',
          role: 'destructive',
          handler: async (data) => {
            if (data.confirm !== 'DELETE') {
              this.showToast('Please type DELETE exactly to confirm.');
              return false; // keep alert open
            }
            await this.deleteAccount();
            return true;
          }
        }
      ]
    });
    await alert2.present();
  }

  private async deleteAccount() {
    const loader = await this.loadingCtrl.create({ message: 'Deleting account...' });
    await loader.present();
    try {
      await this.profileService.deleteAccount();
      await loader.dismiss();
      this.router.navigate(['/auth']);
    } catch (e: any) {
      await loader.dismiss();
      // Firebase requires recent login for account deletion —
      // if the session is too old, Auth throws 'requires-recent-login'
      if (e.code === 'auth/requires-recent-login') {
        this.showToast('Please log out and log back in, then try again.');
      } else {
        this.showToast(e.message || 'Failed to delete account.');
      }
    }
  }

  private async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      color: 'dark',
      position: 'bottom',
    });
    toast.present();
  }
}