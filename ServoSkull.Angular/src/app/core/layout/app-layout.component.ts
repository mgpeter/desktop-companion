import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app-layout.component.html'
})
export class AppLayoutComponent implements OnInit {
  isDarkMode = false;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) return;

    // Check localStorage first
    if (localStorage['theme'] === 'dark' || 
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      this.isDarkMode = true;
    } else {
      document.documentElement.classList.remove('dark');
      this.isDarkMode = false;
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!('theme' in localStorage)) {
        this.isDarkMode = e.matches;
        document.documentElement.classList.toggle('dark', e.matches);
      }
    });
  }

  toggleTheme() {
    if (!this.isBrowser) return;

    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage['theme'] = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage['theme'] = 'light';
    }
  }

  useSystemTheme() {
    if (!this.isBrowser) return;

    localStorage.removeItem('theme');
    this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }
} 