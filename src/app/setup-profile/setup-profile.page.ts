import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfileService } from '../services/user-profile.service';
import { ToastController, LoadingController } from '@ionic/angular';

interface AvatarOption {
  id: string;
  icon: string;
  bg: string;
  iconColor: string;
}

@Component({
  selector: 'app-setup-profile',
  templateUrl: './setup-profile.page.html',
  styleUrls: ['./setup-profile.page.scss'],
  standalone: false,
})
export class SetupProfilePage implements OnInit {
  private profileService = inject(UserProfileService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  // Reference to the hidden <input type="file"> in the template
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  displayName: string = '';
  selectedAvatar: string = 'avatar-1';

  // Holds the base64 data URL of the uploaded photo.
  // null means no photo has been picked — preset avatar is used instead.
  uploadedPhotoBase64: string | null = null;

  readonly MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  avatarOptions: AvatarOption[] = [
    { id: 'avatar-1', icon: 'person', bg: '#ede9fe', iconColor: '#7c3aed' },
    { id: 'avatar-2', icon: 'happy', bg: '#fce7f3', iconColor: '#db2777' },
    { id: 'avatar-3', icon: 'planet', bg: '#dbeafe', iconColor: '#2563eb' },
    { id: 'avatar-4', icon: 'leaf', bg: '#d1fae5', iconColor: '#059669' },
    { id: 'avatar-5', icon: 'flame', bg: '#ffedd5', iconColor: '#ea580c' },
    { id: 'avatar-6', icon: 'diamond', bg: '#e0e7ff', iconColor: '#4f46e5' },
    { id: 'avatar-7', icon: 'paw', bg: '#fef3c7', iconColor: '#d97706' },
    { id: 'avatar-8', icon: 'rocket', bg: '#f3e8ff', iconColor: '#9333ea' },
    { id: 'avatar-9', icon: 'musical-notes', bg: '#cffafe', iconColor: '#0891b2' },
  ];

  async ngOnInit() {
    try {
      const profile = await this.profileService.getCurrentProfile();
      if (profile?.fullName) {
        this.displayName = profile.fullName;
      }
    } catch {
      // Silently continue — user can type it in manually
    }
  }

  // ── Photo Upload ──────────────────────────────────────────────

  // Programmatically trigger the hidden file input
  pickPhoto() {
    this.fileInput.nativeElement.click();
  }

  // Called when the user selects a file from the picker
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Guard: file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.showToast('Please choose a JPG or PNG image.');
      this.resetFileInput();
      return;
    }

    // Guard: file size (before resize)
    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      this.showToast('Image is too large. Please choose one under 5 MB.');
      this.resetFileInput();
      return;
    }

    // Read the raw file, then resize to 200×200 via canvas before storing.
    // Firestore has a 1 MB document limit — a full-size photo would exceed it.
    // At 200×200 the resulting base64 is ~15–30 KB, well within the limit.
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 200;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;

        const ctx = canvas.getContext('2d')!;

        // Centre-crop: scale the image so the shorter side fills 200px,
        // then draw it centred so the result is always a square avatar.
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const scaledW = img.width * scale;
        const scaledH = img.height * scale;
        const offsetX = (SIZE - scaledW) / 2;
        const offsetY = (SIZE - scaledH) / 2;

        ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);

        // Export as JPEG at 85% quality — good balance of size vs appearance
        this.uploadedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
        this.selectedAvatar = '';
      };
      img.onerror = () => {
        this.showToast('Could not process the image. Please try another.');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      this.showToast('Could not read the image. Please try again.');
    };
    reader.readAsDataURL(file);
  }

  // Remove uploaded photo and revert to preset avatar selection
  removePhoto(event: Event) {
    // Stop the click bubbling up to photo-upload-area (which would re-open the picker)
    event.stopPropagation();
    this.uploadedPhotoBase64 = null;
    this.selectedAvatar = 'avatar-1';
    this.resetFileInput();
  }

  private resetFileInput() {
    // Clearing value allows the same file to be re-selected after removal
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // ── Preset Avatar ─────────────────────────────────────────────

  goBack() {
    this.router.navigate(['/auth']);
  }

  selectAvatar(id: string) {
    // Clear any uploaded photo when user picks a preset
    this.uploadedPhotoBase64 = null;
    this.selectedAvatar = id;
    this.resetFileInput();
  }

  // ── Save & Navigate ───────────────────────────────────────────

  async continue() {
    if (!this.displayName.trim()) {
      this.showToast('Please enter a display name.');
      return;
    }

    const loader = await this.loadingCtrl.create({ message: 'Saving...' });
    await loader.present();

    try {
      const update: Record<string, any> = {
        displayName: this.displayName.trim(),
        isProfileSetupComplete: true,
      };

      if (this.uploadedPhotoBase64) {
        // User uploaded a custom photo — store base64 string as profilePhoto.
        // We use a separate field from 'avatar' so downstream code can easily
        // distinguish "has a real photo" vs "using a preset icon".
        update['profilePhoto'] = this.uploadedPhotoBase64;
        update['avatar'] = null; // clear any previously chosen preset
      } else {
        // User chose a preset avatar
        update['avatar'] = this.selectedAvatar || 'avatar-1';
        update['profilePhoto'] = null; // clear any previously uploaded photo
      }
      await this.profileService.updateProfile(update);

      await loader.dismiss();
      this.router.navigate(['/onboarding']);
    } catch (error: any) {
      await loader.dismiss();
      this.showToast(error.message || 'Failed to save profile.');
    }
  }

  async skipSetup() {
    try {
      await this.profileService.updateProfile({
        isProfileSetupComplete: true,
        avatar: 'avatar-1',
      });
    } catch {
      // Non-blocking
    }
    this.router.navigate(['/onboarding']);
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