# Product Requirement Document (PRD) Técnico
## Sistema de Gestão de Carteira e Boletas Personalizadas (ProInvest)

---

## 1. Visão Geral do Produto

### 1.1 Objetivo
O **ProInvest** é uma plataforma de gestão de investimentos e registro de operações financeiras (boletas) com suporte a múltiplos ativos (Ações, Opções, FIIs, Renda Fixa e Criptoativos). O sistema permite a customização dinâmica de formulários de boletas por estratégia/grupo, consolidação de posição em tempo real e visualização gráfica da distribuição de patrimônio.

### 1.2 Problema Central Resolvido
- Processamento e armazenamento de frações de ativos com altíssima precisão (criptomoedas exigem até 12 casas decimais).
- Falta de flexibilidade nas boletas padrão do mercado (necessidade de campos customizados por estratégia).
- Lentidão no cálculo de consolidação de carteira e preço médio.

---

## 2. Arquitetura do Sistema e Stack Tecnológica

### 2.1 Stack Recomendada
- **Front-end:** Single Page Application (SPA) em HTML5, JavaScript ES6+ assíncrono (Fetch API), Tailwind CSS (estilização), Chart.js (gráficos).
- **Back-end:** Node.js v18+ com Express.js.
- **Banco de Dados:** PostgreSQL 14+ (suporte avançado a colunas `NUMERIC` de alta precisão e tipos `JSONB`).
- **Driver DB Node:** `pg` (node-postgres) utilizando Pool de conexões.

### 2.2 Arquitetura de Dados (Diagrama Conceitual)