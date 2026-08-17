import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);
  private readonly workspace = inject(WorkspaceService);
  private readonly policyData = inject(PolicyDataService);
  private readonly bookingService = inject(BookingService);
  private readonly subscriptions = new Subscription();
  private accountSubscriptions = new Subscription();
  private chatCountSubscription?: Subscription;

  activeUser: UserRecord | null = null;
  timeline: TimelineRecord[] = [];
  meetings: MeetingRecord[] = [];
  applications: ApplicationSubmission[] = [];
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
  selectedMeetingOverride: MeetingRecord | null = null;
  proposalAccepted = false;
  proposalSubmitting = false;
  proposalSubmitError = '';
  applicationSubmission: ApplicationSubmission | null = null;
  selectedSubmittedApplication: ApplicationSubmission | null = null;
  deepAnalysisPlan: RankedPlan | null = null;
  rescheduleOpen = false;
  rescheduleDate = '';
  rescheduleSaving = false;
  rescheduleMessage = '';
  consultantQuestionOpen = false;
  consultantQuestionMeetingId = '';
  consultantQuestionText = '';
  consultantQuestionSaving = false;
  consultantQuestionMessage = '';
  applicationReviewSaving = false;
  applicationReviewMessage = '';
  consultantSignature = '';
  blockedDateInput = '';
  blockedDateReason = '';
  blockingAvailability = false;
  blockedDates: string[] = [];
  consultantView: 'active' | 'completed' = 'active';

  ngOnInit(): void {
    this.subscriptions.add(this.workspace.currentUser$.subscribe({ next: account => this.connectAccount(account), error: error => this.handleDataError('account', error) }));
    this.subscriptions.add(this.route.queryParamMap.subscribe(params => {
      if (params.get('section') === 'meetings') setTimeout(() => document.getElementById('consultant-meetings')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }));
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
  get selectedApplicationPlan(): RankedPlan | undefined {
    const name = this.selectedSubmittedApplication?.planName.trim().toLowerCase();
    return name ? this.policies.find(plan => plan.name.trim().toLowerCase() === name) : undefined;
  }
  get displayedTimeline(): TimelineRecord[] {
    const today = this.singaporeDate(new Date());
    const visibleEvents = this.timeline.filter(item => {
      if (item.channel === 'meeting-question') return false;
      if (item.type !== 'consultation') return true;
      const meetingDate = item.meetingDate || item.detail.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
      return !meetingDate || meetingDate >= today;
    });
    if (!this.isConsultant) return visibleEvents;
    const customerId = this.selectedClient?.id;
    return customerId ? visibleEvents.filter(item => item.customerId === customerId) : [];
  }
  get displayedMeetings(): MeetingRecord[] {
    const today = this.singaporeDate(new Date());
    const currentMeetings = this.meetings.filter(meeting => this.isConsultant && this.consultantView === 'completed'
      ? this.isCompletedMeeting(meeting, today)
      : !this.isCompletedMeeting(meeting, today));
    if (!this.isConsultant) return currentMeetings;
    const customerId = this.selectedClient?.id;
    return customerId ? currentMeetings.filter(meeting => meeting.customerId === customerId) : [];
  }
  get displayedApplications(): ApplicationSubmission[] {
    if (!this.isConsultant) return this.applications;
    const customerId = this.selectedClient?.id;
    return customerId ? this.applications.filter(application => application.customerId === customerId && (this.consultantView === 'completed'
      ? application.status !== 'pending-review'
      : application.status === 'pending-review')) : [];
  }
  private isCompletedMeeting(meeting: MeetingRecord, today: string): boolean {
    return meeting.status === 'completed' || meeting.status === 'cancelled' || (!!meeting.date && meeting.date < today);
  }
  get activityLoading(): boolean { return this.timelineLoading || (this.isConsultant && this.customersLoading); }
  applicationStatusLabel(status: ApplicationSubmission['status'] | undefined): string {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Needs attention';
    return 'Pending review';
  }
  applicationForTimeline(item: TimelineRecord): ApplicationSubmission | undefined {
    const planName = item.policyOptions?.[0]?.toLowerCase();
    return this.applications.find(application => application.planName.toLowerCase() === planName);
  }
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

  tagDescription(label: string): string {
    const lookup = label.trim();
    const descriptions: Record<string, string> = {
      Savings: 'A savings goal focused on building reserves for future needs, emergencies, or long-term plans.',
      Retirement: 'A retirement goal aimed at long-term income and financial independence later in life.',
      'Wealth accumulation': 'A goal to grow invested assets and build long-term financial security.',
      Protection: 'A goal to safeguard the household against major life or financial risks.',
      Education: 'Saving for tuition, study costs, or future learning needs.',
      'Emergency fund': 'Cash reserved for unexpected events or sudden household expenses.',
      'Home purchase': 'Setting aside funds for a property deposit or other home-buying milestone.',
      Travel: 'Planning for holidays, trips, or future mobility goals.',
      'Debt management': 'Reducing or managing borrowing and repayable obligations more effectively.',
      'Income protection': 'Coverage designed to maintain financial stability if income is reduced or interrupted.',
      'Critical illness': 'Cover to help manage major medical events and treatment costs.',
      'Family protection': 'A goal to protect dependants and household stability against major risks.',
      'Health protection': 'A focus on safeguarding health-related costs and medical support.',
      'Long-term wealth': 'A goal to build broader wealth and financial growth over time.',
    };

    return descriptions[lookup] ?? `This profile goal is about ${lookup || 'your stated financial need'}.`;
  }

  selectClient(client: UserRecord): void {
    if (this.selectedClientId === client.id) return;
    this.selectedClientId = client.id;
    this.selectedPolicyId = '';
    this.selectedTimelineItem = null;
    this.deepAnalysisPlan = null;
    this.applicationSubmission = null;
    this.rankPlans(client);
  }
  setConsultantView(view: 'active' | 'completed'): void {
    this.consultantView = view;
    this.selectedSubmittedApplication = null;
    this.selectedTimelineItem = null;
  }
  get consultantSchedule(): MeetingRecord[] {
    return this.displayedMeetings.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }
  meetingCustomerName(meeting: MeetingRecord): string {
    return this.customers.find(customer => customer.id === meeting.customerId)?.name || 'Unknown customer';
  }

  selectPolicy(policy: RankedPlan): void {
    this.selectedPolicyId = policy.id;
    document.querySelector('.recommended-plan-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  openSubmittedApplication(application: ApplicationSubmission): void { this.selectedSubmittedApplication = application; this.applicationReviewMessage = ''; this.consultantSignature = ''; }
  closeSubmittedApplication(): void { this.selectedSubmittedApplication = null; this.applicationReviewMessage = ''; this.consultantSignature = ''; }
  pendingReviewCount(customerId: string): number {
    const pendingApplications = this.applications.filter(item => item.customerId === customerId && item.status === 'pending-review').length;
    const pendingQuestions = this.timeline.filter(item => item.customerId === customerId && item.channel === 'meeting-question' && !item.readBy?.includes(this.activeUser?.id ?? '')).length;
    return pendingApplications + pendingQuestions;
  }
  openNextReview(customer: UserRecord, event?: Event): void {
    event?.stopPropagation();
    this.selectClient(customer);
    const application = this.applications.find(item => item.customerId === customer.id && item.status === 'pending-review');
    if (application) {
      setTimeout(() => document.querySelector('.application-record')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
      this.openSubmittedApplication(application);
      return;
    }
    const question = this.timeline.find(item => item.customerId === customer.id && item.channel === 'meeting-question' && !item.readBy?.includes(this.activeUser?.id ?? ''));
    if (question) {
      setTimeout(() => document.querySelector('#consultant-meetings')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
      this.openTimelineItem(question);
    }
  }
  signatureMatches(): boolean { return this.consultantSignature.trim().toLowerCase() === this.activeUser?.name.trim().toLowerCase(); }
  async reviewApplication(status: 'approved' | 'rejected'): Promise<void> {
    const application = this.selectedSubmittedApplication;
    if (!application || !this.activeUser || !this.isConsultant || this.applicationReviewSaving || (status === 'approved' && application.status === 'approved')) return;
    this.applicationReviewSaving = true;
    this.applicationReviewMessage = '';
    try {
      await this.workspace.reviewApplication(application, this.activeUser, status, this.consultantSignature);
      this.applicationReviewMessage = status === 'approved' ? 'Application approved. The customer has been notified.' : 'Marked as needing attention. The customer has been notified.';
      if (status === 'approved') this.closeSubmittedApplication();
    } catch (error: any) {
      this.applicationReviewMessage = error?.message || 'Could not update this application.';
    } finally { this.applicationReviewSaving = false; }
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

  openPlanComparison(policy?: RankedPlan): void {
    void this.router.navigate(['/tabs/chatbot'], {
      queryParams: { compare: 'true', comparisonPlanId: policy?.id ?? this.selectedPolicy?.id ?? '' }
    });
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
    this.selectedMeetingOverride = null;
    this.selectedTimelineItem = item;
    this.proposalAccepted = false;
    this.applicationSubmission = null;
    this.proposalSubmitError = '';
  }

  closeTimelineItem(): void {
    this.selectedTimelineItem = null;
    this.selectedMeetingOverride = null;
    this.rescheduleOpen = false;
    this.rescheduleMessage = '';
    this.consultantQuestionOpen = false;
    this.consultantQuestionMessage = '';
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
    if (this.selectedMeetingOverride) return this.selectedMeetingOverride;
    if (!this.selectedTimelineItem) return undefined;
    const availableMeetings = this.isConsultant ? this.displayedMeetings : this.meetings;
    if (this.selectedTimelineItem.meetingId) {
      return availableMeetings.find(meeting => meeting.id === this.selectedTimelineItem?.meetingId);
    }
    if (this.selectedTimelineItem.type !== 'consultation') return undefined;
    return availableMeetings.find(meeting =>
      (!!this.selectedTimelineItem?.consultantId && meeting.consultantId === this.selectedTimelineItem.consultantId) ||
      this.selectedTimelineItem?.detail.toLowerCase().includes(meeting.consultantName.toLowerCase())
    ) ?? availableMeetings[0];
  }
  meetingQuestionsFor(meeting: MeetingRecord): TimelineRecord[] {
    return this.timeline
      .filter(item => item.channel === 'meeting-question' && item.meetingId === meeting.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  openMeetingDetails(meeting: MeetingRecord): void {
    this.selectedMeetingOverride = meeting;
    this.selectedTimelineItem = {
      id: `meeting-${meeting.id}`,
      customerId: meeting.customerId,
      consultantId: meeting.consultantId,
      type: 'consultation',
      channel: meeting.channel,
      title: 'Meeting details',
      detail: meeting.specialty,
      meetingId: meeting.id,
      meetingDate: meeting.date,
      createdAt: meeting.updatedAt,
      readBy: [],
    };
    this.consultantQuestionOpen = false;
    this.consultantQuestionMessage = '';
  }
  get selectedMeetingQuestions(): TimelineRecord[] {
    const meeting = this.selectedMeeting;
    return meeting ? this.meetingQuestionsFor(meeting) : [];
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
  reviewProposalApplication(plan: RankedPlan): void {
    const application = this.displayedApplications.find(item =>
      item.planName.trim().toLowerCase() === plan.name.trim().toLowerCase()
    );
    if (application) {
      this.openSubmittedApplication(application);
      return;
    }
    this.proposalSubmitError = 'No customer application is attached to this proposal yet.';
  }
  openChatbot(): void { void this.router.navigate(['/tabs/chatbot']); }

  askAiAboutPlan(plan: Plan): void {
    this.closeTimelineItem();
    void this.router.navigate(['/tabs/chatbot'], { queryParams: { planId: plan.id, question: `I have a question about this proposal.` } });
  }

  askAiAboutMeeting(meeting: MeetingRecord): void {
    const questions = this.meetingQuestionsFor(meeting);
    if (!questions.length) return;
    const question = [
      'Answer the customer questions below for my upcoming consultant meeting.',
      ...questions.map((item, index) => `${index + 1}. ${item.detail}`),
      'Give a clear, accurate response for each question separately. Do not invent questions or add a generic meeting briefing.'
    ].join('\n');
    this.closeTimelineItem();
    void this.router.navigate(['/tabs/chatbot'], { queryParams: { question } });
  }

  askConsultantAboutPlan(plan: RankedPlan): void {
    this.selectedPolicyId = plan.id;
    this.consultantQuestionOpen = true;
    this.consultantQuestionMessage = '';
    this.consultantQuestionMeetingId ||= this.displayedMeetings[0]?.id ?? '';
  }

  askQuestionAboutMeeting(meeting: MeetingRecord): void {
    this.consultantQuestionOpen = true;
    this.consultantQuestionMessage = '';
    this.consultantQuestionMeetingId = meeting.id;
    this.consultantQuestionText = '';
  }

  async submitConsultantQuestion(plan?: RankedPlan): Promise<void> {
    const customer = this.recommendationProfile;
    const meeting = this.displayedMeetings.find(item => item.id === this.consultantQuestionMeetingId);
    const question = this.consultantQuestionText.trim();
    if (!customer || !meeting || !question || this.consultantQuestionSaving) return;
    this.consultantQuestionSaving = true;
    this.consultantQuestionMessage = '';
    try {
      await this.workspace.submitMeetingQuestion(customer, meeting, question, plan?.name ?? '');
      this.consultantQuestionText = '';
      this.consultantQuestionMessage = 'Question sent to your consultant for this meeting.';
    } catch (error) {
      console.error('[Tab3] Could not send consultant question:', error);
      this.consultantQuestionMessage = 'Could not send your question. Please try again.';
    } finally {
      this.consultantQuestionSaving = false;
    }
  }

  async markRead(): Promise<void> {
    if (!this.activeUser) return;
    await this.workspace.markTimelineRead(this.activeUser.id, this.timeline);
    this.unreadCount = 0;
  }

  async saveBlockedDate(): Promise<void> {
    if (!this.activeUser || this.activeUser.role !== 'consultant' || !this.blockedDateInput || this.blockingAvailability) return;
    this.blockingAvailability = true;
    try {
      await this.bookingService.setConsultantAvailability(this.activeUser.id, this.blockedDateInput, true, this.blockedDateReason.trim());
      if (!this.blockedDates.includes(this.blockedDateInput)) {
        this.blockedDates = [...this.blockedDates, this.blockedDateInput].sort();
      }
      this.blockedDateInput = '';
      this.blockedDateReason = '';
    } finally {
      this.blockingAvailability = false;
    }
  }

  onBlockedDateInput(event: Event): void {
    this.blockedDateInput = (event.target as HTMLInputElement).value;
  }

  async clearBlockedDate(date: string): Promise<void> {
    if (!this.activeUser || this.activeUser.role !== 'consultant') return;
    await this.bookingService.setConsultantAvailability(this.activeUser.id, date, false, '');
    this.blockedDates = this.blockedDates.filter(item => item !== date);
  }

  async signOut(): Promise<void> {
    await this.workspace.logout();
    void this.router.navigate(['/tab1']);
  }

  recommendedAdvisor(plan: Plan): string { return this.advisorForPlan(plan); }

  whyPlanFits(plan: RankedPlan): string {
    return plan.matchReasons.slice(0, 2).join(' ');
  }

  private advisorId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  private advisorForPlan(plan: Plan): string {
    if (plan.filterCategory === 'life' || plan.filterCategory === 'ci') return 'JOHNNY LEE';
    if (plan.filterCategory === 'wealth') return 'BOBBY';
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
    this.applications = [];
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
    this.accountSubscriptions.add(this.workspace.applicationsFor(account).subscribe({
      next: applications => {
        this.applications = applications;
        if (account.role === 'consultant') {
          void Promise.all(applications.filter(item => item.status !== 'pending-review').map(item => this.workspace.compactApplicationTimeline(item)));
        }
        if (this.applicationSubmission) {
          this.applicationSubmission = applications.find(item => item.id === this.applicationSubmission?.id) ?? this.applicationSubmission;
        }
      },
      error: error => this.handleDataError('applications', error)
    }));
    if (account.role === 'customer') this.connectChatCount(account.id);
    if (account.role === 'consultant') {
      void this.loadConsultantBlockedDates();
      this.accountSubscriptions.add(this.workspace.customers().subscribe({
        next: customers => {
          this.customers = customers;
          this.customersLoading = false;
          if (!customers.some(client => client.id === this.selectedClientId)) {
            this.selectedClientId = customers[0]?.id ?? '';
            this.selectedPolicyId = '';
          }
          this.rankPlans(this.selectedClient ?? null);
        },
        error: error => { this.customersLoading = false; this.handleDataError('customers', error); },
      }));
    }
  }

  private async loadConsultantBlockedDates(): Promise<void> {
    if (!this.activeUser || this.activeUser.role !== 'consultant') return;
    this.blockedDates = await this.bookingService.getBlockedDates(this.activeUser.id);
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
        reasons.push(`Its ${plan.premium} premium stays within your S$${budget} monthly budget.`);
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
      reasons.push(`It adds ${plan.category.toLowerCase()} coverage without directly duplicating your listed plans.`);
    }

    if ((profile.dependents ?? 0) > 0 && (plan.filterCategory === 'life' || plan.filterCategory === 'ci')) {
      score += 10;
      reasons.push(`Its ${plan.filterCategory === 'life' ? 'income and life' : 'critical illness'} protection is relevant because you support ${profile.dependents} dependant${profile.dependents === 1 ? '' : 's'}.`);
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
