import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

export interface Plan {
  id: string;
  name: string;
  category: string;
  filterCategory: 'life' | 'ci' | 'health' | 'wealth';
  filterPremium: 'under50' | '50to100' | 'above100';
  filterCoverage: 'protection' | 'health' | 'savings';
  premium: string;
  description: string;
  covered: string[];
  notCovered: string[];
  bestFor: string[];
  risks: string[];
  considerations: string[];
}

@Injectable({ providedIn: 'root' })
export class PolicyDataService {
  private firestore = inject(Firestore, { optional: true });


  private plans: Plan[] = [];
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Fetches all plans from Firestore if not already cached. Safe to call
   * multiple times — concurrent calls share the same in-flight request.
   */
  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    if (!this.firestore) {
      this.loaded = true;
      console.warn('[PolicyDataService] Firebase is not configured; no remote plans were loaded.');
      return;
    }

    const firestore = this.firestore;

    this.loadingPromise = (async () => {
      try {
        const snapshot = await getDocs(collection(firestore, 'plans'));
        this.plans = snapshot.docs.map(doc => doc.data() as Plan);
        this.loaded = true;
      } catch (err) {
        console.error('[PolicyDataService] Failed to load plans from Firestore:', err);
        this.plans = [];
      }
    })();

    return this.loadingPromise;
  }

  /** All plans, flat — mirrors the old PLANS export. */
  getPlans(): Plan[] {
    return this.plans;
  }

  /** Plans grouped by filterCategory — mirrors the old POLICIES export. */
  getPolicies(): Record<string, Plan[]> {
    return {
      life: this.plans.filter(p => p.filterCategory === 'life'),
      ci: this.plans.filter(p => p.filterCategory === 'ci'),
      health: this.plans.filter(p => p.filterCategory === 'health'),
      wealth: this.plans.filter(p => p.filterCategory === 'wealth'),
    };
  }

  getPlanById(planId: string): Plan | undefined {
    return this.plans.find(p => p.id === planId);
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
