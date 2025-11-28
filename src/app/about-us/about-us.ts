import { CommonModule, NgForOf } from '@angular/common';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o';

@Component({
  selector: 'app-about-us',
  imports: [CarouselModule, NgForOf, CommonModule],
  templateUrl: './about-us.html',
  styleUrl: './about-us.css',
})
export class AboutUs implements OnInit, AfterViewInit {
  images: string[] = [
    'assets/banner/about-us-banner.avif',
    'assets/banner/about-us-banner.jpg',
    'assets/banner/banner3.jpg',
    'assets/banner/banner4.webp'
  ];

  customOptions: OwlOptions = {
    loop: true,
    autoplay: true,
    autoplayTimeout: 3000,
    dots: true,
    nav: false,
    items: 1
  };

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
  }
}
