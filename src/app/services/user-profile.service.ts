import { Injectable } from '@angular/core';
import { Firestore, doc, docData, setDoc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface UserProfileData {
  fullName: string;
  age?: number;
  occupation?: string;
  monthlyIncome?: number;
  maritalStatus?: string;
  dependents?: number;
  hasExistingInsurance?: boolean;
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
  // Real-time Firebase Auth state
  authUser$ = user(this.auth);
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
  // Observable for current logged-in user's Firestore profile
  userProfile$: Observable<UserProfileData | null>;




  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {
    this.userProfile$ = this.authUser$.pipe(
      switchMap((authUser) => {
        if (!authUser) return of(null);
        const userDocRef = doc(this.firestore, `users/${authUser.uid}`);
        return docData(userDocRef) as Observable<UserProfileData | null>;
      })
    );
  }

  async updateProfile(data: Partial<UserProfileData>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user found.');
    }

    // Firestore's merge:true handles per-field merging server-side —
    // no need to combine with a local snapshot (which was previously
    // pulling from a BehaviorSubject stuck on stale initial defaults,
    // causing every update to overwrite good data with those defaults).
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userDocRef, data, { merge: true });
  }
  async getCurrentProfile(): Promise<UserProfileData | null> {
    const user = this.auth.currentUser;
    if (!user) return null;

    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    const snapshot = await getDoc(userDocRef);
    return snapshot.exists() ? (snapshot.data() as UserProfileData) : null;
  }

  // Get current logged-in user ID
  get currentUserId(): string | null {
    return this.auth.currentUser ? this.auth.currentUser.uid : null;
  }

  // Sign Up with Email & Password
  async signUp(email: string, pass: string, fullName: string) {
    const credential = await createUserWithEmailAndPassword(this.auth, email, pass);
    const uid = credential.user.uid;

    // Initialize user document in Firestore
    const userDocRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userDocRef, {
      fullName,
      email,
      isOnboardingCompleted: false,
      createdAt: new Date().toISOString()
    });

    return credential.user;
  }

  // Log In with Email & Password
  async login(email: string, pass: string) {
    const credential = await signInWithEmailAndPassword(this.auth, email, pass);
    return credential.user;
  }

  // Check if current user has already completed profile needs
  async isProfileComplete(uid: string): Promise<boolean> {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    const snapshot = await getDoc(userDocRef);
    if (snapshot.exists()) {
      return !!snapshot.data()?.['isOnboardingCompleted'];
    }
    return false;
  }

  // Save onboarding questionnaire data
  async saveOnboardingProfile(data: UserProfileData): Promise<void> {
    const uid = this.currentUserId;
    if (!uid) throw new Error('No authenticated user found.');

    const insights = this.generateProfileInsights(data);
    const fullPayload = {
      ...data,
      ...insights,
      isOnboardingCompleted: true
    };

    const userDocRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userDocRef, fullPayload, { merge: true });
  }

  // Logout
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
