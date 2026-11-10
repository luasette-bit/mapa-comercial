/* Mapa Comercial · PRG Software · Grupo WorkOffice
   Sistema de mapeamento de administradoras de condomínio.
   Dados: Supabase (projeto "Comercial PRG"). A busca nas fontes públicas roda na função buscar-administradoras. */
(() => {
  "use strict";
  const SUPABASE_URL = "https://zdbhuztsvotujmwxeycq.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkYmh1enRzdm90dWptd3hleWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MjgzNDIsImV4cCI6MjEwOTMwNDM0Mn0.Lcmzjlh11XG4-o_XWRObixi7n8vlsrMaJQJbw3BOIGc"; // chave pública (anon): sem login, o banco não mostra nada
  const FUNCAO = "buscar-administradoras";

  const UFS = [["AC","Acre"],["AL","Alagoas"],["AM","Amazonas"],["AP","Amapá"],["BA","Bahia"],["CE","Ceará"],["DF","Distrito Federal"],["ES","Espírito Santo"],["GO","Goiás"],["MA","Maranhão"],["MG","Minas Gerais"],["MS","Mato Grosso do Sul"],["MT","Mato Grosso"],["PA","Pará"],["PB","Paraíba"],["PE","Pernambuco"],["PI","Piauí"],["PR","Paraná"],["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],["RO","Rondônia"],["RR","Roraima"],["RS","Rio Grande do Sul"],["SC","Santa Catarina"],["SE","Sergipe"],["SP","São Paulo"],["TO","Tocantins"]];
  const TIPOS = ["Todas", "Administradora", "Imobiliária", "Construtora", "Contabilidade"];
  // softwares que o sistema reconhece pelo link do portal no site da administradora
  const SOFTWARES = ["Superlógica", "Group Software (Condomínio21)", "Almah", "CondoMob", "uCondo", "TownSq", "CondoPanel", "Condominizar", "Omeupredio (PRG)", "Ahreas", "Winker", "Webware", "Hitecnet"];
  const CNAES = { "6822600": "Gestão e administração da propriedade imobiliária", "6821801": "Corretagem na compra e venda de imóveis", "6821802": "Corretagem no aluguel de imóveis", "6810202": "Aluguel de imóveis próprios", "6920601": "Atividades de contabilidade", "8112500": "Condomínios prediais", "4120400": "Construção de edifícios" };
  const COR_TIPO = { "Administradora": "#2A3F72", "Imobiliária": "#B4410E", "Construtora": "#5B2A86", "Contabilidade": "#1E7A46" };
  const COLS = "cnpj,cnpj_basico,razao_social,nome_fantasia,matriz,situacao,data_inicio,cnae_principal,cnaes_secundarios,tipo,atividade_principal_condominio,uf,municipio,logradouro,numero,complemento,bairro,cep,telefone1,telefone2,email,porte,referencia_receita,atualizado_em,tel_status,tel_por,tel_em,email_status,qtd_socios,removido,exportada,nova,nota,lat,lon,geo_precisao,nome_condominio,site,site_situacao,sistema,sistema_prova,sistema_em,sistema_status,sistema_por,sistema_marcado,sistema_pista,sistema_pista_url";

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const fmtN = (n) => Number(n || 0).toLocaleString("pt-BR");
  const fmtData = (d) => { if (!d) return ""; const x = new Date(d.length === 10 ? d + "T12:00:00" : d); return isNaN(x) ? "" : x.toLocaleDateString("pt-BR"); };
  const fmtCnpj = (c) => (c && c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : c || "");
  const MIN = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o"]);
  const titulo = (s) => String(s || "").toLowerCase().split(/(\s+)/).map((w, i) => !w.trim() ? w : /^(ltda\.?|me|epp|eireli|s\/a|s\.a\.?|s\/c|ss)$/.test(w) ? w.toUpperCase() : (i && MIN.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const nomeEmp = (r) => titulo(r.nome_fantasia || r.razao_social || fmtCnpj(r.cnpj));
  const ini = (n) => String(n || "?").trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-Z]/.test(p)).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  const ufNome = (uf) => (UFS.find((u) => u[0] === uf) || [uf, uf])[1];
  const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

  // Chama uma função do servidor e devolve sempre um objeto (com .erro quando falha)
  async function chamar(nome, body) {
    try {
      const { data, error } = await sb.functions.invoke(nome, { body });
      if (!error) return data || {};
      try { const j = await error.context.json(); if (j && (j.erro || j.error)) return { erro: j.erro || j.error }; } catch { /* sem corpo */ }
      return { erro: error.context?.status === 401 ? "faca_login" : "rede" };
    } catch { return { erro: "rede" }; }
  }

  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3200); }

  const lembrar = (() => { try { return JSON.parse(localStorage.getItem("mapa-comercial") || "{}") || {}; } catch { return {}; } })();
  function salvarPreferencias() { try { localStorage.setItem("mapa-comercial", JSON.stringify({ uf: S.uf, cidade: S.cidade, cidadeId: S.cidadeId, tipo: S.tipo })); } catch { /* sem armazenamento */ } }

  const S = {
    user: null, perfil: null, view: "mapeamento", menu: false,
    uf: lembrar.uf || "SP", cidade: lembrar.cidade || null, cidadeId: lembrar.cidadeId || null, cidMenu: false, cidBusca: "", estado: null, buscadas: new Map(), totais: new Map(), contando: null, cidOrdem: "az", tipo: lembrar.tipo || "Todas", sistema: "Todos",
    soAtivas: true, escExp: false, soNovas: false, aba: "lista",
    rows: [], carregando: false, erro: "", cidades: [], socios: new Map(), marcas: new Map(),
    sel: null, selRow: null, grupo: [], show: 60, confirmarRemocao: false, msg: "",
    mapeando: null, info: null,
    reg: { texto: "", lugares: [], lugar: null, raio: 2, rows: [], dist: new Map(), carregando: false, tipo: "Todas", semLocal: 0 },
    listas: null, equipe: null, recuperando: false,
  };

  /* ----------------------------------------------------------------- dados */
  async function carregarPerfil() {
    const { data } = await sb.from("perfis").select("nome,papel,aprovado").eq("id", S.user.id).maybeSingle();
    S.perfil = data || { nome: (S.user.email || "").split("@")[0], papel: "sdr", aprovado: false };
    S.pendentes = 0;
    if (S.perfil.aprovado && S.perfil.papel === "admin") {
      const { count } = await sb.from("perfis").select("id", { count: "exact", head: true }).eq("aprovado", false);
      S.pendentes = count || 0;
    }
  }
  async function carregarSocios(basicos) {
    const falta = [...new Set(basicos)].filter((b) => !S.socios.has(b));
    for (const parte of chunk(falta, 150)) {
      const { data } = await sb.from("socios").select("cnpj_basico,nome,qualificacao").in("cnpj_basico", parte);
      parte.forEach((b) => S.socios.set(b, []));
      (data || []).forEach((s) => S.socios.get(s.cnpj_basico).push(s));
    }
  }
  async function carregarMarcas(cnpjs) {
    for (const parte of chunk([...new Set(cnpjs)], 150)) {
      const { data } = await sb.from("marcacoes").select("cnpj,campo,status,usuario_nome,criado_em").in("cnpj", parte);
      parte.forEach((c) => S.marcas.set(c, {}));
      (data || []).forEach((m) => { S.marcas.get(m.cnpj)[m.campo] = m; });
    }
  }
  const IBGE = new Map();
  async function cidadesIbge(uf) {
    if (IBGE.has(uf)) return IBGE.get(uf);
    try {
      const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error(r.status);
      const lista = (await r.json()).map((m) => ({ id: String(m.id), nome: m.nome }));
      IBGE.set(uf, lista); return lista;
    } catch (e) { console.warn(e); return []; }
  }
  // junta a lista do IBGE com o que já foi mapeado (o banco às vezes guarda o nome sem acento)
  function cidadesDoEstado() {
    const ibge = IBGE.get(S.uf) || [];
    const porId = new Map(), porNome = new Map();
    S.cidades.forEach((c) => {
      const k = c.municipio_ibge ? String(c.municipio_ibge) : null;
      if (k) { const a = porId.get(k); porId.set(k, a ? { ...a, qtd: a.qtd + c.qtd, novas: (a.novas || 0) + (c.novas || 0) } : { ...c }); }
      porNome.set(norm(c.municipio), c);
    });
    const lista = ibge.map((m) => { const c = porId.get(m.id) || porNome.get(norm(m.nome)); const t = S.totais.get(norm(m.nome)); const fonte = t ? t.total : undefined;
      // só conta como mapeada a cidade que alguém buscou de verdade; uma empresa solta que apareceu na busca de outra cidade não basta
      const bus = S.buscadas.get(norm(m.nome)); const qtd = c ? c.qtd : 0; const mapeada = !!bus && qtd > 0;
      return { id: m.id, nome: m.nome, qtd, novas: c ? c.novas || 0 : 0, mapeada, fonte, semEmpresas: !mapeada && (!!bus || fonte === 0) }; });
    // cidade mapeada que não veio do IBGE (sem internet, por exemplo) continua aparecendo
    S.cidades.forEach((c) => { if (!S.buscadas.has(norm(c.municipio))) return; if (!lista.some((m) => (c.municipio_ibge && m.id === String(c.municipio_ibge)) || norm(m.nome) === norm(c.municipio))) lista.push({ id: c.municipio_ibge ? String(c.municipio_ibge) : null, nome: c.municipio, qtd: c.qtd, novas: c.novas || 0, mapeada: true }); });
    return lista;
  }

  // Conta quantas empresas do ramo cada cidade tem na fonte (uma vez por estado; a equipe toda aproveita)
  async function contarCidades(uf) {
    if (S.contando) return;
    const ibge = await cidadesIbge(uf);
    const mes = Date.now() - 30 * 864e5;
    const faltam = ibge.map((m) => m.nome).filter((n) => { const t = S.totais.get(norm(n)); return !t || new Date(t.contado_em).getTime() < mes; });
    if (!faltam.length || uf !== S.uf) return;
    S.contando = { uf, feitas: 0, total: faltam.length };
    const atualizar = () => { if (!S.cidMenu || S.uf !== uf) return; const l = $("#cid-lista"); if (l) l.innerHTML = opcoesCidadesHtml(); const t = $("#cid-todas-sub"); if (t) t.textContent = textoTodas();
      const bt = $("#cid-estado"); if (bt && !bt.dataset.certeza) { const n = cidadesDoEstado().filter((c) => !c.mapeada && !c.semEmpresas).length; bt.hidden = !n || !!S.mapeando; bt.querySelector("span").textContent = textoFaltam(n); } };
    atualizar();
    try {
      const fila = chunk(faltam, 40);
      await Promise.all([0, 1].map(async () => {
        while (fila.length && S.uf === uf && S.user) {
          const parte = fila.shift();
          const r = await chamar(FUNCAO, { acao: "contar", uf, cidades: parte });
          if (r && r.totais) Object.entries(r.totais).forEach(([nome, total]) => { if (total !== null) S.totais.set(norm(nome), { nome, total, contado_em: new Date().toISOString() }); });
          S.contando.feitas += parte.length; atualizar();
        }
      }));
    } finally { S.contando = null; atualizar(); }
  }

  async function carregarMapeamento() {
    S.carregando = true; S.erro = ""; render();
    try {
      const [cid, info, busc, tot] = await Promise.all([
        sb.rpc("cidades_da_uf", { p_uf: S.uf, p_so_ativas: S.soAtivas }),
        sb.rpc("info_base"),
        sb.from("cidades_buscadas").select("nome,municipio_ibge,qtd,buscada_em").eq("uf", S.uf),
        sb.from("cidades_total").select("nome,total,contado_em").eq("uf", S.uf).limit(1000),
      ]);
      S.totais = new Map((tot.data || []).map((c) => [norm(c.nome), c]));
      S.buscadas = new Map((busc.data || []).map((c) => [norm(c.nome), c]));
      S.cidades = cid.data || [];
      S.info = info.data || null;
      cidadesIbge(S.uf).then(() => { if (S.cidMenu) render(); });
      let q = sb.from("mapa").select(COLS).eq("uf", S.uf).eq("removido", false).neq("referencia_receita", "exemplo").order("nota", { ascending: false }).limit(3000);
      if (S.cidadeId) q = q.eq("municipio_ibge", S.cidadeId);
      else if (S.cidade) q = q.eq("municipio", S.cidade);
      const { data, error } = await q;
      if (error) throw error;
      S.rows = data || [];
      await Promise.all([carregarSocios(S.rows.map((r) => r.cnpj_basico)), carregarMarcas(S.rows.map((r) => r.cnpj))]);
      if (S.sel && !S.rows.some((r) => r.cnpj === S.sel)) { S.sel = null; S.selRow = null; }
    } catch (e) {
      S.erro = "Não foi possível carregar as empresas. Verifique a internet e recarregue a página.";
      console.error(e);
    } finally { S.carregando = false; render(); }
  }
  async function recarregarEmpresa(cnpj) {
    const { data } = await sb.from("mapa").select(COLS).eq("cnpj", cnpj).maybeSingle();
    if (data) {
      const troca = (arr) => { const i = arr.findIndex((r) => r.cnpj === cnpj); if (i >= 0) arr[i] = data; };
      troca(S.rows); troca(S.reg.rows);
      if (S.selRow && S.selRow.cnpj === cnpj) S.selRow = data;
    }
    await carregarMarcas([cnpj]);
  }

  /* --------------------------------------------------------------- sistema */
  function sistemaDe(r) {
    if (r.sistema_status === "confirmado") return { nome: r.sistema_marcado || r.sistema, nivel: "confirmado" };
    if (r.sistema_status === "errado") return r.sistema_marcado && r.sistema_marcado !== "Não sei" ? { nome: r.sistema_marcado, nivel: "corrigido" } : { nome: null, nivel: null };
    return r.sistema ? { nome: r.sistema, nivel: "provavel" } : { nome: null, nivel: null };
  }
  // pista: portal do sistema com o nome da empresa, enquanto ninguém da equipe marcou nada
  const pistaDe = (r) => (!r.sistema_status && !sistemaDe(r).nome ? r.sistema_pista || null : null);
  function motivoSemSistema(r) {
    if (!r.sistema_em) return "ainda vai ser verificada";
    return { sem_site: "sem site (e-mail pessoal)", email_do_contador: "e-mail é do contador", fora_do_ar: "site fora do ar", sem_sistema_no_site: "site sem link do sistema" }[r.site_situacao] || "não identificado";
  }

  /* --------------------------------------------------------------- filtros */
  function filtrados(rows, tipo = S.tipo) {
    return rows.filter((r) => {
      if (tipo !== "Todas" && r.tipo !== tipo) return false;
      if (S.sistema !== "Todos") {
        const n = sistemaDe(r).nome;
        if (S.sistema.startsWith("pista:")) { if (pistaDe(r) !== S.sistema.slice(6)) return false; }
        else if (S.sistema === "Não identificado" ? !!n : n !== S.sistema) return false;
      }
      if (S.soAtivas && r.situacao !== "ATIVA") return false;
      if (S.escExp && r.exportada) return false;
      if (S.soNovas && !r.nova) return false;
      return true;
    });
  }

  /* ---------------------------------------------------------- componentes */
  const ICONE = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    excel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 13l6 6M15 13l-6 6"/></svg>',
    seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="ic-seta"><path d="m6 9 6 6 6-6"/></svg>',
    busca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    sino: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1B2333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    logo: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2A3F72" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>',
  };
  function nivelTel(r) {
    if (r.tel_status === "confirmado") return ["Confirmado", "s-conf"];
    if (r.tel_status === "errado") return ["Marcado como errado", "s-errado"];
    if (r.telefone1) return ["Identificado", "s-ident"];
    return ["Não encontrado", "s-vazio"];
  }
  function nivelNota(n) { return n >= 75 ? ["Alta", "nota-alta", "b-alta"] : n >= 50 ? ["Média", "nota-media", "b-media"] : ["Baixa", "nota-baixa", "b-baixa"]; }
  function tagsEmpresa(r) {
    const t = [];
    if (r.nova) t.push(`<span class="selo s-nao">Nova · aberta em ${esc(fmtData(r.data_inicio))}</span>`);
    if (r.exportada) t.push(`<span class="selo s-roxo">Exportada por ${esc(r.exportada)}</span>`);
    if (r.situacao && r.situacao !== "ATIVA") t.push(`<span class="selo s-errado">Empresa ${esc(r.situacao.toLowerCase())}</span>`);
    if (r.matriz === false) t.push(`<span class="selo s-neutro">Filial</span>`);
    return t.join("");
  }
  function celulaSistema(r) {
    const s = sistemaDe(r);
    if (pistaDe(r)) return `<span class="pilha" style="gap:2px;align-items:flex-start"><span class="selo s-pista">${esc(r.sistema_pista)}?</span><span class="t11 fraco">a conferir: portal com o nome dela</span></span>`;
    if (!s.nome) return `<span class="pilha" style="gap:2px;align-items:flex-start"><span class="selo s-vazio">Não identificado</span><span class="t11 fraco">${esc(motivoSemSistema(r))}</span></span>`;
    return `<span class="pilha" style="gap:2px;align-items:flex-start"><span class="selo s-sis">${esc(s.nome)}</span><span class="t11 ${s.nivel === "provavel" ? "fraco" : "origem-ok"}">${s.nivel === "provavel" ? "provável, pelo site" : s.nivel === "corrigido" ? "corrigido pela equipe" : "confirmado pela equipe"}</span></span>`;
  }
  function linhaEmpresa(r, dist) {
    const soc = S.socios.get(r.cnpj_basico) || [];
    const [tl, tc] = nivelTel(r);
    const [nl, nc, bc] = nivelNota(r.nota || 0);
    return `<button type="button" class="t-linha" data-acao="sel" data-cnpj="${esc(r.cnpj)}" aria-pressed="${S.sel === r.cnpj}">
      ${dist != null ? `<span class="num t13"><b>${dist < 1 ? Math.round(dist * 1000) + " m" : dist.toFixed(1).replace(".", ",") + " km"}</b>${r.geo_precisao && r.geo_precisao !== "endereco" ? `<br><span class="t11 fraco">pela ${r.geo_precisao === "bairro" ? "região do bairro" : "rua"}</span>` : ""}</span>` : ""}
      <span class="pilha" style="gap:4px">
        <span class="t-nome">${esc(nomeEmp(r))}</span>
        <span class="linha-flex" style="gap:5px"><span class="selo s-ident">${esc(r.tipo || "")}</span><span class="t12 fraco">${esc(r.bairro ? r.bairro + " · " : "")}${esc(r.municipio || "")}</span></span>
        <span class="linha-flex" style="gap:5px">${tagsEmpresa(r)}</span>
      </span>
      ${dist == null ? `<span class="t13 num cnpj">${esc(fmtCnpj(r.cnpj))}</span>` : ""}
      <span class="pilha" style="gap:4px;align-items:flex-start"><span class="t13 num cnpj ${r.tel_status === "errado" ? "riscado" : ""}">${esc(r.telefone1 || "Sem telefone")}</span><span class="selo ${tc}">${tl}</span></span>
      <span class="pilha" style="gap:2px"><span class="t13 corta2">${esc(soc[0] ? titulo(soc[0].nome) : "Não informado")}</span><span class="t11 fraco">${esc(soc[0] ? (soc[0].qualificacao || "Sócio") + (soc.length > 1 ? ` · +${soc.length - 1}` : "") : "Sem sócio na Receita")}</span></span>
      ${celulaSistema(r)}
      <span class="pilha"><span class="linha-flex t12" style="justify-content:space-between"><span class="${nc}">${nl}</span><span class="fraco num">${r.nota || 0}/99</span></span><span class="barra" style="height:6px"><i class="${bc}" style="width:${r.nota || 0}%"></i></span></span>
    </button>`;
  }

  /* --------------------------------------------------------------- telas */
  // Lado esquerdo da tela de entrada: marca do grupo e o que o sistema faz
  function ladoMarca() {
    return `<section class="entrada-marca">
      <img src="marca/workoffice.png?v=1" alt="Grupo WorkOffice" class="logo-wo" width="417" height="65">
      <div class="entrada-titulo"><span class="selo-prg"><img src="marca/prg-software.png?v=1" alt="PRG Software" width="151" height="73"></span>
        <div class="entrada-nome">Mapa Comercial</div></div>
      <p>As administradoras de condomínio de cada cidade, com CNPJ, sócios e contatos, prontas para a equipe prospectar.</p>
      <ul class="entrada-lista"><li>Digite a cidade e o sistema monta o mapeamento</li><li>Veja quem está perto do lugar da visita</li><li>Confirme os dados e exporte a lista</li></ul>
    </section>`;
  }
  function fundo(ligado) {
    document.body.classList.toggle("fora", ligado);
    if (window.FundoPRG) ligado ? window.FundoPRG.ligar() : window.FundoPRG.desligar();
  }

  function render() {
    fundo(!S.user || S.recuperando || (S.perfil && !S.perfil.aprovado));
    if (S.recuperando) return renderNovaSenha();
    if (!S.user) return S.cadastro ? renderCadastro() : renderLogin();
    if (S.perfil && !S.perfil.aprovado) return renderAguardando();
    app.innerHTML = topo() + `<main>${S.view === "mapeamento" ? telaMapeamento() : S.view === "regiao" ? telaRegiao() : S.view === "listas" ? telaListas() : telaEquipe()}</main>`;
    if (S.view === "regiao") desenharMapa();
  }

  function topo() {
    const nav = [["mapeamento", "Mapeamento"], ["regiao", "Região"], ["listas", "Listas exportadas"]];
    if (S.perfil?.papel === "admin") nav.push(["equipe", S.pendentes ? `Equipe <span class="contador">${S.pendentes}</span>` : "Equipe"]);
    return `<header class="topo">
      <button type="button" class="marca marca-topo" data-acao="ir" data-view="mapeamento" aria-label="Mapa Comercial, voltar ao Mapeamento"><img src="marca/prg-software.png?v=1" alt="" width="151" height="73" class="marca-prg"><span class="marca-sep" aria-hidden="true"></span><span class="pilha" style="gap:0"><span class="marca-nome">Mapa Comercial</span><span class="marca-sub">Grupo WorkOffice</span></span></button>
      <nav aria-label="Menu principal">${nav.map(([k, l]) => `<button type="button" data-acao="ir" data-view="${k}" ${S.view === k ? 'aria-current="page"' : ""}>${l}</button>`).join("")}</nav>
      <div class="usuario"><button type="button" data-acao="menu" aria-expanded="${S.menu}"><span>${esc(S.perfil?.nome || "")}</span><span class="avatar">${esc(ini(S.perfil?.nome))}</span></button>
        ${S.menu ? `<div class="menu"><span class="origem" style="padding:6px 10px">${esc(S.user.email)} · ${S.perfil?.papel === "admin" ? "Administradora" : "SDR"}</span><button type="button" data-acao="sair">Sair</button></div>` : ""}
      </div>
    </header>`;
  }

  function telaMapeamento() {
    const lista = filtrados(S.rows);
    const novas = lista.filter((r) => r.nova).length;
    const total = lista.length;
    const telConf = lista.filter((r) => r.tel_status === "confirmado").length;
    const base = S.info?.atualizado_em ? `Dados da Receita Federal · última atualização em ${fmtData(S.info.atualizado_em)}` : "Dados da Receita Federal";
    let html = `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Mapeamento de administradoras</h1><p class="fraco" style="margin:0">Empresas ativas que administram condomínios, ordenadas por facilidade de contato.</p></div><span class="fonte-dados">${esc(base)}</span></div>`;
    if (S.msg) html += `<div class="aviso aviso-ok" role="status"><span>${esc(S.msg)}</span><button type="button" class="mini mini-ok" data-acao="fechar-msg">Fechar</button></div>`;
    if (S.erro) html += `<div class="aviso aviso-erro" role="alert"><span>${esc(S.erro)}</span></div>`;
    if (novas && !S.soNovas) html += `<section class="faixa-novas" aria-label="Empresas novas"><div class="linha-flex" style="gap:12px;flex-wrap:nowrap"><div class="sino">${ICONE.sino}</div><div class="pilha" style="gap:2px"><strong>${novas} ${novas === 1 ? "empresa nova aberta" : "empresas novas abertas"} no último mês</strong><span class="t12" style="color:#5B4A12">Empresa recém-aberta ainda está escolhendo sistema: é o melhor momento para chegar.</span></div></div><button type="button" class="btn btn-escuro" data-acao="so-novas">Ver só as novas</button></section>`;
    html += filtrosHtml();
    if (S.mapeando) html += progressoHtml();
    html += `<section class="cartao resumo" aria-label="Resumo">
      ${indicador("Empresas encontradas", total, "neste filtro")}
      ${indicador("Telefone confirmado", telConf, "pela equipe")}
      ${indicador("Sistema identificado", lista.filter((r) => sistemaDe(r).nome).length, "pelo site ou pela equipe")}
      ${indicador("Usam Superlógica", lista.filter((r) => sistemaDe(r).nome === "Superlógica").length, "pelo site ou pela equipe")}
      ${indicador("Novas no último mês", novas, "abertas recentemente")}
    </section>
    <div class="abas" role="tablist" aria-label="Forma de ver">
      <button type="button" class="aba" role="tab" data-acao="aba" data-aba="lista" aria-selected="${S.aba === "lista"}">Lista de empresas</button>
      <button type="button" class="aba" role="tab" data-acao="aba" data-aba="cidades" aria-selected="${S.aba === "cidades"}">Por cidade</button>
    </div>`;
    if (S.carregando && !S.rows.length) return html + `<div class="cartao vazio">Carregando as empresas…</div>`;
    if (!S.rows.length && !S.cidades.length) return html + `<div class="cartao vazio"><b>Nenhuma cidade de ${esc(ufNome(S.uf))} foi mapeada ainda.</b><br>Digite uma cidade no campo "Mapear cidade" e clique em <b>Mapear</b>. O sistema busca as administradoras sozinho.</div>`;
    if (S.aba === "cidades") return html + cidadesHtml();
    return html + `<div class="duas">${listaHtml(lista)}${painelHtml()}</div>`;
  }
  const indicador = (r, v, s) => `<div class="ind${v ? "" : " zero"}"><span class="rotulo">${r}</span><span class="v">${fmtN(v)}</span><span class="t12 fraco">${s}</span></div>`;

  function filtrosHtml() {
    const cont = (t) => (t === "Todas" ? S.rows.length : S.rows.filter((r) => r.tipo === t).length);
    return `<section class="cartao filtros" aria-label="Filtros">
      <div class="linha-filtros">
        <div class="campo"><label for="f-uf">Estado</label><select id="f-uf" data-acao="uf">${UFS.map(([u, n]) => `<option value="${u}" ${u === S.uf ? "selected" : ""}>${n} (${u})</option>`).join("")}</select></div>
        <div class="campo cid-campo"><span class="rotulo" id="cid-rotulo">Cidade</span>
          <button type="button" class="cid-botao ${S.cidade ? "com-cidade" : ""}" data-acao="cid-menu" aria-haspopup="listbox" aria-expanded="${S.cidMenu}" aria-labelledby="cid-rotulo cid-atual"><span id="cid-atual">${S.cidade ? esc(S.cidade) : `Todas as cidades`}</span>${ICONE.seta}</button>
          ${S.cidMenu ? menuCidadesHtml() : ""}
        </div>
        <div class="campo" style="flex:1 1 380px"><span class="rotulo">Tipo de empresa</span><div class="chips">${TIPOS.map((t) => `<button type="button" class="chip" data-acao="tipo" data-v="${t}" aria-pressed="${S.tipo === t}">${t}<b>${fmtN(cont(t))}</b></button>`).join("")}</div></div>
      </div>
      <div class="linha-filtros">
        <div class="campo" style="flex:1 1 420px"><span class="rotulo">Sistema atual (concorrente)${S.idSis ? ` <span class="fraco" style="font-weight:500">· verificando os sites ${fmtN(S.idSis.feitas)} de ${fmtN(S.idSis.total)}…</span>` : ""}</span><div class="chips">${botoesSistema(S.rows)}</div></div>
        <div class="campo" style="flex:1 1 420px"><span class="rotulo">Limpeza da lista</span><div class="chips">
          ${alternar("soAtivas", "Só empresas ativas")}${alternar("escExp", "Esconder já exportadas")}${alternar("soNovas", "Só novas (último mês)")}
        </div></div>
      </div>
      <div class="acoes-filtro">
        <form class="mapear-campo" data-acao="mapear-form" autocomplete="off">
          <div class="campo"><label for="f-mapear">Mapear cidade de ${esc(S.uf)}</label><input id="f-mapear" class="input" placeholder="Ex.: Santos" maxlength="80" value="${esc(S.mapeando ? S.mapeando.cidade : (S.cidade || ""))}" ${S.mapeando ? "disabled" : ""}></div>
          <button type="submit" class="btn btn-primario" ${S.mapeando ? "disabled" : ""}>${ICONE.pin} Mapear</button>
        </form>
        <button type="button" class="btn btn-sec" data-acao="exportar" ${filtrados(S.rows).length ? "" : "disabled"}>${ICONE.excel} Exportar Excel</button>
      </div>
    </section>`;
  }
  function menuCidadesHtml() {
    const todas = cidadesDoEstado();
    const mapeadas = todas.filter((c) => c.mapeada);
    const faltam = todas.filter((c) => !c.mapeada && !c.semEmpresas).length;
    return `<div class="cid-menu" role="dialog" aria-label="Escolher cidade de ${esc(ufNome(S.uf))}">
      <input id="cid-busca" class="input" type="search" placeholder="Buscar cidade de ${esc(S.uf)}" autocomplete="off" value="${esc(S.cidBusca)}">
      <button type="button" class="cid-op cid-todas ${!S.cidade ? "atual" : ""}" data-acao="cid-todas"><span class="pilha" style="gap:0"><b>Todas as cidades</b><span class="t12 fraco" id="cid-todas-sub">${esc(textoTodas())}</span></span></button>
      <button type="button" class="cid-estado" id="cid-estado" data-acao="mapear-estado" ${faltam && !S.mapeando ? "" : "hidden"}>${ICONE.pin} <span>${textoFaltam(faltam)}</span></button>
      <div class="cid-ordem" role="group" aria-label="Ordenar cidades"><span class="t12 fraco">Ordenar:</span><button type="button" class="cid-ord" data-acao="cid-ordem" data-v="az" aria-pressed="${S.cidOrdem === "az"}">A a Z</button><button type="button" class="cid-ord" data-acao="cid-ordem" data-v="mais" aria-pressed="${S.cidOrdem === "mais"}">Mais empresas</button></div>
      <div class="cid-lista" id="cid-lista" role="listbox" aria-label="Cidades">${opcoesCidadesHtml(todas)}</div>
    </div>`;
  }
  const textoFaltam = (n) => `Mapear o estado inteiro: buscar as empresas ${n === 1 ? "da cidade que falta" : `das outras ${fmtN(n)} cidades`}`;
  function textoTodas() {
    const todas = cidadesDoEstado();
    const mapeadas = todas.filter((c) => c.mapeada).length;
    const totalEmp = S.cidades.reduce((t, c) => t + c.qtd, 0);
    const fonte = todas.reduce((t, c) => t + (c.fonte || 0), 0);
    const comEmp = todas.filter((c) => (c.fonte || 0) > 0 || c.mapeada).length;
    const ja = `Já no sistema: ${fmtN(totalEmp)} ${totalEmp === 1 ? "empresa" : "empresas"} de ${fmtN(mapeadas)} ${mapeadas === 1 ? "cidade" : "cidades"}`;
    if (S.contando && S.contando.uf === S.uf) return `${ja}\nContando quantas existem em cada cidade: ${fmtN(S.contando.feitas)} de ${fmtN(S.contando.total)}…`;
    return fonte ? `${ja}\nExistem em ${ufNome(S.uf)}: ${fmtN(fonte)} empresas do ramo, em ${fmtN(comEmp)} cidades` : ja;
  }
  const qtdCidade = (c) => (c.mapeada ? c.qtd : c.fonte || 0);
  function opcoesCidadesHtml(todas = cidadesDoEstado()) {
    if (!todas.length) return `<p class="t13 fraco" style="padding:10px 12px;margin:0">Carregando as cidades…</p>`;
    const q = norm(S.cidBusca);
    let lista = q ? todas.filter((c) => norm(c.nome).includes(q)) : todas.slice();
    if (S.cidOrdem === "mais") lista.sort((a, b) => qtdCidade(b) - qtdCidade(a) || a.nome.localeCompare(b.nome));
    const contando = S.contando && S.contando.uf === S.uf;
    if (!lista.length) return `<p class="t13 fraco" style="padding:10px 12px;margin:0">Nenhuma cidade com esse nome em ${esc(S.uf)}.</p>`;
    return lista.map((c) => `<button type="button" role="option" class="cid-op ${S.cidadeId && S.cidadeId === c.id ? "atual" : ""}" data-acao="cid-escolher" data-id="${esc(c.id || "")}" data-nome="${esc(c.nome)}" data-mapeada="${c.mapeada}">
      <span>${esc(c.nome)}</span>${c.mapeada
        ? `<span class="cid-q num" title="${fmtN(c.qtd)} empresas no mapeamento">${fmtN(c.qtd)}</span>`
        : c.semEmpresas ? `<span class="cid-nada">nenhuma</span>`
        : c.fonte ? `<span class="cid-fonte"><span class="num" title="${fmtN(c.fonte)} empresas do ramo registradas; ao mapear, holdings ficam de fora">${fmtN(c.fonte)}</span><span class="cid-mapear">mapear</span></span>`
        : `<span class="cid-mapear">${contando ? "contando…" : "mapear"}</span>`}</button>`).join("");
  }

  function botoesSistema(rows, tipo = S.tipo) {
    const salvo = S.sistema; S.sistema = "Todos";
    const base = filtrados(rows, tipo); S.sistema = salvo;
    const cont = new Map(), pistas = new Map(); let sem = 0;
    base.forEach((r) => {
      const n = sistemaDe(r).nome;
      if (n) cont.set(n, (cont.get(n) || 0) + 1);
      else { sem++; const p = pistaDe(r); if (p) pistas.set("pista:" + p, (pistas.get("pista:" + p) || 0) + 1); }
    });
    const lista = [...cont.entries()].sort((a, b) => b[1] - a[1]);
    const listaP = [...pistas.entries()].sort((a, b) => b[1] - a[1]);
    if (S.sistema !== "Todos" && S.sistema !== "Não identificado" && !cont.has(S.sistema) && !pistas.has(S.sistema)) S.sistema = "Todos";
    const chip = (v, rot, n, extra = "") => `<button type="button" class="chip ${v !== "Todos" && v !== "Não identificado" ? "chip-sis" : ""} ${extra}" data-acao="sistema" data-v="${esc(v)}" aria-pressed="${S.sistema === v}">${esc(rot)}<b>${fmtN(n)}</b></button>`;
    // pista = existe um portal desse sistema com o nome da empresa; fica separado e "a conferir"
    return chip("Todos", "Todos", base.length) + lista.map(([n, q]) => chip(n, n, q)).join("")
      + listaP.map(([v, q]) => chip(v, `${v.slice(6)}? a conferir`, q, "chip-pista")).join("")
      + (sem ? chip("Não identificado", "Não identificado", sem) : "")
      + (!lista.length && !S.idSis ? `<span class="t12 fraco" style="align-self:center">Nenhum sistema encontrado nos sites destas empresas ainda.</span>` : "");
  }

  const alternar = (k, label) => `<button type="button" class="alternar" data-acao="alternar" data-k="${k}" aria-pressed="${S[k]}"><span class="cx">${S[k] ? "✓" : ""}</span><span>${label}</span></button>`;

  function progressoHtml() {
    const m = S.mapeando;
    const f = m.total ? Math.min(1, m.feitas / m.total) : 0.05;
    const est = S.estado;
    return `<section class="cartao prog" aria-live="polite">${est ? `<div class="linha-flex" style="justify-content:space-between"><span class="t13"><b>Mapeando ${esc(ufNome(est.uf))}:</b> cidade ${fmtN(est.atual)} de ${fmtN(est.total)} · ${fmtN(est.empresas)} empresas guardadas até agora</span><button type="button" class="mini" data-acao="parar-estado" ${est.parar ? "disabled" : ""}>${est.parar ? "Parando depois desta cidade…" : "Parar"}</button></div><span class="barra"><i style="width:${(est.atual / est.total * 100).toFixed(1)}%"></i></span>` : ""}<b>${esc(m.etapa)}</b><span class="barra"><i style="width:${(f * 100).toFixed(1)}%"></i></span><span class="t12 fraco">${esc(m.detalhe || "")}</span></section>`;
  }

  function cidadesHtml() {
    const buscadas = S.cidades.filter((c) => S.buscadas.has(norm(c.municipio)));
    const soltas = S.cidades.filter((c) => !S.buscadas.has(norm(c.municipio))).reduce((t, c) => t + c.qtd, 0);
    if (!buscadas.length) return `<div class="cartao vazio">Nenhuma cidade de ${esc(ufNome(S.uf))} foi mapeada ainda. Escolha uma cidade no campo Cidade para mapear.</div>`;
    const max = Math.max(...buscadas.map((c) => c.qtd));
    return `<section class="cartao pad pilha" style="gap:14px" aria-label="Concentração por cidade">
      <div class="pilha" style="gap:2px"><span style="font-size:16px;font-weight:700">Onde estão as administradoras</span><span class="t13 fraco">Cidades de ${esc(ufNome(S.uf))} já mapeadas. Clique numa cidade para ver a lista dela.</span></div>
      <div class="grade-cidades">${buscadas.map((c) => `<button type="button" class="cidade" data-acao="cidade" data-v="${esc(c.municipio)}" data-id="${esc(c.municipio_ibge || "")}">
        <span class="linha-flex" style="justify-content:space-between;align-items:baseline"><b>${esc(c.municipio)}</b><span class="q num">${fmtN(c.qtd)}</span></span>
        <span class="barra"><i style="width:${(c.qtd / max * 100).toFixed(1)}%"></i></span>
        <span class="t12 fraco">${c.novas ? `${c.novas} ${c.novas === 1 ? "nova" : "novas"} no último mês` : "nenhuma nova no último mês"}</span></button>`).join("")}</div>
      ${soltas ? `<p class="t12 fraco" style="margin:0">Mais ${fmtN(soltas)} ${soltas === 1 ? "empresa apareceu" : "empresas apareceram"} na busca de uma cidade vizinha, mas ${soltas === 1 ? "tem endereço" : "têm endereço"} em outra cidade. ${soltas === 1 ? "Ela aparece" : "Elas aparecem"} em Todas as cidades; a cidade delas só conta como mapeada depois de ser buscada.</p>` : ""}
    </section>`;
  }

  function listaHtml(lista, dists) {
    const regiao = !!dists;
    const mostrar = lista.slice(0, S.show);
    return `<section class="cartao lista ${regiao ? "regiao" : ""}" aria-label="Empresas mapeadas">
      <div class="lista-cab"><span style="font-size:15px;font-weight:700">Resultados <span class="fraco t13">· ${fmtN(lista.length)}</span></span>
        <span class="legenda">Confiança dos dados: <span class="selo s-conf">● Confirmado</span><span class="selo s-ident">● Identificado</span><span class="selo s-nao">● Não verificado</span><span class="selo s-errado">● Marcado como errado</span></span></div>
      ${lista.length ? "" : `<div class="vazio">${regiao ? "Nenhuma empresa mapeada dentro desse raio. Aumente a distância ou mapeie a cidade dessa região primeiro." : "Nenhuma empresa neste filtro. Tente tirar algum filtro de limpeza ou de sistema."}</div>`}
      ${lista.length ? `<div class="rolagem"><div class="tabela"><div class="t-cab">${regiao ? "<span>Distância</span>" : ""}<span>Empresa</span>${regiao ? "" : "<span>CNPJ</span>"}<span>Telefone</span><span>Sócio</span><span>Sistema atual</span><span>Contatabilidade</span></div>
        ${mostrar.map((r) => linhaEmpresa(r, regiao ? dists.get(r.cnpj) : null)).join("")}</div></div>` : ""}
      ${lista.length > mostrar.length ? `<div class="mais"><button type="button" class="btn btn-sec" data-acao="mais">Mostrar mais (${fmtN(lista.length - mostrar.length)} restantes)</button></div>` : ""}
    </section>`;
  }

  function caixaSistema(r) {
    const s = sistemaDe(r);
    const site = r.site ? `<a href="https://${esc(r.site)}" target="_blank" rel="noopener noreferrer">${esc(r.site)}</a>` : "";
    let corpo;
    if (s.nome) {
      const quem = r.sistema_status ? `<span class="origem origem-ok">${r.sistema_status === "confirmado" ? "Confirmado" : "Corrigido"} por ${esc(r.sistema_por || "")}</span>` : "";
      corpo = `<span class="linha-flex" style="gap:6px"><span class="selo s-sis" style="font-size:12px">${esc(s.nome)}</span><span class="t12 ${s.nivel === "provavel" ? "fraco" : "origem-ok"}">${s.nivel === "provavel" ? "Provável" : s.nivel === "corrigido" ? "Corrigido pela equipe" : "Confirmado pela equipe"}</span></span>
        ${r.sistema && s.nivel === "provavel" ? `<span class="t12 fraco" style="line-height:1.5">O site ${site} tem um link para o portal ${esc(r.sistema)}: <a href="${esc(r.sistema_prova)}" target="_blank" rel="noopener noreferrer" class="prova">ver o link</a>. Confirme na ligação.</span>` : ""}${quem}`;
    } else if (pistaDe(r)) {
      corpo = `<span class="linha-flex" style="gap:6px"><span class="selo s-pista" style="font-size:12px">${esc(r.sistema_pista)}?</span><span class="t12 fraco">A conferir</span></span>
        <span class="t12 fraco" style="line-height:1.5">Existe um portal ${esc(r.sistema_pista)} com o nome desta empresa: <a href="${esc(r.sistema_pista_url)}" target="_blank" rel="noopener noreferrer" class="prova">abrir o portal</a>. Pode ser outra empresa com nome parecido: veja se o logo do portal é dela ou pergunte na ligação.</span>`;
    } else {
      const txt = { sem_site: "A empresa usa e-mail pessoal (Gmail, Hotmail…), então não há site para verificar.", email_do_contador: "O e-mail registrado na Receita é do contador, não da administradora.", fora_do_ar: `O site ${site} não abriu quando foi verificado.`, sem_sistema_no_site: `O site ${site} não tem link para nenhum dos sistemas que o Mapa reconhece.` }[r.site_situacao] || "Ainda vai ser verificado pelo site.";
      corpo = `<span><span class="selo s-vazio">Não identificado</span></span><span class="t12 fraco" style="line-height:1.5">${txt} Pergunte na ligação.</span>`;
    }
    const marcado = !!r.sistema_status;
    const escolher = S.sisCorrigir === r.cnpj ? `<div class="linha-flex" style="gap:6px"><select id="sis-certo" class="input" style="height:36px;flex:1 1 180px"><option value="">Qual sistema ela usa?</option>${SOFTWARES.map((n) => `<option>${esc(n)}</option>`).join("")}<option>Outro sistema</option><option>Planilha / sem sistema</option><option>Não sei</option></select><button type="button" class="mini mini-ok" data-acao="sis-salvar">Salvar</button><button type="button" class="mini" data-acao="sis-cancelar">Cancelar</button></div>` : "";
    const botoes = marcado ? `<button type="button" class="mini" data-acao="desfazer" data-campo="Sistema">Desfazer</button>`
      : s.nome ? `<button type="button" class="mini mini-ok" data-acao="marcar" data-campo="Sistema" data-status="confirmado">✓ Confirmei</button><button type="button" class="mini mini-erro" data-acao="sis-corrigir">✗ Está errado</button>`
      : pistaDe(r) ? `<button type="button" class="mini mini-ok" data-acao="pista-ok">✓ É dela, confirmei</button><button type="button" class="mini mini-erro" data-acao="sis-corrigir">✗ Não é</button>`
      : `<button type="button" class="mini mini-ok" data-acao="sis-corrigir">Informar o sistema</button>`;
    return `<div class="caixa-cinza"><span class="rotulo">Sistema atual</span>${corpo}${escolher || `<span class="linha-flex">${botoes}</span>`}</div>`;
  }

  function painelHtml() {
    const r = S.selRow;
    if (!r) return `<aside class="cartao painel" data-vazio="true" aria-label="Detalhes da empresa"><div class="painel-vazio"><span class="painel-vazio-icone">${ICONE.busca}</span><b>Nenhuma empresa aberta</b><span class="fraco t13">Clique numa linha da lista para ver sócios, contatos e confirmar os dados.</span></div></aside>`;
    const soc = S.socios.get(r.cnpj_basico) || [];
    const marcas = S.marcas.get(r.cnpj) || {};
    const atual = r.atualizado_em ? ` · atualizado em ${fmtData(r.atualizado_em)}` : "";
    const end = [r.logradouro ? `${r.logradouro}${r.numero ? ", " + r.numero : ""}${r.complemento ? " - " + titulo(r.complemento) : ""}` : "", r.bairro, r.cep ? "CEP " + String(r.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2") : ""].filter(Boolean).join(" · ");
    const campos = [
      ["Telefone", [r.telefone1, r.telefone2].filter(Boolean).join(" / ")],
      ["E-mail", r.email || ""],
      ["Endereço", end],
    ];
    const campo = ([label, valor]) => {
      const m = marcas[label];
      const [lvl, cls] = m?.status === "confirmado" ? ["Confirmado", "s-conf"] : m?.status === "errado" ? ["Marcado como errado", "s-errado"] : valor ? ["Identificado", "s-ident"] : ["Não encontrado", "s-vazio"];
      const src = m ? `<span class="origem ${m.status === "confirmado" ? "origem-ok" : "origem-erro"}">${m.status === "confirmado" ? "Confirmado" : "Marcado como errado"} por ${esc(m.usuario_nome)} em ${esc(fmtData(m.criado_em))}</span>` : `<span class="origem">Origem: Receita Federal (cadastro do CNPJ)${esc(atual)}</span>`;
      return `<div class="campo-ficha"><div class="linha-flex" style="justify-content:space-between"><span class="t12 fraco">${label}</span><span class="selo ${cls}">${lvl}</span></div>
        <span class="valor ${m?.status === "errado" ? "riscado" : ""}">${valor ? esc(valor) : '<span class="fraco">Não informado na Receita</span>'}</span>${src}
        ${valor ? `<span class="linha-flex" style="margin-top:2px">${m ? `<button type="button" class="mini" data-acao="desfazer" data-campo="${label}">Desfazer</button>` : `<button type="button" class="mini mini-ok" data-acao="marcar" data-campo="${label}" data-status="confirmado">✓ Confirmei</button><button type="button" class="mini mini-erro" data-acao="marcar" data-campo="${label}" data-status="errado">✗ Está errado</button>`}${label === "Telefone" && r.telefone1 && /^\(\d{2}\) 9/.test(r.telefone1) ? `<a class="mini mini-ok" style="display:inline-flex;align-items:center;text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/55${r.telefone1.replace(/\D/g, "")}">WhatsApp</a>` : ""}</span>` : ""}
      </div>`;
    };
    const checks = [
      [r.tel_status === "confirmado" || (r.telefone1 && r.tel_status !== "errado"), r.tel_status === "confirmado" ? "Telefone confirmado pela equipe" : "Tem telefone na Receita"],
      [!!r.email && r.email_status !== "errado", "Tem e-mail na Receita"],
      [soc.length > 0, "Sócio identificado"],
      [!!r.nome_condominio, "O nome indica administração de condomínios"],
    ];
    const grupo = S.grupo.filter((g) => g.cnpj !== r.cnpj);
    return `<aside class="cartao painel" aria-label="Detalhes da empresa">
      <button type="button" class="mini fechar-painel" data-acao="fechar-painel">Fechar ✕</button>
      <div class="pilha">
        <span class="t11 fraco" style="font-weight:700;text-transform:uppercase;letter-spacing:.05em">Empresa selecionada</span>
        <h2>${esc(nomeEmp(r))}</h2>
        ${r.nome_fantasia && r.razao_social ? `<span class="t12 fraco">${esc(titulo(r.razao_social))}</span>` : ""}
        <span class="t13 fraco">${esc(r.tipo || "")} · ${esc(r.municipio || "")}/${esc(r.uf || "")} · <span class="num" style="white-space:nowrap">CNPJ ${esc(fmtCnpj(r.cnpj))}</span></span>
        <span class="linha-flex" style="gap:6px;margin-top:4px"><span class="selo ${r.situacao === "ATIVA" ? "s-conf" : "s-errado"}">${esc(titulo(r.situacao || "Sem situação"))}</span>${tagsEmpresa(r)}</span>
        <span class="origem">Situação cadastral · Origem: Receita Federal${r.data_inicio ? ` · aberta em ${esc(fmtData(r.data_inicio))}` : ""}</span>
        <span class="origem">O tipo (${esc(r.tipo || "")}) é definido pelo sistema a partir do nome e da atividade registrada na Receita.</span>
      </div>
      ${caixaSistema(r)}
      <div class="pilha" style="gap:10px"><span style="font-size:12px;font-weight:700">Contato</span>${campos.map(campo).join("")}</div>
      <div class="pilha" style="gap:10px">
        <div class="linha-flex" style="justify-content:space-between"><span style="font-size:12px;font-weight:700">Sócios e administradores</span>${soc.length ? '<span class="selo s-ident">Identificado</span>' : ""}</div>
        <span class="origem">Origem: Receita Federal (quadro societário)</span>
        ${soc.length ? soc.map((s) => `<div class="socio"><div class="ini">${esc(ini(s.nome))}</div><div class="pilha" style="gap:0"><span class="t13" style="font-weight:600">${esc(titulo(s.nome))}</span><span class="t11 fraco">${esc(s.qualificacao || "Sócio")}</span></div></div>`).join("") : '<span class="t13 fraco">A Receita não informa sócios para esta empresa.</span>'}
        ${grupo.length ? `<div class="caixa-roxa"><span class="t12" style="font-weight:700;color:var(--roxo)">Sócio com o mesmo nome em outras empresas</span><span class="t12" style="color:#4A3A5C">${grupo.length === 1 ? "Um sócio desta empresa tem o mesmo nome de um sócio de outra empresa do mapeamento." : `Sócios desta empresa têm o mesmo nome de sócios de mais ${grupo.length} empresas do mapeamento.`} A Receita não mostra o CPF completo, então confira se é a mesma pessoa. Se for, vale tratar como um grupo só na abordagem.</span>${grupo.slice(0, 6).map((g) => `<button type="button" class="mini mini-roxo" data-acao="sel" data-cnpj="${esc(g.cnpj)}">Ver ${esc(nomeEmp(g))} (${esc(g.municipio)}) →</button>`).join("")}</div>` : ""}
      </div>
      <div class="pilha" style="gap:8px"><span style="font-size:12px;font-weight:700">Por que está nesta posição</span>
        ${checks.map(([ok, l]) => `<div class="motivo"><span class="bol ${ok ? "bol-ok" : "bol-nao"}">${ok ? "✓" : "·"}</span><span>${l}</span></div>`).join("")}
        <span class="t12 fraco">Atividade principal: ${esc(CNAES[r.cnae_principal] || r.cnae_principal || "não informada")}</span>
      </div>
      <div class="acoes-painel">
        <button type="button" class="btn btn-primario" data-acao="copiar">Copiar dados</button>
        <button type="button" class="btn btn-perigo" data-acao="remover">${S.confirmarRemocao ? "Confirmar remoção" : "Remover do mapeamento"}</button>
      </div>
    </aside>`;
  }

  /* ---------------------------------------------------------------- região */
  function telaRegiao() {
    const R = S.reg;
    const lista = filtrados(R.rows, R.tipo).sort((a, b) => (R.dist.get(a.cnpj) ?? 99) - (R.dist.get(b.cnpj) ?? 99));
    const cont = (t) => filtrados(R.rows, t).length;
    let html = `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Prospectar por região</h1><p class="fraco" style="margin:0">Digite o local que a equipe vai visitar e veja as administradoras em volta, da mais perto para a mais longe.</p></div></div>
    <section class="cartao regiao-busca">
      <div class="linha-filtros">
        <div class="campo busca-local"><label for="r-local">Endereço, bairro ou CEP</label><input id="r-local" class="input" placeholder="Ex.: Av. Ana Costa, 300, Santos" value="${esc(R.texto)}" autocomplete="off" role="combobox" aria-expanded="${!!R.lugares.length}" aria-controls="r-sug">
          ${R.lugares.length ? `<div class="sugestoes" id="r-sug" role="listbox">${R.lugares.map((l, i) => `<button type="button" role="option" data-acao="lugar" data-i="${i}"><b>${esc(l.nome)}</b><span class="t12 fraco">${esc(l.detalhe)}</span></button>`).join("")}</div>` : ""}
        </div>
        <div class="campo"><span class="rotulo">Distância</span><div class="chips">${[0.5, 1, 2, 5].map((k) => `<button type="button" class="chip" data-acao="raio" data-v="${k}" aria-pressed="${R.raio === k}">${k < 1 ? k * 1000 + " m" : k + " km"}</button>`).join("")}</div></div>
      </div>
      ${R.lugar ? `<div class="linha-flex t13"><span class="selo s-ident">Centro</span><b>${esc(R.lugar.nome)}</b><span class="fraco">${esc(R.lugar.detalhe)}</span></div>` : ""}
      ${R.lugar ? `<div class="campo"><span class="rotulo">Tipo de empresa</span><div class="chips">${TIPOS.map((t) => `<button type="button" class="chip" data-acao="r-tipo" data-v="${t}" aria-pressed="${R.tipo === t}">${t}<b>${fmtN(cont(t))}</b></button>`).join("")}</div></div>
      <div class="campo"><span class="rotulo">Sistema atual (concorrente)</span><div class="chips">${botoesSistema(R.rows, R.tipo)}</div></div>` : ""}
    </section>
    <p id="geo-status" class="selo s-ident t13" style="margin:0;display:block;padding:10px 14px" ${S.geo ? "" : "hidden"}>${esc(textoGeo())}</p>`;
    if (!R.lugar) return html + `<div class="cartao vazio">Comece digitando o endereço do lugar que a equipe vai visitar. Só aparecem empresas de cidades que já foram mapeadas na aba <b>Mapeamento</b>.</div>`;
    html += `<div id="mapa" class="mapa" role="img" aria-label="Mapa com as empresas em volta do local escolhido"></div>`;
    html += `<p class="t12 fraco" style="margin:-8px 0 0">${R.carregando ? "Procurando empresas em volta…" : `${fmtN(lista.length)} ${lista.length === 1 ? "empresa" : "empresas"} até ${R.raio < 1 ? R.raio * 1000 + " m" : R.raio + " km"}. A posição vem do endereço da Receita: quando a rua é longa, o ponto pode ficar algumas quadras deslocado.`}</p>`;
    html += `<div class="linha-flex" style="justify-content:flex-end"><button type="button" class="btn btn-sec" data-acao="exportar-regiao" ${lista.length ? "" : "disabled"}>${ICONE.excel} Exportar Excel</button></div>`;
    return html + `<div class="duas">${listaHtml(lista, R.dist)}${painelHtml()}</div>`;
  }

  let mapa = null, camada = null;
  function desenharMapa() {
    const R = S.reg, el = $("#mapa");
    if (!el || !R.lugar || !window.L) return;
    if (mapa) { mapa.remove(); mapa = null; }
    mapa = L.map(el, { scrollWheelZoom: false }).setView([R.lugar.lat, R.lugar.lon], 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(mapa);
    camada = L.layerGroup().addTo(mapa);
    const circ = L.circle([R.lugar.lat, R.lugar.lon], { radius: R.raio * 1000, color: "#2A3F72", weight: 2, fillOpacity: 0.06 }).addTo(camada);
    L.marker([R.lugar.lat, R.lugar.lon], { icon: L.divIcon({ className: "", html: '<div class="pino-centro"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), title: "Local da visita" }).addTo(camada);
    filtrados(R.rows, R.tipo).forEach((r) => {
      if (r.lat == null) return;
      const cor = COR_TIPO[r.tipo] || "#5B6475";
      const m = L.marker([r.lat, r.lon], { icon: L.divIcon({ className: "", html: `<div class="pino" style="background:${cor};${S.sel === r.cnpj ? "transform:scale(1.5);" : ""}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] }), title: nomeEmp(r) }).addTo(camada);
      m.bindTooltip(`${esc(nomeEmp(r))}<br>${esc(r.telefone1 || "sem telefone")}`);
      m.on("click", () => selecionar(r.cnpj));
    });
    mapa.fitBounds(circ.getBounds(), { padding: [20, 20] });
  }

  /* Localização feita pelo navegador (o serviço de mapas bloqueia servidores) */
  const BRASIL = "-74,-34,-34,6";
  async function photon(q, limite = 5) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limite}&bbox=${BRASIL}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error("photon " + r.status);
    return ((await r.json()).features || []).filter((f) => f.properties?.countrycode === "BR");
  }
  const rotuloLugar = (p) => ({
    nome: p.street ? `${p.street}${p.housenumber ? ", " + p.housenumber : ""}` : p.name || "",
    detalhe: [p.street && p.name && p.name !== p.street ? p.name : null, p.district || p.locality, p.city, p.state].filter(Boolean).join(" · "),
  });

  let buscaT, buscaSeq = 0;
  async function buscarLugar(texto) {
    const seq = ++buscaSeq;
    if (texto.trim().length < 4) { S.reg.lugares = []; render(); focarLocal(); return; }
    let lugares = [];
    try {
      let q = texto;
      const cep = texto.replace(/\D/g, "");
      if (cep.length === 8 && /^[\d\s.-]+$/.test(texto.trim())) {
        const c = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        if (c) q = [c.street, c.neighborhood, c.city, c.state].filter(Boolean).join(", ");
      }
      const vistos = new Set();
      for (const f of await photon(q)) {
        const [lon, lat] = f.geometry.coordinates, l = { ...rotuloLugar(f.properties), lat, lon };
        const k = l.nome + l.detalhe; if (vistos.has(k)) continue; vistos.add(k); lugares.push(l);
      }
    } catch (e) { console.warn(e); }
    if (seq !== buscaSeq) return;
    S.reg.lugares = lugares;
    if (!lugares.length) toast("Não achei esse lugar. Tente com o nome da rua e da cidade.");
    render(); focarLocal();
  }

  const textoGeo = () => (S.geo ? `Colocando no mapa as empresas mapeadas: ${fmtN(S.geo.feitas)} de ${fmtN(S.geo.total)}. Deixe esta página aberta; a lista se atualiza sozinha no fim.` : "");
  function mostrarGeo() { const el = $("#geo-status"); if (el) { el.textContent = textoGeo(); el.hidden = !S.geo; } else if (S.view === "regiao" && S.geo) render(); }

  // Verifica os sites das empresas que ainda não passaram pela identificação do sistema
  let sisRodando = false;
  async function identificarSistemas(uf) {
    if (sisRodando || !uf) return;
    sisRodando = true;
    try {
      const { data: fila } = await sb.rpc("sem_sistema", { p_uf: uf, p_limite: 600 });
      if (!fila?.length) return;
      S.idSis = { feitas: 0, total: fila.length }; if (S.view === "mapeamento") render();
      const partes = chunk(fila.map((x) => x.cnpj), 8);
      await Promise.all([0, 1].map(async () => {
        while (partes.length && S.user && S.uf === uf) {
          const parte = partes.shift();
          const r = await chamar(FUNCAO, { acao: "sistema", cnpjs: parte });
          (r.resultados || []).forEach((x) => { const row = S.rows.find((y) => y.cnpj === x.cnpj); if (row) Object.assign(row, { site: x.site, site_situacao: x.site_situacao, sistema: x.sistema, sistema_prova: x.sistema_prova, sistema_pista: x.sistema_pista || null, sistema_pista_url: x.sistema_pista_url || null, sistema_em: new Date().toISOString() }); });
          S.idSis.feitas += parte.length;
          if (S.view === "mapeamento" && !S.cidMenu && !document.activeElement?.matches?.("input, select")) render();
        }
      }));
    } catch (e) { console.warn(e); }
    finally { sisRodando = false; S.idSis = null; if (S.view === "mapeamento" && !S.cidMenu) render(); }
  }

  // Coloca no mapa as empresas que ainda não têm ponto, uma por segundo, em segundo plano
  let geoRodando = false;
  async function localizarPendentes(uf) {
    if (geoRodando || !uf) return;
    geoRodando = true;
    try {
      const { data: fila, error } = await sb.rpc("sem_local", { p_uf: uf, p_limite: 400 });
      if (error || !fila?.length) return;
      S.geo = { feitas: 0, total: fila.length }; mostrarGeo();
      const memo = new Map();
      for (const e of fila) {
        if (!S.user) break;
        const cidade = norm(e.municipio);
        const naCidade = (f) => [f.properties.city, f.properties.county, f.properties.name].some((c) => norm(c) === cidade);
        const rua = (e.logradouro || "").trim(), num = (e.numero || "").replace(/\D/g, "");
        const chave = `${rua}|${num}|${cidade}`;
        let achou = memo.get(chave);
        if (achou === undefined) {
          achou = null;
          const tentativas = [];
          if (rua) tentativas.push([`${rua}${num ? " " + num : ""}, ${e.municipio}, ${e.uf}`, (t) => (t === "house" && num ? "endereco" : "rua")]);
          if (e.bairro) tentativas.push([`${e.bairro}, ${e.municipio}, ${e.uf}`, () => "bairro"]);
          for (const [q, prec] of tentativas) {
            let fs = [];
            try { fs = await photon(q, 3); } catch { await new Promise((r) => setTimeout(r, 3000)); }
            await new Promise((r) => setTimeout(r, 1100));
            const f = fs.find(naCidade);
            if (f && ["house", "street", "district", "locality"].includes(f.properties.type)) {
              const p = prec(f.properties.type);
              achou = { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], precisao: f.properties.type === "street" || f.properties.type === "house" ? p : "bairro" };
              break;
            }
          }
          memo.set(chave, achou);
        }
        await sb.rpc("salvar_local", achou
          ? { p_cnpj: e.cnpj, p_lat: achou.lat, p_lon: achou.lon, p_precisao: achou.precisao }
          : { p_cnpj: e.cnpj, p_lat: null, p_lon: null, p_precisao: "nao_encontrado" });
        S.geo.feitas++;
        mostrarGeo();
      }
    } catch (e) { console.warn(e); }
    finally {
      geoRodando = false; S.geo = null;
      if (S.view === "regiao") { if (S.reg.lugar) carregarRegiao(); else render(); }
    }
  }
  function focarLocal() { const i = $("#r-local"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }

  async function carregarRegiao() {
    const R = S.reg;
    if (!R.lugar) return;
    R.carregando = true; render();
    try {
      const { data, error } = await sb.rpc("empresas_proximas", { p_lat: R.lugar.lat, p_lon: R.lugar.lon, p_raio_km: R.raio });
      if (error) throw error;
      R.dist = new Map((data || []).map((d) => [d.cnpj, d.distancia_km]));
      const cnpjs = [...R.dist.keys()];
      const rows = [];
      for (const parte of chunk(cnpjs, 150)) {
        const { data: d } = await sb.from("mapa").select(COLS).in("cnpj", parte);
        rows.push(...(d || []));
      }
      R.rows = rows;
      await Promise.all([carregarSocios(rows.map((r) => r.cnpj_basico)), carregarMarcas(cnpjs)]);
    } catch (e) { console.error(e); toast("Não deu para buscar as empresas em volta. Tente de novo."); }
    finally { R.carregando = false; render(); }
  }

  /* -------------------------------------------------------- listas e equipe */
  function telaListas() {
    if (!S.listas) { carregarListas(); return `<div class="cartao vazio">Carregando…</div>`; }
    const { exportacoes, atividade } = S.listas;
    const NOME_ACAO = { confirmou: "confirmou", marcou_errado: "marcou como errado", desfez: "desfez a marcação de", removeu: "removeu", exportou: "exportou" };
    return `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Listas exportadas</h1><p class="fraco" style="margin:0">Quem baixou listas do mapeamento e o que a equipe confirmou ou corrigiu.</p></div></div>
      <section class="cartao" style="overflow:hidden"><div class="lista-cab"><b>Exportações</b></div><div class="rolagem">${exportacoes.length ? `<table class="tab-simples"><thead><tr><th>Data</th><th>Quem</th><th>Lista</th><th>Empresas</th></tr></thead><tbody>${exportacoes.map((x) => `<tr><td class="num">${esc(new Date(x.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }))}</td><td>${esc(x.usuario_nome)}</td><td>${esc(x.empresa || "")}</td><td class="num">${fmtN(x.quantidade)}</td></tr>`).join("")}</tbody></table>` : `<div class="vazio">Nenhuma lista exportada ainda.</div>`}</div></section>
      <section class="cartao" style="overflow:hidden"><div class="lista-cab"><b>Atividade da equipe</b><span class="t12 fraco">últimas 60 ações</span></div><div class="rolagem">${atividade.length ? `<table class="tab-simples"><thead><tr><th>Data</th><th>Quem</th><th>O que fez</th></tr></thead><tbody>${atividade.map((x) => `<tr><td class="num">${esc(new Date(x.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }))}</td><td>${esc(x.usuario_nome || "")}</td><td>${esc(NOME_ACAO[x.acao] || x.acao)} ${x.campo ? `<b>${esc(x.campo.toLowerCase())}</b> de ` : ""}${esc(x.empresa || "")}${x.quantidade ? ` (${fmtN(x.quantidade)} empresas)` : ""}</td></tr>`).join("")}</tbody></table>` : `<div class="vazio">Nada por aqui ainda.</div>`}</div></section>`;
  }
  async function carregarListas() {
    const [a, b] = await Promise.all([
      sb.from("historico").select("criado_em,usuario_nome,empresa,quantidade").eq("acao", "exportou").order("criado_em", { ascending: false }).limit(100),
      sb.from("historico").select("criado_em,usuario_nome,acao,campo,empresa,quantidade").neq("acao", "exportou").order("criado_em", { ascending: false }).limit(60),
    ]);
    S.listas = { exportacoes: a.data || [], atividade: b.data || [] };
    render();
  }

  function telaEquipe() {
    if (S.perfil?.papel !== "admin") return `<div class="cartao vazio">Só administradores podem ver esta tela.</div>`;
    if (!S.equipe) { carregarEquipe(); return `<div class="cartao vazio">Carregando a equipe…</div>`; }
    if (S.equipe.erro) return `<div class="aviso aviso-erro">${esc(S.equipe.erro)}</div>`;
    const pend = S.equipe.usuarios.filter((u) => !u.aprovado), ok = S.equipe.usuarios.filter((u) => u.aprovado);
    const cel = (c) => { const d = String(c || "").replace(/\D/g, ""); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : ""; };
    return `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Equipe</h1><p class="fraco" style="margin:0">Quem pode entrar no Mapa Comercial. Cada pessoa cria a própria conta na tela de entrada e já entra. Aqui você troca o papel, gera senha nova ou desativa quem saiu da equipe.</p></div></div>
      ${pend.length ? `<section class="cartao pendentes" style="overflow:hidden"><div class="lista-cab"><b>Aguardando sua aprovação · ${pend.length}</b><span class="t12 fraco">Só aprove quem é da equipe.</span></div>
        ${pend.map((u) => `<div class="pendente"><div class="pilha" style="gap:2px"><b>${esc(u.nome)}</b><span class="t13">${esc(u.email)}${u.celular ? ` · ${esc(cel(u.celular))}` : ""}</span><span class="t12 fraco">pediu acesso em ${esc(fmtData(u.criado_em))}</span></div>
          <div class="linha-flex"><button type="button" class="btn btn-primario" data-acao="usuario" data-op="aprovar" data-papel="sdr" data-id="${u.id}">Aprovar como SDR</button><button type="button" class="btn btn-sec" data-acao="usuario" data-op="aprovar" data-papel="admin" data-id="${u.id}">Aprovar como administradora</button><button type="button" class="btn btn-perigo" data-acao="usuario" data-op="recusar" data-id="${u.id}">Recusar</button></div></div>`).join("")}</section>` : ""}
      <section class="cartao pad pilha" style="gap:12px"><b>Adicionar pessoa você mesma</b>
        <form class="form-grade" data-acao="criar-usuario" autocomplete="off">
          <div class="campo"><label for="u-nome">Nome</label><input id="u-nome" class="input" required maxlength="60"></div>
          <div class="campo"><label for="u-email">E-mail</label><input id="u-email" class="input" type="email" required></div>
          <div class="campo"><label for="u-senha">Senha inicial (mín. 8)</label><input id="u-senha" class="input" type="text" minlength="8" required></div>
          <div class="campo"><label for="u-papel">Papel</label><select id="u-papel" class="input"><option value="sdr">SDR</option><option value="admin">Administrador</option></select></div>
          <button type="submit" class="btn btn-primario">Adicionar</button>
        </form>
        <span class="t12 fraco">Passe a senha inicial para a pessoa por fora (WhatsApp, por exemplo). Ela pode trocar depois em "Esqueci a senha".</span>
      </section>
      <section class="cartao" style="overflow:hidden"><div class="rolagem"><table class="tab-simples"><thead><tr><th>Nome</th><th>E-mail</th><th>Celular</th><th>Papel</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>
        ${ok.map((u) => `<tr><td><b>${esc(u.nome)}</b>${u.ativo ? "" : ' <span class="selo s-errado">Desativado</span>'}</td><td>${esc(u.email)}</td><td class="num">${esc(cel(u.celular))}</td><td>${u.papel === "admin" ? "Administrador" : "SDR"}</td><td class="num">${u.ultimo_acesso ? esc(fmtData(u.ultimo_acesso)) : "nunca entrou"}</td>
          <td><div class="linha-flex">${u.id === S.user.id ? '<span class="t12 fraco">você</span>' : `<button type="button" class="mini" data-acao="usuario" data-op="${u.ativo ? "desativar" : "reativar"}" data-id="${u.id}">${u.ativo ? "Desativar" : "Reativar"}</button><button type="button" class="mini" data-acao="usuario" data-op="papel" data-papel="${u.papel === "admin" ? "sdr" : "admin"}" data-id="${u.id}">${u.papel === "admin" ? "Tornar SDR" : "Tornar administrador"}</button>`}<button type="button" class="mini" data-acao="nova-senha" data-id="${u.id}" data-nome="${esc(u.nome)}">Nova senha</button></div></td></tr>`).join("")}
      </tbody></table></div></section>`;
  }
  async function carregarEquipe() {
    const data = await chamar("gerenciar-usuarios", { acao: "listar" });
    S.equipe = data.erro || !data.usuarios ? { erro: data.erro && data.erro !== "rede" ? data.erro : "Não foi possível carregar a equipe." } : { usuarios: data.usuarios };
    render();
  }

  /* --------------------------------------------------------------- login */
  function renderLogin(msg = "", erro = "") {
    app.innerHTML = `<div class="login-fundo">${ladoMarca()}<form class="login" id="form-login" autocomplete="on">
      <h1>Entrar</h1>
      <label for="l-email">E-mail</label><input id="l-email" type="email" autocomplete="username" required>
      <label for="l-senha">Senha</label><input id="l-senha" type="password" autocomplete="current-password" required>
      ${erro ? `<p class="erro-txt" role="alert">${esc(erro)}</p>` : ""}${msg ? `<p class="aviso aviso-ok" style="margin:4px 0 0">${esc(msg)}</p>` : ""}
      <button type="submit" class="btn btn-primario">Entrar</button>
      <button type="button" class="mini" style="align-self:center;border:none;text-decoration:underline" id="l-esqueci">Esqueci a senha</button>
      <div class="login-rodape">Ainda não tem conta? <button type="button" class="link-forte" id="l-criar">Criar conta</button></div>
    </form></div>`;
    $("#l-criar").onclick = () => { S.cadastro = true; render(); };
    $("#form-login").onsubmit = async (e) => {
      e.preventDefault();
      const b = e.target.querySelector("button[type=submit]"); b.disabled = true; b.textContent = "Entrando…";
      const { error } = await sb.auth.signInWithPassword({ email: $("#l-email").value.trim(), password: $("#l-senha").value });
      if (error) renderLogin("", /invalid/i.test(error.message) ? "E-mail ou senha incorretos." : /banned|disabled/i.test(error.message) ? "Seu acesso foi desativado. Fale com a administradora." : "Não foi possível entrar agora. Tente de novo.");
    };
    $("#l-esqueci").onclick = async () => {
      const email = $("#l-email").value.trim();
      if (!email) { renderLogin("", "Digite seu e-mail acima e clique de novo em Esqueci a senha."); return; }
      await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      renderLogin("Se esse e-mail tiver acesso, chega uma mensagem com o link para criar uma senha nova. Se não chegar, peça para a administradora gerar uma senha nova em Equipe.");
    };
  }
  function renderCadastro(erro = "") {
    const v = S.cadastroDados || {};
    app.innerHTML = `<div class="login-fundo">${ladoMarca()}<form class="login" id="form-cadastro" autocomplete="on" novalidate>
      <h1>Crie sua conta</h1>
      <p class="fraco t13" style="margin:0 0 4px">Leva menos de 1 minuto. Assim que criar, você já entra.</p>
      <label for="c-nome">Nome completo</label><input id="c-nome" autocomplete="name" maxlength="60" required value="${esc(v.nome || "")}">
      <label for="c-email">E-mail</label><input id="c-email" type="email" autocomplete="email" required value="${esc(v.email || "")}">
      <label for="c-cel">Celular (WhatsApp)</label><input id="c-cel" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="(13) 99999-9999" required value="${esc(v.celular || "")}">
      <label for="c-senha">Senha</label><input id="c-senha" type="password" autocomplete="new-password" minlength="8" required placeholder="Pelo menos 8 caracteres">
      ${erro ? `<p class="erro-txt" role="alert">${esc(erro)}</p>` : ""}
      <button type="submit" class="btn btn-primario">Criar minha conta</button>
      <div class="login-rodape">Já tem conta? <button type="button" class="link-forte" id="c-entrar">Entrar</button></div>
    </form></div>`;
    const cel = $("#c-cel");
    cel.oninput = () => {
      const d = cel.value.replace(/\D/g, "").slice(0, 11);
      cel.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
    };
    $("#c-entrar").onclick = () => { S.cadastro = false; render(); };
    $("#form-cadastro").onsubmit = async (e) => {
      e.preventDefault();
      const dados = { nome: $("#c-nome").value.trim(), email: $("#c-email").value.trim().toLowerCase(), celular: cel.value, senha: $("#c-senha").value };
      S.cadastroDados = { nome: dados.nome, email: dados.email, celular: dados.celular };
      if (dados.nome.length < 2) return renderCadastro("Digite seu nome.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email)) return renderCadastro("Digite um e-mail válido.");
      const dig = dados.celular.replace(/\D/g, "");
      if (dig.length < 10 || dig.length > 11) return renderCadastro("Digite o celular com DDD.");
      if (dados.senha.length < 8) return renderCadastro("A senha precisa ter pelo menos 8 caracteres.");
      const b = e.target.querySelector("button[type=submit]"); b.disabled = true; b.textContent = "Criando sua conta…";
      const r = await chamar("criar-conta", dados);
      if (r.erro) return renderCadastro(r.erro === "rede" ? "Sem conexão agora. Tente de novo." : r.erro);
      S.cadastro = false; S.cadastroDados = null;
      const { error } = await sb.auth.signInWithPassword({ email: dados.email, password: dados.senha });
      if (error) renderLogin("Conta criada! Entre com seu e-mail e senha."); else toast("Conta criada. Bem-vindo(a)!");
    };
  }

  function renderAguardando() {
    const primeiro = esc((S.perfil?.nome || "").split(" ")[0]);
    app.innerHTML = `<div class="login-fundo">${ladoMarca()}<div class="login" style="gap:14px">
      <div class="sino" style="width:48px;height:48px;border-radius:14px;font-size:22px" aria-hidden="true">⏳</div>
      <h1>Conta criada, ${primeiro}!</h1>
      <p style="margin:0">Agora uma administradora precisa liberar o seu acesso. Avise a Lua que você já se cadastrou.</p>
      <ol class="passos"><li class="feito"><span>Cadastro feito com <b>${esc(S.user?.email || "")}</b></span></li><li><span>A administradora aprova em <b>Equipe</b></span></li><li><span>Você entra e já vê as administradoras mapeadas</span></li></ol>
      <button type="button" class="btn btn-primario" id="a-verificar">Já fui aprovado, entrar</button>
      <button type="button" class="mini" style="align-self:center;border:none;text-decoration:underline" id="a-sair">Sair</button>
    </div></div>`;
    $("#a-verificar").onclick = async (e) => {
      e.target.disabled = true; e.target.textContent = "Verificando…";
      await carregarPerfil();
      if (S.perfil.aprovado) { render(); await carregarMapeamento(); localizarPendentes(S.uf); }
      else { render(); toast("Ainda não foi aprovado. Tente de novo daqui a pouco."); }
    };
    $("#a-sair").onclick = () => sb.auth.signOut();
  }

  function renderNovaSenha(erro = "") {
    app.innerHTML = `<div class="login-fundo">${ladoMarca()}<form class="login" id="form-senha"><h1>Criar senha nova</h1>
      <label for="n-senha">Senha nova (mín. 8 caracteres)</label><input id="n-senha" type="password" minlength="8" autocomplete="new-password" required>
      ${erro ? `<p class="erro-txt" role="alert">${esc(erro)}</p>` : ""}<button type="submit" class="btn btn-primario">Salvar senha</button></form></div>`;
    $("#form-senha").onsubmit = async (e) => {
      e.preventDefault();
      const { error } = await sb.auth.updateUser({ password: $("#n-senha").value });
      if (error) return renderNovaSenha("Não foi possível salvar. Use pelo menos 8 caracteres.");
      S.recuperando = false; toast("Senha salva"); iniciar();
    };
  }

  /* --------------------------------------------------------------- ações */
  async function selecionar(cnpj) {
    S.confirmarRemocao = false;
    let r = S.rows.find((x) => x.cnpj === cnpj) || S.reg.rows.find((x) => x.cnpj === cnpj);
    if (!r) { const { data } = await sb.from("mapa").select(COLS).eq("cnpj", cnpj).maybeSingle(); r = data; if (r) await Promise.all([carregarSocios([r.cnpj_basico]), carregarMarcas([cnpj])]); }
    if (!r) return;
    S.sel = cnpj; S.selRow = r; S.grupo = [];
    render();
    const nomes = (S.socios.get(r.cnpj_basico) || []).map((s) => s.nome);
    if (nomes.length) {
      const { data: outros } = await sb.from("socios").select("cnpj_basico").in("nome", nomes.slice(0, 20)).neq("cnpj_basico", r.cnpj_basico).limit(50);
      const basicos = [...new Set((outros || []).map((o) => o.cnpj_basico))];
      if (basicos.length) {
        const { data: emps } = await sb.from("mapa").select("cnpj,cnpj_basico,razao_social,nome_fantasia,municipio").in("cnpj_basico", basicos).eq("removido", false).limit(20);
        if (S.sel === cnpj) { S.grupo = emps || []; render(); }
      }
    }
  }

  async function marcar(campo, status, valor = null) {
    const r = S.selRow; if (!r) return;
    const { error } = await sb.from("marcacoes").upsert({ cnpj: r.cnpj, campo, status, valor, usuario_id: S.user.id, usuario_nome: S.perfil.nome }, { onConflict: "cnpj,campo" });
    if (error) { toast("Não foi possível salvar. Tente de novo."); return; }
    await recarregarEmpresa(r.cnpj); toast(status === "confirmado" ? `${campo} confirmado` : `${campo} marcado como errado`); render();
  }
  async function desfazer(campo) {
    const r = S.selRow; if (!r) return;
    const { error } = await sb.from("marcacoes").delete().eq("cnpj", r.cnpj).eq("campo", campo);
    if (error) { toast("Não foi possível desfazer."); return; }
    await recarregarEmpresa(r.cnpj); render();
  }
  async function remover() {
    const r = S.selRow; if (!r) return;
    if (!S.confirmarRemocao) { S.confirmarRemocao = true; render(); return; }
    const { error } = await sb.from("removidos").insert({ cnpj: r.cnpj, motivo: "Removida pela equipe", usuario_id: S.user.id, usuario_nome: S.perfil.nome });
    if (error) { toast("Não foi possível remover."); return; }
    S.rows = S.rows.filter((x) => x.cnpj !== r.cnpj); S.reg.rows = S.reg.rows.filter((x) => x.cnpj !== r.cnpj);
    S.sel = null; S.selRow = null; S.confirmarRemocao = false; toast(`${nomeEmp(r)} saiu do mapeamento`); render();
  }
  async function copiar() {
    const r = S.selRow; if (!r) return;
    const soc = (S.socios.get(r.cnpj_basico) || []).map((s) => `${titulo(s.nome)} (${s.qualificacao || "Sócio"})`).join(", ");
    const txt = [nomeEmp(r), `CNPJ: ${fmtCnpj(r.cnpj)}`, `Telefone: ${[r.telefone1, r.telefone2].filter(Boolean).join(" / ") || "não informado"}`, `E-mail: ${r.email || "não informado"}`, `Endereço: ${[r.logradouro, r.numero, r.bairro, r.municipio + "/" + r.uf].filter(Boolean).join(", ")}`, `Sócios: ${soc || "não informado"}`].join("\n");
    try { await navigator.clipboard.writeText(txt); toast("Dados copiados"); } catch { toast("Não deu para copiar automaticamente."); }
  }

  async function exportar(lista, nomeLista) {
    if (!lista.length) return;
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const cab = ["Empresa", "Razão social", "CNPJ", "Tipo", "Situação", "Telefone", "Telefone 2", "Status do telefone", "E-mail", "Sócios", "Endereço", "Bairro", "Cidade", "UF", "CEP", "Aberta em", "Contatabilidade", "Sistema atual", "Como o sistema foi identificado", "Site", "Distância (km)"];
    const linhas = lista.map((r) => {
      const soc = (S.socios.get(r.cnpj_basico) || []).map((s) => `${titulo(s.nome)} (${s.qualificacao || "Sócio"})`).join("; ");
      const d = S.reg.dist.get(r.cnpj);
      return [nomeEmp(r), titulo(r.razao_social), fmtCnpj(r.cnpj), r.tipo, titulo(r.situacao), r.telefone1, r.telefone2, r.tel_status === "confirmado" ? "Confirmado" : r.tel_status === "errado" ? "Errado" : "Receita", r.email, soc, [r.logradouro, r.numero, r.complemento].filter(Boolean).join(", "), r.bairro, r.municipio, r.uf, r.cep, fmtData(r.data_inicio), r.nota, sistemaDe(r).nome || (pistaDe(r) ? `Possível: ${r.sistema_pista} (a conferir)` : "Não identificado"), (() => { const x = sistemaDe(r); return !x.nome ? (pistaDe(r) ? `A conferir: existe portal ${r.sistema_pista} com o nome da empresa (${r.sistema_pista_url}), pode ser outra empresa` : motivoSemSistema(r)) : x.nivel === "provavel" ? `Provável: link no site (${r.sistema_prova})` : x.nivel === "corrigido" ? `Corrigido por ${r.sistema_por}` : `Confirmado por ${r.sistema_por}`; })(), r.site || "", nomeLista.startsWith("Região") && d != null ? d.toFixed(2).replace(".", ",") : ""].map(q).join(";");
    });
    const blob = new Blob(["﻿" + [cab.map(q).join(";"), ...linhas].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `mapa-comercial-${norm(nomeLista).replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    for (const parte of chunk(lista, 500)) await sb.from("exportacoes").insert(parte.map((r) => ({ cnpj: r.cnpj, usuario_id: S.user.id, usuario_nome: S.perfil.nome })));
    await sb.from("historico").insert({ usuario_id: S.user.id, usuario_nome: S.perfil.nome, acao: "exportou", empresa: nomeLista, quantidade: lista.length });
    toast(`Planilha com ${fmtN(lista.length)} empresas baixada`);
    S.listas = null;
  }

  async function registrarBusca(uf, cidade, qtd) {
    const m = (await cidadesIbge(uf)).find((x) => norm(x.nome) === norm(cidade));
    // guarda quantas empresas daquela cidade estão de fato no mapeamento (pelo código do IBGE)
    if (m && qtd > 0) { const { count } = await sb.from("mapa").select("cnpj", { count: "exact", head: true }).eq("municipio_ibge", m.id).eq("removido", false); if (count != null) qtd = count; }
    const linha = { uf, nome: m ? m.nome : cidade, municipio_ibge: m ? m.id : null, qtd, buscada_em: new Date().toISOString() };
    S.buscadas.set(norm(linha.nome), linha);
    await sb.from("cidades_buscadas").upsert(linha, { onConflict: "uf,nome" });
  }

  async function mapearCidade(cidade, lote = false) {
    cidade = cidade.trim().replace(/\s+/g, " ");
    if (cidade.length < 2) { toast("Digite o nome da cidade."); return; }
    if (!lote && S.mapeando) { toast("Espere o mapeamento atual terminar."); return; }
    const uf = S.uf;
    S.mapeando = { etapa: `Procurando administradoras em ${cidade}/${uf}…`, feitas: 0, total: 0, detalhe: "", cidade }; S.msg = ""; S.erro = ""; render();
    try {
      const cnpjs = []; let pagina = 1;
      for (;;) {
        const r = await chamar(FUNCAO, { acao: "listar", cidade, uf, pagina });
        if (r.erro === "rede") throw new Error("rede");
        if (r.erro === "cidade_nao_encontrada") throw new Error(`Não encontrei ${cidade} em ${ufNome(uf)}. Confira o nome completo da cidade e o estado.`);
        if (r.erro === "fonte_mudou") throw new Error("A fonte da lista de empresas mudou de formato. Avise a Lua para ajustar a busca.");
        if (r.erro === "faca_login") throw new Error("Sua sessão expirou. Saia e entre de novo.");
        if (r.erro) throw new Error("A busca falhou agora. Tente de novo em alguns minutos.");
        cnpjs.push(...(r.empresas || []).map((e) => e.cnpj));
        S.mapeando.detalhe = `${fmtN(cnpjs.length)} de ${fmtN(r.total)} empresas do ramo encontradas`; render();
        if (!r.proxima) break; pagina = r.proxima;
      }
      if (!cnpjs.length) { await registrarBusca(uf, cidade, 0); if (lote) return { gravadas: 0 }; throw new Error(`Nenhuma empresa do ramo registrada em ${cidade}/${uf}.`); }
      const tot = { gravadas: 0, holdings: 0, sem: 0 };
      S.mapeando.total = cnpjs.length;
      // levas de 15 empresas, duas ao mesmo tempo
      const fila = chunk([...new Set(cnpjs)], 15);
      S.mapeando.etapa = `Buscando CNPJ, sócios e contatos na Receita…`;
      const mostrar = () => { S.mapeando.detalhe = `${fmtN(S.mapeando.feitas)} de ${fmtN(cnpjs.length)} empresas consultadas · ${fmtN(tot.gravadas)} guardadas no mapeamento`; render(); };
      mostrar();
      await Promise.all([0, 1].map(async () => {
        while (fila.length) {
          const parte = fila.shift();
          let r = null;
          for (let t = 0; t < 2 && !r; t++) { const d = await chamar(FUNCAO, { acao: "gravar", cnpjs: parte }); if (d && !d.erro) r = d; }
          if (r) { tot.gravadas += r.gravadas; tot.holdings += r.holdings; tot.sem += r.sem_dados; } else tot.sem += parte.length;
          S.mapeando.feitas += parte.length; mostrar();
        }
      }));
      await registrarBusca(uf, cidade, tot.gravadas);
      if (lote) return tot;
      S.mapeando = null;
      const { data: c } = await sb.rpc("cidades_da_uf", { p_uf: uf, p_so_ativas: false });
      const achada = (c || []).find((x) => norm(x.municipio) === norm(cidade));
      const doIbge = (IBGE.get(uf) || []).find((m) => norm(m.nome) === norm(cidade));
      S.cidade = doIbge ? doIbge.nome : achada ? achada.municipio : null;
      S.cidadeId = doIbge ? doIbge.id : achada?.municipio_ibge ? String(achada.municipio_ibge) : null;
      S.aba = "lista"; S.sel = null; S.selRow = null;
      S.msg = `${cidade}/${uf} mapeada: ${fmtN(tot.gravadas)} empresas no mapeamento.${tot.holdings ? ` ${fmtN(tot.holdings)} holdings ficaram de fora.` : ""}${tot.sem ? ` ${fmtN(tot.sem)} não tiveram resposta da Receita agora; mapeie de novo mais tarde para completar.` : ""}`;
      salvarPreferencias();
      await carregarMapeamento();
      localizarPendentes(uf);
      identificarSistemas(uf);
    } catch (e) {
      if (/^Não encontrei/.test(e.message)) await registrarBusca(uf, cidade, 0).catch(() => {});
      if (lote) { if (e.message === "rede") throw e; return { gravadas: 0, falhou: !/^Não encontrei/.test(e.message) }; }
      S.mapeando = null;
      S.erro = e.message === "rede" ? "Sem conexão com o servidor. Verifique a internet e tente de novo." : e.message;
      render();
    }
  }

  // Mapeia, uma por uma, as cidades do estado que ainda não têm nada no mapeamento
  async function mapearEstado() {
    if (S.mapeando) return;
    const uf = S.uf;
    await cidadesIbge(uf);
    // as cidades com mais empresas primeiro
    const faltam = cidadesDoEstado().filter((c) => !c.mapeada && !c.semEmpresas).sort((x, y) => (y.fonte || 0) - (x.fonte || 0));
    if (!faltam.length) { toast("Todas as cidades deste estado já foram mapeadas."); return; }
    S.cidMenu = false; S.cidade = null; S.cidadeId = null; S.msg = ""; S.erro = "";
    S.estado = { uf, atual: 0, total: faltam.length, empresas: 0, parar: false, falhas: 0 };
    try {
      for (const c of faltam) {
        if (S.estado.parar || !S.user) break;
        S.estado.atual++;
        S.mapeando = { etapa: `Procurando administradoras em ${c.nome}/${uf}…`, feitas: 0, total: 0, detalhe: "", cidade: c.nome }; render();
        const r = await mapearCidade(c.nome, true);
        S.estado.empresas += r?.gravadas || 0; if (r?.falhou) S.estado.falhas++;
      }
      const e = S.estado;
      S.msg = `${ufNome(uf)}: ${fmtN(e.atual)} de ${fmtN(e.total)} cidades que faltavam foram procuradas e ${fmtN(e.empresas)} empresas entraram no mapeamento.${e.atual < e.total ? " Clique de novo em Mapear as cidades que faltam para continuar de onde parou." : ""}${e.falhas ? ` Em ${fmtN(e.falhas)} cidades a busca não respondeu; elas continuam na lista para tentar de novo.` : ""}`;
    } catch (e) {
      S.erro = "Sem conexão com o servidor. O que já foi mapeado ficou guardado; clique de novo para continuar.";
    } finally {
      S.mapeando = null; S.estado = null; salvarPreferencias();
      await carregarMapeamento(); localizarPendentes(uf); identificarSistemas(uf);
    }
  }

  /* ------------------------------------------------------------ eventos */
  document.addEventListener("click", (ev) => { if (S.cidMenu && !ev.target.closest(".cid-campo")) { S.cidMenu = false; render(); } });
  app.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b || b.tagName === "FORM" || b.tagName === "SELECT" || b.tagName === "INPUT") return;
    const a = b.dataset.acao;
    if (a !== "menu" && S.menu) { S.menu = false; }
    switch (a) {
      case "menu": S.menu = !S.menu; render(); break;
      case "sair": await sb.auth.signOut(); break;
      case "ir": S.view = b.dataset.view; S.sel = null; S.selRow = null; S.show = 60; if (b.dataset.view === "listas") S.listas = null; if (b.dataset.view === "equipe") S.equipe = null; render(); if (b.dataset.view === "regiao") localizarPendentes(S.uf); break;
      case "fechar-msg": S.msg = ""; render(); break;
      case "so-novas": S.soNovas = true; render(); break;
      case "tipo": S.tipo = b.dataset.v; S.show = 60; salvarPreferencias(); render(); break;
      case "sistema": S.sistema = b.dataset.v; render(); break;
      case "alternar": S[b.dataset.k] = !S[b.dataset.k]; S.show = 60; if (b.dataset.k === "soAtivas") carregarMapeamento(); else render(); break;
      case "aba": S.aba = b.dataset.aba; render(); break;
      case "cidade": S.cidade = b.dataset.v; S.cidadeId = b.dataset.id || null; S.aba = "lista"; S.show = 60; salvarPreferencias(); carregarMapeamento(); break;
      case "limpar-cidade": S.cidade = null; S.cidadeId = null; salvarPreferencias(); carregarMapeamento(); break;
      case "cid-menu": S.cidMenu = !S.cidMenu; S.cidBusca = ""; render(); if (S.cidMenu) { cidadesIbge(S.uf).then(() => { if (S.cidMenu) { const l = $("#cid-lista"); if (l) l.innerHTML = opcoesCidadesHtml(); const t = $("#cid-todas-sub"); if (t) t.textContent = textoTodas(); } contarCidades(S.uf); }); $("#cid-busca")?.focus(); } break;
      case "cid-ordem": S.cidOrdem = b.dataset.v; app.querySelectorAll(".cid-ord").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === S.cidOrdem)); { const l = $("#cid-lista"); if (l) { l.innerHTML = opcoesCidadesHtml(); l.scrollTop = 0; } } break;
      case "cid-todas": S.cidMenu = false; S.cidade = null; S.cidadeId = null; S.aba = "lista"; S.show = 60; salvarPreferencias(); carregarMapeamento(); break;
      case "cid-escolher": {
        // cidade grande: avisa quanto tempo leva antes de começar
        const fonte = (S.totais.get(norm(b.dataset.nome)) || {}).total || 0;
        if (b.dataset.mapeada !== "true" && fonte > 600 && !b.dataset.certeza) {
          b.dataset.certeza = "1";
          b.innerHTML = `<span><b>${esc(b.dataset.nome)}</b>: ${fmtN(fonte)} empresas, leva uns ${fmtN(Math.ceil(fonte / 30 * 8 / 60))} min. Clique de novo para mapear.</span>`;
          break;
        }
        S.cidMenu = false;
        if (b.dataset.mapeada === "true") { S.cidade = b.dataset.nome; S.cidadeId = b.dataset.id || null; S.aba = "lista"; S.show = 60; salvarPreferencias(); carregarMapeamento(); }
        else mapearCidade(b.dataset.nome);
        break;
      }
      case "mapear-estado": {
        if (!b.dataset.certeza) {
          const n = cidadesDoEstado().filter((c) => !c.mapeada && !c.semEmpresas).length;
          b.dataset.certeza = "1";
          b.innerHTML = `${ICONE.pin} Confirmar: procurar ${fmtN(n)} cidades (leva uns ${fmtN(Math.max(1, Math.ceil(n * 5 / 60)))} min; deixe esta aba aberta)`;
          break;
        }
        mapearEstado(); break;
      }
      case "parar-estado": if (S.estado) { S.estado.parar = true; render(); } break;
      case "mais": S.show += 60; render(); break;
      case "sel": selecionar(b.dataset.cnpj); break;
      case "fechar-painel": S.sel = null; S.selRow = null; render(); break;
      case "marcar": marcar(b.dataset.campo, b.dataset.status, b.dataset.campo === "Sistema" ? (S.selRow?.sistema || null) : null); break;
      case "sis-corrigir": S.sisCorrigir = S.sel; render(); break;
      case "pista-ok": if (S.selRow && pistaDe(S.selRow)) await marcar("Sistema", "confirmado", S.selRow.sistema_pista); break;
      case "sis-cancelar": S.sisCorrigir = null; render(); break;
      case "sis-salvar": {
        const v = $("#sis-certo")?.value; if (!v) { toast("Escolha o sistema."); break; }
        const r = S.selRow; S.sisCorrigir = null;
        // se a equipe disse o mesmo que o site, é confirmação; se disse outro, é correção
        await marcar("Sistema", r && r.sistema && v === r.sistema ? "confirmado" : "errado", v); break;
      }
      case "desfazer": desfazer(b.dataset.campo); break;
      case "remover": remover(); break;
      case "copiar": copiar(); break;
      case "exportar": exportar(filtrados(S.rows), S.cidade ? `${S.cidade}/${S.uf}` : ufNome(S.uf)); break;
      case "exportar-regiao": exportar(filtrados(S.reg.rows, S.reg.tipo).sort((x, y) => S.reg.dist.get(x.cnpj) - S.reg.dist.get(y.cnpj)), `Região ${S.reg.lugar?.nome || ""} ${S.reg.raio} km`); break;
      case "lugar": { const l = S.reg.lugares[+b.dataset.i]; S.reg.lugar = l; S.reg.texto = l.nome + (l.detalhe ? ", " + l.detalhe : ""); S.reg.lugares = []; S.sel = null; S.selRow = null; carregarRegiao(); break; }
      case "raio": S.reg.raio = +b.dataset.v; carregarRegiao(); break;
      case "r-tipo": S.reg.tipo = b.dataset.v; render(); break;
      case "usuario": {
        if (b.dataset.op === "recusar" && !b.dataset.certeza) { b.dataset.certeza = "1"; b.textContent = "Clique de novo para recusar"; break; }
        b.disabled = true;
        const data = await chamar("gerenciar-usuarios", { acao: b.dataset.op, id: b.dataset.id, papel: b.dataset.papel });
        if (data.erro) toast(data.erro === "rede" ? "Não foi possível agora. Tente de novo." : data.erro);
        else { toast(b.dataset.op === "aprovar" ? "Acesso liberado" : b.dataset.op === "recusar" ? "Pedido recusado" : "Pronto"); if (b.dataset.op === "aprovar" || b.dataset.op === "recusar") S.pendentes = Math.max(0, (S.pendentes || 0) - 1); }
        S.equipe = null; render(); break;
      }
      case "nova-senha": {
        const senha = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!";
        const data = await chamar("gerenciar-usuarios", { acao: "senha", id: b.dataset.id, senha });
        if (data.erro) { toast(data.erro === "rede" ? "Não foi possível agora. Tente de novo." : data.erro); break; }
        b.outerHTML = `<span class="selo s-ident" style="font-size:12px">Senha nova: <b class="num" style="user-select:all">${esc(senha)}</b></span>`;
        break;
      }
      default: break;
    }
  });
  app.addEventListener("change", (ev) => {
    if (ev.target.id === "f-uf") { S.uf = ev.target.value; S.cidade = null; S.cidadeId = null; S.cidMenu = false; S.sel = null; S.selRow = null; salvarPreferencias(); carregarMapeamento().then(() => { localizarPendentes(S.uf); identificarSistemas(S.uf); }); }
  });
  app.addEventListener("input", (ev) => {
    if (ev.target.id === "cid-busca") { S.cidBusca = ev.target.value; const l = $("#cid-lista"); if (l) l.innerHTML = opcoesCidadesHtml(); return; }
    if (ev.target.id === "r-local") { S.reg.texto = ev.target.value; clearTimeout(buscaT); buscaT = setTimeout(() => buscarLugar(S.reg.texto), 450); }
  });
  app.addEventListener("keydown", (ev) => {
    if (ev.target.id === "r-local" && ev.key === "Enter") { ev.preventDefault(); if (S.reg.lugares[0]) app.querySelector('[data-acao="lugar"][data-i="0"]').click(); else buscarLugar(S.reg.texto); }
    if (ev.key === "Escape" && S.cidMenu) { S.cidMenu = false; render(); $(".cid-botao")?.focus(); return; }
    if (ev.target.id === "cid-busca" && ev.key === "Enter") { ev.preventDefault(); $("#cid-lista .cid-op")?.click(); return; }
    if (ev.key === "Escape" && S.sel && window.innerWidth <= 900) { S.sel = null; S.selRow = null; render(); }
  });
  app.addEventListener("submit", async (ev) => {
    const f = ev.target;
    if (f.dataset.acao === "mapear-form") { ev.preventDefault(); mapearCidade($("#f-mapear").value); }
    if (f.dataset.acao === "criar-usuario") {
      ev.preventDefault();
      const btn = f.querySelector("button"); btn.disabled = true;
      const data = await chamar("gerenciar-usuarios", { acao: "criar", nome: $("#u-nome").value, email: $("#u-email").value, senha: $("#u-senha").value, papel: $("#u-papel").value });
      if (data.erro) { toast(data.erro === "rede" ? "Não foi possível agora. Tente de novo." : data.erro); btn.disabled = false; return; }
      toast("Pessoa adicionada. Passe o e-mail e a senha inicial para ela."); S.equipe = null; render();
    }
  });

  /* ------------------------------------------------------------- início */
  async function iniciar() {
    const { data } = await sb.auth.getSession();
    S.user = data.session?.user || null;
    if (!S.user) return render();
    await carregarPerfil();
    render();
    if (!S.perfil.aprovado) return;
    await carregarMapeamento();
    localizarPendentes(S.uf);
    identificarSistemas(S.uf);
  }
  sb.auth.onAuthStateChange((evento, sessao) => {
    if (evento === "PASSWORD_RECOVERY") { S.recuperando = true; S.user = sessao?.user || null; render(); return; }
    if (evento === "SIGNED_IN" && !S.user && !S.recuperando) { iniciar(); return; }
    if (evento === "SIGNED_OUT") { S.user = null; S.perfil = null; S.pendentes = 0; S.equipe = null; S.rows = []; S.sel = null; S.selRow = null; S.menu = false; render(); }
  });
  iniciar();
})();
