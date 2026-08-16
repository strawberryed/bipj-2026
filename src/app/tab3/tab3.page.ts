import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Plan, PolicyDataService } from '../services/policy-data';
import { ApplicationSubmission, MeetingRecord, TimelineRecord, TimelineType, UserRecord, WorkspaceService } from '../services/workspace.service';
import { BookingService } from '../services/booking';

interface RankedPlan extends Plan {
  matchScore: number;
  matchReasons: string[];
}

type RadarMetric = 'protection' | 'value' | 'flexibility' | 'benefits' | 'coverage';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceService);
  private readonly policyData = inject(PolicyDataService);
  private readonly bookingService = inject(BookingService);
  private readonly subscriptions = new Subscription();
  private accountSubscriptions = new Subscription();
  private chatCountSubscription?: Subscription;

  activeUser: UserRecord | null = null;
  timeline: TimelineRecord[] = [];
  meetings: MeetingRecord[] = [];
  customers: UserRecord[] = [];
  policies: RankedPlan[] = [];
  unreadCount = 0;
  chatCount = 0;
  selectedClientId = '';
  clientQuery = '';
  plansLoading = true;
  selectedPolicyId = '';
  assignedAdvisorName = '';
  authResolved = false;
  dataError = '';
  timelineLoading = true;
  meetingsLoading = true;
  chatCountLoading = true;
  customersLoading = true;
  selectedTimelineItem: TimelineRecord | null = null;
  proposalAccepted = false;
  proposalSubmitting = false;
  proposalSubmitError = '';
  applicationSubmission: ApplicationSubmission | null = null;
  deepAnalysisPlan: RankedPlan | null = null;
  rescheduleOpen = false;
  rescheduleDate = '';
  rescheduleSaving = false;
  rescheduleMessage = '';

  ngOnInit(): void {
    this.subscriptions.add(this.workspace.currentUser$.subscribe({ next: account => this.connectAccount(account), error: error => this.handleDataError('account', error) }));
    void this.loadPlans();
  }

  ngOnDestroy(): void {
    this.chatCountSubscription?.unsubscribe();
    this.accountSubscriptions.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  get isConsultant(): boolean { return this.activeUser?.role === 'consultant'; }
  get displayName(): string { return this.activeUser?.name || 'User'; }
  get selectedClient(): UserRecord | undefined {
    return this.customers.find(item => item.id === this.selectedClientId) || this.customers[0];
  }
  get recommendationProfile(): UserRecord | null {
    return this.isConsultant ? this.selectedClient ?? null : this.activeUser;
  }
  get selectedPolicy(): RankedPlan | undefined {
    return this.policies.find(plan => plan.id === this.selectedPolicyId) ?? this.policies[0];
  }
  get displayedTimeline(): TimelineRecord[] {
    if (!this.isConsultant) return this.timeline;
    const customerId = this.selectedClient?.id;
    return customerId ? this.timeline.filter(item => item.customerId === customerId) : [];
  }
  get displayedMeetings(): MeetingRecord[] {
    if (!this.isConsultant) return this.meetings;
    const customerId = this.selectedClient?.id;
    return customerId ? this.meetings.filter(meeting => meeting.customerId === customerId) : [];
  }
  get activityLoading(): boolean { return this.timelineLoading || (this.isConsultant && this.customersLoading); }
  get upcomingCountLoading(): boolean { return this.meetingsLoading || (this.isConsultant && this.customersLoading); }
  get upcomingMeetings(): MeetingRecord[] {
    const today = this.singaporeDate(new Date());
    return this.displayedMeetings
      .filter(meeting => !!meeting.date && meeting.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }
  get filteredCustomers(): UserRecord[] {
    const query = this.clientQuery.trim().toLowerCase();
    return this.customers.filter(item => !query || item.name.toLowerCase().includes(query) || (item.email || '').toLowerCase().includes(query));
  }

  selectClient(client: UserRecord): void {
    this.selectedClientId = client.id;
    this.rankPlans(client);
  }

  selectPolicy(policy: RankedPlan): void {
    this.selectedPolicyId = policy.id;
    document.querySelector('.recommended-plan-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  viewPlanProposal(policy: RankedPlan): void {
    this.deepAnalysisPlan = null;
    this.selectedPolicyId = policy.id;
    this.openTimelineItem({
      id: policy.id,
      customerId: this.recommendationProfile?.id ?? '',
      type: 'proposal',
      channel: 'plan-recommendation',
      title: `${policy.name} proposal`,
      detail: policy.description,
      policyOptions: [policy.id, policy.name],
      createdAt: new Date().toISOString(),
      readBy: [],
    });
  }

  viewDetailedBreakdown(policy: RankedPlan): void {
    this.selectedPolicyId = policy.id;
    this.selectedTimelineItem = null;
    this.deepAnalysisPlan = policy;
  }

  closeDetailedBreakdown(): void { this.deepAnalysisPlan = null; }

  compareDetailedPlan(): void {
    this.deepAnalysisPlan = null;
    document.querySelector('.alternative-plan')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  radarScore(plan: RankedPlan, metric: RadarMetric): number {
    const covered = plan.covered?.length ?? 0;
    const exclusions = plan.notCovered?.length ?? 0;
    const risks = plan.risks?.length ?? 0;
    const considerations = plan.considerations?.length ?? 0;
    const premium = this.extractMonthlyPremium(plan.premium);
    const categoryStrength: Record<Plan['filterCategory'], number> = { health: 92, ci: 94, life: 90, wealth: 72 };
    const coverageStrength: Record<Plan['filterCoverage'], number> = { protection: 92, health: 94, savings: 76 };

    const scores: Record<RadarMetric, number> = {
      protection: Math.round(categoryStrength[plan.filterCategory] * .55 + coverageStrength[plan.filterCoverage] * .25 + plan.matchScore * .2),
      value: Math.round((premium === null ? 70 : premium <= 50 ? 94 : premium <= 100 ? 86 : premium <= 200 ? 76 : premium <= 350 ? 66 : 56) * .7 + plan.matchScore * .3),
      flexibility: Math.round(Math.max(45, 88 - considerations * 5 - risks * 3) * .75 + plan.matchScore * .25),
      benefits: Math.round(Math.min(96, 48 + covered * 8) * .75 + plan.matchScore * .25),
      coverage: Math.round(Math.max(42, Math.min(96, 54 + covered * 7 - exclusions * 3)) * .75 + plan.matchScore * .25),
    };
    return Math.max(0, Math.min(100, scores[metric]));
  }

  radarPoints(plan: RankedPlan): string {
    const metrics: RadarMetric[] = ['protection', 'value', 'flexibility', 'benefits', 'coverage'];
    const centerX = 130;
    const centerY = 115;
    const radius = 85;
    return metrics.map((metric, index) => {
      const angle = (-90 + index * 72) * Math.PI / 180;
      const distance = radius * this.radarScore(plan, metric) / 100;
      return `${(centerX + Math.cos(angle) * distance).toFixed(1)},${(centerY + Math.sin(angle) * distance).toFixed(1)}`;
    }).join(' ');
  }

  radarPoint(plan: RankedPlan, index: number, coordinate: 'x' | 'y'): number {
    const metric = (['protection', 'value', 'flexibility', 'benefits', 'coverage'] as RadarMetric[])[index];
    const angle = (-90 + index * 72) * Math.PI / 180;
    const distance = 85 * this.radarScore(plan, metric) / 100;
    return coordinate === 'x' ? 130 + Math.cos(angle) * distance : 115 + Math.sin(angle) * distance;
  }

  radarMetrics(plan: RankedPlan): Array<{ key: RadarMetric; label: string; score: number; explanation: string }> {
    return [
      { key: 'protection', label: 'Protection', score: this.radarScore(plan, 'protection'), explanation: 'How strongly the plan protects your stated needs.' },
      { key: 'value', label: 'Plan value', score: this.radarScore(plan, 'value'), explanation: 'Premium affordability balanced against your profile match.' },
      { key: 'flexibility', label: 'Flexibility', score: this.radarScore(plan, 'flexibility'), explanation: 'Fewer restrictions, risks and special considerations score higher.' },
      { key: 'benefits', label: 'Benefits', score: this.radarScore(plan, 'benefits'), explanation: 'Breadth of benefits included in the plan catalogue.' },
      { key: 'coverage', label: 'Coverage', score: this.radarScore(plan, 'coverage'), explanation: 'Covered items balanced against listed exclusions.' },
    ];
  }

  radarRating(score: number): string {
    if (score >= 85) return 'Strong';
    if (score >= 70) return 'Balanced';
    return 'Limited';
  }
  bookRecommendedPlan(): void {
    if (!this.selectedPolicy) return;
    void this.router.navigate(['/book-meeting'], {
      queryParams: {
        recommendedAdvisor: this.recommendedAdvisor(this.selectedPolicy),
        consultantId: this.advisorId(this.recommendedAdvisor(this.selectedPolicy)),
        plan: this.selectedPolicy.name,
        fromTab3: 'true',
        lockAdvisor: 'true',
      },
    });
  }

  openTimelineItem(item: TimelineRecord): void {
    this.selectedTimelineItem = item;
    this.proposalAccepted = false;
    this.applicationSubmission = null;
    this.proposalSubmitError = '';
  }

  closeTimelineItem(): void {
    this.selectedTimelineItem = null;
    this.rescheduleOpen = false;
    this.rescheduleMessage = '';
  }

  get minimumRescheduleDate(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  startReschedule(meeting: MeetingRecord): void {
    this.rescheduleDate = meeting.date || this.minimumRescheduleDate;
    this.rescheduleMessage = '';
    this.rescheduleOpen = true;
  }

  cancelReschedule(): void {
    this.rescheduleOpen = false;
    this.rescheduleMessage = '';
  }

  async saveReschedule(): Promise<void> {
    if (!this.rescheduleDate || this.rescheduleDate < this.minimumRescheduleDate) {
      this.rescheduleMessage = 'Choose today or a future date.';
      return;
    }
    this.rescheduleSaving = true;
    this.rescheduleMessage = '';
    try {
      await this.bookingService.rescheduleBooking(this.rescheduleDate);
      this.rescheduleMessage = 'Meeting date updated successfully.';
      this.rescheduleOpen = false;
    } catch (error) {
      console.error('[Tab3] Could not reschedule meeting:', error);
      this.rescheduleMessage = 'Could not update the date. Please try again.';
    } finally {
      this.rescheduleSaving = false;
    }
  }

  get selectedMeeting(): MeetingRecord | undefined {
    if (!this.selectedTimelineItem || this.selectedTimelineItem.type !== 'consultation') return undefined;
    return this.meetings.find(meeting =>
      (!!this.selectedTimelineItem?.consultantId && meeting.consultantId === this.selectedTimelineItem.consultantId) ||
      this.selectedTimelineItem?.detail.toLowerCase().includes(meeting.consultantName.toLowerCase())
    ) ?? this.meetings[0];
  }
  get selectedProposalPlan(): RankedPlan | undefined {
    if (this.selectedTimelineItem?.type !== 'proposal') return undefined;
    const options = (this.selectedTimelineItem.policyOptions ?? []).map(option => option.toLowerCase());
    return this.policies.find(plan => options.some(option => option === plan.id.toLowerCase() || option.includes(plan.name.toLowerCase()) || plan.name.toLowerCase().includes(option)))
      ?? this.policies.find(plan => this.selectedTimelineItem?.title.toLowerCase().includes(plan.name.toLowerCase()))
      ?? this.selectedPolicy;
  }
  async acceptProposal(): Promise<void> {
    const plan = this.selectedProposalPlan;
    const customer = this.recommendationProfile;
    if (!plan || !customer || this.proposalSubmitting) return;
    const consultantName = this.recommendedAdvisor(plan);
    this.proposalSubmitting = true;
    this.proposalSubmitError = '';
    try {
      this.applicationSubmission = await this.workspace.submitPlanApplication(customer, plan.name, this.advisorId(consultantName), consultantName);
      this.proposalAccepted = true;
    } catch (error) {
      console.error('[Tab3] Application submission failed:', error);
      this.proposalSubmitError = 'We could not send your application. Please check your connection and try again.';
    } finally {
      this.proposalSubmitting = false;
    }
  }
  openChatbot(): void { void this.router.navigate(['/tabs/chatbot']); }

  async markRead(): Promise<void> {
    if (!this.activeUser) return;
    await this.workspace.markTimelineRead(this.activeUser.id, this.timeline);
    this.unreadCount = 0;
  }

  async signOut(): Promise<void> {
    await this.workspace.logout();
    void this.router.navigate(['/tab1']);
  }

  recommendedAdvisor(plan: Plan): string { return this.advisorForPlan(plan); }

  private advisorId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  private advisorForPlan(plan: Plan): string {
    if (plan.filterCategory === 'life' || plan.filterCategory === 'ci') return 'JOHNNY LEE';
    if (plan.filterCategory === 'wealth') return 'BRANDON';
    return 'SARAH LIM';
  }

  trackById(_: number, item: { id: string }): string { return item.id; }

  timelineLabel(type: TimelineType): string {
    return ({ aichat: 'AI Chat', consultation: 'Consultation', proposal: 'Proposal', document: 'Document', email: 'Email', 'direct-message': 'Message' })[type];
  }

  timelineIcon(type: TimelineType): string {
    return ({ aichat: 'sparkles', consultation: 'calendar', proposal: 'document-text', document: 'folder-open', email: 'mail', 'direct-message': 'chatbubble' })[type];
  }

  relativeTime(iso: string): string {
    const timestamp = new Date(iso).getTime();
    if (!Number.isFinite(timestamp)) return '';
    const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private async loadPlans(): Promise<void> {
    try {
      await this.policyData.ensureLoaded();
      this.rankPlans(this.recommendationProfile);
    } finally {
      this.plansLoading = false;
    }
  }

  private connectAccount(account: UserRecord | null): void {
    this.authResolved = true;
    this.chatCountSubscription?.unsubscribe();
    this.chatCountSubscription = undefined;
    this.accountSubscriptions.unsubscribe();
    this.accountSubscriptions = new Subscription();
    this.activeUser = account;
    this.timeline = [];
    this.meetings = [];
    this.customers = [];
    this.chatCount = 0;
    this.unreadCount = 0;
    this.dataError = '';
    this.timelineLoading = !!account;
    this.meetingsLoading = !!account;
    this.chatCountLoading = !!account?.id && account.role === 'customer';
    this.customersLoading = !!account && account.role === 'consultant';
    this.rankPlans(account);
    if (!account) return;

    this.accountSubscriptions.add(this.workspace.timelineFor(account).subscribe({ next: events => { this.timeline = events; this.unreadCount = events.filter(event => !event.readBy?.includes(account.id)).length; this.timelineLoading = false; }, error: error => { this.timelineLoading = false; this.handleDataError('timeline', error); } }));
    this.accountSubscriptions.add(this.workspace.meetingsFor(account).subscribe({ next: meetings => { this.meetings = meetings; this.meetingsLoading = false; }, error: error => { this.meetingsLoading = false; this.handleDataError('meetings', error); } }));
    if (account.role === 'customer') this.connectChatCount(account.id);
    if (account.role === 'consultant') {
      this.accountSubscriptions.add(this.workspace.customers().subscribe({
        next: customers => {
          this.customers = customers;
          this.customersLoading = false;
          if (!customers.some(client => client.id === this.selectedClientId)) this.selectedClientId = customers[0]?.id ?? '';
          this.rankPlans(this.selectedClient ?? null);
        },
        error: error => { this.customersLoading = false; this.handleDataError('customers', error); },
      }));
    }
  }

  private handleDataError(source: string, error: unknown): void {
    console.error('[Tab3] Firebase ' + source + ' listener failed:', error);
    this.dataError = 'Could not load ' + source + ' updates. Check Firebase permissions and try again.';
  }
  private rankPlans(profile: UserRecord | null): void {
    const plans = this.policyData.getPlans();
    this.policies = plans
      .map(plan => this.scorePlan(plan, profile))
      .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name));
    const bestMatch = this.policies[0];
    if (!this.policies.some(plan => plan.id === this.selectedPolicyId)) this.selectedPolicyId = bestMatch?.id ?? '';
    this.assignedAdvisorName = bestMatch ? this.advisorForPlan(bestMatch) : '';
  }

  private scorePlan(plan: Plan, profile: UserRecord | null): RankedPlan {
    if (!profile) return { ...plan, matchScore: 60, matchReasons: ['Review this plan against your completed profile.'] };

    const goals = [...(profile.mainGoals ?? []), ...(profile.financialPriorities ?? []), profile.topConcern ?? '']
      .join(' ').toLowerCase();
    const planText = [plan.name, plan.category, plan.filterCategory, plan.filterCoverage, plan.description, ...(plan.bestFor ?? []), ...(plan.covered ?? [])]
      .join(' ').toLowerCase();
    const reasons: string[] = [];
    let score = 42;

    const needs: Array<{ terms: string[]; category: Plan['filterCategory']; label: string }> = [
      { terms: ['health', 'medical', 'hospital'], category: 'health', label: 'your health and medical protection needs' },
      { terms: ['critical', 'illness', 'ci'], category: 'ci', label: 'your critical illness concerns' },
      { terms: ['family', 'dependent', 'income', 'life', 'protection'], category: 'life', label: 'your family and income protection goals' },
      { terms: ['saving', 'retirement', 'wealth', 'education'], category: 'wealth', label: 'your long-term savings goals' },
    ];
    for (const need of needs) {
      if (need.terms.some(term => goals.includes(term)) && (plan.filterCategory === need.category || need.terms.some(term => planText.includes(term)))) {
        score += 28;
        reasons.push(`Supports ${need.label}.`);
        break;
      }
    }

    const premium = this.extractMonthlyPremium(plan.premium);
    const budget = Number(profile.monthlyBudget || 0);
    if (budget && premium !== null) {
      if (premium <= budget) {
        score += 20;
        reasons.push(`Fits within your S$${budget} monthly budget.`);
      } else {
        score -= 18;
        reasons.push(`Costs more than your S$${budget} monthly budget; review affordability with an adviser.`);
      }
    }

    const existing = (profile.existingPlans ?? []).map(item => `${item.name} ${item.insurer ?? ''}`).join(' ').toLowerCase();
    const likelyDuplicate = !!existing && (existing.includes(plan.name.toLowerCase()) || (plan.filterCategory === 'health' && /shield|health|medical/.test(existing)) || (plan.filterCategory === 'life' && /life|term/.test(existing)));
    if (likelyDuplicate) {
      score -= 20;
      reasons.push('May overlap with existing coverage, so a gap review is recommended.');
    } else if (profile.hasExistingInsurance) {
      score += 8;
      reasons.push('Adds a different coverage area from the plans listed in your profile.');
    }

    if ((profile.dependents ?? 0) > 0 && (plan.filterCategory === 'life' || plan.filterCategory === 'ci')) {
      score += 10;
      reasons.push('Provides relevant protection for someone with dependants.');
    }
    if (!reasons.length) reasons.push('A general option to discuss after reviewing your coverage gaps.');

    return { ...plan, matchScore: Math.max(20, Math.min(98, score)), matchReasons: reasons.slice(0, 3) };
  }

  private extractMonthlyPremium(value: string): number | null {
    const amount = Number(value.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amount)) return null;
    if (/year|annual|\/yr/i.test(value)) return amount / 12;
    return amount;
  }

  private connectChatCount(userId: string): void {
    this.chatCountSubscription?.unsubscribe();
    this.chatCount = 0;
    this.chatCountSubscription = this.workspace.chatCount(userId).subscribe({
      next: count => { this.chatCount = count; this.chatCountLoading = false; },
      error: error => {
        console.warn('[Tab3] Saved AI chat count is unavailable:', error);
        this.chatCount = 0;
        this.chatCountLoading = false;
      },
    });
  }

  private singaporeDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
    return `${value('year')}-${value('month')}-${value('day')}`;
  }
}
