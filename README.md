# hauls — Calculadora de Custo de Importação

Pequena aplicação Next.js (App Router + TypeScript) para calcular o custo final em **BRL**
de produtos comprados em agentes de envio chineses (CSSBuy etc.) e enviados ao Brasil,
com um CRUD para gerenciar as tabelas de frete (que mudam com o tempo).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Radix)
- **Prisma 7** + **SQLite** (via driver adapter `better-sqlite3`)
- **react-hook-form** + **zod** para formulários e validação
- Server Actions para o CRUD

## Funcionalidades

- **Tema escuro** por padrão (com alternância claro/escuro) e fonte ampliada.
- **Cotações ao vivo** das 3 moedas (USD, CNY, BRL) via
  [AwesomeAPI](https://docs.awesomeapi.com.br/api-de-moedas) — sem chave, com
  botão "Atualizar" e fallback offline. Todos os câmbios são editáveis.
- **Calculadora (`/`)** — recálculo ao vivo conforme você digita:
  - preço do produto (CNY); peso em **gramas ou kg** (alternável)
  - método de envio; câmbios CNY→BRL e USD→BRL
  - imposto de importação (padrão 60%), ICMS (padrão 17%), margem, **seguro** (CNY)
  - **valor declarado (USD) aberto/editável**: por padrão usa o produto (ou
    produto + frete, conforme o método), mas você pode declarar qualquer valor
  - isenção **Remessa Conforme** (até US$50): o imposto incide só sobre a parte
    do valor declarado que excede US$50
  - aviso quando o peso está fora da faixa do método
  - detalhamento completo (produto, frete, declarado, imposto, ICMS, preço final)
- **Compras (`/purchases`)** — registra um pacote real com **vários itens** (nome,
  categoria, destinatário, **foto** com upload). Soma os pesos e divide frete,
  seguro e impostos **por peso (regra de três)**, mostrando quanto cada pessoa
  paga. Útil quando você compra para irmão/pais/amigos no mesmo pacote.
- **Métodos de envio (`/shipping-methods`)** — listar, criar, editar e excluir tabelas
  de frete, com validação (`minWeightKg ≤ baseWeightKg ≤ maxWeightKg`, números positivos).
  Cada método define se o **valor declarado inclui o frete** ou só o produto.
  As alterações aparecem na calculadora sem precisar recarregar manualmente.

## Modelo de cálculo

Cada método tem um peso base com preço fixo; o peso que excede é cobrado por kg adicional.
Você paga produto + frete; os impostos incidem sobre o **valor declarado** (alfândega, em USD).

```
kgExtra    = ceil(peso − pesoBase)        // ou proporcional no modo "linear"
freteCNY   = precoBase + precoPorKgExtra × kgExtra
mercadorias= (produto + frete) × câmbio(CNY→BRL)
declarado  = valor informado, ou padrão (produto[+frete]) convertido p/ USD
imposto    = baseTributável(USD) × câmbio(USD→BRL) × imposto%   // isenção: só o que passa de US$50
ICMS       = (declaradoBRL + imposto) × ICMS%
final      = (mercadorias + imposto + ICMS) × (1 + margem%)
```

## Como rodar

Pré-requisitos: **Node 20+** e **pnpm**.

```bash
# 1. Instalar dependências (gera o Prisma Client automaticamente via postinstall)
pnpm install

# 2. Criar o banco SQLite e aplicar as migrações
pnpm db:migrate        # = prisma migrate dev

# 3. Popular as duas tabelas de frete de exemplo
pnpm db:seed

# 4. Subir o servidor de desenvolvimento
pnpm dev               # http://localhost:3000
```

Scripts úteis:

| Script           | O que faz                                            |
| ---------------- | ---------------------------------------------------- |
| `pnpm dev`       | servidor de desenvolvimento                          |
| `pnpm build`     | build de produção                                    |
| `pnpm start`     | roda o build de produção                             |
| `pnpm db:migrate`| cria/aplica migrações (`prisma migrate dev`)         |
| `pnpm db:seed`   | insere/atualiza os dois métodos de exemplo           |
| `pnpm db:reset`  | recria o banco do zero e roda o seed                 |

## Persistência

- O banco é um arquivo SQLite em `./dev.db` (configurável via `DATABASE_URL` no `.env`).
- Modelo `ShippingMethod` em [`prisma/schema.prisma`](prisma/schema.prisma);
  seed em [`prisma/seed.ts`](prisma/seed.ts).
- Prisma 7 não usa o engine Rust: a conexão é feita pelo adapter
  `@prisma/adapter-better-sqlite3` (ver [`src/lib/prisma.ts`](src/lib/prisma.ts)).

## Métodos de exemplo (seed)

| Nome                    | Base | Preço base | Por kg extra | Arred. | Faixa (kg) |
| ----------------------- | ---- | ---------- | ------------ | ------ | ---------- |
| China Post SAL (0-10kg) | 1 kg | CN¥217     | CN¥75        | ceil   | 0–10       |
| SH-SAL-BR (3-30kg)      | 3 kg | CN¥300     | CN¥62,5      | ceil   | 3–30       |
