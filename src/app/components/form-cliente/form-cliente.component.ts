import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cliente } from '../../models/cliente';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientesService } from '../../service/clientes.service';
import { LoginService } from '../../service/login.service';
import { AlertaService } from '../../service/alerta.service';

@Component({
  selector: 'app-form-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-cliente.component.html',
  styleUrl: './form-cliente.component.css',
})
export class FormClienteComponent implements OnInit {
  cliente = new Cliente();
  id?: number;
  botao = 'Cadastrar';

  enderecoDesativado: boolean = false;
  cpfFormatado: string = '';
  telefoneFormatado: string = '';
  instagramFormatado: string = '';
  cepFormatado: string = '';

  constructor(
    private router: Router,
    private clienteService: ClientesService,
    private loginService: LoginService,
    private route: ActivatedRoute,
    private alertaService: AlertaService
  ) {}

  async ngOnInit() {
    this.id = +this.route.snapshot.params['id'];
    if (this.id) {
      this.botao = 'Editar';
      const cliente = await this.clienteService.buscarId(this.id);
      if (cliente) {
        this.cliente = cliente;
      }
    }
  }

  async salvar() {
    this.cliente.idUser = this.loginService.getUserLogado();
    if (!this.validarCampos()) return;
    if (this.id) {
      if (await this.clienteService.editar(this.id, this.cliente)) {
        this.alertaService.sucesso('Sucesso', 'Cliente editado com sucesso!');
        this.voltar();
      }
    } else {
      if (await this.clienteService.insert(this.cliente)) {
        this.alertaService.sucesso(
          'Sucesso',
          'Cliente cadastrado com sucesso!'
        );
        this.voltar();
      }
    }
  }

  validarCampos() {
    if (!this.cliente.nome) {
      this.alertaService.info('Campo Obrigatório', 'O nome é obrigatório!');
      return false;
    }
    return true;
  }

  buscarCep() {
    this.enderecoDesativado = false;
    this.cliente.endereco = '';
    this.cliente.bairro = '';
    this.cliente.cidade = '';
    this.cliente.uf = '';

    const cep = this.cliente.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8)
      return this.alertaService.erro('Erro', 'CEP inválido!');

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((response) => response.json())
      .then((dados) => {
        if (!dados.erro) {
          this.cliente.endereco = dados.logradouro;
          this.cliente.bairro = dados.bairro;
          this.cliente.cidade = dados.localidade;
          this.cliente.uf = dados.uf;
          this.enderecoDesativado = true;
        } else {
          this.alertaService.erro('Erro', 'CEP não encontrado!');
        }
      })
      .catch(() => this.alertaService.erro('Erro', 'Erro ao buscar o CEP!'));
  }

  mascaraCpf(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');

    if (valor.length <= 11) {
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
      valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    input.value = valor;
    this.cliente.cpf = valor;
  }

  mascaraTelefone(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '').slice(0, 11);

    if (valor.length > 0) valor = valor.replace(/^(\d{2})(\d)/g, '($1) $2');
    if (valor.length >= 10) valor = valor.replace(/(\d{5})(\d{4})$/, '$1-$2');

    input.value = valor;
    this.cliente.telefone = valor;
  }

  mascaraInstagram(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\s/g, '').replace(/^@*/, '');
    input.value = '@' + valor;
    this.cliente.instaUser = input.value;
  }

  mascaraCep(event: Event) {
    const input = event.target as HTMLInputElement;
    const numeros = input.value.replace(/\D/g, '').substring(0, 8);
    this.cliente.cep = numeros;
    this.cepFormatado = numeros.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
  }

  voltar() {
    this.router.navigate(['clientes']);
  }
}
