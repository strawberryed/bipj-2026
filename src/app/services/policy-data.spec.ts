import { TestBed } from '@angular/core/testing';

import { PolicyData } from './policy-data';

describe('PolicyData', () => {
  let service: PolicyData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PolicyData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
