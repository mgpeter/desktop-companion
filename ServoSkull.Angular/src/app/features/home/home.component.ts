import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-16 px-4">
      <div class="max-w-4xl w-full space-y-12 text-center">
        <!-- Hero Section -->
        <div class="space-y-6">
          <h1 class="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 bg-clip-text text-transparent">
            Welcome to ServoSkull
          </h1>
          <p class="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your AI-powered desktop companion from the grim darkness of the far future.
          </p>
        </div>

        <!-- Features Grid -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <!-- Voice Interaction -->
          <div class="group p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-colors shadow-sm">
            <div class="space-y-4">
              <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">Voice Interaction</h2>
              <p class="text-slate-600 dark:text-slate-400">Communicate naturally with your AI companion through voice commands.</p>
            </div>
          </div>

          <!-- Visual Processing -->
          <div class="group p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-colors shadow-sm">
            <div class="space-y-4">
              <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">Visual Processing</h2>
              <p class="text-slate-600 dark:text-slate-400">Advanced image recognition and processing capabilities.</p>
            </div>
          </div>

          <!-- Intelligent Assistance -->
          <div class="group p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-colors shadow-sm">
            <div class="space-y-4">
              <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">Intelligent Assistance</h2>
              <p class="text-slate-600 dark:text-slate-400">Context-aware responses and proactive assistance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class HomeComponent {} 