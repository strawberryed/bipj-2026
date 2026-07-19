import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookMeetingPage } from './book-meeting.page';

describe('BookMeetingPage', () => {
  let component: BookMeetingPage;
  let fixture: ComponentFixture<BookMeetingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BookMeetingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
