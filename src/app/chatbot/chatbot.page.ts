import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit, OnDestroy, inject } from '@angular/core';
import { CompareCard, GeminiService, Message, ReplyBlock } from '../services/gemini.service';
import { UserProfileData, UserProfileService } from '../services/user-profile.service';
import { PolicyDataService, Plan } from '../services/policy-data';
import { ChatStorageService } from '../services/chat-storage.service';
import { Subscription } from 'rxjs';
import jsPDF from 'jspdf';
import { AlertController } from '@ionic/angular';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;
const MAX_COMPARE_PLANS = 3;
const CHAT_RESET_VERSION = 'fresh-chat-2026-08-06-v1';

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

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const DEFAULT_CHIPS = [
  'What does PRUShield cover?',
  'Do I need critical illness coverage?',
  'What is a deductible?',
  'How much coverage do I need?'
];

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.page.html',
  styleUrls: ['./chatbot.page.scss'],
  standalone: false,
})
export class ChatbotPage implements AfterViewChecked, OnInit, OnDestroy {
  private gemini = inject(GeminiService);
  private profileService = inject(UserProfileService);
  private policyData = inject(PolicyDataService);
  private chatStorage = inject(ChatStorageService);
  private alertCtrl = inject(AlertController);


  @ViewChild('messagesEnd') messagesEnd!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  isAuthReady = false;
  // Current user's profile — kept in sync via userProfile$ subscription
  // to teammate's UserProfileService (auth-scoped and Firestore-backed).
  profile: UserProfileData = { fullName: 'Guest' };
  currentUid: string | null = null;
  private profileSub?: Subscription;

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

  // Plan detail modal (for tappable planCard blocks in AI replies)
  isPlanDetailOpen = false;
  selectedPlanDetail: Plan | null = null;

  // True while policy data is being fetched from Firestore on first load.
  isPolicyDataLoading = true;

  private lastMessageCount = 0;

  async ngOnInit() {
    // NEW: get UID immediately from auth state, not from the Firestore profile pipe
    this.profileService.authUser$.subscribe(authUser => {
      const uid = authUser?.uid ?? null;
      const uidChanged = uid !== this.currentUid;
      this.currentUid = uid;
      this.isAuthReady = true;   // auth has resolved at least once

      if (uidChanged || (uid && this.messages.length === 0)) {
        void this.startChatSession(uid);
      }
    });

    // Keep the existing profile subscription for name/avatar/etc.
    this.profileSub = this.profileService.userProfile$.subscribe(profileData => {
      this.profile = profileData ?? { fullName: 'Guest' };
    });

    await this.policyData.ensureLoaded();
    this.isPolicyDataLoading = false;
  }

  ngOnDestroy() {
    this.profileSub?.unsubscribe();
  }

  ngAfterViewChecked() {
    if (this.messages.length !== this.lastMessageCount) {
      this.lastMessageCount = this.messages.length;
      this.scrollToBottom();
    }
  }

  // ─────────────────────────────────────────────────────────
  // Chat Persistence (per-user Firestore subcollection via ChatStorageService)
  // ─────────────────────────────────────────────────────────

  /** Appends a single new message to the user's Firestore chat history. */
  private async persistMessage(message: Message) {
    await this.chatStorage.appendMessage(this.currentUid, message);
  }

  /** Loads the user's chat history from Firestore into this.messages. */
  async loadChat() {
    this.messages = await this.chatStorage.loadChat(this.currentUid, MAX_HISTORY);
  }

  private async startChatSession(uid: string | null): Promise<void> {
    if (!uid) {
      this.messages = [];
      return;
    }

    // Only reset local UI state on version change — NEVER wipe Firestore
    const resetKey = `cova_chat_reset_${CHAT_RESET_VERSION}_${uid}`;
    if (!localStorage.getItem(resetKey)) {
      localStorage.setItem(resetKey, 'done');
      this.messages = [];
      this.chips = [...DEFAULT_CHIPS];
    }

    await this.loadChat();
  }

  async reset() {
    this.messages = [];
    this.chips = [...DEFAULT_CHIPS];
    await this.chatStorage.clearChat(this.currentUid);
  }

  // ─────────────────────────────────────────────────────────
  // Profile updates (agentic profile-building)
  // ─────────────────────────────────────────────────────────

  private async applyProfileUpdate(update?: Record<string, any>) {
    if (!update || !this.currentUid) return;
    try {
      // Special-case existingPlans: Firestore merge treats arrays as scalars
      // (replaces the whole array), but semantically the AI's extraction
      // should ADD to the user's existing list, not replace it. So we merge
      // manually here with a case-insensitive de-dupe on plan name.
      const merged = { ...update };
      if (Array.isArray(update['existingPlans'])) {
        const freshProfile = await this.profileService.getCurrentProfile();
        const currentPlans = freshProfile?.existingPlans ?? [];
        const existingNames = new Set(currentPlans.map(p => p.name.toLowerCase().trim()));
        const newPlans = update['existingPlans'].filter(
          (p: any) => p?.name && !existingNames.has(p.name.toLowerCase().trim())
        );
        merged['existingPlans'] = [...currentPlans, ...newPlans];
      }

      await this.profileService.updateProfile(merged);
      console.log('[ChatbotPage] Profile updated:', merged);
      // userProfile$ subscription above will fire and refresh this.profile
      // automatically once Firestore emits the updated document.
    } catch (err) {
      console.error('[ChatbotPage] Failed to persist profile update:', err);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Messaging
  // ─────────────────────────────────────────────────────────

  async send(text?: string) {
    const message = (text ?? this.inputText).trim();
    if (!message || this.isLoading) return;

    if (!this.currentUid) {
      await this.showErrorAlert('Please log in to save chat history.');
      return;
    }

    this.inputText = '';
    this.isLoading = true;

    const userMsg: Message = { role: 'user', content: message };
    this.messages.push(userMsg);
    await this.persistMessage(userMsg);

    const history = this.messages.slice(0, -1);

    try {
      // Read profile fresh from Firestore to avoid stale/guest data
      // from the userProfile$ subscription not having emitted yet.
      const liveProfile = await this.profileService.getCurrentProfile() ?? this.profile;
      console.log('[send] liveProfile being sent to Gemini:', liveProfile);
      const res = await this.gemini.sendMessage(message, history, liveProfile);

      const newMessage: Message = Array.isArray(res.reply)
        ? { role: 'assistant', content: '', blocks: res.reply as ReplyBlock[] }
        : { role: 'assistant', content: res.reply as string };

      if (res.followUpQuestion) {
        newMessage.followUpQuestion = res.followUpQuestion;
      }

      this.messages.push(newMessage);
      await this.persistMessage(newMessage);

      if (res.chips?.length) this.chips = res.chips;
      await this.applyProfileUpdate(res.profileUpdate);

    } catch (e) {
      console.error('[ChatbotPage] sendMessage failed:', e);
      const errorMsg: Message = {
        role: 'assistant',
        content: "Sorry, something went wrong. Try again?"
      };
      this.messages.push(errorMsg);
      await this.persistMessage(errorMsg);
    }

    this.isLoading = false;
  }

  // ─────────────────────────────────────────────────────────
  // Document upload (policy document photo/PDF explanation)
  // ─────────────────────────────────────────────────────────

  triggerFileUpload() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // reset so selecting the same file again still fires change
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      await this.showErrorAlert('Please upload a JPG, PNG, WEBP image, or a PDF file.');
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      await this.showErrorAlert('File is too large. Please upload a file under 10MB.');
      return;
    }

    const attachmentType: 'image' | 'pdf' = file.type === 'application/pdf' ? 'pdf' : 'image';

    const uploadMsg: Message = {
      role: 'user',
      content: '',
      attachment: { name: file.name, type: attachmentType }
    };
    this.messages.push(uploadMsg);
    await this.persistMessage(uploadMsg);

    this.isLoading = true;

    try {
      const base64Data = await this.fileToBase64(file);

      const liveProfile = await this.profileService.getCurrentProfile() ?? this.profile;
      const res = await this.gemini.analyzeDocument(base64Data, file.type, liveProfile);

      const newMessage: Message = Array.isArray(res.reply)
        ? { role: 'assistant', content: '', blocks: res.reply as ReplyBlock[] }
        : { role: 'assistant', content: res.reply as string };

      if (res.followUpQuestion) {
        newMessage.followUpQuestion = res.followUpQuestion;
      }

      this.messages.push(newMessage);
      await this.persistMessage(newMessage);

      if (res.chips?.length) this.chips = res.chips;
      await this.applyProfileUpdate(res.profileUpdate);

    } catch (e) {
      console.error('[ChatbotPage] analyzeDocument failed:', e);
      const errorMsg: Message = {
        role: 'assistant',
        content: "Sorry, I couldn't process that document. Try again?"
      };
      this.messages.push(errorMsg);
      await this.persistMessage(errorMsg);
    }

    this.isLoading = false;
  }

  /** Converts a File to a raw base64 string (strips the data: URL prefix). */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] ?? '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ─────────────────────────────────────────────────────────
  // Comparison
  // ─────────────────────────────────────────────────────────

  openCompare() { this.isCompareOpen = true; }
  closeCompare() { this.isCompareOpen = false; }

  /**
   * Looks up full plan details via PolicyDataService — never trusts
   * anything the AI wrote beyond the planId reference, so the modal
   * always shows real, accurate figures.
   */
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
    const userMsg: Message = { role: 'user', content: `Compare ${names}` };
    this.messages.push(userMsg);
    await this.persistMessage(userMsg);

    this.isLoading = true;
    try {
      const history = this.messages.slice(0, -1);
      const liveProfile = await this.profileService.getCurrentProfile() ?? this.profile;
      const res = await this.gemini.compareMessage(this.selectedPlans, history, liveProfile);

      const rows = [
        { label: 'Monthly premium', values: this.selectedPlans.map(p => p.premium) },
        { label: 'Best for', values: this.selectedPlans.map(p => p.bestFor.join(', ')) },
        { label: 'Covers', values: this.selectedPlans.map(p => p.covered.join(', ')) },
        { label: 'Does not cover', values: this.selectedPlans.map(p => p.notCovered.join(', ')) }
      ];

      const compareMsg: Message = {
        role: 'assistant',
        content: res.reply as string,
        compareCard: {
          plans: [...this.selectedPlans],
          rows,
          fitScores: res.fitScores
        },
        followUpQuestion: res.followUpQuestion
      };
      this.messages.push(compareMsg);
      await this.persistMessage(compareMsg);

      if (res.chips?.length) this.chips = res.chips;
      await this.applyProfileUpdate(res.profileUpdate);
    } catch (e) {
      console.error('[ChatbotPage] compareMessage failed:', e);
      const errorMsg: Message = {
        role: 'assistant',
        content: "Sorry, couldn't run the comparison. Try again?"
      };
      this.messages.push(errorMsg);
      await this.persistMessage(errorMsg);
    }

    this.isLoading = false;
    this.selectedPlans = [];
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
    doc.text(`Prepared for: ${this.profile.fullName}`, PDF_MARGIN, y);
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

    doc.save(`cova-summary-${this.profile.fullName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
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