import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppLayoutComponent } from './core/layout/app-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AppLayoutComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {}
