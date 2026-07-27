import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CompareCard, GeminiService, Message, ReplyBlock } from '../services/gemini.service';
import { POLICIES, PLANS, Plan } from '../../data/policies';
import jsPDF from 'jspdf';
import { AlertController } from '@ionic/angular';
import { DEMO_PROFILES, DEFAULT_PROFILE_ID, DemoProfile } from '../../data/demoProfiles';
import { clearChatHistory, getChatHistory, getCurrentUser, saveChatHistory } from '../../data/app-db';

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

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls: ['./chatbot.page.scss'],
  standalone: false,
})
export class ChatbotPage implements AfterViewChecked, OnInit {

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  // Demo profiles
  demoProfiles = DEMO_PROFILES;
  activeProfile: DemoProfile = DEMO_PROFILES.find(p => p.id === DEFAULT_PROFILE_ID)!;

  messages: Message[] = [];
  inputText = '';
  isLoading = false;
  isGeneratingSummary = false;
  chips: string[] = [];

  // Compare sheet
  isCompareOpen = false;
  selectedPlans: Plan[] = [];
  categories = ['Health Protection', 'Life Protection', 'Critical Illness', 'Wealth Accumulation'];
  currentCategoryLabel = 'Health Protection';

  private lastMessageCount = 0;
  private currentUser = getCurrentUser();

  constructor(
    private gemini: GeminiService,
    private alertCtrl: AlertController
  ) { }

  ngOnInit() {
    this.chips = [...this.activeProfile.defaultChips];
    this.loadChat();
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
    saveChatHistory(this.currentUser?.id, this.messages.slice(-MAX_HISTORY));
  }

  loadChat() {
    this.currentUser = getCurrentUser();
    this.messages = getChatHistory(this.currentUser?.id) as Message[];
  }

  reset() {
    this.messages = [];
    this.chips = [...this.activeProfile.defaultChips];
    clearChatHistory(this.currentUser?.id);
  }

  // ─────────────────────────────────────────────────────────
  // Profile Switching
  // ─────────────────────────────────────────────────────────

  switchProfile(profileId: string) {
    if (profileId === this.activeProfile.id) return;

    const profile = DEMO_PROFILES.find(p => p.id === profileId);
    if (!profile) {
      console.warn(`[ChatbotPage] Profile "${profileId}" not found`);
      return;
    }

    this.activeProfile = profile;
    this.chips = [...profile.defaultChips];
    // Chat history is intentionally shared across profiles by design.
    // Future responses use the new profile's lens (budget, concerns, etc.).
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
      const res = await this.gemini.sendMessage(message, history, this.activeProfile);

      if (Array.isArray(res.reply)) {
        this.messages.push({
          role: 'assistant',
          content: '',
          blocks: res.reply as ReplyBlock[]
        });
      } else {
        this.messages.push({
          role: 'assistant',
          content: res.reply as string
        });
      }

      if (res.chips?.length) this.chips = res.chips;

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

  onCategoryChange() {
    this.selectedPlans = [];
  }

  get currentPlans(): Plan[] {
    const key = CATEGORY_MAP[this.currentCategoryLabel];
    return POLICIES[key] ?? [];
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
      // Pass history EXCLUDING the current trigger message, matching send() pattern
      const history = this.messages.slice(0, -1);
      const res = await this.gemini.compareMessage(this.selectedPlans, history, this.activeProfile);

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
        }
      });

      if (res.chips?.length) this.chips = res.chips;
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

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30);
    doc.text('Cova Insurance Summary', PDF_MARGIN, y);
    y += 8;

    // Meta
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      PDF_MARGIN, y
    );
    y += 4;
    doc.text(`Prepared for: ${this.activeProfile.name}, ${this.activeProfile.age}`, PDF_MARGIN, y);
    y += 10;

    // Divider
    doc.setDrawColor(220);
    doc.line(PDF_MARGIN, y, doc.internal.pageSize.getWidth() - PDF_MARGIN, y);
    y += 10;

    // Body
    doc.setTextColor(30);
    const lines = summaryText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        y += 4;
        continue;
      }

      // Page break check before drawing
      if (y > PDF_USABLE_HEIGHT) {
        doc.addPage();
        y = PDF_MARGIN;
      }

      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
        // Section header
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
        // Body text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(60);

        const wrapped = doc.splitTextToSize(trimmed, maxWidth);
        const blockHeight = wrapped.length * 6;

        // Page break if this block won't fit
        if (y + blockHeight > PDF_USABLE_HEIGHT) {
          doc.addPage();
          y = PDF_MARGIN;
        }

        doc.text(wrapped, PDF_MARGIN, y);
        y += blockHeight + 1;
      }
    }

    // Footer disclaimer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text(
      'This summary was generated by Cova and is for reference purposes only. Please consult a Prudential advisor before making any financial decisions.',
      PDF_MARGIN, 285, { maxWidth }
    );

    doc.save(`cova-summary-${this.activeProfile.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
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
