import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { supabase } from '../../supabase';
import { UserLogado } from '../../models/user';

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

  constructor(private loginService: LoginService, private router: Router) {}

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

    const file = this.novaFoto;
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${this.userId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('foto-usuario')
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError.message);
      alert('Erro ao fazer upload da imagem.');
      return;
    }

    const { data } = supabase.storage
      .from('foto-usuario')
      .getPublicUrl(filePath);

    const novaUrl = data.publicUrl;

    // Atualiza no banco
    const { error: dbError } = await supabase
      .from('usuarios')
      .update({ logo: novaUrl })
      .eq('id', this.userId);

    if (dbError) {
      console.error(dbError.message);
      alert('Erro ao atualizar a foto no banco de dados.');
      return;
    }

    // Atualiza o usuário em memória no loginService
    await this.loginService.recarregarUsuario();
    this.fotoUrl = novaUrl; // atualiza localmente já
    // Limpa seleção e preview
    this.novaFoto = undefined;
    this.novaFotoPreview = '';
    alert('Foto atualizada com sucesso!');
  }
}
