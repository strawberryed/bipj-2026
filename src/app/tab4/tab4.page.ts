import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
	getCurrentUser,
	initDatabase,
	loginUser,
	logoutUser,
	registerUser,
	UserRecord,
} from '../../data/app-db';

type CustomerAuthView = 'login' | 'signup';
type AuthRole = 'customer' | 'consultant' | null;

@Component({
	selector: 'app-tab4',
	templateUrl: './tab4.page.html',
	styleUrls: ['./tab4.page.scss'],
	standalone: false,
})
export class Tab4Page implements OnInit, OnDestroy {
	authView: CustomerAuthView = 'login';
	selectedRole: AuthRole = null;
	currentUser: UserRecord | null = null;
	authMessage = '';

	customerLogin = {
		email: 'customer@demo.com',
		password: '123456',
	};

	consultantLogin = {
		email: 'consultant@demo.com',
		password: '123456',
	};

	signupModel = {
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
		lifeStage: 'Young Family',
		riskAppetite: 'medium' as 'low' | 'medium' | 'high',
		monthlyIncome: '',
		employmentStatus: '',
		dependents: 0,
		financialPriorities: 'Medical protection, Family protection',
		planningHorizon: '10+ years',
		preferredContact: 'chat' as 'chat' | 'email' | 'phone',
	};

	private refreshTimer: number | null = null;
	private readonly handleStorageChange = () => this.refreshPortal();

	constructor(private router: Router) {}

	get isCustomer(): boolean {
		return this.currentUser?.role === 'customer';
	}

	get isConsultant(): boolean {
		return this.currentUser?.role === 'consultant';
	}

	ngOnInit(): void {
		initDatabase();
		this.refreshPortal();
		this.refreshTimer = window.setInterval(() => this.refreshPortal(), 1500);
		window.addEventListener('storage', this.handleStorageChange);
	}

	ngOnDestroy(): void {
		if (this.refreshTimer !== null) {
			window.clearInterval(this.refreshTimer);
		}

		window.removeEventListener('storage', this.handleStorageChange);
	}

	setAuthView(view: CustomerAuthView): void {
		this.authView = view;
		if (view === 'signup') {
			this.selectedRole = 'customer';
		}
		this.authMessage = '';
	}

	selectRole(role: Exclude<AuthRole, null>): void {
		this.selectedRole = role;
		if (role === 'consultant') {
			this.authView = 'login';
		}
		this.authMessage = '';
	}

	backToRoleSelect(): void {
		this.selectedRole = null;
		this.authView = 'login';
		this.authMessage = '';
	}

	signUpCustomer(): void {
		const priorities = this.signupModel.financialPriorities
			.split(',')
			.map(item => item.trim())
			.filter(Boolean);

		if (!this.signupModel.name.trim() || !this.signupModel.email.trim() || !this.signupModel.password) {
			this.authMessage = 'Complete name, email, and password before signing up.';
			return;
		}

		if (this.signupModel.password !== this.signupModel.confirmPassword) {
			this.authMessage = 'Passwords do not match.';
			return;
		}

		const result = registerUser({
			role: 'customer',
			name: this.signupModel.name,
			email: this.signupModel.email,
			password: this.signupModel.password,
			lifeStage: this.signupModel.lifeStage,
			riskAppetite: this.signupModel.riskAppetite,
			monthlyIncome: this.signupModel.monthlyIncome,
			employmentStatus: this.signupModel.employmentStatus,
			dependents: this.signupModel.dependents,
			financialPriorities: priorities,
			planningHorizon: this.signupModel.planningHorizon,
			preferredContact: this.signupModel.preferredContact,
		});

		if (!result.ok) {
			this.authMessage = result.message;
			return;
		}

		this.authView = 'login';
		this.customerLogin.email = result.user.email;
		this.customerLogin.password = this.signupModel.password;
		this.signupModel = {
			...this.signupModel,
			name: '',
			email: '',
			password: '',
			confirmPassword: '',
			monthlyIncome: '',
			employmentStatus: '',
			financialPriorities: 'Medical protection, Family protection',
		};
		this.authMessage = 'Account created. Proceed to customer login.';
	}

	loginAs(role: 'customer' | 'consultant'): void {
		const credentials = role === 'customer' ? this.customerLogin : this.consultantLogin;
		const result = loginUser(credentials.email, credentials.password);

		if (!result.ok) {
			this.authMessage = result.message;
			return;
		}

		if (result.user.role !== role) {
			logoutUser();
			this.authMessage = `This account belongs to a ${result.user.role}. Use the correct login panel.`;
			return;
		}

		this.authMessage = '';
		this.refreshPortal();
		this.router.navigateByUrl('/customer-onboarding');
	}

	openWorkspace(): void {
		this.router.navigateByUrl('/tabs/tab3');
	}

	logout(): void {
		logoutUser();
		this.currentUser = null;
		this.selectedRole = null;
		this.authMessage = 'Signed out.';
	}

	private refreshPortal(): void {
		this.currentUser = getCurrentUser();
	}
}
