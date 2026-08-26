export interface TimeSorteado {
  nome: string;
  emoji: string;
  goleiro: string | null;
  jogadores: string[];
}

export interface Sorteio {
  criadoEm: string;
  times: TimeSorteado[];
  primeiroJogo: [number, number];
  aguarda: number[];
  ordem: string[];
}

const EMOJIS = ["🔵", "⚫", "🔴", "🟡", "🟢", "🟣"];

/** Embaralhamento Fisher-Yates usando crypto quando disponível. */
export function embaralhar<T>(lista: T[]): T[] {
  const arr = [...lista];
  for (let i = arr.length - 1; i > 0; i--) {
    let j: number;
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      j = buf[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface GerarParams {
  inscritos: string[];
  goleirosFixos: string[];
  qtdTimes: number;
}

export function validarSorteio({ inscritos, goleirosFixos, qtdTimes }: GerarParams): string | null {
  const goleiros = goleirosFixos.filter((g) => g.trim());
  const linha = inscritos.filter(
    (n) => !goleiros.some((g) => g.toLowerCase() === n.toLowerCase()),
  );
  const total = goleiros.length + linha.length;
  if (qtdTimes < 2) return "É necessário ao menos 2 times para gerar o sorteio.";
  if (total < qtdTimes * 2)
    return `Jogadores insuficientes: ${total} participante(s) para ${qtdTimes} times. São necessários pelo menos ${qtdTimes * 2}.`;
  if (goleiros.length > qtdTimes)
    return `Há ${goleiros.length} goleiros fixos para apenas ${qtdTimes} times. Ajuste a configuração.`;
  if (total % qtdTimes !== 0)
    return `Atenção: ${total} participantes não dividem exatamente em ${qtdTimes} times. Os times ficarão com quantidades diferentes.`;
  return null;
}

export function gerarSorteio({ inscritos, goleirosFixos, qtdTimes }: GerarParams): Sorteio {
  const goleiros = embaralhar(goleirosFixos.filter((g) => g.trim()));
  const linha = embaralhar(
    inscritos.filter((n) => !goleiros.some((g) => g.toLowerCase() === n.toLowerCase())),
  );

  const times: TimeSorteado[] = Array.from({ length: qtdTimes }, (_, i) => ({
    nome: `TIME ${i + 1}`,
    emoji: EMOJIS[i % EMOJIS.length],
    goleiro: goleiros[i] ?? null,
    jogadores: [],
  }));

  linha.forEach((jogador, idx) => {
    times[idx % qtdTimes].jogadores.push(jogador);
  });

  const ordemTimes = embaralhar(times.map((_, i) => i));
  const primeiroJogo: [number, number] = [ordemTimes[0], ordemTimes[1]];
  const aguarda = ordemTimes.slice(2);

  const ordem: string[] = [
    `1º JOGO: ${times[primeiroJogo[0]].nome} × ${times[primeiroJogo[1]].nome}`,
  ];
  aguarda.forEach((t, i) => {
    ordem.push(`${i + 2}º JOGO: ${times[t].nome} × vencedor do jogo anterior`);
  });

  return {
    criadoEm: new Date().toISOString(),
    times,
    primeiroJogo,
    aguarda,
    ordem,
  };
}

export function textoTimesWhatsApp(s: Sorteio, cabecalho: string): string {
  let texto = `⚽ *TIMES DA PELADA*\n${cabecalho}\n━━━━━━━━━━━━━━━━━━\n\n`;
  for (const t of s.times) {
    texto += `${t.emoji} *${t.nome}*\n`;
    if (t.goleiro) texto += `  🧤 ${t.goleiro}\n`;
    t.jogadores.forEach((j) => { texto += `  • ${j}\n`; });
    texto += `\n`;
  }
  texto += `🔥 *PRIMEIRO JOGO:* ${s.times[s.primeiroJogo[0]].nome} × ${s.times[s.primeiroJogo[1]].nome}\n`;
  if (s.aguarda.length > 0) {
    texto += `⏳ *AGUARDA:* ${s.aguarda.map((i) => s.times[i].nome).join(", ")}\n`;
  }
  return texto;
}

export function parseSorteio(valor: string | null | undefined): Sorteio | null {
  if (!valor) return null;
  try {
    const parsed = JSON.parse(valor) as Sorteio;
    if (!parsed?.times?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}
