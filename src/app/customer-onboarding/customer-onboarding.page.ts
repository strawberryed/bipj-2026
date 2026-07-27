import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getCurrentUser, markOnboardingSeen, UserRecord } from '../../data/app-db';

interface RecommendedPlan {
	name: string;
	reason: string;
}

interface RecommendedConsultant {
	name: string;
	title: string;
	specialties: string[];
}

@Component({
	selector: 'app-customer-onboarding',
	templateUrl: './customer-onboarding.page.html',
	styleUrls: ['./customer-onboarding.page.scss'],
	standalone: false,
})
export class CustomerOnboardingPage implements OnInit {
	currentUser: UserRecord | null = null;
	recommendedPlans: RecommendedPlan[] = [];
	recommendedConsultant: RecommendedConsultant | null = null;

	constructor(private router: Router) {}

	ngOnInit(): void {
		this.currentUser = getCurrentUser();
		if (!this.currentUser || this.currentUser.role !== 'customer') {
			this.router.navigateByUrl('/tab4');
			return;
		}

		// Skip onboarding for users who have already seen it (returning customers)
		if (this.currentUser.hasSeenOnboarding) {
			this.router.navigateByUrl('/tabs/tab3');
			return;
		}

		this.recommendedPlans = this.buildRecommendedPlans();
		this.recommendedConsultant = this.buildRecommendedConsultant();
	}

	startBookingMeeting(): void {
		if (!this.recommendedConsultant || !this.currentUser) {
			return;
		}

		markOnboardingSeen(this.currentUser.id);

		this.router.navigate(['/book-meeting'], {
			queryParams: {
				recommendedAdvisor: this.recommendedConsultant.name,
				fromOnboarding: 'true',
			},
		});
	}

	proceedToWorkspace(): void {
		if (this.currentUser) {
			markOnboardingSeen(this.currentUser.id);
		}

		this.router.navigateByUrl('/tabs/tab3');
	}

	private buildRecommendedPlans(): RecommendedPlan[] {
		if (!this.currentUser?.financialPriorities || this.currentUser.financialPriorities.length === 0) {
			return [];
		}

		const priorities = this.currentUser.financialPriorities.map(p => p.toLowerCase());

		const plans: RecommendedPlan[] = [
			{
				name: this.currentUser.riskAppetite === 'high' ? 'PRULink Assurance Account II' : 'PRUActive Saver III',
				reason: this.currentUser.riskAppetite === 'high'
					? 'Matches your higher risk appetite with growth-oriented exposure.'
					: 'Supports steady, lower-volatility milestone planning.',
			},
		];

		if (priorities.some(item => item.includes('medical') || item.includes('health'))) {
			plans.push({
				name: 'PRUShield + PRUExtra',
				reason: 'Strengthens hospitalisation coverage for day-to-day protection confidence.',
			});
		}

		if (priorities.some(item => item.includes('family')) || (this.currentUser.dependents ?? 0) > 0) {
			plans.push({
				name: 'PRUActive Life V',
				reason: 'Adds broad critical illness and life protection for dependent-focused planning.',
			});
		}

		return plans.slice(0, 3);
	}

	private buildRecommendedConsultant(): RecommendedConsultant {
		if (!this.currentUser) {
			return { name: 'SARAH LIM', title: 'Financial and Health Advisor', specialties: ['Health optimisation'] };
		}

		if (this.currentUser.riskAppetite === 'high') {
			return {
				name: 'BRANDON',
				title: 'Senior Financial Advisor',
				specialties: ['Wealth growth', 'Plan switching'],
			};
		}

		if (this.currentUser.preferredContact === 'phone') {
			return {
				name: 'JOHNNY LEE',
				title: 'Group and Individual Plans',
				specialties: ['Family protection', 'Phone consultations'],
			};
		}

		return {
			name: 'SARAH LIM',
			title: 'Financial and Health Advisor',
			specialties: ['Health optimisation', 'Benefits planning'],
		};
	}
}
