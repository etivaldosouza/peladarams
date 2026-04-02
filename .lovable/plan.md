

# Correção de Sincronização e Calendário em Português

## Problemas Identificados

1. **Sincronização dos dados**: A página admin carrega jogadores via `loadPlayers()` no `useState` inicial, mas o `useEffect` de sync pode estar sendo sobrescrito. O sync do `dataPelada` também falta no admin.
2. **Calendário em inglês**: O componente `Calendar` não recebe a prop `locale={ptBR}`, então os dias e meses aparecem em inglês.

## Alterações

### 1. `src/pages/Admin.tsx`
- Passar `locale={ptBR}` para o componente `Calendar`
- Garantir que o `useEffect` de sync também atualize `dataPelada` do localStorage
- Manter os botões "Confirmar" (pagamento), "✕" (remover) e "Limpar" já existentes
- Adicionar botão para reverter pagamento (marcar como pendente novamente)

### 2. `src/pages/Index.tsx`
- Garantir que o sync do `useEffect` não sobrescreva dados quando localStorage está vazio (condição `if (data)` já existe, mas verificar edge cases)
- Também sincronizar `dataPelada` corretamente

### 3. `src/components/ui/calendar.tsx`
- Aceitar e repassar a prop `locale` ao `DayPicker` para suportar português

## Detalhes Técnicos
- O `DayPicker` do `react-day-picker` aceita `locale` como prop nativa
- O `Calendar` wrapper precisa repassar essa prop (já faz via `...props`)
- Ambas as páginas usam a mesma chave `pelada-jogadores` no localStorage — o sync funciona via `setInterval(2000)` dentro da mesma aba

