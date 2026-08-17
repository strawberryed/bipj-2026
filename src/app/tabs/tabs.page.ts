import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WorkspaceService } from '../services/workspace.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage implements OnInit, OnDestroy {
  private readonly workspace = inject(WorkspaceService);
  private readonly router = inject(Router);
  private readonly subscription = new Subscription();

  isConsultant = false;

  ngOnInit(): void {
    this.subscription.add(this.workspace.currentUser$.subscribe(account => {
      this.isConsultant = account?.role === 'consultant';
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async consultantLogout(): Promise<void> {
    await this.workspace.logout();
    await this.router.navigate(['/auth']);
  }

}
