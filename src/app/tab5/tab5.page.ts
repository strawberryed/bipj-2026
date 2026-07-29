import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ProfileService } from '../tab5/profile.service';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab5',
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class Tab5Page implements OnInit {

  currentScreen: 'build-profile' | 'insurance-needs' | 'profile-summary' | 'edit-profile' = 'build-profile';

  profile = {
    name: '',
    age: '',
    occupation: '',
    monthlyIncome: '',
    maritalStatus: '',
    hasInsurance: null as boolean | null,
    mainGoal: '',
    insuranceBudget: 300,
    topConcern: '',
  };

  maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
  goals = ['Health Protection', 'Retirement', 'Savings', 'Family Protection'];

  generatedPersona = {
    label: '',
    riskLevel: '',
    riskColor: '',
    insights: [] as string[],
  };

  editingSections = {
    personal: false,
    financial: false,
    goals: false,
  };

  savedSuccess = false;

  constructor(private profileService: ProfileService, private alertController: AlertController) {}

  ngOnInit() {
    const saved = this.profileService.getProfile();
    if (saved && saved.name) {
      this.profile = { ...this.profile, ...saved };
      this.generateProfile();
      this.currentScreen = 'profile-summary';
    }
  }

  getPageTitle(): string {
    const titles: Record<string, string> = {
      'build-profile':   'Build Your Profile',
      'insurance-needs': 'Insurance Needs',
      'profile-summary': 'Your Profile Summary',
      'edit-profile':    'Edit Profile',
    };
    return titles[this.currentScreen] || 'Profile';
  }

  async goToScreen(screen: 'build-profile' | 'insurance-needs' | 'profile-summary' | 'edit-profile') {
  // Validate Screen 1
  if (this.currentScreen === 'build-profile') {
    if (!this.profile.name || !this.profile.age || !this.profile.occupation || !this.profile.monthlyIncome || !this.profile.maritalStatus) {
      const alert = await this.alertController.create({
        header: 'Missing Information',
        message: 'Please fill in all fields before continuing.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
  }
  this.currentScreen = screen;
}

  goBack() {
    const backMap: Record<string, 'build-profile' | 'insurance-needs' | 'profile-summary' | 'edit-profile'> = {
      'insurance-needs': 'build-profile',
      'profile-summary': 'insurance-needs',
      'edit-profile':    'profile-summary',
    };
    this.currentScreen = backMap[this.currentScreen] || 'build-profile';
  }

  toggleGoal(goal: string) {
    const goals = this.profile.mainGoal ? this.profile.mainGoal.split(', ') : [];
    const index = goals.indexOf(goal);
    if (index > -1) {
      goals.splice(index, 1);
    } else {
      goals.push(goal);
    }
    this.profile.mainGoal = goals.join(', ');
  }

  isGoalSelected(goal: string): boolean {
    return this.profile.mainGoal.includes(goal);
  }

  async generateProfile() {
    // Validation
    if (this.profile.hasInsurance === null) {
      const alert = await this.alertController.create({
        header: 'Missing Information',
        message: 'Please tell us if you currently have insurance.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
    if (!this.profile.mainGoal) {
      const alert = await this.alertController.create({
        header: 'Missing Information',
        message: 'Please select at least one main goal.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }
    if (!this.profile.topConcern) {
      const alert = await this.alertController.create({
        header: 'Missing Information',
        message: 'Please select your top financial concern.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Save to shared service
    this.profileService.setProfile(this.profile);

    // Persona label — changes based on actual inputs
    const age = Number(this.profile.age);
    const occ = this.profile.occupation;
    if (this.profile.maritalStatus === 'Married' && age < 35) {
      this.generatedPersona.label = 'Young Family Planner';
    } else if (this.profile.maritalStatus === 'Married') {
      this.generatedPersona.label = 'Family Planner';
    } else if (occ === 'Student') {
      this.generatedPersona.label = 'Student Starter';
    } else if (occ === 'Self-Employed' || occ === 'Freelancer') {
      this.generatedPersona.label = 'Independent Professional';
    } else if (age < 25) {
      this.generatedPersona.label = 'Young Working Adult';
    } else if (age < 35) {
      this.generatedPersona.label = 'Early Career Professional';
    } else if (age < 50) {
      this.generatedPersona.label = 'Mid-Career Achiever';
    } else {
      this.generatedPersona.label = 'Pre-Retirement Planner';
    }

    // Risk level
    const budget = Number(this.profile.insuranceBudget);
    if (budget >= 600) {
      this.generatedPersona.riskLevel = 'High Coverage Seeker';
      this.generatedPersona.riskColor = '#22c55e';
    } else if (budget >= 300) {
      this.generatedPersona.riskLevel = 'Moderate Risk';
      this.generatedPersona.riskColor = '#f59e0b';
    } else {
      this.generatedPersona.riskLevel = 'Budget Conscious';
      this.generatedPersona.riskColor = '#ef4444';
    }

    // Personalised AI insights
    const insights: string[] = [];
    const goals = this.profile.mainGoal;
    const concern = this.profile.topConcern;

    // Insight 1 — age + occupation
    if (occ === 'Student' && age < 25) {
      insights.push(`Starting insurance at ${age} as a student locks in the lowest premiums — rates only increase with age, so acting now saves significantly over your lifetime.`);
    } else if (occ === 'Self-Employed' || occ === 'Freelancer') {
      insights.push(`As a self-employed individual with no employer benefits, a personal plan covering hospitalisation and income loss is critical to protecting your livelihood.`);
    } else if (age < 30) {
      insights.push(`At ${age}, your premiums are at their lowest. Starting a whole-life or investment-linked plan now maximises long-term value and compound growth.`);
    } else if (age >= 40) {
      insights.push(`At ${age}, critical illness coverage becomes increasingly important — consider a plan with early-stage illness benefits before premiums increase further.`);
    } else {
      insights.push(`At ${age} years old, you are in a strong position to build a comprehensive coverage portfolio before premiums increase significantly with age.`);
    }

    // Insight 2 — marital status
    if (this.profile.maritalStatus === 'Married') {
      insights.push(`With a family depending on you, a term life policy with at least 10x your annual income ensures your loved ones remain financially protected no matter what.`);
    } else if (this.profile.maritalStatus === 'Single' && goals.includes('Savings')) {
      insights.push(`As a single individual focused on savings, an endowment or investment-linked plan can grow your wealth while simultaneously providing life coverage.`);
    } else {
      insights.push(`As a ${this.profile.maritalStatus.toLowerCase()} individual, personal protection through hospitalisation and critical illness plans safeguards your income and independence.`);
    }

    // Insight 3 — concern + goal + budget
    if (concern === 'Medical expenses' || goals.includes('Health Protection')) {
      insights.push(`With medical inflation averaging 10% annually in Singapore, your S$${budget}/month budget is well-suited for an Integrated Shield Plan upgrade covering private hospitalisation.`);
    } else if (concern === 'Critical illness') {
      insights.push(`Critical illness plans typically pay a lump sum of 3–5x annual income — with your S$${budget}/month budget, multi-pay CI coverage with early-stage benefits is achievable.`);
    } else if (concern === 'Retirement shortfall' || goals.includes('Retirement')) {
      insights.push(`To retire comfortably in Singapore, you need approximately S$1,379/month — supplementing CPF with a retirement annuity plan now helps bridge any future shortfall.`);
    } else if (concern === 'Loss of income') {
      insights.push(`An income protection plan replacing 75% of your salary for up to 2 years ensures you maintain your lifestyle during unexpected job disruptions or illness.`);
    } else if (concern === "Dependents' future" || goals.includes('Family Protection')) {
      insights.push(`A whole-life policy at your current budget ensures dependents receive a guaranteed payout, giving you lasting peace of mind for those who rely on you.`);
    } else {
      insights.push(`Your S$${budget}/month budget is well-positioned to build a balanced portfolio of protection and savings products tailored to your current life stage.`);
    }

    this.generatedPersona.insights = insights.slice(0, 3);
    this.currentScreen = 'profile-summary';
  }

  toggleEditSection(section: 'personal' | 'financial' | 'goals') {
    this.editingSections[section] = !this.editingSections[section];
  }

  saveChanges() {
    this.profileService.setProfile(this.profile);
    this.generateProfile();
    this.currentScreen = 'profile-summary';
    this.savedSuccess = true;
    setTimeout(() => { this.savedSuccess = false; }, 2000);
  }
}
