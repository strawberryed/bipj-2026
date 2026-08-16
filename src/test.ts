// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ChatStorageService } from './app/services/chat-storage.service';
import { GeminiService } from './app/services/gemini.service';
import { UserProfileService } from './app/services/user-profile.service';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Keep generated component smoke tests isolated from external Firebase/Gemini
// infrastructure. Individual service tests can override these defaults when
// they need to exercise the real implementation.
beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    providers: [
      { provide: Firestore, useValue: {} },
      { provide: Functions, useValue: {} },
      {
        provide: Auth,
        useValue: {
          currentUser: null,
          onAuthStateChanged: (next: (user: null) => void) => {
            next(null);
            return () => undefined;
          },
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } },
          params: of({}),
          queryParams: of({}),
        },
      },
      {
        provide: UserProfileService,
        useValue: {
          authUser$: of(null),
          userProfile$: of(null),
          currentUserId: null,
          getCurrentProfile: () => null,
        },
      },
      { provide: GeminiService, useValue: {} },
      {
        provide: ChatStorageService,
        useValue: { loadChat: async () => [], appendMessage: async () => undefined },
      },
    ],
  });
});
