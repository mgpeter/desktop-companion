import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebcamService } from '../../../core/services/webcam.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-webcam-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full h-full">
      <!-- Video Preview -->
      <video
        #videoElement
        class="w-full h-full object-cover rounded-lg"
        autoplay
        playsinline
        [class.hidden]="!isStreamActive"
        (loadedmetadata)="onVideoLoaded()"
      ></video>

      <!-- Placeholder when no stream -->
      <div
        *ngIf="!isStreamActive"
        class="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-lg"
      >
        <div class="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p class="text-slate-500 dark:text-slate-400">
            {{ errorMessage || 'Camera preview will appear here' }}
          </p>
        </div>
      </div>
    </div>
  `
})
export class WebcamPreviewComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  
  private destroy$ = new Subject<void>();
  isStreamActive = false;
  errorMessage = '';

  constructor(
    private webcamService: WebcamService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to stream changes
    this.webcamService.stream$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stream => {
        console.log('Stream received:', stream?.active);
        this.isStreamActive = !!stream?.active;
        
        if (stream && this.videoElement) {
          console.log('Setting video source...');
          this.videoElement.nativeElement.srcObject = stream;
          // Ensure the video plays
          this.videoElement.nativeElement.play().catch(err => {
            console.error('Error playing video:', err);
            this.errorMessage = 'Error playing video stream';
            this.isStreamActive = false;
            this.cdr.detectChanges();
          });
        }
        
        this.cdr.detectChanges();
      });

    // Start the webcam stream
    this.webcamService.startStream().subscribe({
      error: (error) => {
        console.error('Failed to start webcam:', error);
        this.errorMessage = 'Could not access webcam. Please ensure you have granted camera permissions.';
        this.isStreamActive = false;
        this.cdr.detectChanges();
      }
    });
  }

  onVideoLoaded(): void {
    console.log('Video metadata loaded');
    // Force the video to play again after metadata is loaded
    this.videoElement.nativeElement.play().catch(err => {
      console.error('Error playing video after load:', err);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webcamService.stopStream();
  }
} 