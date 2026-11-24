# Mapa Comercial · PRG Software

Sistema interno da equipe comercial para mapear administradoras de condomínio por cidade e por região.

- Tela: `index.html`, `app.css`, `app.js` (publicados pelo GitHub Pages).
- Dados e login: Supabase (projeto "Comercial PRG"). Sem login, o banco não mostra nada.
- Busca nas fontes públicas (lista de empresas por cidade, Receita Federal, localização): função `buscar-administradoras` no Supabase.
- Início: saudação pelo horário (bom dia, boa tarde, boa noite) com uma frase do dia, agenda de hoje, contatos do dia e o quadro resumido.
- Administradoras: ficha de cada administradora (tabela `fichas`) e cada contato registrado (tabela `registros`, com `detalhe` do resultado e `canal`: ligação, WhatsApp ou e-mail). O primeiro contato com a administradora conta como contato novo; os seguintes, como follow-up.
- Vendas: quadro de negócios por funil (tabelas `funis`, `etapas`, `negocios`, `negocio_produtos`, `produtos`, importadas do Agendor). O funil SCC é o quadro oficial das administradoras; a aba Administradoras virou lista, filtrada pelas etapas do SCC. Ganho leva o negócio para a etapa com `resultado = 'ganho'` e guarda a etapa de antes em `negocios.etapa_anterior_id` (o "Reabrir" volta para ela). Registrar um contato na ficha move o negócio do SCC (gatilho `registro_move_negocio`). Ir para "Follow-up semestral" marca um retorno daqui a 6 meses.
- Desempenho: as fichas vêm só com as colunas usadas; o texto das anotações importadas do Agendor é buscado ao abrir a ficha. Datas usam um `Intl.DateTimeFormat` só, com cache por timestamp; listas filtradas e contagens ficam guardadas até os dados (`S.dv`), a busca ou o filtro mudarem; a busca espera 200 ms depois da última tecla.
- Agenda: o próximo retorno fica em `fichas.retorno_em` (e `retorno_nota`); as demonstrações agendadas vêm de `fichas.demo_em`. Avisos 5 minutos antes pelo navegador (`sw.js` só mostra as notificações, não guarda cache).
- Relatórios: diário, semanal e mensal, montados com os registros; observações e correções de números ficam em `relatorios`, e o ponto de partida do acumulado em `acumulado_base`. "Baixar PDF" usa a impressão do navegador.
- Quem cria conta pela tela de entrada fica aguardando aprovação em Equipe.
- A cada publicação, troque só o número da meta `versao` no `index.html` (e o `?v=` dos arquivos).

