import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService, AudioMonitorState } from '../../../core/services/audio.service';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { takeUntil, map, distinctUntilChanged, tap } from 'rxjs/operators';

@Component({
  selector: 'app-audio-controls',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-4" role="group" aria-label="Audio recording controls">
      <!-- Record button with visual feedback -->
      <button
        (click)="toggleRecording()"
        [class]="buttonClasses$ | async"
        [attr.aria-label]="(monitorState$ | async)?.isMonitoring ? 'Stop recording' : 'Start recording'"
        [attr.aria-pressed]="(monitorState$ | async)?.isMonitoring">
        <span class="relative flex items-center justify-center w-full h-full">
          <!-- Microphone icon -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          
          <!-- Voice activity indicator -->
          <span
            *ngIf="(monitorState$ | async)?.isMonitoring"
            class="absolute -top-1 -right-1 flex h-3 w-3">
            <span
              [class]="(monitorState$ | async)?.voiceDetected ? 'animate-ping bg-red-400' : ''"
              class="absolute inline-flex h-full w-full rounded-full opacity-75">
            </span>
            <span
              [class]="(monitorState$ | async)?.voiceDetected ? 'bg-red-500' : 'bg-gray-400 dark:bg-gray-600'"
              class="relative inline-flex rounded-full h-3 w-3">
            </span>
          </span>
        </span>
      </button>

      <!-- Audio level meter -->
      <div
        *ngIf="(monitorState$ | async)?.isMonitoring"
        class="relative h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        role="meter"
        aria-label="Audio level">
        <div
          class="absolute inset-0 h-full bg-blue-500 dark:bg-blue-600 transition-all duration-100 transform origin-left"
          [style.transform]="'scaleX(' + ((audioLevel$ | async) || 0) + ')'">
        </div>
        <!-- Error message overlay -->
        <div
          *ngIf="hasError$ | async"
          class="absolute inset-0 flex items-center justify-center bg-red-500/20 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs px-2">
          Microphone error
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AudioControlsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private monitorStateValue = new BehaviorSubject<AudioMonitorState | null>(null);
  private errorState = new BehaviorSubject<boolean>(false);
  
  monitorState$: Observable<AudioMonitorState>;
  audioLevel$: Observable<number>;
  buttonClasses$: Observable<string>;
  hasError$ = this.errorState.asObservable();

  constructor(private audioService: AudioService) {
    console.log('Initializing AudioControlsComponent');
    
    this.monitorState$ = this.audioService.monitorState$;
    
    // Subscribe to monitor state updates with logging
    this.monitorState$.pipe(
      takeUntil(this.destroy$),
      tap(state => {
        console.log('Monitor state updated:', {
          isMonitoring: state?.isMonitoring,
          isRecording: state?.isRecording,
          voiceDetected: state?.voiceDetected,
          audioLevel: state?.audioLevel?.toFixed(3)
        });
      })
    ).subscribe(state => this.monitorStateValue.next(state));
    
    // Audio level with smoothing and null safety
    this.audioLevel$ = this.monitorState$.pipe(
      map(state => state?.audioLevel || 0),
      distinctUntilChanged((prev, curr) => Math.abs(prev - curr) < 0.05),
      tap(level => {
        if (level > 0.1) { // Only log significant audio levels
          console.debug('Audio level:', level.toFixed(3));
        }
      })
    );
    
    // Dynamic button classes based on state
    this.buttonClasses$ = this.monitorState$.pipe(
      map(state => {
        const baseClasses = 'relative p-3 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
        
        if (!state) {
          return `${baseClasses} bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300`;
        }
        
        if (state.isMonitoring) {
          return `${baseClasses} ${
            state.isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
              : 'bg-red-100 hover:bg-red-200 text-red-500 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-300'
          }`;
        }
        
        return `${baseClasses} bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300`;
      })
    );
  }

  ngOnInit(): void {
    // Initialize audio stream when component loads
    this.audioService.startStream().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.errorState.next(false);
      },
      error: (error: Error) => {
        console.error('Failed to initialize audio stream:', error);
        this.errorState.next(true);
        this.monitorStateValue.next(null);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.audioService.stopMonitoring();
    this.audioService.stopStream();
  }

  toggleRecording(): void {
    const currentState = this.monitorStateValue.value;
    console.log('Toggling recording state:', {
      currentlyMonitoring: currentState?.isMonitoring,
      currentlyRecording: currentState?.isRecording,
      hasError: this.errorState.value
    });

    if (currentState?.isMonitoring) {
      console.log('Stopping voice monitoring');
      this.audioService.stopMonitoring();
    } else {
      console.log('Starting voice monitoring');
      this.errorState.next(false); // Reset error state on new recording attempt
      this.audioService.startMonitoring();
    }
  }
} 