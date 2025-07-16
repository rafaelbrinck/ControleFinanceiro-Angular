import { Injectable } from '@angular/core';
import { AlertaService } from './alerta.service';
import { LoginService } from './login.service';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  constructor(
    private alertaService: AlertaService,
    private loginService: LoginService
  ) {}

  async salvarFoto(novaFoto: File) {
    const userId = this.loginService.getUserLogado();
    const file = novaFoto;
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${userId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('foto-usuario')
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError.message);
      this.alertaService.erro('Erro', 'Erro ao fazer upload da imagem.');
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
      .eq('id', userId);

    if (dbError) {
      console.error(dbError.message);
      this.alertaService.erro(
        'Erro',
        'Erro ao atualizar a foto no banco de dados.'
      );
      return;
    }

    // Atualiza o usuário em memória no loginService
    await this.loginService.recarregarUsuario();

    return novaUrl;
  }
}
