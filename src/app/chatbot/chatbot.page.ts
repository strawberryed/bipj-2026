import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy } from '@angular/core';
import { CompareCard, GeminiService, Message, ReplyBlock } from '../services/gemini.service';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';
import { PolicyDataService, Plan } from '../services/policy-data';
import jsPDF from 'jspdf';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;
const MAX_COMPARE_PLANS = 3;

const PDF_PAGE_HEIGHT = 297;   // A4 mm
const PDF_MARGIN = 16;
const PDF_BOTTOM_MARGIN = 20;
const PDF_USABLE_HEIGHT = PDF_PAGE_HEIGHT - PDF_MARGIN - PDF_BOTTOM_MARGIN;

const CATEGORY_MAP: Record<string, string> = {
  'Health Protection': 'health',
  'Life Protection': 'life',
  'Critical Illness': 'ci',
  'Wealth Accumulation': 'wealth'
};

const DEFAULT_CHIPS = [
  'What does PRUShield cover?',
  'Do I need critical illness coverage?',
  'What is a deductible?',
  'How much coverage do I need?'
];

const CHAT_STORAGE_KEY = 'cova_chat_history_v1';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls: ['./chatbot.page.scss'],
  standalone: false,
})
export class ChatbotPage implements AfterViewChecked, OnInit, OnDestroy {

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  // Active user profile state from UserProfileService
  profile: UserProfileData = {
    fullName: 'Guest User',
    age: 25,
    occupation: 'Working Adult',
    monthlyIncome: 3000,
    maritalStatus: 'Single',
    dependents: 0,
    hasExistingInsurance: false,
    mainGoals: ['Health Protection'],
    monthlyBudget: 200
  };

  messages: Message[] = [];
  inputText = '';
  isLoading = false;
  isGeneratingSummary = false;
  chips: string[] = [...DEFAULT_CHIPS];

  // Compare sheet
  isCompareOpen = false;
  selectedPlans: Plan[] = [];
  categories = ['Health Protection', 'Life Protection', 'Critical Illness', 'Wealth Accumulation'];
  currentCategoryLabel = 'Health Protection';

  // Plan detail modal
  isPlanDetailOpen = false;
  selectedPlanDetail: Plan | null = null;

  // Policy loading state
  isPolicyDataLoading = true;

  private lastMessageCount = 0;
  private profileSub?: Subscription;

  constructor(
    private gemini: GeminiService,
    private profileService: UserProfileService,
    private policyData: PolicyDataService,
    private alertCtrl: AlertController
  ) { }

  async ngOnInit() {
    this.loadChat();

    // Subscribe to live user profile changes from Firestore via UserProfileService
    this.profileSub = this.profileService.userProfile$.subscribe((data) => {
      if (data) {
        this.profile = { ...this.profile, ...data };
      }
    });

    // Ensure policy data is ready
    await this.policyData.ensureLoaded();
    this.isPolicyDataLoading = false;
  }

  ngOnDestroy() {
    if (this.profileSub) {
      this.profileSub.unsubscribe();
    }
  }

  ngAfterViewChecked() {
    if (this.messages.length !== this.lastMessageCount) {
      this.lastMessageCount = this.messages.length;
      this.scrollToBottom();
    }
  }

  // ─────────────────────────────────────────────────────────
  // Chat Persistence
  // ─────────────────────────────────────────────────────────

  saveChat() {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(this.messages.slice(-MAX_HISTORY)));
  }

  loadChat() {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    this.messages = saved ? JSON.parse(saved) : [];
  }

  reset() {
    this.messages = [];
    this.chips = [...DEFAULT_CHIPS];
    localStorage.removeItem(CHAT_STORAGE_KEY);
  }

  // ─────────────────────────────────────────────────────────
  // Profile updates (agentic profile-building)
  // ─────────────────────────────────────────────────────────

  private async applyProfileUpdate(update?: Record<string, string | number | string[]>) {
    if (!update) return;

    try {
      // Persist updates to UserProfileService / Firestore
      await this.profileService.updateProfile(update as Partial<UserProfileData>);
      console.log('[ChatbotPage] Profile updated successfully:', update);
    } catch (err) {
      console.error('[ChatbotPage] Failed to save profile update:', err);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Messaging
  // ─────────────────────────────────────────────────────────

  async send(text?: string) {
    const message = (text ?? this.inputText).trim();
    if (!message || this.isLoading) return;

    this.inputText = '';
    this.isLoading = true;
    this.messages.push({ role: 'user', content: message });

    const history = this.messages.slice(0, -1);

    try {
      const res = await this.gemini.sendMessage(message, history, this.profile);

      const newMessage: Message = Array.isArray(res.reply)
        ? { role: 'assistant', content: '', blocks: res.reply as ReplyBlock[] }
        : { role: 'assistant', content: res.reply as string };

      if (res.followUpQuestion) {
        newMessage.followUpQuestion = res.followUpQuestion;
      }

      this.messages.push(newMessage);

      if (res.chips?.length) this.chips = res.chips;
      await this.applyProfileUpdate(res.profileUpdate);

    } catch (e) {
      console.error('[ChatbotPage] sendMessage failed:', e);
      this.messages.push({
        role: 'assistant',
        content: "Sorry, something went wrong. Try again?"
      });
    }

    this.isLoading = false;
    this.saveChat();
  }

  // ─────────────────────────────────────────────────────────
  // Comparison
  // ─────────────────────────────────────────────────────────

  openCompare() { this.isCompareOpen = true; }
  closeCompare() { this.isCompareOpen = false; }

  getPlanById(planId: string): Plan | undefined {
    return this.policyData.getPlanById(planId);
  }

  openPlanDetail(planId: string) {
    const plan = this.getPlanById(planId);
    if (!plan) {
      console.warn('[ChatbotPage] planCard tapped with unknown planId:', planId);
      return;
    }
    this.selectedPlanDetail = plan;
    this.isPlanDetailOpen = true;
  }

  closePlanDetail() {
    this.isPlanDetailOpen = false;
    this.selectedPlanDetail = null;
  }

  onCategoryChange() {
    this.selectedPlans = [];
  }

  get currentPlans(): Plan[] {
    const key = CATEGORY_MAP[this.currentCategoryLabel];
    return this.policyData.getPolicies()[key] ?? [];
  }

  togglePlan(plan: Plan) {
    const idx = this.selectedPlans.findIndex(p => p.id === plan.id);
    if (idx > -1) {
      this.selectedPlans.splice(idx, 1);
    } else {
      if (this.selectedPlans.length >= MAX_COMPARE_PLANS) return;
      this.selectedPlans.push(plan);
    }
  }

  isPlanSelected(plan: Plan): boolean {
    return this.selectedPlans.some(p => p.id === plan.id);
  }

  async runComparison() {
    if (this.selectedPlans.length < 2) return;
    this.closeCompare();

    const names = this.selectedPlans.map(p => p.name).join(' and ');
    this.messages.push({ role: 'user', content: `Compare ${names}` });

    this.isLoading = true;
    try {
      const history = this.messages.slice(0, -1);
      const res = await this.gemini.compareMessage(this.selectedPlans, history, this.profile);

      const rows = [
        { label: 'Monthly premium', values: this.selectedPlans.map(p => p.premium) },
        { label: 'Best for', values: this.selectedPlans.map(p => p.bestFor.join(', ')) },
        { label: 'Covers', values: this.selectedPlans.map(p => p.covered.join(', ')) },
        { label: 'Does not cover', values: this.selectedPlans.map(p => p.notCovered.join(', ')) }
      ];

      this.messages.push({
        role: 'assistant',
        content: res.reply as string,
        compareCard: {
          plans: [...this.selectedPlans],
          rows,
          fitScores: res.fitScores
        },
        followUpQuestion: res.followUpQuestion
      });

      if (res.chips?.length) this.chips = res.chips;
      await this.applyProfileUpdate(res.profileUpdate);
    } catch (e) {
      console.error('[ChatbotPage] compareMessage failed:', e);
      this.messages.push({
        role: 'assistant',
        content: "Sorry, couldn't run the comparison. Try again?"
      });
    }

    this.isLoading = false;
    this.selectedPlans = [];
    this.saveChat();
  }

  getFitScore(card: CompareCard, planId: string): number {
    return card.fitScores?.find(f => f.planId === planId)?.score ?? 0;
  }

  async showFitReason(card: CompareCard, planId: string) {
    const fit = card.fitScores?.find(f => f.planId === planId);
    if (!fit) return;

    const alert = await this.alertCtrl.create({
      header: `${fit.score}% Fit`,
      message: fit.reason,
      buttons: ['Got it']
    });
    await alert.present();
  }

  // ─────────────────────────────────────────────────────────
  // Summary & PDF
  // ─────────────────────────────────────────────────────────

  async downloadSummary() {
    if (this.messages.length === 0) return;

    this.isGeneratingSummary = true;
    try {
      const summaryText = await this.gemini.generateSummary(this.messages);
      this.buildPDF(summaryText);
    } catch (e) {
      console.error('[ChatbotPage] Summary generation failed:', e);
      await this.showErrorAlert('Could not generate summary. Please try again.');
    }
    this.isGeneratingSummary = false;
  }

  private async showErrorAlert(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Oops',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private buildPDF(summaryText: string) {
    const doc = new jsPDF();
    const maxWidth = doc.internal.pageSize.getWidth() - PDF_MARGIN * 2;
    let y = 20;

    const userName = this.profile.fullName || 'User';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30);
    doc.text('Cova Insurance Summary', PDF_MARGIN, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      PDF_MARGIN, y
    );
    y += 4;
    doc.text(`Prepared for: ${userName}`, PDF_MARGIN, y);
    y += 10;

    doc.setDrawColor(220);
    doc.line(PDF_MARGIN, y, doc.internal.pageSize.getWidth() - PDF_MARGIN, y);
    y += 10;

    doc.setTextColor(30);
    const lines = summaryText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        y += 4;
        continue;
      }

      if (y > PDF_USABLE_HEIGHT) {
        doc.addPage();
        y = PDF_MARGIN;
      }

      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(124, 92, 191);
        doc.text(trimmed, PDF_MARGIN, y);
        y += 7;

        doc.setDrawColor(220);
        doc.line(PDF_MARGIN, y, doc.internal.pageSize.getWidth() - PDF_MARGIN, y);
        y += 5;
        doc.setTextColor(30);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(60);

        const wrapped = doc.splitTextToSize(trimmed, maxWidth);
        const blockHeight = wrapped.length * 6;

        if (y + blockHeight > PDF_USABLE_HEIGHT) {
          doc.addPage();
          y = PDF_MARGIN;
        }

        doc.text(wrapped, PDF_MARGIN, y);
        y += blockHeight + 1;
      }
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text(
      'This summary was generated by Cova and is for reference purposes only. Please consult a Prudential advisor before making any financial decisions.',
      PDF_MARGIN, 285, { maxWidth }
    );

    doc.save(`cova-summary-${userName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  }

  // ─────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────

  scrollToBottom() {
    try {
      this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
    } catch {
      // Element not yet rendered
    }
  }

  nowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}