# 📝 BNotasWeb

Um gerenciador de notas adesivas (sticky notes) inteligente e moderno, desenvolvido com **Angular 18+ (Standalone Components)**. O projeto evoluiu para utilizar um editor de texto rico (WYSIWYG) baseado no poderoso framework **Tiptap**, garantindo estabilidade, performance e uma experiência de escrita fluida.

![Status do Projeto](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![Angular](https://img.shields.io/badge/Angular-18+-dd0031?logo=angular)
![Tiptap](https://img.shields.io/badge/Editor-Tiptap-000?logo=tiptap)

> 🚧 **Status do Projeto: Em Evolução Contínua**
> Este projeto encontra-se em **desenvolvimento ativo**. Recentemente, passou por uma refatoração completa de sua engine de texto para oferecer recursos mais avançados e estáveis.

## 🚀 Visão Geral

O **BnotasWeb** é uma Single Page Application (SPA) focada em produtividade visual. O diferencial técnico atual reside na integração de um editor **Headless** (Tiptap) dentro de um ecossistema Angular, combinando a flexibilidade de componentes personalizados com uma gestão de estado de texto robusta.

## ✨ Funcionalidades Detalhadas

### 1. 🎨 Editor de Texto Rico (Powered by Tiptap)
* **Formatação Completa:** Negrito, Itálico, Sublinhado e Listas (Bullet points).
* **Marca-Texto Multicolorido:** Seleção de cores para destaque (Amarelo, Verde, etc.) com persistência de estilo.
* **Controle Tipográfico:**
    * **Tamanho da Fonte:** Controle granular do tamanho da letra via **Extensão Personalizada (Custom Mark)** criada especificamente para este projeto.
    * **Cores de Texto:** Alteração dinâmica da cor da fonte.
* **Maximizar Leitura (Novo!):** Funcionalidade que permite expandir o card para ocupar a área de trabalho inteira, facilitando a escrita de textos longos (Focus Mode).
* **UX Aprimorada:** Comportamento de parágrafos ajustado (margens compactas) e remoção de bordas de foco nativas para um visual limpo.

### 2. 🗂️ Organização & Produtividade
* **Navegação "Deck" 3D:** Interface imersiva na sidebar onde o usuário usa o scroll (wheel) para rotacionar entre notas de um mesmo grupo com efeitos de transformação 3D.
* **Cards Interativos (Tilt):** Efeito de inclinação suave ao passar o mouse sobre os cards.
* **Categorização por Cores:** As notas funcionam como pastas temáticas visuais.
* **Rascunho Rápido (Scratchpad):** Área de transferência persistente (LocalStorage) para anotações rápidas.
* **Busca Instantânea:** Filtragem em tempo real por título ou conteúdo.

### 3. ⏰ Sistema de Alertas Inteligente
* **Lembretes:** Configuração de data/hora em cada nota.
* **Modal de Urgência:** Alerta visual de "Atenção Máxima" para tarefas vencidas.
* **Ações Rápidas:** Opções de "Concluir" ou "Adiar" (Snooze) diretamente do modal.

---

## 🛠️ Destaques Técnicos & Desafios Superados

A migração para o Tiptap trouxe desafios interessantes de engenharia de software:

1.  **Encapsulamento do Angular vs. Tiptap:**
    * *Desafio:* O Tiptap injeta elementos HTML (`.ProseMirror`) dinamicamente, o que conflitava com o *View Encapsulation* do Angular, impedindo a estilização correta (bordas indesejadas, foco).
    * *Solução:* Implementação estratégica de estilos globais e seletores de atributo (`[contenteditable]`) para garantir uma interface limpa sem quebrar o isolamento dos componentes.

2.  **Extensões Personalizadas (Custom Marks):**
    * Desenvolvimento de uma extensão própria para gerenciar o atributo `font-size` dentro do modelo de documento do Tiptap, permitindo que o tamanho da fonte seja aplicado e preservado independentemente de outras marcas (como negrito ou cor).

3.  **Gerenciamento de Estado Visual:**
    * Controle de estado para funcionalidades como "Maximizar Card", utilizando binding de classes CSS condicionais e posicionamento absoluto relativo ao workspace.

## 💻 Tecnologias

* **Framework:** Angular 18+ (Standalone Components)
* **Linguagem:** TypeScript
* **Editor Engine:** [Tiptap](https://tiptap.dev/) (Headless WYSIWYG)
* **Estilização:** CSS3 (3D Transforms, Flexbox, Grid, Keyframes)
* **Gerenciamento de Pacotes:** NPM

## 📦 Como Rodar o Projeto

1.  **Clone o repositório:**
    ```bash
    git clone (https://github.com/fabiocleinti-eng/BnotasWeb-Front-end.git)
    ```
2.  **Instale as dependências:**
    ```bash
    cd BnotasWeb-Front-end
    npm install
    ```
3.  **Execute o servidor de desenvolvimento:**
    ```bash
    npm start
    ```
4.  Acesse `http://localhost:4200/`.

---

## 👨‍💻 Autor

Desenvolvido por **Fábio Clein**.
Engenheiro de Software focado em soluções Front-end modernas e interativas.

* **LinkedIn:** (https://www.linkedin.com/in/f%C3%A1bio-clein-8aabb5325/)
* **E-mail:** fabioclein.ti@gmail.com