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
- Nome oficial dos sistemas garantido no banco (função `nome_oficial_sistema` + gatilhos em fichas, empresas, marcações e concorrência): "Almah" vira "Almah Condos", "Cond21" vira "Group Software (Condomínio21)" etc.
- **Funções do time**: no cadastro a pessoa escolhe SDR, Vendedor, Pós-vendas ou Gestor (`perfis.funcao`); a Equipe mostra e troca a função. "Papel" continua sendo o acesso (próprios dados ou vê tudo).

## Concorrência completa (v45)
- Cada brecha mostra: o que aconteceu (texto montado pelo sistema nas quedas; resumo nas notícias), fatos (início, duração, quedas em 6 meses), **Como usar na ligação** (roteiro editável pelo time), **O que as administradoras disseram** (anotações das ligações, tabela `concorrencia_notas`) e o resultado da brecha.
- Movimentos têm resumo, **Para vendas** e **Para o pós-venda**, editáveis (`editar_texto_evento`).
- Resumo automático só para links diretos (blog, registros à mão): o vigia guarda a descrição oficial da página (meta description). Os links do Google Notícias não levam direto à matéria; o resumo dessas fica para o time escrever.
- **Abertura animada** da página (toda vez que entra na Concorrência; cobre a tela no clique, antes de a página aparecer; pula com Esc ou clique): o globo da marca passa pelos concorrentes com a situação real de cada um (quem tem brecha fica mais tempo e em vermelho) e termina no total de brechas abertas.


## Indicadores Comerciais (v47)
- Aba **Indicadores** no menu: central de indicadores para a gestão. Página nova; Relatórios diário, semanal e mensal não mudaram.
- Tudo é calculado sozinho; só as **metas** são digitadas (botão "Metas e parâmetros", só para admin ou função Gestor). Meta inicial gravada: 6 demos agendadas por mês. Meta em branco = sem meta (nada é inventado).
- Fontes: `registros` (tentativas = Sem contato, Consegui contato, Negativa e Demo agendada, em qualquer canal; contato efetivado = tentativas menos Sem contato; contrato = registro Contrato fechado), `demos` (histórico de demonstrações), `negocio_etapas` (histórico de etapas do funil SCC, para propostas) e `metas_comerciais`.
- Banco (migração `indicadores_comerciais`):
  - `demos`: cada agendamento é uma linha. Gatilho em `fichas.demo_em` (data no futuro = agendamento; data diferente com uma demo aberta = reagendamento, que fecha a anterior como `reagendada` e liga a nova em `reagendada_de`, sem contar de novo). Gatilho em `registros`: Demo agendada garante a linha aberta; Demo realizada fecha a aberta como `realizada` (ou cria uma já realizada). As 38 demos realizadas anteriores entraram como `origem = historico`, apresentadas pelo Leonardo, sem data de agendamento.
  - `registros.apresentador`: quem apresentou a demo (campo "Quem apresentou" em Demo realizada: Leonardo ou Matheus cobrindo férias). Na tabela de demonstrações dos Indicadores dá para corrigir quem apresentou e marcar "Não aconteceu" nas demos que passaram da data sem resultado.
  - `negocio_etapas`: gatilho grava cada mudança de etapa de negócio com data. As etapas atuais vindas do Agendor entraram como `origem = importado` (data = `etapa_desde`).
  - `metas_comerciais`: chave/valor; lê quem está liberado, grava só a gestão (`eh_gestao()`).
  - Os gatilhos nunca bloqueiam o registro: se algo falhar, só avisam no log.
- Quem conta o quê: a SDR conta tentativas, contatos e demos agendadas (`usuario_id` / `agendada_por`); quem apresenta conta demos realizadas, propostas e contratos (pelo `apresentador` da última demo realizada da ficha). O Matheus aparece no filtro como Gestor (sem conta) só pelas demos que apresentou.
- Funil por empresa: cada administradora conta uma vez em todas as etapas que alcançou até o fim do período; proposta e contrato só entram para quem teve demo realizada.
- Filtros: Dia, Semana, Mês, Ano e Personalizado (com ← →), e Responsável. Tudo na página usa o mesmo período e responsável. Compara com o período anterior do mesmo tamanho (no período em andamento, até o mesmo dia).
- Atualização: busca de novo ao abrir a aba (se passou 1 minuto), a cada 2 minutos com a aba aberta, no botão Atualizar e no "Atualizar dados" do menu.
- Exportação: "Baixar PDF" (impressão do navegador, só o conteúdo) e "Baixar Excel" (SheetJS carregado na hora: Resumo, Funil, Por responsável, Evolução, Demonstrações).

## Oportunidades (v48)
- Aba **Oportunidades** no menu: administradoras que tiveram demo realizada (tabela `demos`) e ainda não fecharam. Abas: Em negociação, Retomar depois (com aviso quando chega o dia), Negaram e Fecharam.
- Cada contato pós-demo vai para `oportunidade_contatos` com quem fez (`usuario_id`): a SDR e o vendedor aparecem com selos diferentes no histórico. "Como ficou?": Em negociação, Deixou para depois (data para retomar), Negou (motivo obrigatório: preço, contrato com o sistema atual, não é o momento, faltou funcionalidade, não gostou do sistema (uso ou visual), não viu vantagem sobre o atual, escolheu outro sistema, parou de responder, outro) ou Fechou contrato.
- A situação atual fica em `oportunidades` (sem linha = em negociação). Fechou contrato chama `fechar_oportunidade()`, que grava o registro de Contrato fechado (entra nos Relatórios e Indicadores).
- A lista vem de `lista_oportunidades()` (security definer, só para quem está liberado), porque o vendedor não enxerga as fichas da SDR pela regra normal. Ela devolve só o necessário para negociar: nome, cidade, sistema, condomínios, responsável, telefones, WhatsApp e e-mail.
- Não usa as etapas importadas do Agendor.

## Início do vendedor (v61)
- Quem tem a função **Vendedor** abre o sistema numa tela própria: saudação com as demos e retomadas do dia, as demonstrações de hoje em destaque (sistema, tamanho, responsável, contato, quem agendou e a anotação da SDR), as próximas demos, demos sem resultado, a semana (demos, retomadas das Oportunidades e retornos dele), Concorrência agora (brecha ativa + quantas administradoras que já viram a demo usam aquele sistema), Retomar hoje e Seu mês.
- Menu do vendedor sem Mapeamento, Região e Listas.
- Dados: `agenda_vendedor()` (security definer, só o necessário das fichas da SDR). "Registrar resultado" chama `resultado_demo()`: Aconteceu grava o registro de Demo realizada na ficha da SDR (os relatórios dela continuam certos) com o vendedor como apresentador; Reagendar muda a data da demo; Não aconteceu marca a demo.
- As classes das telas de Indicadores que tinham o mesmo nome do Início (in-cab, in-cartao, in-data, in-eixo, in-grade, in-trilho) passaram a se chamar bi-*.

## Pós-vendas (v62)
- Quem tem a função **Pós-vendas** abre o sistema numa tela própria: visitas e ligações de hoje em destaque (endereço, contato, desde quando é cliente, produtos que já usa, o que dá para oferecer, Como chegar e WhatsApp), visitas sem resultado, próximas, a semana, Clientes que precisam de atenção (insatisfeitos ou 90+ dias sem contato), Produtos adicionais (funil de Serviços Adicionais + sugestão de venda) e Sua carteira.
- Aba **Clientes** (pós-vendas e admin): a carteira = fichas no Funil de Acompanhamento, vinda de `carteira_clientes()` (security definer). Na ficha do cliente: como está (Para contatar, Em acompanhamento, Satisfeito, Insatisfeito, via `situacao_cliente()`), produtos que já usa (`cliente_produtos`), marcar visita ou ligação e o histórico.
- `visitas`: visita presencial ou ligação de acompanhamento, com resultado e como o cliente ficou. As da pessoa aparecem também na Agenda (verde).
- Menu do pós-vendas: Início, Agenda, Clientes, Vendas e Administradoras.

## v63 — PDF dos relatórios em A4 em pé
- O "Baixar PDF" dos relatórios (dia, semana, mês) monta um PDF próprio em A4 em pé, no layout do Resumo Semanal: capa com a data grande, Observações, Resultados, Ligações do Dia (só no diário), Em destaque, e no semanal/mensal o Acumulado, Contratos Fechados e o Painel de Demonstrações Realizadas.
- Fontes Sora (títulos e números) e Plus Jakarta Sans (texto), carregadas só na hora de baixar.
- Os blocos são medidos e distribuídos nas páginas sem cortar cartões; se a última página ficaria quase vazia, usa uma versão um pouco mais compacta.
- Margem 0 na página: o navegador não imprime endereço e data; o rodapé é do próprio relatório.
- As brechas da concorrência saíram dos relatórios.

## v64 — Corrigir contato pelo relatório
- Na tabela de ligações dos Relatórios, cada contato seu tem o botão **Editar**: dá para trocar o resultado (Sem contato, Contato realizado, Negativa, Só anotação) e reescrever a anotação. Negativa pede o destino (Follow-up semestral com data, ou Sem interesse), igual ao registro novo.
- Registros de demonstração e contrato: só a anotação é editável.
- Banco: gatilhos `registro_corrigido_*` atualizam a ficha e o negócio quando o resultado muda (só avançam, como no registro novo).
- "Conversei" / "Consegui contato" passou a se chamar **Contato realizado**.
- Banco: "sem_contato" aceito em `registros.detalhes` (o Salvar com "Sem contato" falhava).

## v65 — Calendário de escolher data no visual da Agenda
- Todos os campos de data (e data com hora) usam um calendário próprio no computador: grade igual à da Agenda, dia escolhido em azul, hoje destacado, pontinho roxo nos dias que já têm retorno ou demo, atalhos (Amanhã, 1 semana, 1 mês, 6 meses), Limpar / Hoje / Escolher. Campos com hora ganham o campo Hora dentro do calendário.
- O campo mostra o dia da semana ao lado da data (some em campo estreito). Continua dando para digitar a data.
- No celular fica o calendário do próprio aparelho.
- Feito sem mexer nas telas: cada campo de data é preparado sozinho quando aparece (MutationObserver), respeitando min/max.

## v66 — Negativa + Follow-up
- A negativa guarda o destino no próprio registro (`detalhes`: `follow_semestral` ou `sem_interesse`) e aparece como **Negativa + Follow-up** ou **Negativa + Sem interesse** (antes aparecia sempre "Sem interesse").
- Negativa com follow-up vai para a coluna **Follow-up semestral** do quadro (antes caía em Sem interesse). Gatilho de correção também roda quando o destino muda.
- As 4 negativas já registradas (todas com follow-up marcado na ficha) foram ajustadas.

## v67 — Início do gestor (Matheus)
- Função **Gestor** (perfis.funcao = 'gestor', sem ser admin): menu Início, Indicadores, Oportunidades, Clientes, Relatórios e Agenda do time.
- Início do gestor: meta de demos do mês com barra, 4 números do mês contra o mês anterior, o time agora (SDR, vendedor, pós-vendas), funil do mês, demos dos próximos 7 dias (com "Matheus cobre"), "Precisa da sua atenção" (demos sem resultado, oportunidades paradas há +15 dias, clientes em risco, meta) e atalhos. Os números vêm do mesmo cálculo dos Indicadores.
- Banco: as políticas de leitura de fichas, registros, relatórios, negócios, contatos, tarefas e acumulado usam `eh_gestao()` (admin ou gestor). Escrever continua só para o dono.
- Gestor vê a equipe toda por padrão (Relatórios com seletor de pessoa), não recebe avisos de retorno dos outros.

## v68 — Pós-vendas guardado para depois
- A página Clientes saiu do menu da admin e do gestor (fica só para quem tiver a função Pós-vendas, que ainda não tem contas). Quem abrir #/clientes sem ser do pós-vendas volta para o Início.
- Início do gestor sem a parte do pós-vendas: o cartão "Carlos e Ivan" e o aviso de clientes em risco saíram; o 4º número virou **Propostas enviadas**; o atalho Clientes virou **Agenda do time**.
- O código do pós-vendas (início, clientes, visitas) continua no sistema para quando essa parte for repensada.

## v69 — Menu lateral
- A barra de cima virou um menu lateral com grupos: Geral (Início, Agenda), Prospecção (Mapeamento, Região, Listas, Concorrência), Carteira (Administradoras), Comercial (Vendas, Oportunidades), Análises (Relatórios, Indicadores). Embaixo: Equipe (só admin), o usuário (menu com Atualizar dados, versão e Sair) e "Recolher menu".
- Recolhido fica só com ícones (76px), com os contadores sobre os ícones e o nome ao passar o mouse; a escolha fica guardada (localStorage `mapa-menu-mini`).
- Em telas até 900px: barra fina em cima com ☰ e o menu abre como gaveta pela esquerda.
- Cada função vê só as próprias páginas (vendedor, gestor, pós-vendas), agrupadas do mesmo jeito.

## v70 — Oportunidades mais organizada, com a origem
- A página segue uma ordem: **1. Escolha a situação** (quatro quadros grandes com o número e o que cada situação quer dizer), **2. De onde veio** (Todas, Prospecção, Captação direta, com a busca ao lado) e **3. a lista**.
- Lista em colunas fixas: Administradora, Origem, Andamento (Demo › Contato › Resposta, verde quando a etapa já aconteceu) e Próximo passo (vermelho quando está atrasado: sem contato depois da demo, mais de 15 dias sem contato, ou hora de retomar).
- Ao clicar numa linha, os detalhes abrem **ao lado** (no celular, em tela cheia): origem, quem agendou e quem apresentou a demo, situação agora, contatos da administradora, o formulário de registrar contato e o histórico, como antes.
- **Origem automática pela função de quem agendou a primeira demo**, não pelo nome: SDR agendou = Prospecção; vendedor ou gestor = Captação direta. Se outra pessoa assumir como SDR, continua igual. Sem mudança no banco: lê `demos.agendada_por` e `perfis.funcao`. Hoje as 38 demos foram agendadas pela SDR, então tudo aparece como Prospecção.
