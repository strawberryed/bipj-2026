import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookMeetingPage } from './book-meeting.page';
import { BookMeetingPageModule } from './book-meeting.module';

describe('BookMeetingPage', () => {
  let component: BookMeetingPage;
  let fixture: ComponentFixture<BookMeetingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BookMeetingPageModule] }).compileComponents();

    fixture = TestBed.createComponent(BookMeetingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
