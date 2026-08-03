import { Injectable } from '@angular/core';

/**
 * TEMPORARY / PLACEHOLDER SERVICE
 * ─────────────────────────────────────────────────────────────
 * This exists because the team's real user/profile database isn't
 * confirmed yet (app-db.ts's status is unclear — may be a teammate's
 * placeholder, may not be). Rather than depend on that file, this
 * service is fully self-contained: its own localStorage key, its
 * own shape, no imports from anyone else's code.
 *
 * WHEN THE REAL BACKEND IS CONFIRMED:
 * Only the internals of getProfile()/updateProfile() need to change
 * (e.g. call a real API/Firestore/whatever instead of localStorage).
 * Every other file that uses UserProfile (gemini.service.ts,
 * chatbot.page.ts) stays untouched, since they only depend on this
 * interface and these two methods.
 */

export interface UserProfile {
  id: string;
  name: string;
  lifeStage?: string;
  employmentStatus?: string;
  monthlyIncome?: string;
  dependents?: number;
  riskAppetite?: 'low' | 'medium' | 'high';
  financialPriorities?: string[];
  planningHorizon?: string;
  preferredContact?: 'chat' | 'email' | 'phone';
}

const STORAGE_KEY = 'cova_temp_profile_v1';

const DEFAULT_PROFILE: UserProfile = {
  id: 'guest',
  name: 'Guest'
};

@Injectable({ providedIn: 'root' })
export class UserProfileService {

  getProfile(): UserProfile {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };

    try {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  updateProfile(updates: Partial<UserProfile>): UserProfile {
    const current = this.getProfile();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  resetProfile(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}