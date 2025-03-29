import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WeatherForecasts } from '../dtos/weatherForecast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'ServoSkull.Angular';
  forecasts: WeatherForecasts = [];

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadForecasts();
  }

  private loadForecasts(): void {
    this.http.get<WeatherForecasts>('/api/weatherforecast')
      .subscribe({
        next: (result) => {
          this.forecasts = result;
        },
        error: (error) => {
          console.error('Error fetching weather forecast:', error);
          if (error.error instanceof ErrorEvent) {
            console.error('Client side error:', error.error.message);
          } else {
            console.error('Server side error:', {
              status: error.status,
              message: error.message,
              details: error.error
            });
          }
        }
      });
  }
}
