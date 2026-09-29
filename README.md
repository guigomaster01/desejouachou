# 💜 Desejou Achou ✨ - Loja Virtual de Afiliados

Uma plataforma moderna, elegante e dinâmica de achadinhos, cupons e ofertas afiliadas, desenvolvida com **Astro 5+**, **Tailwind CSS v4** e **Content Collections** em Markdown (`.md`).

---

## 🎨 Identidade Visual e Conceito
- **Paleta de Cores**: Roxo chic, tons de lavanda e lilás, com fundo branco limpo e toques de pink/dourado para ofertas e cupons.
- **Público & Curadoria**: Estética feminina, moderna e confiável, inspirada nas melhores criadoras de conteúdo de achadinhos (TikTok, Instagram, Pinterest).
- **Lojas Parceiras Suportadas**: Shopee, Amazon Brasil, Shein, Mercado Livre, AliExpress, Magazine Luiza e mais.

---

## 🚀 Como Executar o Projeto Localmente

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o servidor de desenvolvimento**:
   ```bash
   npx astro dev --background
   ```
   - Para verificar o status: `npx astro dev status`
   - Para ver os logs: `npx astro dev logs`
   - Para parar o servidor: `npx astro dev stop`

3. **Gerar a versão final estática (Build)**:
   ```bash
   npm run build
   ```

---

## 🛍️ Como Adicionar um Novo Produto (`.md`)

Para cadastrar um novo achadinho, basta criar um novo arquivo `.md` dentro da pasta `src/content/products/` (exemplo: `src/content/products/novo-produto.md`).

### Exemplo de Arquivo `.md`:

```markdown
---
title: "Secador Portátil Iônico Dobrável de Alta Potência"
description: "Seca em metade do tempo, não resseca o cabelo e cabe na bolsa de viagem. Meu queridinho diário!"
price: "R$ 149,90"
originalPrice: "R$ 289,00"
discount: "-48%"
affiliateUrl: "https://shopee.com.br/link-do-seu-afiliado"
affiliatePlatform: "shopee" # shopee | amazon | shein | mercadolivre | aliexpress | magalu | outros
category: "Beleza & Cabelo" # Beleza & Cabelo | Casa & Cozinha | Moda & Acessórios | Achados Tech | Organização
badge: "Viral no TikTok" # Destaque especial (opcional)
badgeColor: "purple" # purple | pink | amber | emerald
rating: 4.9 # Nota de 1 a 5
reviewsCount: 3420 # Quantidade de avaliações
image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80"
featured: true # true para aparecer no topo dos destaques
couponCode: "DESEJOU15" # Cupom opcional com botão de copiar
couponDiscount: "15% OFF" # Desconto do cupom
publishDate: "2026-09-28"
tags: ["cabelo", "beleza", "rotina", "shopee"]
---

### Minha Opinião Sincera ✨
Aqui você escreve a resenha detalhada, suas dicas de amiga e o motivo pelo qual você recomenda a compra! O conteúdo em Markdown será renderizado com formatação elegante na página de detalhes do produto.

### Dica de Amiga 💜
Sempre aplique o cupom antes de finalizar para economizar ainda mais!
```

---

## ⚙️ Funcionalidades Incluídas

- 🔍 **Busca Instantânea Reativa**: Filtre produtos por nome, tag ou categoria sem recarregar a página.
- 🏷️ **Filtro de Categorias & Lojas**: Pílulas navegáveis para alternar entre Shopee, Amazon, Shein, etc.
- 📋 **Copiador de Cupom em 1 Clique**: Botões dinâmicos com feedback visual ("Copiado!") e notificações toast.
- 📱 **100% Responsivo**: Layout otimizado para celulares, tablets e desktops.
- 🛡️ **Página de Detalhes Dedicada** (`/produto/[slug]`): URL própria para cada achado, com imagem ampliada, link seguro com `rel="nofollow sponsored"`, resenha completa e produtos relacionados.
- 🎟️ **Central de Cupons** (`/cupons`): Todos os cupons e regras organizados por loja.
- 👩 **Página Sobre & Transparência** (`/sobre`): Biografia da criadora, critérios de teste e aviso de conformidade de afiliados.
- 💬 **Botão Flutuante do WhatsApp / Telegram**: Conexão direta com grupo VIP de promoções.
