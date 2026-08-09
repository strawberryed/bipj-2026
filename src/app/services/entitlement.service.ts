import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Firestore, doc, docData, getDoc, setDoc } from '@angular/fire/firestore';
import { Auth, user, User } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface Entitlements {
  consultantUnlocked: boolean;
  reportUnlocked: boolean;
  lastPurchaseAt?: string;
}

const DEFAULT_ENTITLEMENTS: Entitlements = {
  consultantUnlocked: false,
  reportUnlocked: false,
};

@Injectable({ providedIn: 'root' })
export class EntitlementsService {
  private authUser$: Observable<User | null>;
  entitlements$: Observable<Entitlements>;

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private injector: EnvironmentInjector
  ) {
    this.authUser$ = runInInjectionContext(this.injector, () => user(this.auth));

    this.entitlements$ = this.authUser$.pipe(
      switchMap(authUser => {
        if (!authUser) return of(DEFAULT_ENTITLEMENTS);
        return runInInjectionContext(this.injector, () => {
          const purchasesDocRef = doc(this.firestore, `purchases/${authUser.uid}`);
          return docData(purchasesDocRef) as Observable<Entitlements | undefined>;
        });
      }),
      map(entitlements => ({ ...DEFAULT_ENTITLEMENTS, ...(entitlements ?? {}) }))
    );
  }

  async grant(purchase: { consultant?: boolean; report?: boolean }): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('No authenticated user found.');

    await runInInjectionContext(this.injector, async () => {
      const purchasesDocRef = doc(this.firestore, `purchases/${uid}`);
      const snapshot = await getDoc(purchasesDocRef);
      const current = { ...DEFAULT_ENTITLEMENTS, ...(snapshot.exists() ? snapshot.data() : {}) };

      const updated: Entitlements = {
        consultantUnlocked: current.consultantUnlocked || !!purchase.consultant,
        reportUnlocked: current.reportUnlocked || !!purchase.report,
        lastPurchaseAt: new Date().toISOString()
      };

      await setDoc(purchasesDocRef, updated, { merge: true });
    });
  }
}
