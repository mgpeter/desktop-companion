import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { ChatComponent } from './features/chat/chat.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomeComponent
  },
  {
    path: 'chat',
    component: ChatComponent
  }
];
