import { Component, Output, EventEmitter, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../../../core/services/audio.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-audio-controls',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      (click)="toggleRecording()"
      [class.bg-red-500]="isRecording$ | async"
      [class.text-white]="isRecording$ | async"
      class="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      [attr.aria-label]="(isRecording$ | async) ? 'Stop recording' : 'Start recording'"
    >
      <!-- Microphone icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>

      <!-- Recording indicator -->
      <span class="text-sm whitespace-nowrap">
        {{ (isRecording$ | async) ? 'Recording...' : 'Record' }}
      </span>

      <!-- Pulse animation when recording -->
      <div *ngIf="isRecording$ | async" 
           class="absolute -top-1 -right-1 flex items-center justify-center">
        <div class="h-2 w-2 rounded-full bg-red-500"></div>
        <div class="absolute h-2 w-2 rounded-full bg-red-500 animate-ping"></div>
      </div>
    </button>
  `
})
export class AudioControlsComponent implements OnDestroy {
  @Output() audioRecorded = new EventEmitter<Blob>();
  
  private destroy$ = new Subject<void>();
  readonly isRecording$;

  constructor(private audioService: AudioService) {
    this.isRecording$ = this.audioService.isRecording$;
    // Start audio stream when component is created
    this.audioService.startStream().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      error: (error) => console.error('Failed to start audio stream:', error)
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.audioService.stopStream();
  }

  async toggleRecording(): Promise<void> {
    const isRecording = await firstValueFrom(this.isRecording$.pipe(takeUntil(this.destroy$)));
    console.log('isRecording was', isRecording);
    if (isRecording) {
      try {
        const audioBlob = await this.audioService.stopRecording();
        this.audioRecorded.emit(audioBlob);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    } else {
      this.audioService.startRecording();
    }
  }
} 