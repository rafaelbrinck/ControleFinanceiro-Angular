import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { supabase } from '../../supabase';
import { UserLogado } from '../../models/user';
import { AlertaService } from '../../service/alerta.service';
import { PerfilService } from '../../service/perfil.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css'],
})
export class PerfilComponent implements OnInit {
  usuario?: UserLogado;
  username?: string = '';
  fotoUrl: string = '';
  userId?: string;

  novaFoto?: File;
  novaFotoPreview: string = '';

  constructor(
    private loginService: LoginService,
    private router: Router,
    private alertaService: AlertaService,
    private perfilService: PerfilService
  ) {}

  ngOnInit(): void {
    this.loginService.user$.subscribe((user) => {
      if (user) {
        this.usuario = user;
        this.username = user.username;
        this.fotoUrl = user.logo || '';
        this.userId = user.id;

        // ⚠️ Atualiza também o preview, se necessário
        if (!this.novaFoto) {
          this.novaFotoPreview = '';
        }
      }
    });
  }

  selecionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.novaFoto = input.files[0];

    const reader = new FileReader();
    reader.onload = () => {
      this.novaFotoPreview = reader.result as string;
    };
    reader.readAsDataURL(this.novaFoto);
  }

  async salvarFoto(): Promise<void> {
    if (!this.novaFoto || !this.userId) return;
    const novaUrl = await this.perfilService.salvarFoto(this.novaFoto);
    if (!novaUrl) {
      this.alertaService.erro('Erro', 'Não foi possível atualizar a foto.');
      return;
    }
    this.fotoUrl = novaUrl; // atualiza localmente já
    // Limpa seleção e preview
    this.novaFoto = undefined;
    this.novaFotoPreview = '';
    this.alertaService.sucesso('Sucesso', 'Foto atualizada com sucesso!');
  }
}
