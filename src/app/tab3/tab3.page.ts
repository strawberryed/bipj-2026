import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Tab3ReactApp } from './tab3.react';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None,
})
export class Tab3Page implements AfterViewInit, OnDestroy {
  @ViewChild('reactHost', { static: true }) reactHost!: ElementRef<HTMLDivElement>;
  private root: Root | null = null;

  ngAfterViewInit(): void {
    this.root = createRoot(this.reactHost.nativeElement);
    this.root.render(createElement(Tab3ReactApp));
  }

  ngOnDestroy(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}
