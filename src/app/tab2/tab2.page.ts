import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { GeminiService, Message, ReplyBlock } from '../services/gemini.service';
import { POLICIES, Plan } from '../../data/policies';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements AfterViewChecked, OnInit {

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  messages: Message[] = [];
  inputText = '';
  isLoading = false;
  isGeneratingSummary = false;
  chips: string[] = [
    'What is a deductible?',
    'Do I need medical coverage?',
    'What does PRUShield cover?',
    'How does co-payment work?'
  ];

  isCompareOpen = false;
  selectedPlans: any[] = [];

  categories = ['Health Protection', 'Life Protection', 'Critical Illness', 'Wealth Accumulation'];
  currentCategoryLabel = 'Health Protection';

  private lastMessageCount = 0;

  constructor(private gemini: GeminiService) { }

  ngOnInit() {
    this.loadChat();
  }

  ngAfterViewChecked() {
    if (this.messages.length !== this.lastMessageCount) {
      this.lastMessageCount = this.messages.length;
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    try {
      this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
    } catch { }
  }

  saveChat() {
    localStorage.setItem('cova_chat', JSON.stringify(this.messages));
  }

  loadChat() {
    const saved = localStorage.getItem('cova_chat');
    if (saved) this.messages = JSON.parse(saved);
  }

  async send(text?: string) {
    const message = (text ?? this.inputText).trim();
    if (!message || this.isLoading) return;

    this.inputText = '';
    this.isLoading = true;
    this.messages.push({ role: 'user', content: message });

    const history = this.messages.slice(0, -1);

    try {
      const res = await this.gemini.sendMessage(message, history);

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
      this.messages.push({ role: 'assistant', content: "Sorry, something went wrong. Try again?" });
    }

    this.isLoading = false;
    this.saveChat();
  }

  reset() {
    this.messages = [];
    this.chips = [
      'What is a deductible?',
      'Do I need medical coverage?',
      'What does PRUShield cover?',
      'How does co-payment work?'
    ];
    localStorage.removeItem('cova_chat');
  }

  openCompare() { this.isCompareOpen = true; }
  closeCompare() { this.isCompareOpen = false; }

  nowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  onCategoryChange() {
    this.selectedPlans = [];
  }

  get currentPlans(): Plan[] {
    const categoryMap: Record<string, string> = {
      'Health Protection': 'health',
      'Life Protection': 'life',
      'Critical Illness': 'ci',
      'Wealth Accumulation': 'wealth'
    };
    const key = categoryMap[this.currentCategoryLabel];
    return POLICIES[key] ?? [];
  }

  togglePlan(plan: Plan) {
    const idx = this.selectedPlans.findIndex(p => p.id === plan.id);
    if (idx > -1) {
      this.selectedPlans.splice(idx, 1);
    } else {
      if (this.selectedPlans.length >= 3) return;
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
      const res = await this.gemini.compareMessage(this.selectedPlans);

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
          rows
        }
      });

      if (res.chips?.length) this.chips = res.chips;
    } catch (e) {
      this.messages.push({ role: 'assistant', content: "Sorry, couldn't run the comparison. Try again?" });
    }

    this.isLoading = false;
    this.selectedPlans = [];
    this.saveChat();
  }

  async downloadSummary() {
    if (this.messages.length === 0) return;
    this.isGeneratingSummary = true;
    try {
      const summaryText = await this.gemini.generateSummary(this.messages); // ← from service
      this.buildPDF(summaryText);
    } catch (e) {
      console.error('Summary generation failed', e);
    }
    this.isGeneratingSummary = false;
  }

  buildPDF(summaryText: string) {
    const doc = new jsPDF();
    const margin = 16;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30);
    doc.text('Cova Insurance Summary', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y);
    y += 10;

    doc.setDrawColor(220);
    doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
    y += 10;

    doc.setTextColor(30);
    const lines = summaryText.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) { y += 4; return; }

      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(124, 92, 191);
        doc.text(trimmed, margin, y);
        y += 7;
        doc.setDrawColor(220);
        doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
        y += 5;
        doc.setTextColor(30);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(60);
        const wrapped = doc.splitTextToSize(trimmed, maxWidth);
        if (y + wrapped.length * 6 > 270) { doc.addPage(); y = 20; }
        doc.text(wrapped, margin, y);
        y += wrapped.length * 6 + 1;
      }
    });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text('This summary was generated by Cova and is for reference purposes only. Please consult a Prudential advisor before making any financial decisions.', margin, 285, { maxWidth });

    doc.save('cova-summary.pdf');
  }
}