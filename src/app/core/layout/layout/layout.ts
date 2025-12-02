import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    Header
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {

}
