import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { GeminiService, Message } from '../services/gemini.service';
import { POLICIES, PLANS, Plan } from '../../data/policies';


@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements AfterViewChecked {

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

    // slice AFTER pushing, so history excludes the message just added
    const history = this.messages.slice(0, -1);

    try {
      const res = await this.gemini.sendMessage(message, history); // use history, not this.messages

      this.messages.push({ role: 'assistant', content: res.reply });

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
      this.messages.push({ role: 'assistant', content: res.reply });
      if (res.chips?.length) this.chips = res.chips;
    } catch (e) {
      this.messages.push({ role: 'assistant', content: "Sorry, couldn't run the comparison. Try again?" });
    }
    this.isLoading = false;
    this.selectedPlans = [];
  }
}