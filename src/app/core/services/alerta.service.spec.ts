import { TestBed } from '@angular/core/testing';

import { AlertaService } from '@app/core/services/alerta.service';

describe('AlertaService', () => {
  let service: AlertaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlertaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
