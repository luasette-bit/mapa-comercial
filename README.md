# Mapa Comercial · PRG Software

Sistema interno da equipe comercial para mapear administradoras de condomínio por cidade e por região.

- Tela: `index.html`, `app.css`, `app.js` (publicados pelo GitHub Pages).
- Dados e login: Supabase (projeto "Comercial PRG"). Sem login, o banco não mostra nada.
- Busca nas fontes públicas (lista de empresas por cidade, Receita Federal, localização): função `buscar-administradoras` no Supabase.
- Início: saudação pelo horário (bom dia, boa tarde, boa noite) com uma frase do dia, agenda de hoje, contatos do dia e o quadro resumido.
- Administradoras: ficha de cada administradora (tabela `fichas`) e cada contato registrado (tabela `registros`, com `detalhe` do resultado e `canal`: ligação, WhatsApp ou e-mail). O primeiro contato com a administradora conta como contato novo; os seguintes, como follow-up.
- Vendas: quadro de negócios por funil (tabelas `funis`, `etapas`, `negocios`, `negocio_produtos`, `produtos`, importadas do Agendor). O funil SCC é o quadro oficial das administradoras; a aba Administradoras virou lista, filtrada pelas etapas do SCC. Ganho leva o negócio para a etapa com `resultado = 'ganho'` e guarda a etapa de antes em `negocios.etapa_anterior_id` (o "Reabrir" volta para ela). Registrar um contato na ficha move o negócio do SCC (gatilho `registro_move_negocio`). Ir para "Follow-up semestral" marca um retorno daqui a 6 meses.
- Ficha: painel com Tarefas (`tarefas`), Negócios (`negocios`) e Contatos (`contatos`), buscados por `ficha_id` só quando a ficha abre e guardados até mudar. O retorno da ficha (`fichas.retorno_em`) acompanha a tarefa pendente mais próxima: concluir a tarefa que era o retorno passa para a próxima (ou deixa vazio); uma tarefa nova mais próxima vira o retorno; um retorno marcado por fora não é apagado.
- Como falar: a ficha junta números e e-mails sem repetir, com a origem de cada um (site, contato, ficha, CNPJ), e botões de WhatsApp (wa.me), Ligar e E-mail (mailto com assunto padrão). WhatsApp da empresa: `empresas.whatsapp` (do site); se não houver, celular do CNPJ (DDD + 9 dígitos começando com 9). Fixo não ganha WhatsApp. A view `mapa` traz `whatsapp` e `whatsapp_em`.
- Rota: a tela atual fica no endereço (`#/vendas?funil=SCC&status=ganho`, `#/adms?ficha=ID`, `#/mapeamento?emp=CNPJ`...). F5 volta para o mesmo lugar; tela, ficha e empresa entram no histórico (botão Voltar), filtros só trocam o endereço.
- Abertura: o app é desenhado uma vez; quando chegam dados, `renderDados()` troca só os pedaços (`data-pedaco`) que mudaram, sem repetir animação de entrada.
- Versão: o app confere `index.html` sem cache (ao abrir, ao voltar para a aba e a cada 30 min). Ao abrir troca sozinho para a versão nova (uma vez por versão); com o app aberto mostra o aviso "Atualizar agora". Ao publicar, suba o número em `<meta name="versao">` e nos `?v=`.
- Registrar contato em duas etapas na mesma tela: 1. Cadastro (campos agrupados: a administradora, quem atende, como falar) e 2. Registrar contato (registro à esquerda; resumo do cadastro e últimos contatos à direita). Abre no Cadastro enquanto ninguém atendeu de verdade (sem contato contado, sem `contato_anterior` e etapa SCC antes de Contato); depois abre direto no registro. "Editar dados" abre só o cadastro. O cadastro e o contato são salvos juntos.
- Negativa: destino obrigatório. Follow-up semestral marca o retorno (padrão: daqui a 6 meses em dia útil, ajustável) e move o negócio para a etapa 4; Sem interesse limpa o retorno e deixa o negócio na etapa 5 (o gatilho já move).
- Administradoras: aba Sem interesse (etapa SCC de ordem 5), fora das listas de trabalho; depois de 1 ano desde `etapa_desde` a ficha aparece como pronta para retomar, e só volta com "Retomar contato" (vai para a etapa Contato).
- Registrar contato: uma escolha só (Sem contato, Consegui contato, Demo agendada, Demo realizada, Negativa) + "Só anotação". Registros antigos mantêm detalhe/rótulo. "Sem contato" não conta como contato novo nem follow-up a partir de 25/11/2026 (`SEM_CONTATO_NAO_CONTA_DESDE`).
- Demo realizada: exige dia/hora, sistema, condomínios, responsável e cidade/UF; vai para o Painel de Demonstrações Realizadas (relatório da semana) com o cartão novo em destaque.
- Desempenho: as fichas vêm só com as colunas usadas; o texto das anotações importadas do Agendor é buscado ao abrir a ficha. Datas usam um `Intl.DateTimeFormat` só, com cache por timestamp; listas filtradas e contagens ficam guardadas até os dados (`S.dv`), a busca ou o filtro mudarem; a busca espera 200 ms depois da última tecla. Os dados ficam guardados em memória (a Agenda usa as mesmas fichas da lista; perfis, listas e equipe são buscados uma vez); só busca de novo depois de salvar, pelo "Atualizar dados" do menu ou ao voltar para a aba depois de 10 minutos. Vendas troca só o quadro ao mudar filtro ou negócio; o painel da ficha troca só a si mesmo. O histórico mostra 20 registros por vez.
- Agenda: o próximo retorno fica em `fichas.retorno_em` (e `retorno_nota`); as demonstrações agendadas vêm de `fichas.demo_em`. Avisos 5 minutos antes pelo navegador (`sw.js` só mostra as notificações, não guarda cache).
- Relatórios: diário, semanal e mensal, montados com os registros; observações e correções de números ficam em `relatorios`, e o ponto de partida do acumulado em `acumulado_base`. "Baixar PDF" usa a impressão do navegador.
- Quem cria conta pela tela de entrada fica aguardando aprovação em Equipe.
- A cada publicação, troque só o número da meta `versao` no `index.html` (e o `?v=` dos arquivos).

## Sistemas reconhecidos (v42)
- O nosso sistema aparece como **SCC Online (PRG)** (antes "Omeupredio (PRG)"; o Omeupredio é o app que vem com ele). Quem usa aparece com o selo "Já é cliente · SCC Online". A detecção continua pelo link do portal omeupredio.com.br.
- Novos: **Seu Condomínio** (seucondominio.com.br e appseucondominio.com.br) e **Alterdata** (portal Immobile Web / Condomínio Up, immobileweb.com.br).
- Banco: 13 empresas e 1 marcação renomeadas de "Omeupredio (PRG)" para "SCC Online (PRG)"; as 442 empresas cujo site não tinha link de sistema voltaram para a fila de verificação.
- Campo "Sistema" da ficha virou lista de escolha (com "Outro sistema…"). Nomes diferentes para o mesmo sistema viram o nome oficial (ex.: "Cond21" e "Group" → "Group Software (Condomínio21)"), então não há concorrente repetido. Entraram ApControle, BR Condomínios, Datadigitos, Icondev, Syndkos, Systemar e Sem sistema. As 14 fichas que estavam escritas de outro jeito foram padronizadas no banco; quando havia dois sistemas no mesmo texto, o detalhe foi para "Informações adicionais".

## Concorrência (v43)
- Aba **Concorrência**: brechas (atacar hoje), movimentos (ficar sabendo) e um resumo por concorrente (portal no ar ou não, quedas em 6 meses, notícias).
- **Vigia automático** (função `vigiar-concorrencia`, agendada no pg_cron a cada 15 minutos):
  - testa os portais dos concorrentes (até 3 endereços por sistema, tirados dos links reais dos sites das administradoras); sem resposta em 2 testes seguidos = brecha "portal fora do ar"; quando volta, a brecha fecha e vale por mais 14 dias;
  - a cada 2 horas procura notícias no Google Notícias: problema (instabilidade, apagão, vazamento, reajuste...) = brecha; lançamento, parceria, mudança na empresa = movimento;
  - a cada 6 horas lê o blog da Almah (único concorrente com feed aberto).
- O Reclame Aqui bloqueia leitura automática; o que aparecer lá entra pelo botão "Registrar à mão".
- **Lista de ligação da brecha**: fichas e empresas do mapeamento que usam aquele sistema, com "Ligar e registrar" (abre a ficha já no registro; empresa sem ficha ganha ficha na hora).
- **Marcação no banco** (gatilho `registro_marca_brecha`): todo contato com administradora que usa o sistema da brecha, dentro do prazo, ganha `registros.brecha_id`; demonstração e contrato até 60 dias depois herdam a brecha do contato que abriu a conversa. O relatório (semana/mês) mostra uma seção "Brechas da concorrência".
- **Início**: card de alerta quando há brecha aberta; sem brecha, mostra a última novidade.
- **Funções do time**: no cadastro a pessoa escolhe SDR, Vendedor, Pós-vendas ou Gestor (`perfis.funcao`); a Equipe mostra e troca a função. "Papel" continua sendo o acesso (próprios dados ou vê tudo).

