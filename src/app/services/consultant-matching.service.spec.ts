import { TestBed } from '@angular/core/testing';

import { ConsultantMatchingService } from './consultant-matching.service';

describe('ConsultantMatchingService', () => {
  let service: ConsultantMatchingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConsultantMatchingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
