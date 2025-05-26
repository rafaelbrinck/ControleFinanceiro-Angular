import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cliente } from '../../models/cliente';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientesService } from '../../service/clientes.service';
import { LoginService } from '../../service/login.service';

@Component({
  selector: 'app-form-cliente',
  imports: [CommonModule, FormsModule],
  templateUrl: './form-cliente.component.html',
  styleUrl: './form-cliente.component.css',
})
export class FormClienteComponent {
  cliente = new Cliente();
  id?: number;
  botao = 'Cadastrar';

  cpfFormatado: string = '';
  telefoneFormatado: string = '';
  instagramFormatado: string = '';
  cepFormatado: string = '';

  constructor(
    private router: Router,
    private clienteService: ClientesService,
    private loginService: LoginService,
    private route: ActivatedRoute
  ) {
    this.id = +this.route.snapshot.params['id'];
    if (this.id) {
      this.botao = 'Editar';
      this.cliente = this.clienteService.buscarId(this.id);
    }
  }

  salvar() {
    if (this.id) {
      this.clienteService.editar(this.id, this.cliente);
      alert('Cliente alterado com sucesso!');
      this.voltar();
    } else {
      this.cliente.idUser = this.loginService.getUserLogado();
      this.clienteService.insert(this.cliente);
      alert('Cliente adicionado com sucesso!');
      this.cliente = new Cliente();
      this.voltar();
    }
  }
  formatarInstagram() {
    if (!this.cliente.instaUser!.startsWith('@')) {
      this.cliente.instaUser = '@' + this.cliente.instaUser;
    }
  }

  mascaraCpf(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value;

    // Remove tudo que não for número
    valor = valor.replace(/\D/g, '');

    // Aplica a máscara: XXX.XXX.XXX-XX
    if (valor.length <= 11) {
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    input.value = valor;
    this.cliente.cpf = valor; // ou onde você estiver armazenando
  }

  mascaraTelefone(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value;

    valor = valor.replace(/\D/g, '');

    if (valor.length > 11) {
      valor = valor.slice(0, 11); // Limita a 11 dígitos
    }

    if (valor.length > 0) {
      valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
    }
    if (valor.length >= 10) {
      valor = valor.replace(/(\d{5})(\d{4})$/, '$1-$2');
    }

    input.value = valor;
    this.cliente.telefone = valor;
  }

  mascaraInstagram(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value;

    // Remove qualquer @ extra e espaços
    valor = valor.replace(/\s/g, '').replace(/^@*/, '');

    // Garante que começa com "@"
    valor = '@' + valor;

    input.value = valor;
    this.cliente.instaUser = valor;
  }

  mascaraCep(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = input.value;

    const numeros = valor.replace(/\D/g, '').substring(0, 8);
    this.cliente.cep = numeros;

    this.cepFormatado = numeros.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
  }

  voltar() {
    this.router.navigate(['clientes']);
  }
}
