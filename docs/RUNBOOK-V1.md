# ProInvest V1.0 — Runbook local

Este runbook cobre a aplicação privada/local da V1.0. Publicação em produção (`GATE-PROD PUBLIC`) não faz parte deste gate.

## Pré-requisitos

- Node.js 24 LTS (faixa suportada: `>=24 <25`).
- PostgreSQL 18.
- Uma cópia local de `.env.example` chamada `.env`, com credenciais não versionadas.

## Subida limpa

```bash
npm ci
npm run db:migrate
npm run db:migrate
npm run db:seed
npm test
npm run start:api
```

A segunda migration valida idempotência. Abra `http://localhost:3000/`; a raiz redireciona para `/portfolio`. `GET /health` deve responder `status: ok`.

## Verificação de produto

1. Confirme a navegação entre Carteira e todos os fluxos de operação.
2. Na Carteira, aplique filtros de conta e estratégia.
3. Confirme que posições abertas aparecem somente em “Posições atuais”.
4. Confirme que futuros e derivativos encerrados aparecem somente em “Resultados históricos”.
5. Confirme que BRL e USD permanecem separados e que o total global informa a ausência de FX.
6. Confirme que métricas parciais mostram subtotal conhecido e cobertura, nunca zero inventado.

## Regressão e segurança

`npm test` executa goldens, testes PostgreSQL quando `TEST_DATABASE_URL` está definido e a regressão do shell web/headers HTTP. O CI sempre fornece PostgreSQL, executa migrations duas vezes, seed, suíte completa e `npm audit --audit-level=high` com permissões somente de leitura.

Não registre payloads financeiros, secrets ou URLs com senha. Portfolio é read-only e não habilita ordem, cancelamento, saque, transferência, movimentação, assinatura ou alteração remota de alavancagem.

## Falhas conhecidas

- Sem `TEST_DATABASE_URL`, testes de integração são pulados localmente; o CI sempre fornece PostgreSQL.
- Sem valoração atual, market value e P&L não realizado ficam incompletos.
- Sem moeda-base e FX aprovados, não existe total global convertido.

## Rollback local

Pare o processo da API. A V1.0 não introduz tabela ou migration de Portfolio: a leitura continua derivada de operações e snapshots, então o rollback do código não exige reversão de dados.
