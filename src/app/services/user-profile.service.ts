import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Firestore, doc, docData, setDoc, getDoc, onSnapshot, deleteDoc, collection, getDocs } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, user, User } from '@angular/fire/auth';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface ExistingPlan {
  name: string;
  insurer?: string;
  notes?: string;
}

export interface UserProfileData {
  fullName: string;
  role?: 'customer' | 'consultant';
  email?: string;                   // saved at sign-up
  displayName?: string;             // chosen display name (shown in greetings, profile)
  avatar?: string | null;           // preset avatar ID (e.g. 'avatar-1'), null if photo uploaded
  profilePhoto?: string | null;     // base64 data URL of uploaded photo, null if using preset
  dateOfBirth?: string;             // ISO date string
  isProfileSetupComplete?: boolean; // gates setup-profile → onboarding transition
  age?: number;
  occupation?: string;
  monthlyIncome?: number;
  maritalStatus?: string;
  dependents?: number;
  hasExistingInsurance?: boolean;
  existingPlans?: ExistingPlan[];
  mainGoals?: string[];
  monthlyBudget?: number;
  topConcern?: string;
  personaTag?: string;
  riskProfile?: string;
  aiInsights?: string[];
  isOnboardingCompleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  authUser$: Observable<User | null>;
  userProfile$: Observable<UserProfileData | null>;

  private userProfileSubject = new BehaviorSubject<UserProfileData>({
    fullName: '',
    age: 0,
    occupation: '',
    monthlyIncome: 0,
    maritalStatus: 'Single',
    dependents: 0,
    hasExistingInsurance: false,
    mainGoals: [],
    monthlyBudget: 0
  });

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private injector: EnvironmentInjector
  ) {
    this.authUser$ = runInInjectionContext(this.injector, () => user(this.auth));

    this.userProfile$ = this.authUser$.pipe(
      switchMap((authUser) => {
        if (!authUser) return of(null);
        // Use native onSnapshot instead of docData() — docData() has a
        // breaking change in @angular/fire 20.x that misidentifies a
        // DocumentReference as a Query and throws an error.
        return runInInjectionContext(this.injector, () => {
          return new Observable<UserProfileData | null>(observer => {
            const userDocRef = doc(this.firestore, `users/${authUser.uid}`);
            const unsubscribe = onSnapshot(
              userDocRef,
              (snapshot) => {
                if (snapshot.exists()) {
                  observer.next(snapshot.data() as UserProfileData);
                } else {
                  observer.next(null);
                }
              },
              (error) => observer.error(error)
            );
            // Return teardown logic so the listener is removed on unsubscribe
            return () => unsubscribe();
          });
        });
      })
    );
  }

  async updateProfile(data: Partial<UserProfileData>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user found.');
    }

    const current = this.userProfileSubject.value;
    const updated = { ...current, ...data };

    await runInInjectionContext(this.injector, async () => {
      const userDocRef = doc(this.firestore, `users/${user.uid}`);
      await setDoc(userDocRef, updated, { merge: true });
    });

    this.userProfileSubject.next(updated);
  }

  get currentUserId(): string | null {
    return this.auth.currentUser ? this.auth.currentUser.uid : null;
  }

  async getCurrentProfile(): Promise<UserProfileData | null> {
    const uid = this.currentUserId;
    if (!uid) return null;

    return runInInjectionContext(this.injector, async () => {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      const snapshot = await getDoc(userDocRef);
      return snapshot.exists() ? (snapshot.data() as UserProfileData) : null;
    });
  }

  async signUp(email: string, pass: string, fullName: string) {
    const credential = await createUserWithEmailAndPassword(this.auth, email, pass);
    const uid = credential.user.uid;

    await runInInjectionContext(this.injector, async () => {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      await setDoc(userDocRef, {
        fullName,
        email,
        role: 'customer',
        isProfileSetupComplete: false,
        isOnboardingCompleted: false,
        createdAt: new Date().toISOString()
      });
    });

    return credential.user;
  }

  async login(email: string, pass: string) {
    const credential = await signInWithEmailAndPassword(this.auth, email, pass);
    return credential.user;
  }

  async isProfileComplete(uid: string): Promise<boolean> {
    return runInInjectionContext(this.injector, async () => {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        return !!snapshot.data()?.['isOnboardingCompleted'];
      }
      return false;
    });
  }

  async saveOnboardingProfile(data: UserProfileData): Promise<void> {
    const uid = this.currentUserId;
    if (!uid) throw new Error('No authenticated user found.');

    const insights = this.generateProfileInsights(data);
    const fullPayload = {
      ...data,
      ...insights,
      isOnboardingCompleted: true
    };

    await runInInjectionContext(this.injector, async () => {
      const userDocRef = doc(this.firestore, `users/${uid}`);
      await setDoc(userDocRef, fullPayload, { merge: true });
    });
  }

  async deleteAccount(): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user found.');

    const uid = currentUser.uid;

    await runInInjectionContext(this.injector, async () => {
      // 1. Delete chatHistory subcollection docs
      const chatRef = collection(this.firestore, `users/${uid}/chatHistory`);
      const chatSnap = await getDocs(chatRef);
      for (const d of chatSnap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Delete the user Firestore doc
      const userDocRef = doc(this.firestore, `users/${uid}`);
      await deleteDoc(userDocRef);

      // 3. Delete the Firebase Auth account
      await deleteUser(currentUser);
    });
  }

  async logout() {
    await signOut(this.auth);
  }

  private generateProfileInsights(data: Partial<UserProfileData>) {
    let personaTag = 'Young Working Adult';
    if (data.age && data.age < 23) personaTag = 'Student / Early Career';
    else if (data.dependents && data.dependents > 0) personaTag = 'Family Breadwinner';

    const aiInsights: string[] = [];
    if (data.monthlyIncome && data.monthlyIncome >= 2000) {
      aiInsights.push('You are in a good position to build both protection and savings.');
    }
    if (data.mainGoals?.includes('Health Protection')) {
      aiInsights.push('Health coverage should be prioritised.');
    }
    if (data.mainGoals?.includes('Savings')) {
      aiInsights.push('A plan with a savings component will help you achieve your long-term goals.');
    }

    return {
      personaTag,
      riskProfile: 'Moderate Risk',
      aiInsights
    };
  }
}
