# 📦 Sistema de Orçamentos | Angular + Supabase

Sistema web completo para **gestão de orçamentos** com foco em usabilidade, performance e integração moderna com serviços em nuvem (Supabase). Desenvolvido com **Angular**, o projeto conta com uma experiência fluida de cadastro e finalização de orçamentos, além de controle de clientes, produtos, variáveis e envio direto via **WhatsApp**.

---

## 🧠 Funcionalidades

- 🔐 **Autenticação real com Supabase**
  - Registro, login e proteção de rotas com JWT simulado
- 👥 **Gestão de clientes**
  - Cadastro, busca e associação a orçamentos
- 📦 **Controle de produtos e variações**
  - Cadastro de produtos e variações com integração ao carrinho
- 🧾 **Orçamentos dinâmicos**
  - Carrinho com resumo financeiro, frete, desconto e parcelamento
- 📱 **Envio direto para WhatsApp**
  - Geração automática de link com mensagem formatada
- 💬 **Sistema de alertas modais**
  - Componente customizado para mensagens, erros, confirmações e feedbacks
- 🧹 **UX moderna e responsiva**
  - Layout minimalista, responsivo e com ícones Bootstrap
- 🔎 **Filtros, Pipes e Máscaras**
  - Pipes customizados para moeda, CPF, telefone, data e busca dinâmica

---

## 🚀 Tecnologias

| Tecnologia      | Descrição                      |
| --------------- | ------------------------------ |
| Angular         | Framework principal do projeto |
| Supabase        | Backend as a Service           |
| Bootstrap Icons | Ícones modernos e leves        |
| RxJS            | Programação reativa            |
| TypeScript      | Tipagem estática e robustez    |

---

## ⚙️ Instalação e Execução

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio

# Instalar dependências
npm install

# Rodar localmente
ng serve
```

> Acesse via `http://localhost:4200`

---

## 🔐 Supabase Setup

1. Crie uma conta no [https://supabase.com](https://supabase.com)
2. Configure as tabelas `usuarios`, `clientes`, `produtos`, `orcamentos`, etc.
3. Copie a URL do projeto e a chave pública (`anon`) para configurar o Supabase client.
4. Insira os dados no `login.service.ts` ou serviço equivalente.

---

## 🛠️ Estrutura de Pastas

```
📁 src
 ┣ 📂app
 ┃ ┣ 📂components
 ┃ ┣ 📂services
 ┃ ┣ 📂pipes
 ┃ ┣ 📂models
 ┃ ┗ app.module.ts
```

---

## 📩 Envio de Orçamento via WhatsApp

Exemplo de mensagem formatada gerada pelo sistema:

```
Olá, gostaria de fazer um pedido:

*Orçamento #4890*
- 2x Produto A - R$ 19,90
- 1x Produto B - R$ 5,99

*Cliente:* Rafael Brinckmann
📞 (11) 99999-9999
*Pagamento:* Pix
*Total:* R$ 45,79

```

---

## 💡 Diferenciais Técnicos

- ✔️ Componentização de modais reutilizáveis (`alerta-global`)
- ✔️ Máscaras dinâmicas sem bibliotecas externas
- ✔️ Pipes inteligentes para formatação
- ✔️ Uso de `BehaviorSubject` e `firstValueFrom` para melhor controle reativo
- ✔️ Validações robustas no frontend

---

## 🙋‍♂️ Autor

Desenvolvido por [**Rafael Brinckmann**](https://github.com/rafaelbrinck) 💙  
Focado em soluções web simples, modernas e objetivas.
