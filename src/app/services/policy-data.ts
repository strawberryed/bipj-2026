import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
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
  private plans: Plan[] = [];
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor(
    private firestore: Firestore,
    private injector: EnvironmentInjector
  ) { }

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = runInInjectionContext(this.injector, async () => {
      try {
        const plansColRef = collection(this.firestore, 'plans');
        const snapshot = await getDocs(plansColRef);
        this.plans = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Plan));
        this.loaded = true;
      } catch (err) {
        console.error('[PolicyDataService] Failed to load plans from Firestore:', err);
        this.plans = [];
      }
    });

    return this.loadingPromise;
  }

  getPlans(): Plan[] {
    return this.plans;
  }

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