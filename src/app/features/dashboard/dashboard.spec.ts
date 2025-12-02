import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing'; // Importante para testar serviços HTTP
import { DashboardComponent } from './dashboard'; // <--- CORREÇÃO: Importar DashboardComponent

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DashboardComponent, // <--- CORREÇÃO: Usar DashboardComponent
        HttpClientTestingModule // Adicionado para evitar erro de 'No provider for HttpClient'
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent); // <--- CORREÇÃO
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});