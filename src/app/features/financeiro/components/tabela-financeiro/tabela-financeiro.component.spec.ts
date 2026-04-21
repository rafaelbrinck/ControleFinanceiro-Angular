import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabelaFinanceiroComponent } from './tabela-financeiro.component';

describe('TabelaFinanceiroComponent', () => {
  let component: TabelaFinanceiroComponent;
  let fixture: ComponentFixture<TabelaFinanceiroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabelaFinanceiroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabelaFinanceiroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
