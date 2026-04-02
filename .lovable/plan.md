

# Pelada da Semana ⚽

## Visão Geral
Página para organizar peladas de futebol com cadastro de jogadores, pagamento via Pix e lista de confirmados. Tema verde/preto/branco com visual moderno.

## Funcionalidades

### 1. Cadastro de Jogador
- Campo de nome + botão "Confirmar participação"
- Limite de 18 titulares, excedentes entram como "Reserva"
- Contador de vagas restantes visível

### 2. Pagamento via Pix
- Chave Pix exibida com botão copiar
- QR Code estático
- Botão "Já fiz o pagamento" que muda status para "Pago" (verde)

### 3. Lista de Jogadores
- Seção "Confirmados" e "Reservas" separadas
- Status "Pendente" (amarelo) e "Pago" (verde) ao lado de cada nome
- Atualização em tempo real sem recarregar

### 4. Caixa da Pelada
- Total arrecadado, valor do campo (R$120) e saldo atual

### 5. Extras
- Botão "Limpar lista" com confirmação
- Animações leves (fade-in ao adicionar jogador)
- Persistência com LocalStorage

## Design
- Cores: verde (#16a34a), preto (#111), branco
- Mobile-first, responsivo
- Visual limpo e intuitivo

## Implementação
- Tudo em `src/pages/Index.tsx` como componente React único
- Dados persistidos em LocalStorage
- Sem dependências extras

