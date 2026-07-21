import { Component, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { GeminiService, Message, ReplyBlock } from '../services/gemini.service';
import { POLICIES, PLANS, Plan } from '../../data/policies';
import jsPDF from 'jspdf';


@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, AfterViewChecked {

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  messages: Message[] = [];
  inputText = '';
  isLoading = false;
  chips: string[] = [
    'What is a deductible?',
    'Do I need medical coverage?',
    'What does PRUShield cover?',
    'How does co-payment work?'
  ];

  // Compare sheet
  isCompareOpen = false;
  selectedPlans: any[] = [];

  constructor(
    private gemini: GeminiService,
  ) { }

  ngOnInit() {
    const pendingPrompt = localStorage.getItem('tab2_continue_prompt_v1');
    if (!pendingPrompt) {
      return;
    }

    localStorage.removeItem('tab2_continue_prompt_v1');
    setTimeout(() => {
      this.send(pendingPrompt);
    }, 150);
  }

  private lastMessageCount = 0;

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
        // structured block response
        this.messages.push({
          role: 'assistant',
          content: '',
          blocks: res.reply as ReplyBlock[]
        });
      } else {
        // plain string response
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
  }

  reset() {
    this.messages = [];
    this.chips = [
      'What is a deductible?',
      'Do I need medical coverage?',
      'What does PRUShield cover?',
      'How does co-payment work?'
    ];
  }

  openCompare() { this.isCompareOpen = true; }
  closeCompare() { this.isCompareOpen = false; }

  nowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }


  categories = ['Health Protection', 'Life Protection', 'Critical Illness', 'Wealth Accumulation'];
  currentCategoryLabel = 'Health Protection';

  onCategoryChange() {
    this.selectedPlans = []; // reset selections when category changes
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
      if (this.selectedPlans.length >= 3) return; // max 3
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

      // build the card rows from plan data
      const rows = [
        {
          label: 'Monthly premium',
          values: this.selectedPlans.map(p => p.premium)
        },
        {
          label: 'Best for',
          values: this.selectedPlans.map(p => p.bestFor.join(', '))
        },
        {
          label: 'Covers',
          values: this.selectedPlans.map(p => p.covered.join(', '))
        },
        {
          label: 'Does not cover',
          values: this.selectedPlans.map(p => p.notCovered.join(', '))
        }
      ];

      this.messages.push({
        role: 'assistant',
        content: res.reply as string, // ← add the cast
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
  }


  downloadSummary() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Cova Chat Summary', margin, y);
    y += 8;

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(new Date().toLocaleString(), margin, y);
    y += 10;

    // Divider
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Messages
    this.messages.forEach(msg => {
      const isUser = msg.role === 'user';

      // Role label
      if (isUser) {
        doc.setTextColor(100, 100, 100); // grey for user
      } else {
        doc.setTextColor(124, 92, 191);  // lavender for Cova
      }

      // Content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(30);

      if (msg.blocks) {
        // structured blocks
        msg.blocks.forEach(block => {
          if (block.type === 'header') {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            const lines = doc.splitTextToSize(block.content.toUpperCase(), maxWidth);
            doc.text(lines, margin, y);
            y += lines.length * 5 + 2;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
          } else if (block.type === 'text' || block.type === 'note') {
            const lines = doc.splitTextToSize(block.content, maxWidth);
            doc.text(lines, margin, y);
            y += lines.length * 6 + 2;
          } else if (block.type === 'bullets') {
            block.items.forEach(item => {
              const lines = doc.splitTextToSize(`• ${item}`, maxWidth - 4);
              doc.text(lines, margin + 4, y);
              y += lines.length * 6;
            });
            y += 2;
          }
          // new page if needed
          if (y > 270) { doc.addPage(); y = 20; }
        });
      } else if (msg.content) {
        const lines = doc.splitTextToSize(msg.content, maxWidth);
        doc.text(lines, margin, y);
        y += lines.length * 6;
      }

      y += 6; // gap between messages
      if (y > 270) { doc.addPage(); y = 20; }
    });

    doc.save('cova-chat-summary.pdf');
  }
}