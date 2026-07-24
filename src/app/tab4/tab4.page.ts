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
  monthlyIncome = '';
  employmentStatus = '';
  dependents = 0;
  planningHorizon = '';
  preferredContact: 'chat' | 'email' | 'phone' = 'chat';
  financialPriorities: string[] = [];

  readonly priorityOptions = [
    'Medical protection',
    'Family protection',
    'Critical illness',
    'Retirement planning',
    'Wealth accumulation'
  ];

  errorMessage = '';
  successMessage = '';

  activeUser = getCurrentUser();

  constructor(private router: Router) { }

  ngOnInit() {
    initDatabase();
    this.refreshSession();
  }

  setMode(mode: 'login' | 'create') {
    if (this.role === 'consultant' && mode === 'create') {
      this.errorMessage = 'Consultant sign up is disabled. Consultants can only log in.';
      this.successMessage = '';
      return;
    }

    this.mode = mode;
    this.errorMessage = '';
    this.successMessage = '';
  }

  setRole(role: UserRole) {
    this.role = role;

    if (role === 'consultant') {
      this.mode = 'login';
    }

    this.errorMessage = '';
    this.successMessage = '';
  }

  togglePriority(priority: string) {
    if (this.financialPriorities.includes(priority)) {
      this.financialPriorities = this.financialPriorities.filter(item => item !== priority);
      return;
    }

    this.financialPriorities = [...this.financialPriorities, priority];
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
      if (this.role !== 'customer') {
        this.errorMessage = 'Sign up is only available for customers.';
        this.successMessage = '';
        return;
      }

      const name = this.name.trim();
      if (!name) {
        this.errorMessage = 'Please enter your name.';
        this.successMessage = '';
        return;
      }

      if (!this.monthlyIncome || !this.employmentStatus || !this.planningHorizon) {
        this.errorMessage = 'Please complete income, employment status, and planning horizon.';
        this.successMessage = '';
        return;
      }

      if (this.financialPriorities.length === 0) {
        this.errorMessage = 'Please select at least one financial priority.';
        this.successMessage = '';
        return;
      }

      const created = registerUser({
        role: 'customer',
        name,
        email,
        password,
        lifeStage: this.lifeStage,
        riskAppetite: this.riskAppetite,
        monthlyIncome: this.monthlyIncome,
        employmentStatus: this.employmentStatus,
        dependents: this.dependents,
        financialPriorities: this.financialPriorities,
        planningHorizon: this.planningHorizon,
        preferredContact: this.preferredContact,
      });

      if (!created.ok) {
        this.errorMessage = created.message;
        this.successMessage = '';
        return;
      }

      this.successMessage = 'Account created. Please log in with your new credentials.';
      this.errorMessage = '';
      this.mode = 'login';
      this.password = '';

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
    this.router.navigateByUrl('/tabs/tab1');
  }

  goToWorkspace() {
    this.router.navigateByUrl('/tabs/tab1');
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
