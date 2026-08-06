import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  getChatHistory,
  getCurrentUser,
  getCustomers,
  getMeetingsForUser,
  getTimelineEventsForUser,
  getUnreadTimelineCountForUser,
  logoutUser,
  markTimelineRead,
  MeetingRecord,
  TimelineRecord,
  TimelineType,
  UserRecord,
} from '../../data/app-db';

type CustomerView = 'home' | 'chatbot' | 'proposal' | 'compare' | 'policies';
type ConsultantView = 'dashboard' | 'clients' | 'profile' | 'analytics' | 'recommendations';

interface PolicyCard {
  id: string;
  name: string;
  premium: string;
  coverage: string;
  renewal: string;
  matchScore: number;
  pros: string[];
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  activeUser: UserRecord | null = null;
  customerView: CustomerView = 'home';
  consultantView: ConsultantView = 'dashboard';
  timeline: TimelineRecord[] = [];
  meetings: MeetingRecord[] = [];
  customers: UserRecord[] = [];
  unreadCount = 0;
  selectedClientId = '';
  selectedPolicyId = 'p1';
  clientQuery = '';
  clientFilter: 'All' | 'Active' | 'Pending' = 'All';
  private refreshTimer?: number;
  private recommendationInitialized = false;

  readonly customerTabs: Array<{ id: CustomerView; label: string; icon: string }> = [
    { id: 'home', label: 'Interaction Timeline', icon: 'time-outline' },
    { id: 'chatbot', label: 'AI Chatbot', icon: 'sparkles-outline' },
    { id: 'proposal', label: 'Current Proposal', icon: 'document-text-outline' },
    { id: 'compare', label: 'Policy Comparison', icon: 'git-compare-outline' },
    { id: 'policies', label: 'My Policies', icon: 'shield-checkmark-outline' },
  ];

  readonly consultantTabs: Array<{ id: ConsultantView; label: string; icon: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline' },
    { id: 'clients', label: 'Client List', icon: 'people-outline' },
    { id: 'profile', label: 'Client Profile', icon: 'person-outline' },
    { id: 'analytics', label: 'Coverage & Analytics', icon: 'analytics-outline' },
    { id: 'recommendations', label: 'Recommendations', icon: 'bulb-outline' },
  ];

  readonly policies: PolicyCard[] = [
    { id: 'p1', name: 'PRUShield + PRUExtra', premium: 'S$88/mo', coverage: 'Health', renewal: '30 Nov 2026', matchScore: 92, pros: ['Strong hospitalisation support', 'Lower out-of-pocket risk', 'Good specialist network'] },
    { id: 'p2', name: 'PRUActive Life V', premium: 'S$74/mo', coverage: 'Life + CI', renewal: '15 Jan 2027', matchScore: 87, pros: ['Early-stage CI coverage', 'Lifelong profile fit', 'Balanced family protection'] },
    { id: 'p3', name: 'PRUActive Saver III', premium: 'S$120/mo', coverage: 'Savings', renewal: '08 Mar 2027', matchScore: 78, pros: ['Capital guarantee at maturity', 'Milestone planning support', 'Predictable schedule'] },
  ];

  ngOnInit(): void {
    this.refresh();
    this.refreshTimer = window.setInterval(() => this.refresh(), 1500);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer);
  }

  get isConsultant(): boolean { return this.activeUser?.role === 'consultant'; }
  get displayName(): string { return this.activeUser?.name || 'User'; }
  get chatCount(): number { return this.activeUser ? getChatHistory(this.activeUser.id).length : 0; }
  get selectedPolicy(): PolicyCard { return this.policies.find(item => item.id === this.selectedPolicyId) || this.policies[0]; }
  get recommendationReason(): string {
    const priorities = (this.activeUser?.financialPriorities || []).join(' ').toLowerCase();
    if (priorities.includes('health') || priorities.includes('medical') || priorities.includes('critical')) {
      return 'Recommended from your health and medical-protection priorities.';
    }
    if (priorities.includes('family') || priorities.includes('income loss')) {
      return 'Recommended to strengthen protection for you and your dependants.';
    }
    if (priorities.includes('saving') || priorities.includes('retirement') || priorities.includes('wealth')) {
      return 'Recommended to support your savings and long-term wealth goals.';
    }
    return 'A balanced starting plan based on the profile you provided.';
  }
  get recommendedAdvisor(): string {
    if (this.selectedPolicyId === 'p2') return 'JOHNNY LEE';
    if (this.selectedPolicyId === 'p3') return 'BRANDON';
    return 'SARAH LIM';
  }
  get selectedClient(): UserRecord | undefined { return this.customers.find(item => item.id === this.selectedClientId) || this.customers[0]; }
  get filteredCustomers(): UserRecord[] {
    const query = this.clientQuery.trim().toLowerCase();
    return this.customers.filter(item => !query || item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query));
  }

  setCustomerView(view: CustomerView): void {
    if (view === 'chatbot') { void this.router.navigate(['/tabs/tab2']); return; }
    this.customerView = view;
  }

  setConsultantView(view: ConsultantView): void { this.consultantView = view; }

  bookRecommendedPlan(): void {
    void this.router.navigate(['/book-meeting'], {
      queryParams: {
        recommendedAdvisor: this.recommendedAdvisor,
        plan: this.selectedPolicy.name,
        fromTab3: 'true',
      },
    });
  }

  markRead(): void {
    if (!this.activeUser) return;
    markTimelineRead(this.activeUser.id);
    this.unreadCount = 0;
  }

  signOut(): void {
    logoutUser();
    void this.router.navigate(['/tab1']);
  }

  trackById(_: number, item: { id: string }): string { return item.id; }

  timelineLabel(type: TimelineType): string {
    return ({ aichat: 'AI Chat', consultation: 'Consultation', proposal: 'Proposal', document: 'Document', email: 'Email', 'direct-message': 'Message' })[type];
  }

  relativeTime(iso: string): string {
    const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private refresh(): void {
    this.activeUser = getCurrentUser();
    if (!this.activeUser) { this.timeline = []; this.meetings = []; this.customers = []; return; }
    if (!this.recommendationInitialized && this.activeUser.role === 'customer') {
      const priorities = (this.activeUser.financialPriorities || []).join(' ').toLowerCase();
      if (priorities.includes('family') || priorities.includes('income loss')) this.selectedPolicyId = 'p2';
      else if (priorities.includes('saving') || priorities.includes('retirement') || priorities.includes('wealth')) this.selectedPolicyId = 'p3';
      else this.selectedPolicyId = 'p1';
      this.recommendationInitialized = true;
    }
    this.timeline = getTimelineEventsForUser(this.activeUser);
    this.meetings = getMeetingsForUser(this.activeUser);
    this.unreadCount = getUnreadTimelineCountForUser(this.activeUser);
    if (this.isConsultant) {
      this.customers = getCustomers();
      if (!this.selectedClientId && this.customers.length) this.selectedClientId = this.customers[0].id;
    }
  }
}
