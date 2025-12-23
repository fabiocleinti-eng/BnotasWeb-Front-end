import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appTiltCard]',
  standalone: true
})
export class TiltCardDirective {
  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 0.1s ease-out');
    this.renderer.setStyle(this.el.nativeElement, 'will-change', 'transform');
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const card = this.el.nativeElement;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Ajuste o divisor (15) para controlar a intensidade. Quanto maior, mais suave.
    const rotateX = ((y - centerY) / centerY) * -15; 
    const rotateY = ((x - centerX) / centerX) * 15;

    // Aplica o 3D + Escala leve
    const style = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    this.renderer.setStyle(card, 'transform', style);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.renderer.setStyle(this.el.nativeElement, 'transform', 'perspective(1000px) rotateX(0) rotateY(0) scale(1)');
  }
}