import { TiltCardDirective } from './tilt-card.directive';
import { ElementRef, Renderer2 } from '@angular/core';

describe('TiltCardDirective', () => {
  it('should create an instance', () => {
    // Cria "dublês" (mocks) das ferramentas que a diretiva precisa
    const mockElementRef = new ElementRef(document.createElement('div'));
    const mockRenderer = jasmine.createSpyObj('Renderer2', ['setStyle']);
    
    const directive = new TiltCardDirective(mockElementRef, mockRenderer);
    expect(directive).toBeTruthy();
  });
});