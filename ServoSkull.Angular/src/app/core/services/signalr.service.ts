import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, from, of, timer, Subject } from 'rxjs';
import { map, catchError, retry, tap, timeout, takeUntil, switchMap } from 'rxjs/operators';

export interface ChatMessage {
  text: string;
  timestamp: Date;
  isFromUser: boolean;
  imageData?: string;
  audioData?: string; // Base64 encoded audio data
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection?: signalR.HubConnection;
  private connectionState = new BehaviorSubject<boolean>(false);
  private readonly isBrowser: boolean;
  private connecting = false;
  private messageReceived = new Subject<ChatMessage>();
  private transcriptReceived = new Subject<string>();

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    console.log('SignalR Service initialized, isBrowser:', this.isBrowser);

    if (this.isBrowser) {
      this.initializeConnection();
    } else {
      console.log('SignalR: Skipping connection in SSR context');
    }
  }

  private initializeConnection(): void {
    if (!this.isBrowser) return;

    console.log('SignalR: Initializing connection...');
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('/hub/interactionHub', {
        skipNegotiation: false,
        // Let SignalR negotiate the best transport
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling
      })
      .withHubProtocol(new signalR.JsonHubProtocol())
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          const delayMs = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          console.log(`SignalR: Next retry in ${delayMs}ms, previous attempts: ${retryContext.previousRetryCount}`);
          return delayMs;
        }
      })
      .configureLogging(signalR.LogLevel.Debug)
      .build();

    // Set up message handler
    this.hubConnection.on('ReceiveResponse', (message: string, audioData?: string) => {
      console.log('SignalR: Received message:', { text: message, hasAudio: !!audioData });
      this.messageReceived.next({
        text: message,
        timestamp: new Date(),
        isFromUser: false,
        audioData: audioData
      });
    });

    this.hubConnection.on('ReceiveTranscription', (audioData: string) => {
      console.log('SignalR: Received audio transcription:', audioData);
      this.transcriptReceived.next(audioData);
    });

    // Set up connection state change handler
    this.hubConnection.onreconnecting((error) => {
      console.log('SignalR: Attempting to reconnect...', error);
      this.connectionState.next(false);
      this.connecting = false;
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('SignalR: Reconnected with connection ID:', connectionId);
      this.connectionState.next(true);
      this.connecting = false;
    });

    this.hubConnection.onclose((error) => {
      console.log('SignalR: Connection closed', error);
      this.connectionState.next(false);
      this.connecting = false;
    });
  }

  public sendMessage(message: string, imageData?: string): Observable<void> {
    if (!this.hubConnection || !this.isConnected()) {
      console.error('SignalR: Cannot send message - not connected');
      return of(void 0);
    }

    return from(this.hubConnection.invoke('SendMessage', message, imageData)).pipe(
      tap(() => console.log('SignalR: Message sent:', { text: message, hasImage: !!imageData })),
      catchError(error => {
        console.error('SignalR: Error sending message:', error);
        throw error;
      })
    );
  }

  public onMessageReceived(): Observable<ChatMessage> {
    return this.messageReceived.asObservable();
  }

  public onTranscriptionReceived(): Observable<string> {
    return this.transcriptReceived.asObservable();
  }

  public startConnection(): Observable<boolean> {
    if (!this.isBrowser || !this.hubConnection) {
      console.log('SignalR: Cannot start connection - browser:', this.isBrowser, 'connection:', !!this.hubConnection);
      return of(false);
    }

    if (this.connecting) {
      console.log('SignalR: Connection attempt already in progress');
      return of(false);
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR: Already connected');
      return of(true);
    }

    if (this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      console.log('SignalR: Connection is in state:', this.hubConnection.state);
      return of(false);
    }

    console.log('SignalR: Starting connection...');
    this.connecting = true;

    return from(this.hubConnection.start()).pipe(
      timeout(15000), // Add 15 second timeout
      tap((result) => {
        console.log('SignalR: Connection attempt result:', {
          state: this.hubConnection?.state,
          connectionId: this.hubConnection?.connectionId
        });
      }),
      map(() => {
        if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
          console.log('SignalR: Connection successfully established');
          this.connectionState.next(true);
          this.connecting = false;
          return true;
        } else {
          throw new Error(`Connection in unexpected state: ${this.hubConnection?.state}`);
        }
      }),
      catchError(error => {
        console.error('SignalR: Error establishing connection:', error);
        this.connectionState.next(false);
        this.connecting = false;
        throw error;
      }),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          console.log(`SignalR: Retry ${retryCount} after error:`, error);
          return timer(1000 * Math.pow(2, retryCount - 1));
        }
      })
    );
  }

  public isConnected(): Observable<boolean> {
    return this.connectionState.asObservable();
  }

  public stopConnection(): Observable<void> {
    if (!this.isBrowser || !this.hubConnection) {
      console.log('SignalR: Cannot stop connection - not initialized');
      return of(void 0);
    }

    if (this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.log('SignalR: Not connected, current state:', this.hubConnection.state);
      return of(void 0);
    }

    console.log('SignalR: Stopping connection...');
    return from(this.hubConnection.stop()).pipe(
      timeout(5000), // Add 5 second timeout for stop
      tap(() => console.log('SignalR: Stop connection initiated')),
      map(() => {
        console.log('SignalR: Connection stopped successfully');
        this.connectionState.next(false);
      }),
      catchError(error => {
        console.error('SignalR: Error stopping connection:', error);
        // Force the connection state to false even if stop fails
        this.connectionState.next(false);
        throw error;
      })
    );
  }

  public sendAudioMessage(audioBlob: Blob): Observable<void> {
    if (!this.hubConnection || !this.isConnected()) {
      console.error('SignalR: Cannot send audio - not connected');
      return of(void 0);
    }

    return from(
      // Convert blob to base64
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      })
    ).pipe(
      // Send to hub
      switchMap(base64Audio => {
        if (!this.hubConnection || !this.isConnected()) {
          throw new Error('SignalR: Cannot send audio - not connected');
        }
        console.log('SignalR: Sending audio message:', base64Audio);
        return from(this.hubConnection.invoke('ProcessAudioMessage', base64Audio));
      }),
      tap(() => console.log('SignalR: Audio message sent')),
      catchError(error => {
        console.error('SignalR: Error sending audio message:', error);
        throw error;
      })
    );
  }
}