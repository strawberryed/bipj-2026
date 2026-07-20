import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  UserRole,
  getCurrentUser,
  initDatabase,
  loginUser,
  logoutUser,
  registerUser,
} from '../../data/app-db';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false,
})
export class Tab4Page implements OnInit {
  mode: 'login' | 'create' = 'login';

  role: UserRole | null = null;
  name = '';
  email = '';
  password = '';
  lifeStage = 'Young Family';
  riskAppetite: 'low' | 'medium' | 'high' = 'medium';

  errorMessage = '';
  successMessage = '';

  activeUser = getCurrentUser();

  constructor(private router: Router) { }

  ngOnInit() {
    initDatabase();
    this.refreshSession();
  }

  setMode(mode: 'login' | 'create') {
    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
  }

  setRole(role: UserRole) {
    this.role = role;
    this.errorMessage = '';
    this.successMessage = '';
  }

  submit(modeOverride?: 'login' | 'create') {
    if (modeOverride) {
      this.mode = modeOverride;
    }

    if (!this.role) {
      this.errorMessage = 'Please choose Customer or Consultant first.';
      this.successMessage = '';
      return;
    }

    const email = this.email.trim();
    const password = this.password.trim();

    if (!email || !password) {
      this.errorMessage = 'Please enter email and password.';
      this.successMessage = '';
      return;
    }

    if (this.mode === 'create') {
      const name = this.name.trim();
      if (!name) {
        this.errorMessage = 'Please enter your name.';
        this.successMessage = '';
        return;
      }

      const created = registerUser({
        role: this.role,
        name,
        email,
        password,
        lifeStage: this.role === 'customer' ? this.lifeStage : undefined,
        riskAppetite: this.role === 'customer' ? this.riskAppetite : undefined,
      });

      if (!created.ok) {
        this.errorMessage = created.message;
        this.successMessage = '';
        return;
      }

      const signedIn = loginUser(email, password);
      if (signedIn.ok) {
        this.successMessage = 'Account created and logged in.';
        this.errorMessage = '';
        this.refreshSession();
        this.router.navigateByUrl('/tabs/tab3');
      }

      return;
    }

    const loggedIn = loginUser(email, password);
    if (!loggedIn.ok) {
      this.errorMessage = loggedIn.message;
      this.successMessage = '';
      return;
    }

    this.errorMessage = '';
    this.successMessage = `Welcome back, ${loggedIn.user.name}.`;
    this.refreshSession();
    this.router.navigateByUrl('/tabs/tab3');
  }

  goToWorkspace() {
    this.router.navigateByUrl('/tabs/tab3');
  }

  logout() {
    logoutUser();
    this.refreshSession();
    this.password = '';
    this.successMessage = 'Logged out successfully.';
    this.errorMessage = '';
  }

  private refreshSession() {
    this.activeUser = getCurrentUser();
  }

}
