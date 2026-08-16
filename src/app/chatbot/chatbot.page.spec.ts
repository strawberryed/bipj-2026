import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { ChatbotPage } from './chatbot.page';
import { PolicyDataService } from '../services/policy-data';


describe('ChatbotPage', () => {
  let component: ChatbotPage;
  let fixture: ComponentFixture<ChatbotPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChatbotPage],
      imports: [IonicModule.forRoot(), ExploreContainerComponentModule],
      providers: [{ provide: PolicyDataService, useValue: { ensureLoaded: async () => undefined, getPlans: () => [] } }]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
