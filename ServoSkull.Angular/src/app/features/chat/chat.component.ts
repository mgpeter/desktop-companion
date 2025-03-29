import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-4rem)] gap-4 p-4">
      <!-- Camera Preview Section -->
      <div class="w-1/2 bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex flex-col">
        <h2 class="text-xl font-semibold mb-4">Camera Preview</h2>
        <div class="flex-grow bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
          <div class="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p class="text-slate-500 dark:text-slate-400">Camera preview will appear here</p>
          </div>
        </div>
      </div>

      <!-- Chat Section -->
      <div class="w-1/2 bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex flex-col">
        <h2 class="text-xl font-semibold mb-4">Chat</h2>
        <!-- Chat Messages -->
        <div class="flex-grow bg-white dark:bg-slate-700 rounded-lg mb-4 p-4 overflow-y-auto">
          <div class="text-center text-slate-500 dark:text-slate-400">
            No messages yet
          </div>
        </div>
        <!-- Chat Input -->
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            class="flex-grow px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            [(ngModel)]="messageInput"
            (keyup.enter)="sendMessage()"
          >
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            (click)="sendMessage()"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  `
})
export class ChatComponent {
  messageInput = '';

  sendMessage() {
    if (this.messageInput.trim()) {
      // TODO: Implement message sending
      console.log('Message sent:', this.messageInput);
      this.messageInput = '';
    }
  }
} 