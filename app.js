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
    user: null, perfil: null, view: "inicio", menu: false,
    uf: lembrar.uf || "SP", cidade: lembrar.cidade || null, cidadeId: lembrar.cidadeId || null, cidMenu: false, cidBusca: "", estado: null, buscadas: new Map(), totais: new Map(), contando: null, cidOrdem: "az", tipo: lembrar.tipo || "Todas", sistema: "Todos",
    soAtivas: true, escExp: false, soNovas: false, escBase: false, aba: "lista",
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
      if (S.escBase && S.ag?.cnpjs?.has(r.cnpj)) return false;
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
    const fx = S.lg.carregado && S.user ? fichaDoCnpj(r.cnpj) : null, ux = fx && ultimaDe(fx);
    if (ux) t.push(`<span class="selo ${ux.data === hojeISO() ? "s-conf" : "s-ident"}">${ux.data === hojeISO() ? "Hoje" : `Contato em ${ddmm(ux.data)}`} · ${esc(rotuloReg(ux))}</span>`);
    else if (S.ag?.cnpjs?.has(r.cnpj)) t.push(`<span class="selo s-ident">Nas suas administradoras</span>`);
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

  // Guarda o que está sendo digitado na ficha para não perder quando a tela se atualiza sozinha
  function guardarForm() {
    const f = app.querySelector('form[data-acao="lg-salvar"]'); if (!f || !f.dataset.sujo) return null;
    const v = [...f.elements].filter((e) => e.name && e.type !== "submit" && e.type !== "hidden").map((e) => [e.name, e.type === "radio" || e.type === "checkbox" ? e.value : null, e.type === "radio" || e.type === "checkbox" ? e.checked : e.value]);
    return { chave: (f.dataset.ficha || "") + "|" + (f.dataset.cnpj || ""), v, foco: document.activeElement?.id };
  }
  function devolverForm(g) {
    const f = app.querySelector('form[data-acao="lg-salvar"]'); if (!g || !f || (f.dataset.ficha || "") + "|" + (f.dataset.cnpj || "") !== g.chave) return;
    for (const [n, rv, val] of g.v) { const el = rv != null ? f.querySelector(`[name="${n}"][value="${CSS.escape(rv)}"]`) : f.elements[n]; if (!el || el instanceof RadioNodeList) continue; if (el.type === "radio" || el.type === "checkbox") el.checked = val; else el.value = val; }
    f.dataset.sujo = "1"; const d = $("#rg-demo"); if (d) d.hidden = !f.querySelector('[name="res"][value="demo_agendada"]:checked');
    if (g.foco) document.getElementById(g.foco)?.focus();
  }
  function render() {
    const g = guardarForm(), rolagem = app.querySelector(".gaveta .painel")?.scrollTop || 0; renderTela(); devolverForm(g);
    const gv = app.querySelector(".gaveta .painel"); if (gv && rolagem) gv.scrollTop = rolagem;
    document.body.classList.toggle("com-gaveta", !!gv);
  }
  const gaveta = (html, fechar) => `<div class="gaveta-fundo" data-acao="${fechar}"></div><div class="gaveta gaveta-grande" role="dialog" aria-modal="true">${html}</div>`;
  function renderTela() {
    fundo(!S.user || S.recuperando || (S.perfil && !S.perfil.aprovado));
    if (S.recuperando) return renderNovaSenha();
    if (!S.user) return S.cadastro ? renderCadastro() : renderLogin();
    if (S.perfil && !S.perfil.aprovado) return renderAguardando();
    app.innerHTML = topo() + `<main class="${S.view === "inicio" ? "main-inicio" : ""}">${S.view === "inicio" ? "" : faixaAgenda()}${S.view === "inicio" ? telaInicio() : S.view === "mapeamento" ? telaMapeamento() : S.view === "regiao" ? telaRegiao() : S.view === "listas" ? telaListas() : S.view === "adms" ? telaAdms() : S.view === "agenda" ? telaAgenda() : S.view === "relatorios" ? telaRelatorios() : telaEquipe()}</main>`;
    if (S.view === "regiao") desenharMapa();
  }

  function topo() {
    const nAg = S.ag?.carregado ? pendentesAgenda() : 0;
    const nav = [["inicio", "Início"], ["mapeamento", "Mapeamento"], ["regiao", "Região"], ["adms", "Administradoras"], ["agenda", nAg ? `Agenda <span class="contador">${nAg}</span>` : "Agenda"], ["relatorios", "Relatórios"], ["listas", "Listas exportadas"]];
    if (S.perfil?.papel === "admin") nav.push(["equipe", S.pendentes ? `Equipe <span class="contador">${S.pendentes}</span>` : "Equipe"]);
    return `<header class="topo">
      <button type="button" class="marca marca-topo" data-acao="ir" data-view="inicio" aria-label="Mapa Comercial, voltar ao início"><img src="marca/prg-software.png?v=1" alt="" width="151" height="73" class="marca-prg"><span class="marca-sep" aria-hidden="true"></span><span class="pilha" style="gap:0"><span class="marca-nome">Mapa Comercial</span><span class="marca-sub">Grupo WorkOffice</span></span></button>
      <nav aria-label="Menu principal">${nav.map(([k, l]) => `<button type="button" data-acao="ir" data-view="${k}" ${k === "agenda" ? 'id="nav-agenda"' : ""} ${S.view === k ? 'aria-current="page"' : ""}>${l}</button>`).join("")}</nav>
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
    if (S.lg.carregado && !S.lg.dono) {
      const m = metricas(hojeISO(), hojeISO());
      html += `<section class="cartao hoje-mapa"><span class="t13"><b>Suas ligações de hoje:</b> ${fmtN(m.ligacoes)} ${m.ligacoes === 1 ? "contato" : "contatos"} · ${fmtN(m.primeira_ligacao)} ${m.primeira_ligacao === 1 ? "novo" : "novos"} · ${fmtN(m.follow_up)} follow-up${m.follow_up === 1 ? "" : "s"}${m.demo_agendada ? ` · ${fmtN(m.demo_agendada)} demo agendada${m.demo_agendada === 1 ? "" : "s"}` : ""}</span><span class="t12 fraco">Clique numa empresa da lista, preencha a ficha e salve: o contato já entra no relatório do dia.</span><button type="button" class="mini" data-acao="lg-rel-dia">Ver relatório do dia →</button></section>`;
    }
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
    return html + listaHtml(lista) + (S.selRow ? gaveta(painelHtml(), "fechar-painel") : "");
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
          ${alternar("soAtivas", "Só empresas ativas")}${alternar("escExp", "Esconder já exportadas")}${alternar("soNovas", "Só novas (último mês)")}${alternar("escBase", "Esconder quem já liguei")}
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
    return `<aside class="cartao painel painel-lg" aria-label="Detalhes da empresa">
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
      ${blocoLigacaoMapa(r)}
      <details class="lg-bloco" open><summary><b>Dados da Receita</b><span class="t12 fraco">sistema, contato, sócios</span></summary><div class="pilha receita-grade" style="gap:18px;margin-top:10px">
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
      </div></details>
      <div class="acoes-painel">
        <button type="button" class="btn btn-sec" data-acao="copiar">Copiar dados</button>
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
    return html + listaHtml(lista, R.dist) + (S.selRow ? gaveta(painelHtml(), "fechar-painel") : "");
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
    return `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Equipe</h1><p class="fraco" style="margin:0">Quem pode entrar no Mapa Comercial. Cada pessoa cria a própria conta na tela de entrada e só entra depois que uma administradora aprova aqui. Você também troca o papel, gera senha nova ou desativa quem saiu da equipe.</p></div></div>
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

  /* ------------------------------------------------- ligações e relatórios */
  // O resultado é o que aconteceu na ligação. Se ela é contato novo ou follow-up o sistema descobre sozinho:
  // a primeira ligação para a administradora é nova, as seguintes são follow-up.
  const RESULTADOS = [
    ["conversou", "Conversei", "s-ident"],
    ["sem_contato", "Não atendeu / sem contato", "s-vazio"],
    ["negativa", "Negativa", "s-errado"],
    ["demo_agendada", "Demo agendada", "s-roxo"],
    ["demo_realizada", "Demo realizada", "s-conf"],
    ["contrato", "Contrato fechado", "s-conf"],
    ["anotacao", "Só anotação", "s-neutro"],
  ];
  const RES = Object.fromEntries(RESULTADOS.map(([k, l, c]) => [k, { l, c }]));
  const LIGACAO = new Set(["conversou", "sem_contato", "negativa", "demo_agendada"]);
  const ETAPA = { prospeccao: ["Em prospecção", "s-neutro"], demo_agendada: ["Demo agendada", "s-roxo"], demo_realizada: ["Demo realizada", "s-ident"], contrato: ["Contrato fechado", "s-conf"], negativa: ["Negativa", "s-errado"] };
  const FUNIL = [
    ["mapeamento", "Mapeamento", "Ainda não contatadas"], ["indisponivel", "Indisponível", "Não conseguiu falar"], ["contato", "Contato", "Já conversou"],
    ["follow_semestral", "Follow-up semestral", "Retomar em 6 meses"], ["sem_interesse", "Sem interesse", ""], ["demonstracao", "Demonstração", "Agendada ou feita"], ["contrato", "Contrato fechado", ""],
  ];
  const FUNIL_NOME = Object.fromEntries(FUNIL.map(([k, l]) => [k, l]));
  const FUNIL_COR = { mapeamento: "s-neutro", indisponivel: "s-vazio", contato: "s-ident", follow_semestral: "s-nao", sem_interesse: "s-errado", demonstracao: "s-roxo", contrato: "s-conf" };
  const FILTRO_ETAPA = [["todas", "Todas"], ["prospeccao", "Em prospecção"], ["demo_agendada", "Demo agendada"], ["demo_realizada", "Demo realizada"], ["contrato", "Contrato"], ["negativa", "Negativa"]];
  const CAMPOS = [
    ["nome", "Administradora"], ["telefones", "Números disponíveis para contato"], ["whatsapp", "WhatsApp"], ["horario_funcionamento", "Horário de funcionamento"],
    ["cidade", "Cidade"], ["uf", "UF"], ["sistema", "Sistema usado"], ["qtd_condominios", "Quantos condomínios atende"], ["qtd_unidades", "Quantas unidades"],
    ["atendente", "Nome de quem atendeu a ligação"], ["email", "E-mail para contato"], ["numero_responsavel", "Número do responsável"],
    ["melhor_horario", "Melhor horário para falar com o responsável"], ["responsavel", "Nome do responsável"], ["cnpj", "CNPJ"],
  ];
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const TZ = "America/Sao_Paulo";
  const pad2 = (n) => String(n).padStart(2, "0");
  const hojeISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
  const isoData = (iso) => new Date(iso + "T12:00:00Z");
  const somaDias = (iso, n) => { const d = isoData(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const segundaDe = (iso) => somaDias(iso, -((isoData(iso).getUTCDay() + 6) % 7));
  const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const ddmmaaaa = (iso) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";
  const localSP = (ts) => ts ? new Date(ts).toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T") : "";
  const extenso = (iso, hora) => `${iso.slice(8, 10)} de ${MESES[+iso.slice(5, 7) - 1]}${hora ? ` às ${hora}` : ""}`;

  S.lg = { dono: null, carregado: false, carregando: false, fichas: [], regs: [], base: [], rels: [], pessoas: null, busca: "", etapa: "todas", sel: null, novo: false, apagar: null, mostrar: 100, dadosAberto: true, idx: new Map(), modo: (() => { try { return localStorage.getItem("mapa-adm-modo") || "quadro"; } catch { return "quadro"; } })(), porColuna: {}, arrastando: null, arrastou: false };
  S.rl = { periodo: "dia", ref: hojeISO(), editObs: false, editAj: false };

  const donoAtual = () => S.lg.dono || S.user.id;
  const souDono = () => donoAtual() === S.user.id;

  async function tudo(montar) {
    const out = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await montar().range(de, de + 999);
      if (error) throw error;
      out.push(...(data || []));
      if (!data || data.length < 1000) return out;
    }
  }
  async function carregarLig() {
    const L = S.lg; if (L.carregando) return; L.carregando = true;
    const dono = donoAtual();
    const q = (t, cols) => () => { let x = sb.from(t).select(cols); if (dono !== "todos") x = x.eq("usuario_id", dono); return x.order(t === "acumulado_base" ? "usuario_id" : t === "relatorios" ? "inicio" : "id"); };
    try {
      const [fichas, regs, base, rels] = await Promise.all([
        tudo(q("fichas", "*")), tudo(q("registros", "id,ficha_id,usuario_id,data,tipo,detalhe,detalhes,envio,canal,texto,criado_em")),
        tudo(q("acumulado_base", "*")), tudo(q("relatorios", "*")),
      ]);
      Object.assign(L, { fichas, regs, base, rels });
      if (S.perfil?.papel === "admin" && !L.pessoas) { const { data } = await sb.from("perfis").select("id,nome").eq("aprovado", true).order("nome"); L.pessoas = data || []; }
      derivar();
      L.carregado = true;
    } catch (e) { console.error(e); toast("Não deu para carregar as ligações. Tente de novo."); }
    finally { L.carregando = false; render(); }
  }
  function derivar() {
    const L = S.lg;
    L.fichaPorId = new Map(L.fichas.map((f) => [f.id, f]));
    L.porFicha = new Map();
    const ord = [...L.regs].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.criado_em < b.criado_em ? -1 : 1));
    for (const r of ord) { if (!L.porFicha.has(r.ficha_id)) L.porFicha.set(r.ficha_id, []); L.porFicha.get(r.ficha_id).push(r); }
    for (const [id, lista] of L.porFicha) {
      let primeira = !L.fichaPorId.get(id)?.contato_anterior;
      for (const r of lista) { r.nova = false; if (LIGACAO.has(r.tipo)) { r.nova = primeira; primeira = false; } }
    }
    // texto de busca de cada ficha: todos os campos e todas as anotações
    L.idx = new Map(L.fichas.map((f) => [f.id, norm([f.nome, f.cidade, f.uf, f.sistema, f.responsavel, f.telefones, f.whatsapp, f.email, f.atendente, f.numero_responsavel, f.melhor_horario, f.horario_funcionamento, f.cnpj, f.observacoes, f.retorno_nota, ...(L.porFicha.get(f.id) || []).map((r) => r.texto)].join(" ")).replace(/\s+/g, " ")]));
  }
  const nomePessoa = (id) => id === S.user.id ? S.perfil?.nome : (S.lg.pessoas || []).find((p) => p.id === id)?.nome || "";
  const jaLigou = (f) => f.contato_anterior || (S.lg.porFicha.get(f.id) || []).some((r) => LIGACAO.has(r.tipo));

  function metricas(ini, fim) {
    const rs = S.lg.regs.filter((r) => r.data >= ini && r.data <= fim);
    const lig = rs.filter((r) => LIGACAO.has(r.tipo));
    const n = (t) => rs.filter((r) => r.tipo === t).length;
    return { rs, lig, ligacoes: lig.length, pessoas: new Set(lig.map((r) => r.ficha_id)).size, primeira_ligacao: lig.filter((r) => r.nova).length, follow_up: lig.filter((r) => !r.nova).length,
      sem_contato: n("sem_contato"), negativa: n("negativa"), demo_agendada: n("demo_agendada"), demo_realizada: n("demo_realizada"), contrato: n("contrato") };
  }
  function acumulado(fim) {
    const L = S.lg; let tentativas = 0, prospectadas = 0;
    const baseAte = new Map();
    for (const b of L.base) if (b.ate <= fim) { tentativas += b.tentativas; prospectadas += b.prospectadas; baseAte.set(b.usuario_id, b.ate); }
    for (const r of L.regs) {
      if (r.data > fim || !LIGACAO.has(r.tipo)) continue;
      const ate = baseAte.get(r.usuario_id); if (ate && r.data <= ate) continue;
      tentativas++; if (r.nova) prospectadas++;
    }
    const fichasCom = (t) => [...new Set(L.regs.filter((r) => r.tipo === t && r.data <= fim).map((r) => r.ficha_id))].map((id) => L.fichaPorId.get(id)).filter(Boolean);
    return { tentativas, prospectadas, demos: fichasCom("demo_realizada"), contratos: fichasCom("contrato") };
  }

  /* ---- Administradoras: a ficha de cada uma, as ligações e o próximo retorno */
  // Botões de resultado: [chave, rótulo, tipo para os relatórios, detalhe]
  const BOTOES = [
    ["nao_atende", "Não atende", "sem_contato", "nao_atende"],
    ["caixa_postal", "Caixa postal", "sem_contato", "caixa_postal"],
    ["numero_invalido", "Número não existe", "sem_contato", "numero_invalido"],
    ["conversou", "Conversei", "conversou", null],
    ["material_enviado", "Só atende por e-mail / WhatsApp", "conversou", "material_enviado"],
    ["pediu_retorno", "Pediu para retornar", "conversou", "pediu_retorno"],
    ["sem_abertura", "Sem abertura", "conversou", "sem_abertura"],
    ["negativa", "Sem interesse", "negativa", null],
    ["demo_agendada", "Demo agendada", "demo_agendada", null],
    ["demo_realizada", "Demo realizada", "demo_realizada", null],
    ["contrato", "Contrato fechado", "contrato", null],
    ["anotacao", "Só anotação", "anotacao", null],
  ];
  const DETALHE = { nao_atende: "Não atende", caixa_postal: "Caixa postal", numero_invalido: "Número não existe", material_enviado: "Só atende por e-mail / WhatsApp", pediu_retorno: "Pediu para retornar", sem_abertura: "Sem abertura" };
  const CANAL = { ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail" };
  const NOME_BOTAO = Object.fromEntries(BOTOES.map(([k, l]) => [k, l]));
  const ENVIO = { whatsapp: "WhatsApp", email: "e-mail" };
  const envioTxt = (r) => (r.envio?.length ? ` · Apresentação enviada por ${r.envio.map((k) => ENVIO[k] || k).join(" e ")}` : "");
  const rotuloReg = (r) => (r.canal && r.canal !== "ligacao" ? CANAL[r.canal] + " · " : "") + rotuloRes(r) + envioTxt(r);
  const rotuloRes = (r) => (r.detalhes?.length > 1 ? r.detalhes.map((k) => NOME_BOTAO[k] || k).join(" + ") : DETALHE[r.detalhe] || (r.detalhes?.[0] && NOME_BOTAO[r.detalhes[0]]) || RES[r.tipo]?.l || r.tipo);
  // quando ela marca mais de um resultado, o principal (que conta nos relatórios) é o que chegou mais longe
  const PRIORIDADE = ["contrato", "demo_realizada", "demo_agendada", "negativa", "conversou", "sem_contato", "anotacao"];
  const horaReg = (r) => (r.criado_em && localSP(r.criado_em).slice(0, 10) === r.data ? localSP(r.criado_em).slice(11, 16) : "");
  const tsSP = (dia, hora) => `${dia}T${hora || "09:00"}:00-03:00`;
  const diaDe = (ts) => localSP(ts).slice(0, 10);
  function quandoTxt(ts) {
    const l = localSP(ts), d = l.slice(0, 10), h = l.slice(11, 16), hj = hojeISO();
    const dia = d === hj ? "Hoje" : d === somaDias(hj, 1) ? "Amanhã" : d === somaDias(hj, -1) ? "Ontem" : `${DIAS[isoData(d).getUTCDay()].slice(0, 3)} ${ddmm(d)}`;
    return `${dia} · ${h}`;
  }
  // soma dias úteis: um retorno "amanhã" numa sexta vai para segunda
  function diasUteis(n) { let d = hojeISO(); for (let i = 0; i < n; i++) { d = somaDias(d, 1); while ([0, 6].includes(isoData(d).getUTCDay())) d = somaDias(d, 1); } return d; }

  function seletorPessoa(id) {
    if (S.perfil?.papel !== "admin" || !S.lg.pessoas) return "";
    const d = donoAtual();
    return `<div class="campo" style="min-width:200px"><label for="${id}">De quem</label><select id="${id}" class="input sel-dono"><option value="${S.user.id}">Eu (${esc(S.perfil.nome)})</option>${S.lg.pessoas.filter((p) => p.id !== S.user.id).map((p) => `<option value="${p.id}" ${d === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}<option value="todos" ${d === "todos" ? "selected" : ""}>Equipe toda</option></select></div>`;
  }
  function ultimaDe(f) { const l = S.lg.porFicha.get(f.id); return l && l.length ? l[l.length - 1] : null; }
  // quem fechou contrato também fez demonstração: entra nas duas contagens
  function naEtapa(f, k) {
    if (k === "todas") return true;
    if (k === "retorno") return !!f.retorno_em;
    if (k === "fez_demo") return f.etapa === "demo_realizada" || f.etapa === "contrato" || (S.lg.porFicha.get(f.id) || []).some((r) => r.tipo === "demo_realizada");
    return (f.funil || "mapeamento") === k;
  }
  function fichasFiltradas() {
    const L = S.lg, palavras = norm(L.busca).split(/\s+/).filter(Boolean);
    return L.fichas.filter((f) => {
      if (!naEtapa(f, L.etapa)) return false;
      if (!palavras.length) return true;
      const t = L.idx.get(f.id) || ""; return palavras.every((p) => t.includes(p));
    }).sort((x, y) => { const a = ultimaDe(x)?.data || x.criado_em.slice(0, 10), c = ultimaDe(y)?.data || y.criado_em.slice(0, 10); return a < c ? 1 : a > c ? -1 : (x.atualizado_em < y.atualizado_em ? 1 : -1); });
  }
  function celulaRetorno(f) {
    if (!f.retorno_em) return '<span class="fraco t12">—</span>';
    const atr = diaDe(f.retorno_em) < hojeISO();
    return `<span class="selo ${atr ? "s-errado" : diaDe(f.retorno_em) === hojeISO() ? "s-nao" : "s-ident"}">${atr ? "Atrasado · " : ""}${esc(quandoTxt(f.retorno_em))}</span>`;
  }
  function linhasFichas() {
    const lista = fichasFiltradas();
    if (!lista.length) return `<div class="vazio">${S.lg.fichas.length ? "Nenhuma administradora com essa busca." : "Nenhuma administradora ainda. Clique em <b>+ Nova administradora</b> ou, no Mapeamento, abra uma empresa e clique em <b>Registrar ligação</b>."}</div>`;
    return lista.slice(0, S.lg.mostrar).map((f) => {
      const u = ultimaDe(f), lig = (S.lg.porFicha.get(f.id) || []).filter((r) => LIGACAO.has(r.tipo)).length, el = FUNIL_NOME[f.funil] || "Mapeamento", ec = FUNIL_COR[f.funil] || "s-neutro";
      return `<button type="button" class="lg-linha" data-acao="lg-sel" data-id="${f.id}" aria-pressed="${S.lg.sel === f.id}">
        <span class="pilha" style="gap:1px;min-width:0"><span class="t-nome">${esc(f.nome)}</span><span class="t12 fraco">${esc([f.cidade, f.uf].filter(Boolean).join(" - ") || "Cidade não informada")}${S.lg.dono === "todos" ? ` · ${esc(nomePessoa(f.usuario_id))}` : ""}</span></span>
        <span class="t13">${f.sistema ? esc(f.sistema) : '<span class="fraco">Sistema ?</span>'}</span>
        <span><span class="selo ${ec}">${el}</span></span>
        <span class="t12">${u ? `<b class="num">${ddmm(u.data)}</b> · ${esc(rotuloReg(u))}<br><span class="fraco">${lig} ${lig === 1 ? "contato" : "contatos"}</span>` : '<span class="fraco">Sem ligação ainda</span>'}</span>
        <span>${celulaRetorno(f)}</span>
      </button>`;
    }).join("") + (lista.length > S.lg.mostrar ? `<div style="padding:14px 18px"><button type="button" class="mini" data-acao="lg-mais">Mostrar mais (${fmtN(lista.length - S.lg.mostrar)})</button></div>` : "");
  }
  function telaAdms() {
    const L = S.lg;
    const cab = `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Administradoras</h1><p class="fraco" style="margin:0">A ficha de cada administradora com todos os contatos feitos. Procure por nome, cidade, responsável, e-mail ou qualquer coisa que você anotou.</p></div>
      <div class="linha-flex" style="align-items:flex-end">${seletorPessoa("lg-dono")}${souDono() ? `<button type="button" class="btn btn-primario" data-acao="lg-nova">+ Nova administradora</button>` : ""}</div></div>`;
    if (!L.carregado) { if (!L.carregando) carregarLig(); return cab + `<div class="cartao vazio">Carregando as administradoras…</div>`; }
    const hoje = hojeISO(), m = metricas(hoje, hoje);
    const ind = (v, l, sub = "") => `<div class="ind ${v ? "" : "zero"}"><span class="v">${fmtN(v)}</span><span class="t12 fraco">${l}${sub}</span></div>`;
    const nRet = L.fichas.filter((f) => f.retorno_em).length;
    return cab + `
      <section class="cartao" style="overflow:hidden"><div class="lista-cab"><b>Hoje, ${DIAS[isoData(hoje).getUTCDay()]} ${ddmm(hoje)}</b><button type="button" class="mini" data-acao="lg-rel-dia">Ver relatório do dia →</button></div>
        <div class="resumo resumo6">${ind(m.ligacoes, "Contatos", m.ligacoes ? ` com ${fmtN(m.pessoas)} administradora${m.pessoas === 1 ? "" : "s"}` : "")}${ind(m.primeira_ligacao, "Contatos novos")}${ind(m.follow_up, "Follow-ups")}${ind(m.sem_contato, "Sem contato")}${ind(m.negativa, "Negativas")}${ind(m.demo_agendada, "Demos agendadas")}</div></section>
      <section class="cartao filtros"><div class="linha-filtros">
        <div class="campo" style="flex:1 1 300px"><label for="lg-busca">Procurar</label><input id="lg-busca" class="input" type="search" value="${esc(L.busca)}" placeholder="Nome, cidade, responsável, e-mail, anotação…" autocomplete="off"></div>
        <div class="campo"><span class="rotulo">Ver como</span><div class="abas" role="tablist">${[["quadro", "Quadro por etapa"], ["lista", "Lista"]].map(([k, l]) => `<button type="button" role="tab" class="aba" data-acao="lg-modo" data-v="${k}" aria-selected="${L.modo === k}">${l}</button>`).join("")}</div></div>
      </div>
      ${L.modo === "lista" ? `<div class="campo"><span class="rotulo">Mostrar</span><div class="chips">${[["todas", "Todas"], ...FUNIL.map(([k, l]) => [k, l]), ["fez_demo", "Fizeram demonstração"], ["retorno", "Com retorno marcado"]].map(([k, l]) => `<button type="button" class="chip" data-acao="lg-etapa" data-v="${k}" aria-pressed="${L.etapa === k}">${l}<b>${fmtN(L.fichas.filter((f) => naEtapa(f, k)).length)}</b></button>`).join("")}</div></div>` : ""}
      </section>
      ${L.modo === "quadro" ? quadroHtml() : `
        <section class="cartao lista" style="margin-top:18px"><div class="lista-cab"><b>Administradoras</b><span class="t12 fraco">o contato mais recente primeiro</span></div>
          <div class="rolagem"><div class="lg-tabela"><div class="lg-cab"><span>Administradora</span><span>Sistema</span><span>Etapa</span><span>Último contato</span><span>Ligar de novo</span></div><div id="lg-lista">${linhasFichas()}</div></div></div></section>`}
      ${L.sel || L.novo ? gaveta(painelFicha(), "lg-fechar") : ""}`;
  }

  /* ---- Início: saudação, o dia e o funil, sem excesso de informação */
  const FRASES = {
    manha: [
      "O café tá pronto e as administradoras de {cidade} também. Vamos prospectar?",
      "Dia novo, lista nova. Quem vai ser a primeira demo da semana?",
      "Toda demonstração começa com um \"alô\". Bora pro primeiro?",
      "Bom dia para quem vai encontrar a próxima administradora que fecha com a PRG.",
      "{retornos}",
      "Manhã é a melhor hora para pegar o responsável no escritório. Partiu?",
    ],
    tarde: [
      "Metade do dia feita. A próxima ligação pode ser a próxima demonstração.",
      "{retornos}",
      "Tarde boa para ligar: o pessoal já voltou do almoço. Vamos?",
      "{contatos}",
      "Cada \"não atende\" de hoje vira um retorno marcado amanhã. Segue o jogo.",
      "Uma ligação de cada vez. A próxima pode ser a que fecha.",
    ],
    noite: [
      "Dia encerrado. Bora deixar os retornos de amanhã marcados e descansar?",
      "{contatos}",
      "Hora de fechar o dia. O relatório já está prontinho para o Matheus.",
      "Amanhã tem mais administradora esperando sua ligação. Descansa!",
    ],
  };
  function fraseDoDia(periodo, ctx) {
    const lista = FRASES[periodo], hj = hojeISO();
    const dia = Math.round((isoData(hj) - isoData(hj.slice(0, 4) + "-01-01")) / 864e5);
    for (let i = 0; i < lista.length; i++) {
      let f = lista[(dia + i) % lista.length];
      if (f === "{retornos}") { if (!ctx.retornos) continue; f = `Você tem ${ctx.retornos} ${ctx.retornos === 1 ? "retorno marcado" : "retornos marcados"} para hoje. Bora fazer acontecer?`; }
      if (f === "{contatos}") { if (!ctx.contatos) continue; f = periodo === "noite" ? `Hoje foram ${ctx.contatos} ${ctx.contatos === 1 ? "contato" : "contatos"}. Amanhã tem mais.` : `Já são ${ctx.contatos} ${ctx.contatos === 1 ? "contato" : "contatos"} hoje. Mais um?`; }
      if (f.includes("{cidade}")) { if (!ctx.cidade) continue; f = f.replace("{cidade}", ctx.cidade); }
      return f;
    }
    return lista[0].replace("{cidade}", "toda parte");
  }
  function telaInicio() {
    const L = S.lg, A = S.ag, hj = hojeISO(), agora = new Date();
    const hora = +agora.toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }) % 24;
    const periodo = hora < 12 ? "manha" : hora < 18 ? "tarde" : "noite";
    const saud = { manha: "Bom dia", tarde: "Boa tarde", noite: "Boa noite" }[periodo];
    const nome = String(S.perfil?.nome || "").trim().split(/\s+/)[0] || "";
    const pronto = L.carregado && !L.dono;
    if (L.dono && L.dono !== S.user.id) { L.dono = null; L.carregado = false; }
    if (!L.carregado && !L.carregando) carregarLig();
    const m = pronto ? metricas(hj, hj) : null;
    const its = A.carregado ? itensAgenda() : [];
    const atr = its.filter((i) => i.tipo === "retorno" && i.dia < hj), hojeRet = its.filter((i) => i.tipo === "retorno" && i.dia === hj), hojeDemo = its.filter((i) => i.tipo === "demo" && i.dia === hj);
    const frase = fraseDoDia(periodo, { cidade: S.cidade || "", retornos: hojeRet.length, contatos: m?.ligacoes || 0 });
    const dataTxt = `${DIAS[isoData(hj).getUTCDay()]}, ${+hj.slice(8)} de ${MESES[+hj.slice(5, 7) - 1]}`;
    const aLigar = S.cidade && S.rows.length && pronto ? filtrados(S.rows).filter((r) => !fichaDoCnpj(r.cnpj)).length : null;
    const lista = [...atr, ...hojeRet, ...hojeDemo].sort((a, b) => (a.dia + a.hora < b.dia + b.hora ? -1 : 1)).slice(0, 4);
    const proximos = lista.length ? lista : its.filter((i) => i.dia > hj).slice(0, 3);
    const itemAg = (i) => { const a = i.tipo === "retorno" && i.dia < hj; return `<button type="button" class="in-ag ${a ? "in-ag-atr" : i.tipo === "demo" ? "in-ag-demo" : ""}" data-acao="ag-abrir" data-id="${i.f.id}"><b class="num">${a || i.dia !== hj ? ddmm(i.dia) : i.hora}</b><span class="pilha" style="gap:0;min-width:0"><b class="t13 corta1">${esc(i.f.nome)}</b><span class="t12 fraco corta1">${i.tipo === "demo" ? `Demonstração ${i.f.demo_formato === "presencial" ? "presencial" : "virtual"}` : esc(i.f.retorno_nota || "Ligar de novo")}</span></span></button>`; };
    // ligações por hora (8h às 19h)
    const horas = []; for (let h = 8; h <= 19; h++) horas.push([h, 0]);
    if (m) for (const r of m.lig) { const hh = +localSP(r.criado_em).slice(11, 13); const x = horas.find((y) => y[0] === hh); if (x && localSP(r.criado_em).slice(0, 10) === hj) x[1]++; }
    const maxH = Math.max(1, ...horas.map((x) => x[1])), horaAgora = hora;
    const minhas = pronto ? L.fichas.filter((f) => f.usuario_id === S.user.id) : [];
    const porEtapa = FUNIL.map(([k, l]) => [k, l, minhas.filter((f) => (f.funil || "mapeamento") === k).length]);
    const maxE = Math.max(1, ...porEtapa.map((x) => x[2]));
    const corE = { mapeamento: "#9AAAC6", indisponivel: "#9AAAC6", contato: "#2C63DB", follow_semestral: "#FDB601", sem_interesse: "#E3B4AE", demonstracao: "#5B2A86", contrato: "#1E7A46" };
    const Ac = pronto ? acumulado(hj) : null;
    const ind = (v, l, cls) => `<span class="in-num ${cls}"><b class="num">${v}</b><span>${l}</span></span>`;
    return `<section class="in-hero"><div class="in-grade" aria-hidden="true"></div><div class="in-aro" aria-hidden="true"></div><div class="in-aro2" aria-hidden="true"></div>
      <div class="in-hero-dentro">
        <div class="pilha in-ola"><span class="in-data">${esc(dataTxt)}</span><h1>${saud}${nome ? `, ${esc(nome)}` : ""}.</h1><p>${esc(frase)}</p></div>
        <div class="pilha in-cta">
          ${S.cidade ? `<button type="button" class="in-btn" data-acao="in-continuar">Continuar em ${esc(S.cidade)}/${esc(S.uf)} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
            <span class="in-cta-sub">${aLigar != null ? `${fmtN(aLigar)} ${aLigar === 1 ? "empresa ainda não contatada" : "empresas ainda não contatadas"}` : "abre a próxima empresa da lista"}</span>
            <button type="button" class="in-btn2" data-acao="ir" data-view="mapeamento">Escolher outra cidade</button>`
          : `<button type="button" class="in-btn" data-acao="ir" data-view="mapeamento">Começar a prospectar <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`}
        </div>
      </div></section>
    <div class="in-cartoes">
      <section class="in-cartao"><div class="in-cab"><h2>Sua agenda de hoje</h2><button type="button" class="in-link" data-acao="ir" data-view="agenda">Ver agenda →</button></div>
        <div class="in-nums">${ind(hojeRet.length, hojeRet.length === 1 ? "retorno" : "retornos", "in-azul")}${ind(atr.length, atr.length === 1 ? "atrasado" : "atrasados", "in-verm")}${ind(hojeDemo.length, hojeDemo.length === 1 ? "demo" : "demos", "in-roxo")}</div>
        ${proximos.length ? `${lista.length ? "" : '<span class="t12 fraco">Nada para hoje. Os próximos:</span>'}<div class="pilha" style="gap:8px">${proximos.map(itemAg).join("")}</div>` : '<span class="t13 fraco">Nenhum retorno marcado. Quando marcar "Ligar de novo" numa ficha, ele aparece aqui.</span>'}
      </section>
      <section class="in-cartao"><div class="in-cab"><h2>Seu dia até agora</h2><button type="button" class="in-link" data-acao="lg-rel-dia">Relatório do dia →</button></div>
        ${m ? `<div class="in-grande"><b class="num">${fmtN(m.ligacoes)}</b><span>${m.ligacoes === 1 ? "contato" : "contatos"}${m.pessoas ? ` com ${fmtN(m.pessoas)} ${m.pessoas === 1 ? "administradora" : "administradoras"}` : " hoje"}</span></div>
        <div class="in-mini">${[["Contatos novos", m.primeira_ligacao], ["Follow-ups", m.follow_up], ["Sem contato", m.sem_contato], ["Demos agendadas", m.demo_agendada]].map(([l, v]) => `<span><span class="fraco">${l}</span><b class="num">${fmtN(v)}</b></span>`).join("")}</div>
        <div class="pilha" style="gap:6px"><span class="t12 fraco">Contatos por hora</span><div class="in-barras" aria-hidden="true">${horas.map(([h, v]) => `<i style="height:${v ? Math.max(10, Math.round((v / maxH) * 100)) : 6}%" class="${h === horaAgora ? "agora" : v ? "tem" : ""}" title="${h}h: ${v}"></i>`).join("")}</div><span class="in-eixo"><span>8h</span><span>12h</span><span>16h</span><span>19h</span></span></div>`
        : '<span class="t13 fraco">Carregando…</span>'}
      </section>
      <section class="in-cartao"><div class="in-cab"><h2>Suas administradoras</h2><button type="button" class="in-link" data-acao="ir" data-view="adms">Ver quadro →</button></div>
        ${pronto ? `<div class="pilha" style="gap:9px">${porEtapa.map(([k, l, v]) => `<span class="in-etapa"><span class="fraco">${l}</span><span class="in-trilho"><i style="width:${v ? Math.max(3, Math.round((v / maxE) * 100)) : 0}%;background:${corE[k]}"></i></span><b class="num">${fmtN(v)}</b></span>`).join("")}</div>
        <div class="in-acum"><b>${fmtN(Ac.demos.length)} ${Ac.demos.length === 1 ? "demonstração" : "demonstrações"}</b> e <b>${fmtN(Ac.contratos.length)} ${Ac.contratos.length === 1 ? "contrato" : "contratos"}</b> no acumulado. ${periodo === "noite" ? "Amanhã tem mais." : "Falta pouco para a próxima."}</div>` : '<span class="t13 fraco">Carregando…</span>'}
      </section>
    </div>`;
  }

  /* ---- quadro: uma coluna por etapa */
  const ICONE_TEL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
  const ICONE_RELOGIO = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const ATIVAS = new Set(["mapeamento", "indisponivel", "contato", "demonstracao"]);
  function cartaoQuadro(f) {
    const u = ultimaDe(f), hj = hojeISO();
    const dias = u ? Math.max(0, Math.round((isoData(hj) - isoData(u.data)) / 864e5)) : null;
    const atr = f.retorno_em && diaDe(f.retorno_em) < hj;
    const demo = f.funil === "demonstracao" && f.demo_em && f.etapa === "demo_agendada" ? localSP(f.demo_em) : "";
    let sinal = "";
    if (f.retorno_em) sinal = `<span class="qd-ic ${atr ? "qd-ic-atr" : "qd-ic-ok"}" title="${atr ? "Retorno atrasado" : "Retorno marcado"}">${ICONE_TEL}</span>`;
    else if (ATIVAS.has(f.funil || "mapeamento") && !demo && f.etapa !== "demo_realizada") sinal = `<span class="qd-ic qd-ic-nada" title="Sem próximo passo marcado">!</span>`;
    const proximo = demo ? `<span class="qd-prox qd-prox-demo">Demo ${ddmm(demo.slice(0, 10))} · ${demo.slice(11, 16)}</span>`
      : f.retorno_em ? `<span class="qd-prox ${atr ? "qd-prox-atr" : ""}">${atr ? "Atrasado · " : ""}${esc(quandoTxt(f.retorno_em))}</span>` : "";
    return `<button type="button" class="qd-card ${atr ? "qd-atr" : ""}" data-acao="lg-sel" data-id="${f.id}" ${souDono() ? 'draggable="true" data-qd="1"' : ""} aria-pressed="${S.lg.sel === f.id}">
      <span class="qd-topo"><span class="qd-nome">${esc(f.nome)}</span>${sinal}</span>
      <span class="t12 fraco">${esc([f.cidade, f.uf].filter(Boolean).join(" - ") || "Cidade não informada")}${f.sistema ? ` · ${esc(f.sistema)}` : ""}${S.lg.dono === "todos" ? ` · ${esc(nomePessoa(f.usuario_id))}` : ""}</span>
      <span class="qd-pe">${proximo || "<span></span>"}<span class="qd-dias" title="${u ? `Último contato em ${ddmmaaaa(u.data)}` : "Nenhum contato ainda"}">${u ? `${ICONE_RELOGIO}${dias}d` : "novo"}</span></span>
    </button>`;
  }
  function quadroHtml() {
    const L = S.lg, lista = fichasFiltradasQuadro(), por = new Map(FUNIL.map(([k]) => [k, []]));
    for (const f of lista) (por.get(f.funil) || por.get("mapeamento")).push(f);
    return `<div class="quadro" role="list">${FUNIL.map(([k, l, sub]) => { const cs = por.get(k);
      return `<section class="qd-col" data-funil="${k}" role="listitem" aria-label="${l}"><div class="qd-cab"><span class="qd-titulo">${l}</span><span class="qd-cont num">${fmtN(cs.length)}</span>${sub ? `<span class="t11 fraco qd-sub">${sub}</span>` : ""}</div>
        <div class="qd-cards">${cs.slice(0, L.porColuna[k] || 60).map(cartaoQuadro).join("") || '<span class="t12 fraco qd-vazio">Nenhuma aqui</span>'}${cs.length > (L.porColuna[k] || 60) ? `<button type="button" class="mini" data-acao="qd-mais" data-v="${k}">Mostrar mais ${fmtN(cs.length - (L.porColuna[k] || 60))}</button>` : ""}</div></section>`; }).join("")}</div>`;
  }
  function fichasFiltradasQuadro() {
    const L = S.lg, palavras = norm(L.busca).split(/\s+/).filter(Boolean);
    const lista = palavras.length ? L.fichas.filter((f) => { const t = L.idx.get(f.id) || ""; return palavras.every((p) => t.includes(p)); }) : [...L.fichas];
    // atrasados primeiro, depois quem tem retorno mais perto, depois o contato mais antigo
    const chave = (f) => (f.retorno_em ? (diaDe(f.retorno_em) < hojeISO() ? "0" : "1") + localSP(f.retorno_em) : "2" + (ultimaDe(f)?.data || "0000"));
    return lista.sort((a, b) => (chave(a) < chave(b) ? -1 : 1));
  }
  async function moverFunil(id, para) {
    const L = S.lg, f = L.fichaPorId.get(id); if (!f || f.funil === para || f.usuario_id !== S.user.id) return;
    const mud = { funil: para };
    let aviso = `${f.nome} foi para ${FUNIL_NOME[para]}.`;
    if (para === "follow_semestral" && (!f.retorno_em || diaDe(f.retorno_em) <= hojeISO())) {
      const d = isoData(hojeISO()); d.setUTCMonth(d.getUTCMonth() + 6); let dia = d.toISOString().slice(0, 10);
      while ([0, 6].includes(isoData(dia).getUTCDay())) dia = somaDias(dia, 1);
      mud.retorno_em = tsSP(dia, "09:00"); mud.retorno_nota = f.retorno_nota || "Follow-up semestral";
      aviso += ` Retorno marcado para ${ddmmaaaa(dia)}.`;
    }
    if (para === "contrato" && f.etapa !== "contrato") aviso += " Para contar nos relatórios, registre \"Contrato fechado\" na ficha.";
    if (para === "demonstracao" && !["demo_agendada", "demo_realizada", "contrato"].includes(f.etapa)) aviso += " Para contar nos relatórios, registre a demo na ficha.";
    const antes = { ...f }; Object.assign(f, mud); render();
    const { error } = await sb.from("fichas").update(mud).eq("id", id);
    if (error) { console.error(error); Object.assign(f, antes); toast("Não foi possível mover. Tente de novo."); render(); return; }
    toast(aviso); carregarAgenda();
  }

  function campoFicha(k, label, f, ro) {
    const v = f?.[k] ?? "", dis = ro ? "disabled" : "";
    if (k === "uf") return `<div class="campo"><label for="fx-uf">${label}</label><select id="fx-uf" name="uf" class="input" ${dis}><option value=""></option>${UFS.map(([u]) => `<option ${v === u ? "selected" : ""}>${u}</option>`).join("")}</select></div>`;
    if (k === "sistema") return `<div class="campo"><label for="fx-sistema">${label}</label><input id="fx-sistema" name="sistema" class="input" list="lg-sistemas" value="${esc(v)}" ${dis}></div>`;
    const tipo = k.startsWith("qtd_") ? 'type="number" min="0"' : k === "email" ? 'type="email"' : "";
    return `<div class="campo ${["nome", "telefones", "melhor_horario"].includes(k) ? "campo-largo" : ""}"><label for="fx-${k}">${label}</label><input id="fx-${k}" name="${k}" class="input" ${tipo} value="${esc(v)}" ${k === "nome" ? "required maxlength=\"200\"" : ""} ${dis}></div>`;
  }
  function camposDados(f, ro) {
    return `<div class="lg-form">
      ${CAMPOS.map(([k, l]) => campoFicha(k, l, f, ro)).join("")}
      <div class="campo campo-largo"><label for="fx-observacoes">Informações adicionais</label><textarea id="fx-observacoes" name="observacoes" class="input lg-texto" rows="2" maxlength="4000" placeholder="O que vale para a administradora toda (ex.: 2 unidades, uma em Maringá e outra em Cascavel)" ${ro ? "disabled" : ""}>${esc(f?.observacoes || "")}</textarea></div>
      <details class="lg-dados campo-largo"><summary>Demonstração e contrato</summary><div class="lg-form">
        <div class="campo"><label for="fx-demo">Demonstração (data e hora)</label><input id="fx-demo" name="demo_em" type="datetime-local" class="input" value="${esc(localSP(f?.demo_em))}" ${ro ? "disabled" : ""}></div>
        <div class="campo"><label for="fx-formato">Formato da demonstração</label><select id="fx-formato" name="demo_formato" class="input" ${ro ? "disabled" : ""}><option value="virtual">Virtual</option><option value="presencial" ${f?.demo_formato === "presencial" ? "selected" : ""}>Presencial</option></select></div>
        <div class="campo"><label for="fx-contrato">Contrato fechado em</label><input id="fx-contrato" name="contrato_em" type="date" class="input" value="${esc(f?.contrato_em || "")}" ${ro ? "disabled" : ""}></div>
        <label class="lg-check campo-largo"><input type="checkbox" name="contato_anterior" ${f?.contato_anterior ? "checked" : ""} ${ro ? "disabled" : ""}> <span>Já tinha contato com esta administradora antes do sistema <span class="fraco">(todos os contatos contam como follow-up)</span></span></label>
      </div></details>
      <datalist id="lg-sistemas">${SOFTWARES.map((s) => `<option value="${esc(s)}">`).join("")}<option value="Sem sistema"></datalist>
    </div>`;
  }
  function formLigacao(f, op = {}) {
    const L = S.lg, hj = hojeISO(), existe = !!f?.id;
    const ret = f?.retorno_em ? localSP(f.retorno_em) : "", retDia = ret.slice(0, 10), vence = ret && retDia <= hj;
    const proxima = !existe ? "Primeiro contato: vai contar como <b>contato novo</b>." : jaLigou(f) ? "Este contato vai contar como <b>follow-up</b>." : "Primeiro contato: vai contar como <b>contato novo</b>.";
    return `<form class="pilha lg-lig" style="gap:14px" data-acao="lg-salvar" autocomplete="off" novalidate ${existe ? `data-ficha="${f.id}"` : ""} ${op.cnpj ? `data-origem="mapa" data-cnpj="${esc(op.cnpj)}"` : ""}>
      <input type="hidden" name="retorno_orig" value="${esc(ret)}">
      <details class="lg-bloco lg-bloco-dados" ${L.dadosAberto ? "open" : ""}><summary><b>Dados da administradora</b><span class="t12 fraco">preencha durante a ligação</span></summary>${camposDados(f, false)}</details>
      <div class="caixa-cinza"><b>Registrar contato</b>
        <div class="linha-flex" style="align-items:flex-end;gap:12px">
          <div class="campo" style="min-width:150px"><label for="rg-data">Dia</label><input id="rg-data" name="data" type="date" class="input" value="${hj}" max="${hj}"></div>
          <div class="campo" style="min-width:0"><span class="rotulo">Contato feito por</span><div class="chips">${Object.entries(CANAL).map(([k, l], i) => `<label class="chip-radio"><input type="radio" name="canal" value="${k}" ${i === 0 ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
        </div>
        <span class="rotulo">O que aconteceu <span class="fraco" style="font-weight:500">· pode marcar mais de um</span></span>
        <div class="chips">${BOTOES.map(([k, l]) => `<label class="chip-radio chip-check"><input type="checkbox" name="res" value="${k}"><span>${l}</span></label>`).join("")}</div>
        <span class="rotulo">Enviei a apresentação por</span>
        <div class="linha-flex" style="gap:8px">${Object.entries(ENVIO).map(([k, l]) => `<label class="chip-radio chip-check"><input type="checkbox" name="envio" value="${k}"><span>${k === "email" ? "E-mail" : l}</span></label>`).join("")}
          <span class="linha-flex" style="gap:6px;margin-left:auto"><button type="button" class="mini mini-ok" data-acao="lg-abrir-wpp">Abrir WhatsApp</button><button type="button" class="mini" data-acao="lg-abrir-email">Abrir e-mail</button></span></div>
        <span class="t12 fraco">O número e o e-mail ficam nos campos <b>WhatsApp</b> e <b>E-mail para contato</b> da ficha.</span>
        <div id="rg-demo" class="linha-flex" hidden><div class="campo"><label for="rg-demo-em">Dia e hora da demonstração</label><input id="rg-demo-em" name="rg_demo_em" type="datetime-local" class="input"></div><div class="campo"><label for="rg-formato">Formato</label><select id="rg-formato" name="rg_formato" class="input"><option value="virtual">Virtual</option><option value="presencial">Presencial</option></select></div></div>
        <div class="campo"><label for="rg-texto">Anotação</label><textarea id="rg-texto" name="texto" class="input lg-texto" rows="4" placeholder="Com quem falou, o que disse, próximo passo…"></textarea></div>
        <span class="t12 fraco">${proxima}</span>
      </div>
      <div class="caixa-cinza"><b>Ligar de novo</b>
        <div class="chips">${[[1, "Amanhã"], [2, "Em 2 dias"], [5, "Em 1 semana"], [10, "Em 2 semanas"]].map(([n, l]) => `<button type="button" class="mini" data-acao="lg-ret" data-d="${n}">${l}</button>`).join("")}<button type="button" class="mini" data-acao="lg-ret" data-d="0">Sem retorno</button></div>
        <div class="linha-flex" style="align-items:flex-end;gap:12px">
          <div class="campo" style="min-width:150px"><label for="rt-data">Dia</label><input id="rt-data" name="retorno_data" type="date" class="input" value="${esc(retDia)}" min="${vence ? retDia : hj}"></div>
          <div class="campo" style="min-width:110px"><label for="rt-hora">Hora</label><input id="rt-hora" name="retorno_hora" type="time" class="input" value="${esc(ret.slice(11, 16))}"></div>
          <div class="campo" style="flex:1 1 200px"><label for="rt-nota">Lembrete</label><input id="rt-nota" name="retorno_nota" class="input" maxlength="300" value="${esc(f?.retorno_nota || "")}" placeholder="Ex.: falar com a Isabeli"></div>
        </div>
        <span class="t12 fraco">${vence ? `Este retorno é de ${retDia === hj ? "hoje" : ddmm(retDia)}: ao salvar o contato ele sai da agenda. Para marcar outro, mude o dia.` : "Sem hora, o aviso chega às 9h. O retorno aparece na Agenda e você recebe um aviso no horário."}</span>
      </div>
      ${op.cnpj ? `<label class="lg-check"><input type="checkbox" name="proxima" ${L.proxima !== false ? "checked" : ""}> <span>Depois de salvar, abrir a próxima da lista</span></label>` : ""}
      <div class="linha-flex"><button type="submit" name="modo" value="ligacao" class="btn btn-primario">${existe ? "Salvar contato" : op.cnpj ? "Salvar contato" : "Criar e salvar contato"}</button><button type="submit" name="modo" value="dados" class="btn btn-sec">${existe ? "Salvar só os dados" : op.cnpj ? "Só guardar a ficha" : "Só criar a ficha"}</button></div>
    </form>`;
  }
  function painelFicha() {
    const L = S.lg;
    if (L.novo) return `<aside class="cartao painel painel-lg" aria-label="Nova administradora"><button type="button" class="mini fechar-painel" data-acao="lg-fechar">Fechar ✕</button><div class="pilha"><h2>Nova administradora</h2><span class="t13 fraco">Preencha o que souber. Se já estiver ligando, registre o contato no mesmo lugar.</span></div>${formLigacao(null)}</aside>`;
    const f = L.sel && L.fichaPorId.get(L.sel);
    if (!f) return `<aside class="cartao painel painel-lg" data-vazio="true"><div class="painel-vazio"><span class="painel-vazio-icone">${ICONE.busca}</span><b>Nenhuma administradora aberta</b><span class="fraco t13">Clique numa administradora da lista para ver a ficha, o histórico e registrar um contato.</span></div></aside>`;
    const ro = f.usuario_id !== S.user.id;
    const regs = [...(L.porFicha.get(f.id) || [])].reverse();
    const el = FUNIL_NOME[f.funil] || "Mapeamento", ec = FUNIL_COR[f.funil] || "s-neutro";
    const tels = String(f.telefones || "").split(/[|,/]| e /).map((t) => t.trim()).filter((t) => t.replace(/\D/g, "").length >= 10);
    const wpp = String(f.whatsapp || "").replace(/\D/g, "");
    const links = (wpp.length >= 10 ? `<a class="mini mini-ok" target="_blank" rel="noopener" href="https://wa.me/55${wpp.slice(-11)}">WhatsApp ${esc(f.whatsapp)}</a>` : "") + tels.slice(0, 3).map((t) => { const n = t.replace(/\D/g, ""); return `<a class="mini" href="tel:+55${n}">Ligar ${esc(t.replace(/\s*(wpp|whats.*|google)\s*$/i, ""))}</a>${/^\d{2}9/.test(n) ? `<a class="mini mini-ok" target="_blank" rel="noopener" href="https://wa.me/55${n}">WhatsApp</a>` : ""}`; }).join("");
    return `<aside class="cartao painel painel-lg" aria-label="Ficha da administradora">
      <button type="button" class="mini fechar-painel" data-acao="lg-fechar">Fechar ✕</button>
      <div class="pilha"><span class="t11 fraco" style="font-weight:700;text-transform:uppercase;letter-spacing:.05em">Ficha da administradora${ro ? ` · ${esc(nomePessoa(f.usuario_id))}` : ""}</span>
        <h2>${esc(f.nome)}</h2><span class="t13 fraco">${esc([f.cidade, f.uf].filter(Boolean).join(" - "))}${f.horario_funcionamento ? ` · ${esc(f.horario_funcionamento)}` : ""}</span>
        <span class="linha-flex" style="gap:6px">${ro ? `<span class="selo ${ec}">${el}</span>` : ""}${f.sistema ? `<span class="selo s-sis">${esc(f.sistema)}</span>` : ""}${f.demo_em ? `<span class="selo s-roxo">Demo ${esc(new Date(f.demo_em).toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }))}</span>` : ""}${f.retorno_em ? celulaRetorno(f) : ""}</span>
        ${f.retorno_nota && f.retorno_em ? `<span class="t13">Lembrete: ${esc(f.retorno_nota)}</span>` : ""}
        ${ro ? "" : `<div class="campo" style="max-width:260px;margin-top:4px"><label for="fx-funil">Etapa</label><select id="fx-funil" class="input sel-funil" data-id="${f.id}">${FUNIL.map(([k, l]) => `<option value="${k}" ${f.funil === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>`}
        ${links ? `<span class="linha-flex" style="gap:6px;margin-top:4px">${links}</span>` : ""}
      </div>
      ${ro ? `<details class="lg-bloco" open><summary><b>Dados da administradora</b></summary>${camposDados(f, true)}</details>` : formLigacao(f)}
      <div class="pilha" style="gap:8px"><span style="font-size:12px;font-weight:700">Histórico · ${regs.length} ${regs.length === 1 ? "registro" : "registros"}</span>
        ${regs.length ? regs.map((r) => { const h = horaReg(r); return `<div class="lg-reg"><div class="linha-flex" style="justify-content:space-between"><span class="linha-flex" style="gap:6px"><b class="num t13">${ddmmaaaa(r.data)}${h ? ` <span class="fraco" style="font-weight:500">${h}</span>` : ""}</b><span class="selo ${RES[r.tipo]?.c || "s-neutro"}">${esc(rotuloReg(r))}</span>${LIGACAO.has(r.tipo) ? `<span class="selo ${r.nova ? "s-novo" : "s-neutro"}">${r.nova ? "Contato novo" : "Follow-up"}</span>` : ""}</span>${ro ? "" : `<button type="button" class="mini lg-x" data-acao="lg-apagar-reg" data-id="${r.id}">${L.apagar === r.id ? "Confirmar" : "Apagar"}</button>`}</div>${r.texto ? `<span class="t13 lg-txt">${esc(r.texto)}</span>` : ""}</div>`; }).join("") : '<span class="t13 fraco">Nenhum contato registrado ainda.</span>'}
      </div>
      ${ro ? "" : `<div class="acoes-painel"><button type="button" class="btn btn-perigo" data-acao="lg-apagar-ficha" data-id="${f.id}">${L.apagar === f.id ? "Clique de novo para apagar" : "Apagar ficha"}</button></div>`}
    </aside>`;
  }

  const igual = (k, a, b) => (k.endsWith("_em") && k !== "contrato_em" ? localSP(a) === localSP(b) : (a ?? null) === (b ?? null));
  async function salvarTudo(form, modo) {
    const L = S.lg, fd = new FormData(form), mapa = form.dataset.origem === "mapa";
    const f = form.dataset.ficha ? L.fichaPorId.get(form.dataset.ficha) : mapa ? null : L.novo ? null : L.fichaPorId.get(L.sel);
    const d = {};
    for (const [k] of CAMPOS) { const v = String(fd.get(k) ?? "").trim(); d[k] = k.startsWith("qtd_") ? (v === "" ? null : Math.max(0, parseInt(v, 10) || 0)) : (v || null); }
    if (d.cnpj) d.cnpj = d.cnpj.replace(/\D/g, "") || null;
    d.observacoes = String(fd.get("observacoes") || "").trim() || null;
    const demo = String(fd.get("demo_em") || ""); d.demo_em = demo ? demo + ":00-03:00" : null;
    d.demo_formato = fd.get("demo_formato") || "virtual"; d.contrato_em = fd.get("contrato_em") || null; d.contato_anterior = fd.get("contato_anterior") === "on";
    const rd = String(fd.get("retorno_data") || ""), rh = String(fd.get("retorno_hora") || "");
    d.retorno_em = rd ? tsSP(rd, rh) : null;
    d.retorno_nota = rd ? (String(fd.get("retorno_nota") || "").trim() || null) : null;
    if (!d.nome) { toast("Informe o nome da administradora."); L.dadosAberto = true; form.querySelector(".lg-bloco").open = true; $("#fx-nome")?.focus(); return; }

    const marcados = modo === "ligacao" ? fd.getAll("res").map(String) : [];
    const envio = modo === "ligacao" ? fd.getAll("envio").map(String) : [];
    // só marcou o envio da apresentação: conta como conversa
    if (envio.length && !marcados.length) marcados.push("conversou");
    const escolhidos = BOTOES.filter((b) => marcados.includes(b[0]));
    const res = escolhidos.length ? [...escolhidos].sort((a, b) => PRIORIDADE.indexOf(a[2]) - PRIORIDADE.indexOf(b[2]))[0] : null;
    const data = String(fd.get("data") || "") || hojeISO(), texto = String(fd.get("texto") || "").trim() || null;
    if (modo === "ligacao") {
      if (!res) { toast("Escolha o que aconteceu no contato."); form.querySelector('[name="res"]')?.focus(); return; }
      if (escolhidos.length === 1 && res[0] === "anotacao" && !texto) { toast("Escreva a anotação."); $("#rg-texto")?.focus(); return; }
      if (marcados.includes("pediu_retorno") && !rd) { toast("Marque o dia de ligar de novo."); $("#rt-data")?.focus(); return; }
      // o contato de hoje cumpre o retorno que vencia hoje (ou antes), a não ser que ela tenha marcado outro
      const orig = String(fd.get("retorno_orig") || "");
      if (orig && rd && localSP(d.retorno_em) === orig && orig.slice(0, 10) <= hojeISO()) { d.retorno_em = null; d.retorno_nota = null; }
      if (escolhidos.some((b) => b[2] === "demo_agendada") && fd.get("rg_demo_em")) { d.demo_em = fd.get("rg_demo_em") + ":00-03:00"; d.demo_formato = fd.get("rg_formato") || "virtual"; }
      if (escolhidos.some((b) => b[2] === "demo_realizada") && !d.demo_em) d.demo_em = data + "T12:00:00-03:00";
    }
    if (d.retorno_em && modo === "dados" && diaDe(d.retorno_em) < hojeISO() && !(f && igual("retorno_em", f.retorno_em, d.retorno_em))) { toast("O dia de ligar de novo já passou. Escolha hoje ou outro dia."); $("#rt-data")?.focus(); return; }
    if (!f) {
      const dup = L.fichas.find((x) => x.usuario_id === S.user.id && ((d.cnpj && x.cnpj === d.cnpj) || norm(x.nome) === norm(d.nome)));
      if (dup) { toast("Essa administradora já tem ficha. Abri a ficha dela."); if (mapa) { abrirFicha(dup.id); return; } L.novo = false; L.sel = dup.id; render(); return; }
    }
    form.querySelectorAll("button[type=submit]").forEach((b) => (b.disabled = true));
    try {
      let id = f?.id;
      if (!f) {
        const { data: nf, error } = await sb.from("fichas").insert({ ...d, usuario_id: S.user.id }).select().single(); if (error) throw error;
        L.fichas.push(nf); id = nf.id;
      } else {
        const mudou = {}; for (const k of Object.keys(d)) if (!igual(k, f[k], d[k])) mudou[k] = d[k];
        if (Object.keys(mudou).length) { const { error } = await sb.from("fichas").update(mudou).eq("id", id); if (error) throw error; }
      }
      let novo = null;
      if (res) {
        const { data: r, error } = await sb.from("registros").insert({ ficha_id: id, usuario_id: S.user.id, data, tipo: res[2], detalhe: escolhidos.length === 1 ? res[3] : null, detalhes: escolhidos.map((b) => b[0]), envio: envio.length ? envio : null, canal: fd.get("canal") || "ligacao", texto }).select().single(); if (error) throw error;
        L.regs.push(r); novo = r;
      }
      const { data: nf } = await sb.from("fichas").select("*").eq("id", id).single();
      if (nf) L.fichas[L.fichas.findIndex((x) => x.id === nf.id)] = nf;
      if (!mapa) { L.novo = false; L.sel = id; }
      derivar(); form.dataset.sujo = "";
      const salvo = novo && L.regs.find((x) => x.id === novo.id);
      toast(salvo ? (LIGACAO.has(salvo.tipo) ? `Salvo como ${salvo.nova ? "contato novo" : "follow-up"}${nf?.retorno_em ? ` · ligar de novo ${quandoTxt(nf.retorno_em).toLowerCase()}` : ""}.` : "Registro salvo.") : f ? "Dados salvos." : "Ficha criada.");
      carregarAgenda();
      if (mapa) {
        L.proxima = fd.get("proxima") === "on";
        const prox = L.proxima && modo === "ligacao" ? proximaEmpresa(form.dataset.cnpj) : null;
        if (prox) { await selecionar(prox); document.querySelector(".painel")?.scrollTo(0, 0); return; }
      }
      render();
    } catch (e) {
      console.error(e); toast("Não foi possível salvar. Tente de novo.");
      form.querySelectorAll("button[type=submit]").forEach((b) => (b.disabled = false));
    }
  }
  const fichaDoCnpj = (cnpj) => S.lg.fichas.find((x) => x.usuario_id === S.user.id && x.cnpj === cnpj);
  const contatadaHoje = (cnpj) => { const f = fichaDoCnpj(cnpj); return !!f && (S.lg.porFicha.get(f.id) || []).some((r) => r.data === hojeISO()); };
  function proximaEmpresa(cnpj) {
    const lista = filtrados(S.rows), i = lista.findIndex((r) => r.cnpj === cnpj);
    for (let j = i + 1; j < lista.length; j++) if (!contatadaHoje(lista[j].cnpj)) return lista[j].cnpj;
    return null;
  }
  // No Mapeamento: a ficha abre ao lado da empresa e o contato entra direto nas ligações do dia
  function blocoLigacaoMapa(r) {
    const L = S.lg;
    if (L.dono && L.dono !== S.user.id) { L.dono = null; L.carregado = false; }
    if (!L.carregado) { if (!L.carregando) carregarLig(); return `<div class="caixa-cinza"><span class="t13 fraco">Abrindo a ficha…</span></div>`; }
    const f = fichaDoCnpj(r.cnpj), soc = S.socios.get(r.cnpj_basico) || [];
    const base = f || { nome: nomeEmp(r), telefones: [r.telefone1, r.telefone2].filter(Boolean).join(" / ") || null, email: r.email || null, cidade: r.municipio ? titulo(r.municipio) : null, uf: r.uf || null, sistema: sistemaDe(r).nome || null, cnpj: r.cnpj };
    const regs = f ? [...(L.porFicha.get(f.id) || [])].reverse() : [];
    const resumo = f ? `<div class="caixa-cinza"><div class="linha-flex" style="justify-content:space-between"><b class="t13">Já está nas suas administradoras</b><button type="button" class="mini" data-acao="lg-abrir" data-id="${f.id}">Ver ficha completa</button></div>
        <span class="linha-flex" style="gap:6px"><span class="selo ${FUNIL_COR[f.funil] || "s-neutro"}">${FUNIL_NOME[f.funil] || "Mapeamento"}</span>${f.retorno_em ? celulaRetorno(f) : ""}</span>
        ${regs.slice(0, 3).map((x) => `<span class="t12"><b class="num">${ddmm(x.data)}</b> · ${esc(rotuloReg(x))}${x.texto ? ` · <span class="fraco">${esc(x.texto.length > 110 ? x.texto.slice(0, 110) + "…" : x.texto)}</span>` : ""}</span>`).join("")}${regs.length > 3 ? `<span class="t12 fraco">e mais ${regs.length - 3} no histórico</span>` : ""}</div>`
      : soc.length ? `<span class="t12 fraco">Sócio${soc.length > 1 ? "s" : ""} na Receita: <b>${esc(soc.slice(0, 3).map((x) => titulo(x.nome)).join(", "))}</b></span>` : "";
    return `<div class="pilha" style="gap:12px">${resumo}${formLigacao(base, { cnpj: r.cnpj })}</div>`;
  }
  async function abrirFicha(id) {
    const L = S.lg;
    if (L.dono && L.dono !== S.user.id) { L.dono = null; L.carregado = false; }
    S.view = "adms"; S.sel = null; S.selRow = null; L.sel = id; L.novo = false; L.busca = ""; L.etapa = "todas";
    if (!L.carregado) await carregarLig(); else render();
    window.scrollTo(0, 0);
  }
  async function abrirFichaDaEmpresa(r) {
    const L = S.lg;
    if (L.dono && L.dono !== S.user.id) { L.dono = null; L.carregado = false; }
    if (!L.carregado) await carregarLig();
    let f = L.fichas.find((x) => x.usuario_id === S.user.id && x.cnpj === r.cnpj);
    if (!f) {
      const s = sistemaDe(r);
      const { data, error } = await sb.from("fichas").insert({ usuario_id: S.user.id, cnpj: r.cnpj, nome: nomeEmp(r), telefones: [r.telefone1, r.telefone2].filter(Boolean).join(" / ") || null, email: r.email || null, cidade: r.municipio ? titulo(r.municipio) : null, uf: r.uf || null, sistema: s.nome || null }).select().single();
      if (error) { console.error(error); toast("Não deu para criar a ficha. Tente de novo."); return; }
      L.fichas.push(data); derivar(); f = data; carregarAgenda();
    }
    S.view = "adms"; S.sel = null; S.selRow = null; L.sel = f.id; L.novo = false; L.busca = ""; L.etapa = "todas"; L.dadosAberto = true; render(); window.scrollTo(0, 0);
  }

  /* ---- Agenda: retornos marcados e demonstrações agendadas, com aviso na hora */
  S.ag = { fichas: [], carregado: false, cnpjs: new Set(), modo: "mes", ref: hojeISO(), dia: hojeISO(), arrastando: null };
  async function carregarAgenda() {
    if (!S.user || !S.perfil?.aprovado) return;
    const { data, error } = await sb.from("fichas").select("id,nome,cidade,uf,cnpj,telefones,responsavel,etapa,retorno_em,retorno_nota,demo_em,demo_formato").eq("usuario_id", S.user.id).limit(20000);
    if (error) { console.error(error); return; }
    S.ag.fichas = data || []; S.ag.carregado = true; S.ag.cnpjs = new Set(S.ag.fichas.map((f) => f.cnpj).filter(Boolean));
    if (S.view === "agenda") render(); else atualizarContador();
    verificarAvisos();
  }
  function itensAgenda() {
    const out = [];
    for (const f of S.ag.fichas) {
      if (f.retorno_em) { const l = localSP(f.retorno_em); out.push({ tipo: "retorno", f, ts: f.retorno_em, dia: l.slice(0, 10), hora: l.slice(11, 16) }); }
      if (f.demo_em && f.etapa === "demo_agendada") { const l = localSP(f.demo_em); out.push({ tipo: "demo", f, ts: f.demo_em, dia: l.slice(0, 10), hora: l.slice(11, 16) }); }
    }
    return out.sort((a, b) => (a.dia + a.hora < b.dia + b.hora ? -1 : 1));
  }
  const pendentesAgenda = () => itensAgenda().filter((i) => i.tipo === "retorno" && i.dia <= hojeISO()).length;
  function atualizarContador() {
    const el = $("#nav-agenda"); if (!el) return;
    const n = pendentesAgenda(); el.innerHTML = n ? `Agenda <span class="contador">${n}</span>` : "Agenda";
  }
  function itemLista(i) {
    const atr = i.tipo === "retorno" && i.dia < hojeISO();
    return `<button type="button" class="ag-linha ${i.tipo === "demo" ? "ag-demo" : atr ? "ag-atr" : ""}" data-acao="ag-abrir" data-id="${i.f.id}">
      <span class="ag-hora num">${atr ? ddmm(i.dia) : i.hora}</span>
      <span class="pilha" style="gap:1px;min-width:0"><b class="t13">${esc(i.f.nome)}</b><span class="t12 fraco">${i.tipo === "demo" ? `Demonstração ${i.f.demo_formato === "presencial" ? "presencial" : "virtual"}` : esc(i.f.retorno_nota || "Ligar de novo")}${i.f.cidade ? ` · ${esc(i.f.cidade)}` : ""}</span></span>
      <span class="selo ${i.tipo === "demo" ? "s-roxo" : atr ? "s-errado" : "s-ident"}">${i.tipo === "demo" ? "Demo" : atr ? "Atrasado" : "Retorno"}</span>
    </button>`;
  }
  function itemCal(i) {
    const atr = i.tipo === "retorno" && i.dia < hojeISO();
    return `<button type="button" class="ag-it ${i.tipo === "demo" ? "ag-it-demo" : atr ? "ag-it-atr" : ""}" data-acao="ag-abrir" data-id="${i.f.id}" ${i.tipo === "retorno" ? 'draggable="true" data-arrastar="1"' : ""} title="${esc(`${i.hora} · ${i.f.nome}${i.tipo === "demo" ? " (demonstração)" : i.f.retorno_nota ? " · " + i.f.retorno_nota : ""}`)}"><span class="num">${i.hora}</span> ${esc(i.f.nome)}</button>`;
  }
  function telaAgenda() {
    const A = S.ag, hj = hojeISO();
    const st = avisosStatus();
    const botaoAviso = st === "granted" ? `<span class="selo s-conf" style="align-self:center">Avisos ligados neste aparelho</span>`
      : st === "denied" ? `<span class="t12 fraco" style="max-width:300px">Os avisos estão bloqueados neste navegador. Libere em Configurações do site → Notificações.</span>`
      : st === "sem" ? "" : `<button type="button" class="btn btn-sec" data-acao="av-ativar">${ICONE.sino.replace('width="20" height="20"', 'width="18" height="18"')} Ativar avisos na hora</button>`;
    const cab = `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Agenda</h1><p class="fraco" style="margin:0">Os retornos que você marcou e as demonstrações agendadas. Clique para abrir a ficha. No computador, arraste um retorno para outro dia para remarcar.</p></div><div class="linha-flex">${botaoAviso}</div></div>`;
    if (!A.carregado) { carregarAgenda(); return cab + `<div class="cartao vazio">Carregando a agenda…</div>`; }
    const itens = itensAgenda(), porDia = new Map();
    for (const i of itens) { if (!porDia.has(i.dia)) porDia.set(i.dia, []); porDia.get(i.dia).push(i); }
    const atrasados = itens.filter((i) => i.tipo === "retorno" && i.dia < hj);
    const doDia = porDia.get(A.dia) || [];
    const nomeDia = A.dia === hj ? "Hoje" : A.dia === somaDias(hj, 1) ? "Amanhã" : DIAS[isoData(A.dia).getUTCDay()];
    const proximos = itens.filter((i) => i.dia > A.dia).slice(0, 6);
    const lista = `<section class="cartao ag-lado pad pilha" style="gap:14px">
      ${atrasados.length ? `<div class="pilha" style="gap:8px"><b class="t13" style="color:var(--vermelho)">Atrasados · ${atrasados.length}</b><span class="t12 fraco">Retornos que passaram do dia sem contato registrado.</span>${atrasados.map(itemLista).join("")}</div>` : ""}
      <div class="pilha" style="gap:8px"><b class="t13">${nomeDia}, ${ddmm(A.dia)} · ${doDia.length} ${doDia.length === 1 ? "compromisso" : "compromissos"}</b>${doDia.length ? doDia.map(itemLista).join("") : `<span class="t13 fraco">Nada marcado ${A.dia === hj ? "para hoje" : "neste dia"}.</span>`}</div>
      ${proximos.length ? `<div class="pilha" style="gap:8px"><b class="t13">Depois</b>${proximos.map((i) => itemLista(i).replace('class="ag-hora num">' + i.hora, `class="ag-hora num">${ddmm(i.dia)}<br>${i.hora}`)).join("")}</div>` : ""}
    </section>`;
    let corpo;
    if (A.modo === "mes") {
      const ini = A.ref.slice(0, 8) + "01", fimM = (() => { const d = isoData(ini); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d.toISOString().slice(0, 10); })();
      const dias = []; for (let d = segundaDe(ini); d <= somaDias(segundaDe(fimM), 6); d = somaDias(d, 1)) dias.push(d);
      corpo = `<div class="ag-grade">${["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => `<span class="ag-sem">${d}</span>`).join("")}${dias.map((d) => { const its = porDia.get(d) || [];
        return `<div class="ag-dia ${d.slice(0, 7) !== ini.slice(0, 7) ? "ag-fora" : ""} ${d === hj ? "ag-hoje" : ""} ${d === A.dia ? "ag-sel" : ""}" data-dia="${d}"><button type="button" class="ag-num num" data-acao="ag-dia" data-dia="${d}" aria-label="${ddmm(d)}: ${its.length} compromissos">${+d.slice(8)}</button>${its.slice(0, 3).map(itemCal).join("")}${its.length > 3 ? `<button type="button" class="ag-mais" data-acao="ag-dia" data-dia="${d}">+${its.length - 3} mais</button>` : ""}</div>`; }).join("")}</div>`;
    } else {
      const ini = segundaDe(A.ref), dias = [0, 1, 2, 3, 4, 5, 6].map((n) => somaDias(ini, n));
      corpo = `<div class="ag-semana">${dias.map((d) => { const its = porDia.get(d) || [];
        return `<div class="ag-dia ag-col ${d === hj ? "ag-hoje" : ""} ${d === A.dia ? "ag-sel" : ""}" data-dia="${d}"><button type="button" class="ag-num" data-acao="ag-dia" data-dia="${d}"><span class="t12 fraco">${DIAS[isoData(d).getUTCDay()].slice(0, 3)}</span> <b class="num">${ddmm(d)}</b></button>${its.map(itemCal).join("") || '<span class="t12 fraco" style="padding:4px 2px">—</span>'}</div>`; }).join("")}</div>`;
    }
    const mesNome = MESES[+A.ref.slice(5, 7) - 1], titulo = A.modo === "mes" ? `${mesNome[0].toUpperCase() + mesNome.slice(1)} de ${A.ref.slice(0, 4)}` : `${ddmm(segundaDe(A.ref))} a ${ddmm(somaDias(segundaDe(A.ref), 6))}`;
    const cal = `<section class="cartao ag-cal pad pilha" style="gap:12px">
      <div class="linha-flex" style="justify-content:space-between">
        <div class="abas" role="tablist">${[["mes", "Mês"], ["semana", "Semana"]].map(([k, l]) => `<button type="button" role="tab" class="aba" data-acao="ag-modo" data-v="${k}" aria-selected="${A.modo === k}">${l}</button>`).join("")}</div>
        <div class="linha-flex"><button type="button" class="mini" data-acao="ag-nav" data-v="-1" aria-label="Anterior">←</button><b style="min-width:170px;text-align:center">${titulo}</b><button type="button" class="mini" data-acao="ag-nav" data-v="1" aria-label="Próximo">→</button><button type="button" class="mini" data-acao="ag-hoje">Hoje</button></div>
      </div>${corpo}
      <span class="linha-flex t12 fraco" style="gap:14px"><span><i class="ag-leg"></i>Retorno</span><span><i class="ag-leg ag-leg-demo"></i>Demonstração</span><span><i class="ag-leg ag-leg-atr"></i>Atrasado</span></span>
    </section>`;
    return cab + `<div class="ag-duas">${lista}${cal}</div>`;
  }
  async function remarcar(id, dia) {
    const f = S.ag.fichas.find((x) => x.id === id); if (!f?.retorno_em) return;
    const hora = localSP(f.retorno_em).slice(11, 16);
    if (diaDe(f.retorno_em) === dia) return;
    if (dia < hojeISO()) { toast("Esse dia já passou. Escolha hoje ou outro dia."); return; }
    const novo = tsSP(dia, hora);
    const { data, error } = await sb.from("fichas").update({ retorno_em: novo }).eq("id", id).select("retorno_em").single();
    if (error) { console.error(error); toast("Não foi possível remarcar. Tente de novo."); return; }
    f.retorno_em = data.retorno_em;
    const lf = S.lg.fichas.find((x) => x.id === id); if (lf) lf.retorno_em = data.retorno_em;
    S.ag.dia = dia; toast(`Retorno remarcado para ${ddmm(dia)} às ${hora}.`); render();
  }
  function faixaAgenda() {
    if (!S.ag.carregado || S.view === "agenda") return "";
    const hj = hojeISO(), its = itensAgenda().filter((i) => i.dia <= hj);
    if (!its.length) return "";
    let fechada; try { fechada = localStorage.getItem("mapa-faixa-agenda") === hj; } catch { fechada = false; }
    if (fechada) return "";
    const ret = its.filter((i) => i.tipo === "retorno"), atr = ret.filter((i) => i.dia < hj).length, demos = its.filter((i) => i.tipo === "demo" && i.dia === hj).length;
    const partes = [];
    if (ret.length - atr) partes.push(`${ret.length - atr} ${ret.length - atr === 1 ? "retorno" : "retornos"} para hoje`);
    if (atr) partes.push(`${atr} ${atr === 1 ? "atrasado" : "atrasados"}`);
    if (demos) partes.push(`${demos} ${demos === 1 ? "demonstração" : "demonstrações"} hoje`);
    if (!partes.length) return "";
    const prox = ret.filter((i) => i.dia === hj).find((i) => i.ts && new Date(i.ts) > new Date());
    return `<section class="faixa-novas faixa-agenda" aria-label="Agenda de hoje"><div class="linha-flex" style="gap:12px;flex-wrap:nowrap"><div class="sino">${ICONE.sino}</div><div class="pilha" style="gap:2px"><strong>Você tem ${partes.join(", ").replace(/, ([^,]*)$/, " e $1")}.</strong>${prox ? `<span class="t12" style="color:#5B4A12">Próximo: ${prox.hora} · ${esc(prox.f.nome)}${prox.f.retorno_nota ? ` (${esc(prox.f.retorno_nota)})` : ""}</span>` : ""}</div></div><div class="linha-flex"><button type="button" class="btn btn-escuro" data-acao="ir" data-view="agenda">Ver agenda</button><button type="button" class="mini" data-acao="av-faixa-fechar">Fechar</button></div></section>`;
  }

  // Avisos no horário: notificação do navegador (computador ou celular), 5 minutos antes
  let swReg = null;
  const avisosStatus = () => (!("Notification" in window) ? "sem" : Notification.permission);
  async function registrarSw() { if (!("serviceWorker" in navigator) || swReg) return; try { swReg = await navigator.serviceWorker.register("sw.js"); } catch (e) { console.warn("sem service worker", e); } }
  async function ativarAvisos() {
    if (avisosStatus() === "sem") { toast("Este navegador não mostra avisos."); return; }
    const p = await Notification.requestPermission();
    if (p === "granted") { await registrarSw(); toast("Avisos ligados. Você recebe um aviso 5 minutos antes de cada retorno."); }
    else toast("Os avisos não foram liberados.");
    render();
  }
  function avisar(f, tipo, ts) {
    const h = localSP(ts).slice(11, 16);
    const tit = tipo === "retorno" ? `${h} · Ligar para ${f.nome}` : `${h} · Demonstração com ${f.nome}`;
    const corpo = [tipo === "retorno" && f.retorno_nota ? f.retorno_nota : "", f.responsavel ? `Responsável: ${f.responsavel}` : "", f.telefones || ""].filter(Boolean).join("\n");
    toast(tit);
    if (avisosStatus() !== "granted") return;
    const op = { body: corpo, icon: "icone-512.png", badge: "favicon-32.png", tag: `${f.id}-${tipo}`, data: { id: f.id } };
    try {
      if (swReg) swReg.showNotification(tit, op);
      else { const n = new Notification(tit, op); n.onclick = () => { window.focus(); abrirFicha(f.id); n.close(); }; }
    } catch (e) { console.warn(e); }
  }
  function verificarAvisos() {
    if (!S.user || !S.ag.carregado) return;
    let ja; try { ja = JSON.parse(localStorage.getItem("mapa-avisos") || "{}") || {}; } catch { ja = {}; }
    const agora = Date.now(); let mudou = false;
    for (const f of S.ag.fichas) for (const [ts, tipo] of [[f.retorno_em, "retorno"], [f.etapa === "demo_agendada" ? f.demo_em : null, "demo"]]) {
      if (!ts) continue;
      const t = new Date(ts).getTime(), k = `${f.id}|${tipo}|${t}`;
      if (ja[k] || agora < t - 5 * 60e3 || agora > t + 30 * 60e3) continue;
      ja[k] = agora; mudou = true; avisar(f, tipo, ts);
    }
    for (const k of Object.keys(ja)) if (agora - ja[k] > 3 * 864e5) { delete ja[k]; mudou = true; }
    if (mudou) try { localStorage.setItem("mapa-avisos", JSON.stringify(ja)); } catch { /* sem armazenamento */ }
    atualizarContador();
  }
  setInterval(verificarAvisos, 30e3);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.user && S.perfil?.aprovado) carregarAgenda(); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", (e) => { if (e.data?.abrir && S.user) abrirFicha(e.data.abrir); });

  /* ---- Relatórios: dia, semana e mês */
  function periodoDe(p, ref) {
    if (p === "dia") return { ini: ref, fim: ref, rotulo: ddmmaaaa(ref), sub: DIAS[isoData(ref).getUTCDay()], nome: "Relatório Diário", curto: "do Dia" };
    if (p === "semana") { const ini = segundaDe(ref); return { ini, fim: somaDias(ini, 6), rotulo: `${ddmm(ini)} – ${ddmm(somaDias(ini, 4))}`, sub: "", nome: "Relatório Semanal", curto: "da Semana" }; }
    const ini = ref.slice(0, 8) + "01", d = isoData(ini); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0);
    const mes = MESES[+ini.slice(5, 7) - 1];
    return { ini, fim: d.toISOString().slice(0, 10), rotulo: `${mes[0].toUpperCase() + mes.slice(1)} de ${ini.slice(0, 4)}`, sub: "", nome: "Relatório Mensal", curto: "do Mês" };
  }
  const relDe = (p, ini) => S.lg.rels.find((r) => r.usuario_id === donoAtual() && r.periodo === p && r.inicio === ini);
  function horaDe(r, f) {
    const m = (r.texto || "").match(/às (\d{1,2}[:h]\d{2})/); if (m) return m[1].replace("h", ":");
    if (f.demo_em && localSP(f.demo_em).slice(0, 10) === r.data) return localSP(f.demo_em).slice(11, 16);
    return "";
  }
  function cartaoDemo(f, linha, extra = "") {
    const qtd = f.qtd_condominios != null ? `${fmtN(f.qtd_condominios)} condomínios${f.qtd_unidades ? ` | ${fmtN(f.qtd_unidades)} unidades` : ""}` : "—";
    return `<div class="rel-card"><b class="rel-card-nome">${esc(f.nome)}</b><b class="t12">${linha}</b>
      <span>Sistema usado: ${esc(f.sistema || "—")}</span><span>Quantos condomínios atende: ${esc(qtd)}</span><span>Nome do responsável: ${esc(f.responsavel || "—")}</span><span>Cidade: ${esc([f.cidade, f.uf].filter(Boolean).join(" - ") || "—")}</span>${extra}</div>`;
  }
  function barrasSvg(itens) {
    const max = Math.max(1, ...itens.map((i) => i[1])), W = 520, H = 250, bw = 74, gap = (W - 40 - bw * itens.length) / (itens.length - 1 || 1);
    return `<svg viewBox="0 0 ${W} ${H + 46}" class="rel-grafico" role="img" aria-label="Acumulado">${itens.map(([l, v], i) => { const h = Math.max(2, Math.round((v / max) * (H - 30))), x = 20 + i * (bw + gap), y = H - h;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${i < 2 ? "#16306F" : "#2C63DB"}"/><text x="${x + bw / 2}" y="${y - 8}" text-anchor="middle" font-size="16" font-weight="700" fill="#0A1847">${fmtN(v)}</text><text x="${x + bw / 2}" y="${H + 20}" text-anchor="middle" font-size="12" fill="#5B6475">${esc(l)}</text>`; }).join("")}<line x1="10" x2="${W - 10}" y1="${H}" y2="${H}" stroke="#CBD3E1"/></svg>`;
  }
  function telaRelatorios() {
    const L = S.lg, R = S.rl;
    const ctrl = `<div class="cabeca rel-controles"><div class="pilha" style="gap:4px"><h1>Relatórios</h1><p class="fraco" style="margin:0">Montados sozinhos com as ligações registradas. Escreva as observações e baixe em PDF para mandar.</p></div>
      <div class="linha-flex" style="align-items:flex-end">${seletorPessoa("rl-dono")}</div></div>`;
    if (!L.carregado) { if (!L.carregando) carregarLig(); return ctrl + `<div class="cartao vazio">Carregando…</div>`; }
    const P = periodoDe(R.periodo, R.ref), m = metricas(P.ini, P.fim), rel = relDe(R.periodo, P.ini), aj = rel?.ajustes || {}, edita = souDono();
    const val = (k) => (aj[k] ?? m[k]);
    const ajustado = Object.keys(aj).length > 0;
    const barra = `<section class="cartao filtros rel-controles"><div class="linha-filtros" style="align-items:center;justify-content:space-between">
      <div class="abas" role="tablist">${[["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]].map(([k, l]) => `<button type="button" role="tab" class="aba" data-acao="rl-periodo" data-v="${k}" aria-selected="${R.periodo === k}">${l}</button>`).join("")}</div>
      <div class="linha-flex"><button type="button" class="mini" data-acao="rl-ant" aria-label="Período anterior">←</button><b class="num" style="min-width:150px;text-align:center">${P.rotulo}</b><button type="button" class="mini" data-acao="rl-prox" aria-label="Próximo período">→</button><button type="button" class="mini" data-acao="rl-hoje">Hoje</button></div>
      <button type="button" class="btn btn-primario" data-acao="rl-pdf">Baixar PDF</button></div></section>`;

    const quem = donoAtual() === "todos" ? "Equipe comercial" : nomePessoa(donoAtual());
    const capa = `<section class="rel-pg rel-capa"><span class="rel-sobre">${P.nome}</span><span class="rel-grande">${P.rotulo}</span>${P.sub ? `<span class="rel-sub">${P.sub[0].toUpperCase() + P.sub.slice(1)}</span>` : ""}
      <p class="fraco">Resumo das atividades de prospecção, follow-ups e oportunidades em andamento no período.</p><span class="t13"><b>${esc(quem || "")}</b> · PRG Software · Grupo WorkOffice</span></section>`;

    const obs = (rel?.observacoes || []).filter((o) => o.titulo || o.texto);
    let obsHtml;
    if (R.editObs && edita) {
      const lista = [0, 1, 2].map((i) => obs[i] || { titulo: "", texto: "" });
      obsHtml = `<form data-acao="rl-obs" class="pilha" style="gap:12px">${lista.map((o, i) => `<div class="rel-obs-ed"><input class="input" name="t${i}" value="${esc(o.titulo)}" placeholder="Título (ex.: Prospecção e agendamento)" maxlength="80"><textarea class="input lg-texto" name="x${i}" rows="4" placeholder="O que foi feito, foco, próximos passos…">${esc(o.texto)}</textarea></div>`).join("")}
        <div class="linha-flex"><button type="submit" class="btn btn-primario">Salvar observações</button><button type="button" class="btn btn-sec" data-acao="rl-obs-cancelar">Cancelar</button></div></form>`;
    } else obsHtml = obs.length ? `<div class="rel-obs">${obs.map((o) => `<div class="rel-obs-card"><b>${esc(o.titulo)}</b><span>${esc(o.texto)}</span></div>`).join("")}</div>`
      : `<div class="vazio rel-tela" style="padding:20px">Nenhuma observação escrita para este período.</div>`;
    const secObs = `<section class="rel-pg ${obs.length || R.editObs ? "" : "rel-sem-print"}"><div class="linha-flex" style="justify-content:space-between"><h2 class="rel-h">Observações ${P.curto}</h2>${edita && !R.editObs && donoAtual() !== "todos" ? `<button type="button" class="mini rel-tela" data-acao="rl-obs-editar">${obs.length ? "Editar" : "Escrever observações"}</button>` : ""}</div>${obsHtml}</section>`;

    const nums = [["follow_up", "Follow-ups"], ["primeira_ligacao", "Novas administradoras contatadas"], ["demo_realizada", "Demonstrações realizadas"], ["demo_agendada", "Demonstrações agendadas"], ["sem_contato", "Sem contato"], ["negativa", "Negativas"]];
    const numsHtml = R.editAj && edita ? `<form data-acao="rl-aj" class="pilha" style="gap:12px"><span class="t13 fraco">Use só se algum número precisar de correção (por exemplo, ligações que não foram registradas). Deixe em branco para o sistema contar sozinho.</span>
        <div class="form-grade">${nums.map(([k, l]) => `<div class="campo"><label for="aj-${k}">${l} <span class="fraco">(contou ${m[k]})</span></label><input id="aj-${k}" name="${k}" type="number" min="0" class="input" value="${aj[k] ?? ""}"></div>`).join("")}</div>
        <div class="linha-flex"><button type="submit" class="btn btn-primario">Salvar números</button><button type="button" class="btn btn-sec" data-acao="rl-aj-cancelar">Cancelar</button></div></form>`
      : `<div class="rel-nums">${nums.map(([k, l]) => `<div><span class="rel-num">${fmtN(val(k))}</span><span class="rel-num-l">${l}</span></div>`).join("")}</div>`;
    const secNums = `<section class="rel-pg"><div class="linha-flex" style="justify-content:space-between"><h2 class="rel-h">Resultados ${P.curto}</h2>${edita && !R.editAj && donoAtual() !== "todos" ? `<button type="button" class="mini rel-tela" data-acao="rl-aj-editar">${ajustado ? "Corrigir números" : "Corrigir números à mão"}</button>` : ""}</div>
      <p class="rel-lead">${(() => { const n = ajustado ? (+val("follow_up") + +val("primeira_ligacao")) : m.ligacoes; return `<b>${fmtN(n)}</b> ${n === 1 ? "contato" : "contatos"}`; })()}${ajustado ? "" : ` com <b>${fmtN(m.pessoas)}</b> ${m.pessoas === 1 ? "administradora" : "administradoras diferentes"}`}${ajustado ? ' <span class="selo s-nao rel-tela">números corrigidos à mão</span>' : ""}</p>${numsHtml}
      ${R.periodo !== "dia" && m.ligacoes ? graficoPorDia(P, m) : ""}</section>`;

    const listaLig = (rs) => rs.length ? `<table class="tab-simples rel-tab"><thead><tr>${R.periodo === "dia" ? "" : "<th>Dia</th>"}<th>Administradora</th><th>Cidade</th><th>Ligação</th><th>Resultado</th><th>Anotação</th>${donoAtual() === "todos" ? "<th>Quem</th>" : ""}</tr></thead><tbody>${rs.map((r) => { const f = L.fichaPorId.get(r.ficha_id) || {}; return `<tr>${R.periodo === "dia" ? "" : `<td class="num">${ddmm(r.data)}</td>`}<td><b>${esc(f.nome || "")}</b></td><td>${esc([f.cidade, f.uf].filter(Boolean).join(" - "))}</td><td>${LIGACAO.has(r.tipo) ? (r.nova ? "Contato novo" : "Follow-up") : "—"}</td><td><span class="selo ${RES[r.tipo]?.c}">${esc(rotuloReg(r))}</span></td><td class="rel-anot">${esc(r.texto || "")}</td>${donoAtual() === "todos" ? `<td>${esc(nomePessoa(r.usuario_id))}</td>` : ""}</tr>`; }).join("")}</tbody></table>` : `<div class="vazio" style="padding:20px">Nenhuma ligação registrada ${R.periodo === "dia" ? "neste dia" : "neste período"}.</div>`;
    const ordenados = [...m.rs].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.criado_em < b.criado_em ? -1 : 1));
    const secLista = R.periodo === "dia" ? `<section class="rel-pg"><h2 class="rel-h">Ligações do dia</h2><div class="rolagem">${listaLig(ordenados)}</div></section>`
      : `<section class="rel-pg rel-sem-print"><details class="rel-tela"><summary><b>Ver todos os registros ${P.curto} (${m.rs.length})</b></summary><div class="rolagem" style="margin-top:10px">${listaLig(ordenados)}</div></details></section>`;

    const ag = m.rs.filter((r) => r.tipo === "demo_agendada"), re = m.rs.filter((r) => r.tipo === "demo_realizada");
    const cardsAg = ag.map((r) => { const f = L.fichaPorId.get(r.ficha_id); if (!f) return ""; const dt = f.demo_em ? localSP(f.demo_em) : ""; return cartaoDemo(f, dt ? `Demonstração ${f.demo_formato === "presencial" ? "presencial" : "virtual"} agendada: ${extenso(dt.slice(0, 10), dt.slice(11, 16))}` : `Demonstração agendada em ${ddmm(r.data)} (data da demo não informada)`); }).join("");
    const cardsRe = re.map((r) => { const f = L.fichaPorId.get(r.ficha_id); return f ? cartaoDemo(f, `Demonstração ${f.demo_formato === "presencial" ? "presencial" : "virtual"} realizada: ${extenso(r.data, horaDe(r, f))}`) : ""; }).join("");
    const secDestaque = `<section class="rel-pg"><span class="selo s-ident" style="align-self:flex-start">${R.periodo === "dia" ? "DIA" : R.periodo === "semana" ? "SEMANA" : "MÊS"} EM DESTAQUE</span>
      <h2 class="rel-h">Demonstrações agendadas</h2>${cardsAg ? `<div class="rel-cards">${cardsAg}</div>` : '<p class="fraco">Nenhuma demonstração agendada no período.</p>'}
      <h2 class="rel-h" style="margin-top:18px">Demonstrações realizadas</h2>${cardsRe ? `<div class="rel-cards">${cardsRe}</div>` : '<p class="fraco">Nenhuma demonstração realizada no período.</p>'}</section>`;

    let resto = "";
    if (R.periodo !== "dia") {
      const A = acumulado(P.fim);
      const ufs = [...new Set(L.fichas.filter((f) => f.uf && (L.porFicha.get(f.id) || []).some((r) => r.data <= P.fim)).map((f) => f.uf))].sort();
      const sis = {}; A.demos.forEach((f) => { if (f.sistema && !/sem sistema/i.test(f.sistema)) sis[f.sistema] = (sis[f.sistema] || 0) + 1; });
      const top = Object.entries(sis).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
      const listaUf = ufs.length > 1 ? ufs.slice(0, -1).join(", ") + " e " + ufs[ufs.length - 1] : ufs[0] || "";
      const fimTxt = R.periodo === "semana" ? somaDias(P.ini, 4) : P.fim;
      const ordDemo = (fs) => fs.map((f) => { const r = (L.porFicha.get(f.id) || []).find((x) => x.tipo === "demo_realizada" && x.data <= P.fim); return { f, r }; }).sort((a, b) => (a.r.data < b.r.data ? -1 : 1));
      resto = `<section class="rel-pg"><h2 class="rel-h">Acumulado até ${ddmm(fimTxt)}</h2><div class="rel-acum">${barrasSvg([["Tentativas", A.tentativas], ["Administradoras", A.prospectadas], ["Demonstrações", A.demos.length], ["Contratos", A.contratos.length]])}
        <div class="pilha" style="gap:12px"><b class="rel-sub2">Destaques do período</b><p style="margin:0">Com <b>${fmtN(A.tentativas)} tentativas de contato</b> e <b>${fmtN(A.prospectadas)} administradoras prospectadas</b>, o período acumulado resultou em <b>${fmtN(A.demos.length)} demonstrações realizadas</b> e <b>${fmtN(A.contratos.length)} ${A.contratos.length === 1 ? "contrato fechado" : "contratos fechados"}</b>.${listaUf ? ` Os atendimentos abrangeram administradoras em <b>${esc(listaUf)}</b>, com diferentes sistemas de gestão em uso.` : ""}</p>
        ${top.length ? `<div class="rel-info">As demonstrações contemplaram administradoras com rotinas e plataformas variadas, incluindo ${esc(top.join(", "))} e outros sistemas de administração.</div>` : ""}</div></div></section>
        <section class="rel-pg"><div class="rel-painel-cab"><h2 class="rel-h">Painel de Demonstrações Realizadas</h2><b class="t13">TOTAL: ${fmtN(A.demos.length)} ${A.demos.length === 1 ? "Demonstração" : "Demonstrações"}</b></div>
          ${A.demos.length ? `<div class="rel-cards">${ordDemo(A.demos).map(({ f, r }) => cartaoDemo(f, `Demonstração ${f.demo_formato === "presencial" ? "presencial" : "virtual"} realizada: ${extenso(r.data, horaDe(r, f))}`)).join("")}</div>` : '<p class="fraco">Nenhuma demonstração ainda.</p>'}</section>
        <section class="rel-pg"><div class="rel-painel-cab"><h2 class="rel-h">Painel de Contratos Fechados</h2><b class="t13">TOTAL: ${fmtN(A.contratos.length)} ${A.contratos.length === 1 ? "Contrato" : "Contratos"}</b></div>
          ${A.contratos.length ? `<div class="rel-cards">${A.contratos.map((f) => { const d = (L.porFicha.get(f.id) || []).find((x) => x.tipo === "demo_realizada"); return cartaoDemo(f, d ? `Demonstração ${f.demo_formato === "presencial" ? "presencial" : "virtual"} realizada: ${extenso(d.data, horaDe(d, f))}` : "", `<b class="t12">Contrato fechado dia ${ddmmaaaa(f.contrato_em || (L.porFicha.get(f.id) || []).find((x) => x.tipo === "contrato")?.data || "")}</b>`); }).join("")}</div>` : '<p class="fraco">Nenhum contrato fechado ainda.</p>'}</section>`;
    }
    return ctrl + barra + `<div class="relatorio">${capa}${secObs}${secNums}${secLista}${secDestaque}${resto}</div>`;
  }
  function graficoPorDia(P, m) {
    let pontos = [];
    if (S.rl.periodo === "semana") pontos = [0, 1, 2, 3, 4, 5, 6].map((i) => somaDias(P.ini, i)).filter((d, i) => i < 5 || m.lig.some((r) => r.data === d)).map((d) => [DIAS[isoData(d).getUTCDay()].slice(0, 3) + " " + ddmm(d), m.lig.filter((r) => r.data === d).length]);
    else { for (let d = segundaDe(P.ini); d <= P.fim; d = somaDias(d, 7)) { const a = d < P.ini ? P.ini : d, b = somaDias(d, 6) > P.fim ? P.fim : somaDias(d, 6); pontos.push([`${ddmm(a)}–${ddmm(b)}`, m.lig.filter((r) => r.data >= a && r.data <= b).length]); } }
    const max = Math.max(1, ...pontos.map((p) => p[1]));
    return `<div class="pilha" style="gap:8px;margin-top:6px"><b class="t13">Ligações por ${S.rl.periodo === "semana" ? "dia" : "semana"}</b><div class="rel-dias">${pontos.map(([l, v]) => `<div class="rel-dia"><span class="num t12"><b>${v}</b></span><span class="rel-dia-b"><i style="height:${Math.round((v / max) * 100)}%"></i></span><span class="t11 fraco">${l}</span></div>`).join("")}</div></div>`;
  }
  async function salvarRel(campos) {
    const L = S.lg, R = S.rl, P = periodoDe(R.periodo, R.ref), atual = relDe(R.periodo, P.ini);
    const linha = { usuario_id: S.user.id, periodo: R.periodo, inicio: P.ini, observacoes: atual?.observacoes || [], ajustes: atual?.ajustes || {}, ...campos, atualizado_em: new Date().toISOString() };
    const { data, error } = await sb.from("relatorios").upsert(linha).select().single();
    if (error) { console.error(error); toast("Não foi possível salvar. Tente de novo."); return false; }
    L.rels = L.rels.filter((r) => !(r.usuario_id === data.usuario_id && r.periodo === data.periodo && r.inicio === data.inicio)).concat(data);
    return true;
  }
  function baixarPdf() {
    const P = periodoDe(S.rl.periodo, S.rl.ref), antes = document.title;
    document.title = `${P.nome} - ${P.rotulo.replace(/\//g, "-")}${donoAtual() === "todos" ? " - Equipe" : ` - ${nomePessoa(donoAtual()) || ""}`}`;
    document.body.classList.add("imprimindo");
    const volta = () => { document.title = antes; document.body.classList.remove("imprimindo"); window.removeEventListener("afterprint", volta); };
    window.addEventListener("afterprint", volta);
    setTimeout(() => window.print(), 50);
  }

  app.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b || b.tagName === "FORM") return;
    const a = b.dataset.acao, L = S.lg, R = S.rl, A = S.ag;
    if (!a.startsWith("lg-") && !a.startsWith("rl-") && !a.startsWith("ag-") && !a.startsWith("av-") && !a.startsWith("qd-") && !a.startsWith("in-") && a !== "ficha-empresa") { if (!a.startsWith("lg-apagar")) L.apagar = null; return; }
    if (a !== "lg-apagar-reg" && a !== "lg-apagar-ficha") L.apagar = null;
    switch (a) {
      case "ficha-empresa": if (S.selRow) { b.disabled = true; await abrirFichaDaEmpresa(S.selRow); } break;
      case "lg-abrir": await abrirFicha(b.dataset.id); break;
      case "in-continuar": {
        S.view = "mapeamento"; render(); window.scrollTo(0, 0);
        const prox = filtrados(S.rows).find((r) => !contatadaHoje(r.cnpj) && !fichaDoCnpj(r.cnpj)) || filtrados(S.rows).find((r) => !contatadaHoje(r.cnpj));
        if (prox) await selecionar(prox.cnpj);
        break;
      }
      case "lg-abrir-wpp": {
        const n = String($("#fx-whatsapp")?.value || $("#fx-numero_responsavel")?.value || "").replace(/\D/g, "");
        if (n.length < 10) { toast("Preencha o WhatsApp na ficha."); $("#fx-whatsapp")?.focus(); break; }
        window.open(`https://wa.me/${n.length <= 11 ? "55" + n : n}`, "_blank", "noopener"); const c = b.closest("form")?.querySelector('[name="envio"][value="whatsapp"]'); if (c) { c.checked = true; c.form.dataset.sujo = "1"; } break;
      }
      case "lg-abrir-email": {
        const e = String($("#fx-email")?.value || "").trim();
        if (!e.includes("@")) { toast("Preencha o e-mail para contato na ficha."); $("#fx-email")?.focus(); break; }
        window.open(`mailto:${encodeURIComponent(e)}`, "_blank"); const c = b.closest("form")?.querySelector('[name="envio"][value="email"]'); if (c) { c.checked = true; c.form.dataset.sujo = "1"; } break;
      }
      case "lg-modo": L.modo = b.dataset.v; try { localStorage.setItem("mapa-adm-modo", L.modo); } catch { /* sem armazenamento */ } render(); break;
      case "qd-mais": L.porColuna[b.dataset.v] = (L.porColuna[b.dataset.v] || 60) + 60; render(); break;
      case "lg-sel": if (L.arrastou) { L.arrastou = false; break; } L.sel = b.dataset.id; L.novo = false; render(); if (window.innerWidth > 900) document.querySelector(".painel-lg")?.scrollIntoView({ block: "nearest" }); break;
      case "lg-fechar": L.sel = null; L.novo = false; render(); break;
      case "lg-nova": L.novo = true; L.sel = null; L.dadosAberto = true; render(); $("#fx-nome")?.focus(); break;
      case "lg-etapa": L.etapa = b.dataset.v; L.mostrar = 100; render(); break;
      case "lg-mais": L.mostrar += 100; { const l = $("#lg-lista"); if (l) l.innerHTML = linhasFichas(); } break;
      case "lg-rel-dia": S.view = "relatorios"; R.periodo = "dia"; R.ref = hojeISO(); render(); break;
      case "lg-ret": {
        const n = +b.dataset.d, d = $("#rt-data"), h = $("#rt-hora");
        if (!d) break;
        if (!n) { d.value = ""; if (h) h.value = ""; const no = $("#rt-nota"); if (no) no.value = ""; }
        else { d.value = diasUteis(n); if (h && !h.value) h.value = "09:00"; }
        break;
      }
      case "lg-apagar-reg": case "lg-apagar-ficha": {
        if (L.apagar !== b.dataset.id) { L.apagar = b.dataset.id; b.textContent = a === "lg-apagar-reg" ? "Confirmar" : "Clique de novo para apagar"; break; }
        const t = a === "lg-apagar-reg" ? "registros" : "fichas";
        const { error } = await sb.from(t).delete().eq("id", b.dataset.id);
        if (error) { toast("Não foi possível apagar."); break; }
        if (t === "fichas") { L.fichas = L.fichas.filter((f) => f.id !== b.dataset.id); L.regs = L.regs.filter((r) => r.ficha_id !== b.dataset.id); L.sel = null; carregarAgenda(); }
        else L.regs = L.regs.filter((r) => r.id !== b.dataset.id);
        L.apagar = null; derivar(); toast("Apagado."); render(); break;
      }
      case "ag-abrir": if (A.arrastou) { A.arrastou = false; break; } await abrirFicha(b.dataset.id); break;
      case "ag-dia": A.dia = b.dataset.dia; render(); break;
      case "ag-modo": A.modo = b.dataset.v; A.ref = A.dia; render(); break;
      case "ag-nav": {
        const s = +b.dataset.v;
        if (A.modo === "semana") A.ref = somaDias(segundaDe(A.ref), 7 * s);
        else { const d = isoData(A.ref.slice(0, 8) + "01"); d.setUTCMonth(d.getUTCMonth() + s); A.ref = d.toISOString().slice(0, 10); }
        render(); break;
      }
      case "ag-hoje": A.ref = A.dia = hojeISO(); render(); break;
      case "av-ativar": await ativarAvisos(); break;
      case "av-faixa-fechar": try { localStorage.setItem("mapa-faixa-agenda", hojeISO()); } catch { /* sem armazenamento */ } b.closest(".faixa-agenda")?.remove(); break;
      case "rl-periodo": R.periodo = b.dataset.v; R.editObs = R.editAj = false; render(); break;
      case "rl-ant": case "rl-prox": {
        const s = a === "rl-ant" ? -1 : 1;
        if (R.periodo === "dia") { let d = somaDias(R.ref, s); while ([0, 6].includes(isoData(d).getUTCDay()) && !L.regs.some((r) => r.data === d)) d = somaDias(d, s); R.ref = d; }
        else if (R.periodo === "semana") R.ref = somaDias(segundaDe(R.ref), 7 * s);
        else { const d = isoData(R.ref.slice(0, 8) + "01"); d.setUTCMonth(d.getUTCMonth() + s); R.ref = d.toISOString().slice(0, 10); }
        R.editObs = R.editAj = false; render(); break;
      }
      case "rl-hoje": R.ref = hojeISO(); render(); break;
      case "rl-pdf": baixarPdf(); break;
      case "rl-obs-editar": R.editObs = true; render(); break;
      case "rl-obs-cancelar": R.editObs = false; render(); break;
      case "rl-aj-editar": R.editAj = true; render(); break;
      case "rl-aj-cancelar": R.editAj = false; render(); break;
      default: break;
    }
  });
  app.addEventListener("submit", async (ev) => {
    const f = ev.target, a = f.dataset.acao;
    if (!a || !(a.startsWith("lg-") || a.startsWith("rl-"))) return;
    ev.preventDefault();
    if (a === "lg-salvar") salvarTudo(f, ev.submitter?.value === "dados" ? "dados" : "ligacao");
    if (a === "rl-obs") { const fd = new FormData(f); const obs = [0, 1, 2].map((i) => ({ titulo: String(fd.get("t" + i) || "").trim(), texto: String(fd.get("x" + i) || "").trim() })).filter((o) => o.titulo || o.texto); if (await salvarRel({ observacoes: obs })) { S.rl.editObs = false; toast("Observações salvas."); render(); } }
    if (a === "rl-aj") { const fd = new FormData(f), aj = {}; for (const [k, v] of fd) if (String(v).trim() !== "") aj[k] = Math.max(0, parseInt(v, 10) || 0); if (await salvarRel({ ajustes: aj })) { S.rl.editAj = false; toast(Object.keys(aj).length ? "Números corrigidos." : "Números voltaram a ser contados pelo sistema."); render(); } }
  });
  app.addEventListener("input", (ev) => {
    const fm = ev.target.closest?.('form[data-acao="lg-salvar"]'); if (fm) fm.dataset.sujo = "1";
    if (ev.target.id === "lg-busca") { S.lg.busca = ev.target.value; S.lg.mostrar = 100; const l = $("#lg-lista"); if (l) l.innerHTML = linhasFichas(); const q = $(".quadro"); if (q) q.outerHTML = quadroHtml(); }
  });
  app.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.classList.contains("sel-dono")) { S.lg.dono = t.value === S.user.id ? null : t.value; S.lg.carregado = false; S.lg.sel = null; S.lg.novo = false; S.rl.editObs = S.rl.editAj = false; render(); return; }
    if (t.classList.contains("sel-funil")) { moverFunil(t.dataset.id, t.value); return; }
    { const fm = t.closest?.('form[data-acao="lg-salvar"]'); if (fm) fm.dataset.sujo = "1"; }
    if (t.name === "res" && t.closest('[data-acao="lg-salvar"]')) {
      const d = $("#rg-demo"); if (d) d.hidden = !t.form.querySelector('[name="res"][value="demo_agendada"]:checked');
      if (t.checked && t.value === "pediu_retorno" && !$("#rt-data")?.value) $("#rt-data")?.focus();
    }
  });
  app.addEventListener("toggle", (ev) => { if (ev.target.classList?.contains("lg-bloco-dados")) S.lg.dadosAberto = ev.target.open; }, true);
  // arrastar um cartão para outra etapa do quadro
  app.addEventListener("dragstart", (ev) => { const c = ev.target.closest?.("[data-qd]"); if (!c) return; S.lg.arrastando = c.dataset.id; ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", c.dataset.id); c.classList.add("ag-movendo"); });
  app.addEventListener("dragover", (ev) => { const col = ev.target.closest?.(".qd-col"); if (!col || !S.lg.arrastando) return; ev.preventDefault(); app.querySelectorAll(".qd-alvo").forEach((x) => x !== col && x.classList.remove("qd-alvo")); col.classList.add("qd-alvo"); });
  app.addEventListener("drop", (ev) => { const col = ev.target.closest?.(".qd-col"); if (!col || !S.lg.arrastando) return; ev.preventDefault(); const id = S.lg.arrastando; S.lg.arrastando = null; S.lg.arrastou = true; setTimeout(() => (S.lg.arrastou = false), 300); moverFunil(id, col.dataset.funil); });
  app.addEventListener("dragend", () => { S.lg.arrastando = null; app.querySelectorAll(".qd-alvo").forEach((x) => x.classList.remove("qd-alvo")); });
  // arrastar um retorno para outro dia da agenda
  app.addEventListener("dragstart", (ev) => { const it = ev.target.closest?.("[data-arrastar]"); if (!it) return; S.ag.arrastando = it.dataset.id; ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", it.dataset.id); it.classList.add("ag-movendo"); });
  app.addEventListener("dragend", (ev) => { ev.target.classList?.remove("ag-movendo"); S.ag.arrastando = null; app.querySelectorAll(".ag-alvo").forEach((x) => x.classList.remove("ag-alvo")); });
  app.addEventListener("dragover", (ev) => { const d = ev.target.closest?.(".ag-dia"); if (!d || !S.ag.arrastando) return; ev.preventDefault(); app.querySelectorAll(".ag-alvo").forEach((x) => x !== d && x.classList.remove("ag-alvo")); d.classList.add("ag-alvo"); });
  app.addEventListener("drop", (ev) => { const d = ev.target.closest?.(".ag-dia"); if (!d || !S.ag.arrastando) return; ev.preventDefault(); const id = S.ag.arrastando; S.ag.arrastando = null; S.ag.arrastou = true; setTimeout(() => (S.ag.arrastou = false), 300); remarcar(id, d.dataset.dia); });

  /* ------------------------------------------------------------ eventos */
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || S.cidMenu) return;
    if (S.sel) { S.sel = null; S.selRow = null; render(); return; }
    if (S.view === "adms" && (S.lg.sel || S.lg.novo)) { S.lg.sel = null; S.lg.novo = false; render(); }
  });
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
    carregarAgenda(); carregarLig();
    if (avisosStatus() === "granted") registrarSw();
    const abrir = new URLSearchParams(location.search).get("abrir");
    if (abrir) { history.replaceState(null, "", location.pathname); abrirFicha(abrir); }
    await carregarMapeamento();
    localizarPendentes(S.uf);
    identificarSistemas(S.uf);
  }
  sb.auth.onAuthStateChange((evento, sessao) => {
    if (evento === "PASSWORD_RECOVERY") { S.recuperando = true; S.user = sessao?.user || null; render(); return; }
    if (evento === "SIGNED_IN" && !S.user && !S.recuperando) { iniciar(); return; }
    if (evento === "SIGNED_OUT") { S.user = null; S.perfil = null; S.pendentes = 0; S.equipe = null; S.lg = { ...S.lg, dono: null, carregado: false, fichas: [], regs: [], base: [], rels: [], pessoas: null, sel: null, novo: false }; S.ag = { ...S.ag, fichas: [], carregado: false, cnpjs: new Set() }; S.rows = []; S.sel = null; S.selRow = null; S.menu = false; render(); }
  });
  iniciar();
})();
