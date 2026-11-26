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
  const SOFTWARES = ["Superlógica", "Group Software (Condomínio21)", "Almah Condos", "CondoMob", "uCondo", "TownSq", "CondoPanel", "Condominizar", "Seu Condomínio", "Alterdata", "Ahreas", "Winker", "Webware", "Hitecnet", "SCC Online (PRG)"];
  // o nosso sistema: quem usa já é cliente (o app Omeupredio vem junto com ele)
  const NOSSO = "SCC Online (PRG)";
  // função de cada pessoa no time (o acesso continua sendo o "papel": SDR ou administrador)
  const FUNCOES = [["sdr", "SDR"], ["vendedor", "Vendedor"], ["pos_vendas", "Pós-vendas"], ["gestor", "Gestor"]];
  const rotuloFuncao = (f) => (FUNCOES.find(([k]) => k === f) || [, "SDR"])[1];
  // sistemas que o time já anotou nas ligações (não aparecem no site, mas existem)
  const OUTROS_SISTEMAS = ["ApControle", "BR Condomínios", "Datadigitos", "Icondev", "Syndkos", "Systemar", "Sem sistema"];
  // nomes diferentes para o mesmo sistema: tudo vira o nome oficial, para não contar duas vezes
  const chaveSis = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const APELIDOS = { cond21: "Group Software (Condomínio21)", condominio21: "Group Software (Condomínio21)", group: "Group Software (Condomínio21)", groupsoftware: "Group Software (Condomínio21)", groupcondominios: "Group Software (Condomínio21)", com21: "Group Software (Condomínio21)",
    almah: "Almah Condos", almahcondos: "Almah Condos", almahcondo: "Almah Condos", superlogicacondominios: "Superlógica", omeupredio: NOSSO, omeupredioplus: NOSSO, scc: NOSSO, scconline: NOSSO, prg: NOSSO, prgsoftware: NOSSO, sccprg: NOSSO,
    brcondominios: "BR Condomínios", brcondos: "BR Condomínios", alterdataimmobile: "Alterdata", immobile: "Alterdata", condominioup: "Alterdata", semsistema: "Sem sistema", nenhum: "Sem sistema" };
  function sistemasConhecidos() {
    const extra = (S.lg?.fichas || []).map((f) => f.sistema).filter(Boolean);
    const m = new Map();
    for (const n of [...SOFTWARES, ...OUTROS_SISTEMAS, ...extra]) { const k = chaveSis(n); if (k && !(APELIDOS[k] && chaveSis(APELIDOS[k]) !== k) && !m.has(k)) m.set(k, n); }
    return [...m.values()].sort((a, b) => (a === "Superlógica" ? -1 : b === "Superlógica" ? 1 : a.localeCompare(b, "pt-BR")));
  }
  // devolve sempre o nome oficial: "Cond21", "group" e "Group Software" viram o mesmo
  function nomeSistema(t) {
    const v = String(t || "").trim().replace(/\s+/g, " "); if (!v) return null;
    const k = chaveSis(v); if (APELIDOS[k]) return APELIDOS[k];
    const igual = sistemasConhecidos().find((n) => chaveSis(n) === k); if (igual) return igual;
    const comeca = sistemasConhecidos().find((n) => chaveSis(n).length >= 4 && (k.startsWith(chaveSis(n)) || chaveSis(n).startsWith(k)) && k.length >= 4);
    return comeca || v.charAt(0).toUpperCase() + v.slice(1);
  }
  const sistemaDoForm = (form) => { const sel = form.elements.sistema?.value || ""; return sel === "__outro" ? nomeSistema(form.elements.sistema_outro?.value) : sel || null; };
  const CNAES = { "6822600": "Gestão e administração da propriedade imobiliária", "6821801": "Corretagem na compra e venda de imóveis", "6821802": "Corretagem no aluguel de imóveis", "6810202": "Aluguel de imóveis próprios", "6920601": "Atividades de contabilidade", "8112500": "Condomínios prediais", "4120400": "Construção de edifícios" };
  const COR_TIPO = { "Administradora": "#2A3F72", "Imobiliária": "#B4410E", "Construtora": "#5B2A86", "Contabilidade": "#1E7A46" };
  const COLS = "cnpj,cnpj_basico,razao_social,nome_fantasia,matriz,situacao,data_inicio,cnae_principal,cnaes_secundarios,tipo,atividade_principal_condominio,uf,municipio,logradouro,numero,complemento,bairro,cep,telefone1,telefone2,whatsapp,whatsapp_em,email,porte,referencia_receita,atualizado_em,tel_status,tel_por,tel_em,email_status,qtd_socios,removido,exportada,nova,nota,lat,lon,geo_precisao,nome_condominio,site,site_situacao,sistema,sistema_prova,sistema_em,sistema_status,sistema_por,sistema_marcado,sistema_pista,sistema_pista_url";

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  // formatadores criados uma vez só: criar um Intl a cada chamada é o que deixava as listas lentas
  const NUM_BR = new Intl.NumberFormat("pt-BR");
  const fmtN = (n) => NUM_BR.format(Number(n || 0));
  const fmtData = (d) => { if (!d) return ""; if (d.length === 10) return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`; const l = localSP(d); return l ? `${l.slice(8, 10)}/${l.slice(5, 7)}/${l.slice(0, 4)}` : ""; };
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
    dv: 0,
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
    const [{ data }, pend] = await Promise.all([
      sb.from("perfis").select("nome,papel,aprovado,funcao").eq("id", S.user.id).maybeSingle(),
      sb.from("perfis").select("id", { count: "exact", head: true }).eq("aprovado", false),
    ]);
    S.perfil = data || { nome: (S.user.email || "").split("@")[0], papel: "sdr", funcao: "sdr", aprovado: false };
    S.pendentes = S.perfil.aprovado && S.perfil.papel === "admin" ? pend.count || 0 : 0;
  }
  let buscandoPessoas = null;
  function garantirPessoas() {
    if (S.perfil?.papel !== "admin" || S.lg.pessoas) return Promise.resolve();
    if (!buscandoPessoas) buscandoPessoas = sb.from("perfis").select("id,nome").eq("aprovado", true).order("nome").then(({ data }) => { S.lg.pessoas = data || []; }).finally(() => { buscandoPessoas = null; });
    return buscandoPessoas;
  }
  async function carregarSocios(basicos) {
    const falta = [...new Set(basicos)].filter((b) => !S.socios.has(b));
    await Promise.all(chunk(falta, 150).map(async (parte) => {
      const { data } = await sb.from("socios").select("cnpj_basico,nome,qualificacao").in("cnpj_basico", parte);
      parte.forEach((b) => S.socios.set(b, []));
      (data || []).forEach((s) => S.socios.get(s.cnpj_basico).push(s));
    }));
  }
  async function carregarMarcas(cnpjs) {
    await Promise.all(chunk([...new Set(cnpjs)], 150).map(async (parte) => {
      const { data } = await sb.from("marcacoes").select("cnpj,campo,status,usuario_nome,criado_em").in("cnpj", parte);
      parte.forEach((c) => S.marcas.set(c, {}));
      (data || []).forEach((m) => { S.marcas.get(m.cnpj)[m.campo] = m; });
    }));
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
    S.carregando = true; S.erro = ""; renderDados();
    try {
      let q = sb.from("mapa").select(COLS).eq("uf", S.uf).eq("removido", false).neq("referencia_receita", "exemplo").order("nota", { ascending: false }).limit(3000);
      if (S.cidadeId) q = q.eq("municipio_ibge", S.cidadeId);
      else if (S.cidade) q = q.eq("municipio", S.cidade);
      const lista = q.then((r) => { if (!r.error) { S.rows = r.data || []; S.rowsProntas = true; tentarInicio(); } return r; });
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
      const { data, error } = await lista;
      if (error) throw error;
      S.rows = data || [];
      await Promise.all([carregarSocios(S.rows.map((r) => r.cnpj_basico)), carregarMarcas(S.rows.map((r) => r.cnpj))]);
      if (S.sel && !S.rows.some((r) => r.cnpj === S.sel)) { S.sel = null; S.selRow = null; }
    } catch (e) {
      S.erro = "Não foi possível carregar as empresas. Verifique a internet e recarregue a página.";
      console.error(e);
    } finally { S.carregando = false; renderDados(); }
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
    if (s.nome === NOSSO) return `<span class="pilha" style="gap:2px;align-items:flex-start"><span class="selo s-conf">Já é cliente · SCC Online</span><span class="t11 ${s.nivel === "provavel" ? "fraco" : "origem-ok"}">${s.nivel === "provavel" ? "provável, pelo site" : "confirmado pela equipe"}</span></span>`;
    return `<span class="pilha" style="gap:2px;align-items:flex-start"><span class="selo s-sis">${esc(s.nome)}</span><span class="t11 ${s.nivel === "provavel" ? "fraco" : "origem-ok"}">${s.nivel === "provavel" ? "provável, pelo site" : s.nivel === "corrigido" ? "corrigido pela equipe" : "confirmado pela equipe"}</span></span>`;
  }

  /* ---- Como falar: números e e-mails com a origem de cada um, botão de WhatsApp e de e-mail */
  const digitos = (s) => String(s || "").replace(/\D/g, "");
  // número nacional (DDD + número), sem o 55 do Brasil
  const nacional = (s) => { let d = digitos(s); if (d.length >= 12 && d.startsWith("55")) d = d.slice(2); return d.length === 10 || d.length === 11 ? d : ""; };
  const ehCelular = (n) => n.length === 11 && n[2] === "9";
  const fmtTel = (n) => (n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : n.length === 10 ? `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}` : n);
  const ICO_WPP = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.17-1.5A9.93 9.93 0 1 0 12.04 2zm0 18.13a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.07.9.92-2.98-.2-.31a8.22 8.22 0 1 1 6.85 3.72zm4.5-6.15c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.96-.14.17-.29.19-.53.06a6.7 6.7 0 0 1-1.98-1.22 7.43 7.43 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5l.37-.43c.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.86 2.04 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.7c.58.25 1.04.4 1.4.51.58.19 1.12.16 1.54.1.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.1-.22-.17-.47-.29z"/></svg>';
  const ICO_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICO_LIGAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
  const ASSUNTO_EMAIL = "PRG · Mapa Comercial — contato";
  // o número do WhatsApp vai inteiro, com o 55 (no celular abre o app)
  const linkWpp = (n) => `https://wa.me/${digitos(n).length >= 12 ? digitos(n) : "55" + n}`;
  const botaoWpp = (n, quem, cls = "") => `<a class="bt-wpp ${cls}" href="${linkWpp(n)}" target="_blank" rel="noopener" aria-label="Abrir conversa no WhatsApp${quem ? ` com ${esc(quem)}` : ""} (abre em nova aba)">${ICO_WPP}<span>WhatsApp</span></a>`;
  const botaoEmail = (email, quem, cls = "") => `<a class="bt-email ${cls}" href="mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?subject=${encodeURIComponent(ASSUNTO_EMAIL)}" aria-label="Enviar e-mail para ${esc(quem || email)}">${ICO_MAIL}<span>E-mail</span></a>`;
  const botaoLigar = (n, quem, cls = "") => `<a class="bt-ligar ${cls}" href="tel:+55${n}" aria-label="Ligar para ${esc(quem || fmtTel(n))}">${ICO_LIGAR}<span>Ligar</span></a>`;
  // WhatsApp de uma empresa (tabela empresas): o do site; se não tiver, o celular do CNPJ. Fixo não conta.
  function wppEmpresa(e) {
    if (!e) return null;
    const site = digitos(e.whatsapp);
    if (site.length >= 12) return { n: site, origem: "site", rotulo: "WhatsApp do site" };
    for (const t of [e.telefone1, e.telefone2]) { const n = nacional(t); if (ehCelular(n)) return { n, origem: "cnpj", rotulo: "celular do CNPJ" }; }
    return null;
  }
  function canaisDaFicha(f, emp, contatos) {
    const tels = new Map(), mails = new Map();
    const cnpjNums = new Set([emp?.telefone1, emp?.telefone2].map(nacional).filter(Boolean));
    const add = (num, origem, extra = {}) => {
      const d = digitos(num), n = d.length >= 12 && !d.startsWith("55") ? "" : nacional(num); if (!n) return;
      const k = n.slice(-10), a = tels.get(k);
      if (a) { if (extra.wpp) a.wpp = true; if (extra.quem && !a.quem) a.quem = extra.quem; return; }
      tels.set(k, { n, origem: origem === "ficha" && cnpjNums.has(n) ? "cnpj" : origem, wpp: !!extra.wpp || ehCelular(n), quem: extra.quem || "", cargo: extra.cargo || "", desde: extra.desde || "" });
    };
    const site = digitos(emp?.whatsapp);
    if (site.length >= 12) add(site, "site", { wpp: true, desde: emp.whatsapp_em });
    for (const c of contatos || []) {
      for (const t of [c.whatsapp, c.celular, c.telefone]) add(t, "contato", { quem: c.nome, cargo: c.cargo, wpp: t === c.whatsapp && !!t });
      if (c.email) mails.set(c.email.toLowerCase(), { email: c.email, origem: "contato", quem: c.nome, cargo: c.cargo });
    }
    if (f?.whatsapp) add(f.whatsapp, "ficha", { wpp: true });
    for (const t of String(f?.telefones || "").split(/\s*[|/,;]\s*|\s+e\s+/)) add(t, "ficha");
    if (f?.numero_responsavel) add(f.numero_responsavel, "resp", { quem: f.responsavel || "" });
    for (const t of [emp?.telefone1, emp?.telefone2]) add(t, "cnpj");
    const fe = (f?.email || "").trim(), ee = (emp?.email || "").trim();
    if (fe && !mails.has(fe.toLowerCase())) mails.set(fe.toLowerCase(), { email: fe, origem: ee && fe.toLowerCase() === ee.toLowerCase() ? "cnpj" : "ficha" });
    if (ee && !mails.has(ee.toLowerCase())) mails.set(ee.toLowerCase(), { email: ee, origem: "cnpj" });
    const ordem = { site: 0, contato: 1, ficha: 2, resp: 2, cnpj: 3 };
    return { cnpjNums, tels: [...tels.values()].sort((a, b) => ordem[a.origem] - ordem[b.origem] || b.wpp - a.wpp), mails: [...mails.values()].sort((a, b) => ordem[a.origem] - ordem[b.origem]) };
  }
  function blocoCanais(f, emp, contatos, carregando) {
    const { tels, mails } = canaisDaFicha(f, emp, contatos);
    const tag = (o, mail) => `<span class="ct-tag">${o === "site" ? "site" : o === "contato" ? "contato" : o === "cnpj" ? "CNPJ" : o === "resp" ? "responsável" : "ficha"}</span>`;
    const vazio = '<span class="ct-slot" aria-hidden="true"></span>';
    const quem = (x) => (x.quem ? `<span class="ct-quem">${esc(x.quem)}${x.cargo ? ` · ${esc(x.cargo)}` : ""}</span>` : "");
    // cada linha: valor e etiqueta à esquerda; dois lugares fixos de botão à direita (WhatsApp | Ligar ou E-mail)
    const linhaTel = (t) => `<li class="ct-linha"><span class="ct-valor"><b class="num">${esc(fmtTel(t.n))}</b>${t.origem === "cnpj" ? "" : tag(t.origem)}${quem(t)}</span>
      <span class="ct-acoes">${t.wpp ? botaoWpp(t.n, t.quem || f.nome, "ct-bt") : vazio}${botaoLigar(t.n, t.quem || f.nome, "ct-bt")}</span></li>`;
    const linhaMail = (m) => `<li class="ct-linha"><span class="ct-valor"><b class="ct-mail">${esc(m.email)}</b>${m.origem === "cnpj" ? "" : tag(m.origem, true)}${quem(m)}</span>
      <span class="ct-acoes">${botaoEmail(m.email, m.quem || f.nome, "ct-bt")}</span></li>`;
    const ehCnpj = (x) => x.origem === "cnpj";
    const prim = [...tels.filter((t) => !ehCnpj(t)).map(linhaTel), ...mails.filter((m) => !ehCnpj(m)).map(linhaMail)];
    const cnpj = [...tels.filter(ehCnpj).map(linhaTel), ...mails.filter(ehCnpj).map(linhaMail)];
    return `<div class="ct mc-largo-sempre" id="mc-canais-${f.id}">
      <div class="ct-cab"><span>Como falar</span>${carregando ? '<i>buscando números…</i>' : ""}</div>
      ${prim.length ? `<ul class="ct-lista">${prim.join("")}</ul>` : ""}
      ${cnpj.length ? `<div class="ct-grupo"><span>Cadastro do CNPJ</span><i>pode ser da contabilidade</i></div><ul class="ct-lista">${cnpj.join("")}</ul>` : ""}
      ${!prim.length && !cnpj.length ? `<p class="ct-nada">Nenhum número ou e-mail ainda.</p>` : ""}</div>`;
  }
  function atualizarCanais(fichaId) {
    const el = document.getElementById("mc-canais-" + fichaId), f = S.lg.fichaPorId?.get(fichaId), reg = S.fx.cache.get(fichaId);
    if (el && f && reg) el.outerHTML = blocoCanais(f, reg.emp, reg.contatos, reg.estado === "carregando");
  }

  function linhaEmpresa(r, dist) {
    const soc = S.socios.get(r.cnpj_basico) || [];
    const [tl, tc] = nivelTel(r);
    const [nl, nc, bc] = nivelNota(r.nota || 0);
    const wl = wppEmpresa(r);
    return `<div class="t-item">${wl ? `<div class="t-sobre ${dist != null ? "t-sobre-reg" : ""}"><span class="t-sobre-cel">${botaoWpp(wl.n, nomeEmp(r), "bt-wpp-mini")}</span></div>` : ""}<button type="button" class="t-linha" data-acao="sel" data-cnpj="${esc(r.cnpj)}" aria-pressed="${S.sel === r.cnpj}">
      ${dist != null ? `<span class="num t13"><b>${dist < 1 ? Math.round(dist * 1000) + " m" : dist.toFixed(1).replace(".", ",") + " km"}</b>${r.geo_precisao && r.geo_precisao !== "endereco" ? `<br><span class="t11 fraco">pela ${r.geo_precisao === "bairro" ? "região do bairro" : "rua"}</span>` : ""}</span>` : ""}
      <span class="pilha" style="gap:4px">
        <span class="t-nome">${esc(nomeEmp(r))}</span>
        <span class="linha-flex" style="gap:5px"><span class="selo s-ident">${esc(r.tipo || "")}</span><span class="t12 fraco">${esc(r.bairro ? r.bairro + " · " : "")}${esc(r.municipio || "")}</span></span>
        <span class="linha-flex" style="gap:5px">${tagsEmpresa(r)}</span>
      </span>
      ${dist == null ? `<span class="t13 num cnpj">${esc(fmtCnpj(r.cnpj))}</span>` : ""}
      <span class="pilha" style="gap:4px;align-items:flex-start"><span class="t13 num cnpj ${r.tel_status === "errado" ? "riscado" : ""}">${esc(r.telefone1 || "Sem telefone")}</span><span class="selo ${tc}">${tl}</span>${wl ? `<span class="ct-tag" title="WhatsApp ${wl.origem === "site" ? "do site da empresa" : "do celular do CNPJ"}">WhatsApp · ${wl.origem === "site" ? "site" : "CNPJ"}</span>` : ""}</span>
      <span class="pilha" style="gap:2px"><span class="t13 corta2">${esc(soc[0] ? titulo(soc[0].nome) : "Não informado")}</span><span class="t11 fraco">${esc(soc[0] ? (soc[0].qualificacao || "Sócio") + (soc.length > 1 ? ` · +${soc.length - 1}` : "") : "Sem sócio na Receita")}</span></span>
      ${celulaSistema(r)}
      <span class="pilha"><span class="linha-flex t12" style="justify-content:space-between"><span class="${nc}">${nl}</span><span class="fraco num">${r.nota || 0}/99</span></span><span class="barra" style="height:6px"><i class="${bc}" style="width:${r.nota || 0}%"></i></span></span>
    </button></div>`;
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
    f.dataset.sujo = "1"; atualizarBlocoDemo(f, false); atualizarNegativa(f);
    const c = $("#rg-conta"); if (c) c.innerHTML = avisoContagem(f);
    if (g.foco) document.getElementById(g.foco)?.focus();
  }
  function render() {
    contaRedesenho++;
    S.mesmaTela = app.dataset.ultimaTela === S.view && !!app.querySelector("main") && !app.querySelector(".in-esqueleto");
    app.dataset.ultimaTela = S.user && S.perfil?.aprovado ? S.view : "";
    const g = guardarForm(), rolagem = app.querySelector(".gaveta .painel")?.scrollTop || 0; renderTela(); devolverForm(g);
    const gv = app.querySelector(".gaveta .painel"); if (gv && rolagem) gv.scrollTop = rolagem;
    if (window.Gaveta && app.querySelector(".upw-sec-files")) window.Gaveta.ligar(app);
    document.body.classList.toggle("com-gaveta", !!gv);
    sincronizarRota();
  }
  const gaveta = (html, fechar) => `<div class="gaveta-fundo" data-acao="${fechar}"></div><div class="gaveta gaveta-grande" role="dialog" aria-modal="true">${html}</div>`;
  function renderTela() {
    fundo(!S.user || S.recuperando || (S.perfil && !S.perfil.aprovado));
    if (S.recuperando) return renderNovaSenha();
    if (!S.user) return S.cadastro ? renderCadastro() : renderLogin();
    if (S.perfil && !S.perfil.aprovado) return renderAguardando();
    app.innerHTML = htmlLogado();
    guardarPedacos();
    if (S.view === "regiao") desenharMapa();
  }
  // a tela logada: o topo e cada parte que pode mudar sozinha quando chegam dados ficam num "pedaço" (data-pedaco)
  function htmlLogado() {
    if (S.view !== "concorrencia") S.cc.abertura = false; // ao voltar para a Concorrência, a abertura toca de novo
    const tela = S.view === "inicio" ? telaInicio() : S.view === "mapeamento" ? telaMapeamento() : S.view === "regiao" ? telaRegiao() : S.view === "listas" ? telaListas() : S.view === "adms" ? telaAdms() : S.view === "vendas" ? telaVendas() : S.view === "oportunidades" ? telaOportunidades() : S.view === "clientes" ? telaClientes() : S.view === "agenda" ? telaAgenda() : S.view === "relatorios" ? telaRelatorios() : S.view === "indicadores" ? telaIndicadores() : S.view === "concorrencia" ? telaConcorrencia() : telaEquipe();
    return `<div data-pedaco="topo" class="pedaco">${topo()}</div><main class="${S.view === "inicio" ? "main-inicio" : ""}">${S.view === "inicio" ? tela : `<div data-pedaco="faixa" class="pedaco">${faixaAgenda()}</div><div data-pedaco="tela" class="pedaco">${S.voltarAtivo && !(S.view === "adms" && S.lg.sel) ? '<div class="voltar-barra"><button type="button" class="fc-voltar" data-acao="voltar">← Voltar</button></div>' : ""}${tela}</div>`}</main>`;
  }
  const PEDACOS = new Map();
  function guardarPedacos() {
    PEDACOS.clear();
    const els = app.querySelectorAll("[data-pedaco]");
    for (const el of els) PEDACOS.set(el.dataset.pedaco, el.outerHTML);
    app.dataset.pedacos = [...els].map((e) => e.dataset.pedaco).join(",") + "|" + S.view;
  }
  // chegaram dados: troca só os pedaços que mudaram (sem redesenhar a tela e sem repetir as animações de entrada)
  let contaRedesenho = 0, contaPedaco = 0;
  function renderDados() {
    if (S.user && !S.perfil) return; // o perfil ainda não chegou: a primeira tela sai junto com ele
    if (S.view === "inicio" && S.user && S.perfil?.aprovado && app.querySelector("main") && !ehVendedor() && !ehPos()) { if (!S.inicio.desenhado) tentarInicio(); return; }
    if (!S.user || S.recuperando || !S.perfil?.aprovado || S.view === "regiao" || !app.dataset.pedacos) return render();
    const t = document.createElement("template"); t.innerHTML = htmlLogado();
    const novos = [...t.content.querySelectorAll("[data-pedaco]")];
    if (novos.map((e) => e.dataset.pedaco).join(",") + "|" + S.view !== app.dataset.pedacos) return render();
    const g = guardarForm(), rolagem = app.querySelector(".gaveta .painel")?.scrollTop || 0;
    let trocou = false;
    for (const n of novos) {
      const k = n.dataset.pedaco, html = n.outerHTML; if (PEDACOS.get(k) === html) continue;
      const v = app.querySelector(`[data-pedaco="${k}"]`); if (!v) return render();
      n.classList.add("sem-entrada"); v.replaceWith(n); PEDACOS.set(k, html); trocou = true; contaPedaco++;
    }
    sincronizarRota();
    if (!trocou) return;
    devolverForm(g);
    const gv = app.querySelector(".gaveta .painel"); if (gv && rolagem) gv.scrollTop = rolagem;
    if (window.Gaveta && app.querySelector(".upw-sec-files")) window.Gaveta.ligar(app);
    document.body.classList.toggle("com-gaveta", !!gv);
  }

  function topo() {
    const nAg = S.ag?.carregado ? pendentesAgenda() : 0;
    const nav = [["inicio", "Início"], ["mapeamento", "Mapeamento"], ["regiao", "Região"], ["adms", "Administradoras"], ["vendas", "Vendas"], ["oportunidades", (() => { if (!S.op.lista && !S.op.carregando && !S.op.erro && S.perfil?.aprovado) setTimeout(() => carregarOportunidades(true), 0); return rotuloNavOp(); })()], ["agenda", nAg ? `Agenda <span class="contador">${nAg}</span>` : "Agenda"], ["relatorios", "Relatórios"], ["indicadores", "Indicadores"], ["concorrencia", (() => { const n = S.cc.carregado ? S.cc.eventos.filter(brechaAtiva).length : 0; return n ? `Concorrência <span class="contador">${n}</span>` : "Concorrência"; })()], ["listas", "Listas"]];
    if (ehVendedor()) for (const k of ["mapeamento", "regiao", "listas"]) { const i = nav.findIndex((x) => x[0] === k); if (i >= 0) nav.splice(i, 1); }
    if (ehPos() || S.perfil?.papel === "admin") nav.splice(nav.findIndex((x) => x[0] === "vendas") + 1, 0, ["clientes", "Clientes"]);
    if (ehPos()) { const fica = ["inicio", "agenda", "clientes", "vendas", "adms"]; for (let i = nav.length - 1; i >= 0; i--) if (!fica.includes(nav[i][0])) nav.splice(i, 1); }
    if (S.perfil?.papel === "admin") nav.push(["equipe", S.pendentes ? `Equipe <span class="contador">${S.pendentes}</span>` : "Equipe"]);
    return `<header class="topo">
      <button type="button" class="marca marca-topo" data-acao="ir" data-view="inicio" aria-label="Mapa Comercial, voltar ao início"><img src="marca/prg-software.png?v=1" alt="" width="151" height="73" class="marca-prg"><span class="marca-sep" aria-hidden="true"></span><span class="pilha" style="gap:0"><span class="marca-nome">Mapa Comercial</span><span class="marca-sub">Grupo WorkOffice</span></span></button>
      <nav aria-label="Menu principal">${nav.map(([k, l]) => `<button type="button" data-acao="ir" data-view="${k}" ${k === "agenda" ? 'id="nav-agenda"' : ""} ${S.view === k ? 'aria-current="page"' : ""}>${l}</button>`).join("")}</nav>
      <div class="usuario"><button type="button" data-acao="menu" aria-expanded="${S.menu}"><span>${esc(S.perfil?.nome || "")}</span><span class="avatar">${esc(ini(S.perfil?.nome))}</span></button>
        ${S.menu ? `<div class="menu"><span class="origem" style="padding:6px 10px">${esc(S.user.email)} · ${esc(rotuloFuncao(S.perfil?.funcao))}${S.perfil?.papel === "admin" ? " · vê tudo" : ""}</span><button type="button" data-acao="atualizar">Atualizar dados</button><span class="menu-versao">Versão ${VERSAO}</span><button type="button" data-acao="sair">Sair</button></div>` : ""}
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
        ${label === "E-mail" && valor && m?.status !== "errado" ? `<span class="ct-acoes ct-sozinho">${botaoEmail(valor, nomeEmp(r), "ct-bt")}</span>` : ""}
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
    const wE = wppEmpresa(r);
    const blocoWpp = `<div class="campo-ficha"><span class="t12 fraco">WhatsApp</span>
      ${wE ? `<div class="ct-linha ct-claro" title="${wE.origem === "site" ? `Do botão de WhatsApp do site da empresa${r.whatsapp_em ? `, visto em ${esc(fmtData(r.whatsapp_em))}` : ""}` : "Celular do cadastro do CNPJ"}"><span class="ct-valor"><b class="num">${esc(fmtTel(nacional(wE.n)))}</b><span class="ct-tag">${wE.origem === "site" ? "site" : "CNPJ"}</span></span><span class="ct-acoes">${botaoWpp(nacional(wE.n), nomeEmp(r), "ct-bt")}</span></div>` : `<span class="valor"><span class="fraco">Não encontrado</span></span>`}</div>`;
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
      <div class="pilha" style="gap:10px"><span style="font-size:12px;font-weight:700">Contato</span>${campo(campos[0])}${blocoWpp}${campos.slice(1).map(campo).join("")}</div>
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
      <section class="cartao" style="overflow:hidden"><div class="lista-cab"><b>Exportações</b></div><div class="rolagem">${exportacoes.length ? `<table class="tab-simples"><thead><tr><th>Data</th><th>Quem</th><th>Lista</th><th>Empresas</th></tr></thead><tbody>${exportacoes.map((x) => `<tr><td class="num">${esc(dataHoraBR(x.criado_em))}</td><td>${esc(x.usuario_nome)}</td><td>${esc(x.empresa || "")}</td><td class="num">${fmtN(x.quantidade)}</td></tr>`).join("")}</tbody></table>` : `<div class="vazio">Nenhuma lista exportada ainda.</div>`}</div></section>
      <section class="cartao" style="overflow:hidden"><div class="lista-cab"><b>Atividade da equipe</b><span class="t12 fraco">últimas 60 ações</span></div><div class="rolagem">${atividade.length ? `<table class="tab-simples"><thead><tr><th>Data</th><th>Quem</th><th>O que fez</th></tr></thead><tbody>${atividade.map((x) => `<tr><td class="num">${esc(dataHoraBR(x.criado_em))}</td><td>${esc(x.usuario_nome || "")}</td><td>${esc(NOME_ACAO[x.acao] || x.acao)} ${x.campo ? `<b>${esc(x.campo.toLowerCase())}</b> de ` : ""}${esc(x.empresa || "")}${x.quantidade ? ` (${fmtN(x.quantidade)} empresas)` : ""}</td></tr>`).join("")}</tbody></table>` : `<div class="vazio">Nada por aqui ainda.</div>`}</div></section>`;
  }
  async function carregarListas() {
    if (S.buscandoListas) return; S.buscandoListas = true;
    const [a, b] = await Promise.all([
      sb.from("historico").select("criado_em,usuario_nome,empresa,quantidade").eq("acao", "exportou").order("criado_em", { ascending: false }).limit(100),
      sb.from("historico").select("criado_em,usuario_nome,acao,campo,empresa,quantidade").neq("acao", "exportou").order("criado_em", { ascending: false }).limit(60),
    ]);
    S.listas = { exportacoes: a.data || [], atividade: b.data || [] }; S.buscandoListas = false;
    renderDados();
  }

  function telaEquipe() {
    if (S.perfil?.papel !== "admin") return `<div class="cartao vazio">Só administradores podem ver esta tela.</div>`;
    if (!S.equipe) { carregarEquipe(); return `<div class="cartao vazio">Carregando a equipe…</div>`; }
    if (S.equipe.erro) return `<div class="aviso aviso-erro">${esc(S.equipe.erro)}</div>`;
    const pend = S.equipe.usuarios.filter((u) => !u.aprovado), ok = S.equipe.usuarios.filter((u) => u.aprovado);
    const cel = (c) => { const d = String(c || "").replace(/\D/g, ""); return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : ""; };
    return `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Equipe</h1><p class="fraco" style="margin:0">Quem pode entrar no Mapa Comercial. Cada pessoa cria a própria conta na tela de entrada e só entra depois que uma administradora aprova aqui. Você também troca o papel, gera senha nova ou desativa quem saiu da equipe.</p></div></div>
      ${pend.length ? `<section class="cartao pendentes" style="overflow:hidden"><div class="lista-cab"><b>Aguardando sua aprovação · ${pend.length}</b><span class="t12 fraco">Só aprove quem é da equipe.</span></div>
        ${pend.map((u) => `<div class="pendente"><div class="pilha" style="gap:2px"><b>${esc(u.nome)}</b><span class="t13">${esc(u.email)}${u.celular ? ` · ${esc(cel(u.celular))}` : ""}</span><span class="t12 fraco">${esc(rotuloFuncao(u.funcao))} · pediu acesso em ${esc(fmtData(u.criado_em))}</span></div>
          <div class="linha-flex"><button type="button" class="btn btn-primario" data-acao="usuario" data-op="aprovar" data-papel="sdr" data-id="${u.id}">Aprovar como SDR</button><button type="button" class="btn btn-sec" data-acao="usuario" data-op="aprovar" data-papel="admin" data-id="${u.id}">Aprovar como administradora</button><button type="button" class="btn btn-perigo" data-acao="usuario" data-op="recusar" data-id="${u.id}">Recusar</button></div></div>`).join("")}</section>` : ""}
      <section class="cartao pad pilha" style="gap:12px"><b>Adicionar pessoa você mesma</b>
        <form class="form-grade" data-acao="criar-usuario" autocomplete="off">
          <div class="campo"><label for="u-nome">Nome</label><input id="u-nome" class="input" required maxlength="60"></div>
          <div class="campo"><label for="u-email">E-mail</label><input id="u-email" class="input" type="email" required></div>
          <div class="campo"><label for="u-senha">Senha inicial (mín. 8)</label><input id="u-senha" class="input" type="text" minlength="8" required></div>
          <div class="campo"><label for="u-funcao">Função</label><select id="u-funcao" class="input">${FUNCOES.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
          <div class="campo"><label for="u-papel">Acesso</label><select id="u-papel" class="input"><option value="sdr">Só os próprios dados</option><option value="admin">Vê tudo (administrador)</option></select></div>
          <button type="submit" class="btn btn-primario">Adicionar</button>
        </form>
        <span class="t12 fraco">Passe a senha inicial para a pessoa por fora (WhatsApp, por exemplo). Ela pode trocar depois em "Esqueci a senha".</span>
      </section>
      <section class="cartao" style="overflow:hidden"><div class="rolagem"><table class="tab-simples"><thead><tr><th>Nome</th><th>E-mail</th><th>Celular</th><th>Função</th><th>Acesso</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>
        ${ok.map((u) => `<tr><td><b>${esc(u.nome)}</b>${u.ativo ? "" : ' <span class="selo s-errado">Desativado</span>'}</td><td>${esc(u.email)}</td><td class="num">${esc(cel(u.celular))}</td><td><select class="input" style="height:32px;min-width:120px" data-funcao-de="${u.id}" aria-label="Função de ${esc(u.nome)}">${FUNCOES.map(([k, l]) => `<option value="${k}" ${u.funcao === k ? "selected" : ""}>${l}</option>`).join("")}</select></td><td>${u.papel === "admin" ? "Vê tudo" : "Próprios dados"}</td><td class="num">${u.ultimo_acesso ? esc(fmtData(u.ultimo_acesso)) : "nunca entrou"}</td>
          <td><div class="linha-flex">${u.id === S.user.id ? '<span class="t12 fraco">você</span>' : `<button type="button" class="mini" data-acao="usuario" data-op="${u.ativo ? "desativar" : "reativar"}" data-id="${u.id}">${u.ativo ? "Desativar" : "Reativar"}</button><button type="button" class="mini" data-acao="usuario" data-op="papel" data-papel="${u.papel === "admin" ? "sdr" : "admin"}" data-id="${u.id}">${u.papel === "admin" ? "Tornar SDR" : "Tornar administrador"}</button>`}<button type="button" class="mini" data-acao="nova-senha" data-id="${u.id}" data-nome="${esc(u.nome)}">Nova senha</button></div></td></tr>`).join("")}
      </tbody></table></div></section>`;
  }
  async function carregarEquipe() {
    if (S.buscandoEquipe) return; S.buscandoEquipe = true;
    const data = await chamar("gerenciar-usuarios", { acao: "listar" }).finally(() => { S.buscandoEquipe = false; });
    S.equipe = data.erro || !data.usuarios ? { erro: data.erro && data.erro !== "rede" ? data.erro : "Não foi possível carregar a equipe." } : { usuarios: data.usuarios };
    renderDados();
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
      <label for="c-funcao">Sua função no time</label><select id="c-funcao" required><option value="">Escolha</option>${FUNCOES.map(([k, l]) => `<option value="${k}" ${v.funcao === k ? "selected" : ""}>${l}</option>`).join("")}</select>
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
      const dados = { nome: $("#c-nome").value.trim(), email: $("#c-email").value.trim().toLowerCase(), celular: cel.value, funcao: $("#c-funcao").value, senha: $("#c-senha").value };
      S.cadastroDados = { nome: dados.nome, email: dados.email, celular: dados.celular, funcao: dados.funcao };
      if (dados.nome.length < 2) return renderCadastro("Digite seu nome.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email)) return renderCadastro("Digite um e-mail válido.");
      const dig = dados.celular.replace(/\D/g, "");
      if (dig.length < 10 || dig.length > 11) return renderCadastro("Digite o celular com DDD.");
      if (!dados.funcao) return renderCadastro("Escolha a sua função no time.");
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
    ["conversou", "Contato realizado", "s-ident"],
    ["sem_contato", "Não atendeu / sem contato", "s-vazio"],
    ["negativa", "Negativa", "s-errado"],
    ["demo_agendada", "Demo agendada", "s-roxo"],
    ["demo_realizada", "Demo realizada", "s-conf"],
    ["contrato", "Contrato fechado", "s-conf"],
    ["anotacao", "Só anotação", "s-neutro"],
  ];
  const RES = Object.fromEntries(RESULTADOS.map(([k, l, c]) => [k, { l, c }]));
  const LIGACAO = new Set(["conversou", "sem_contato", "negativa", "demo_agendada"]);
  // Sem contato não é contato: a partir de 25/11/2026 ele não conta como contato novo nem como follow-up
  // (fica só em "Sem contato"). Os registros de antes continuam contando como contavam.
  const SEM_CONTATO_NAO_CONTA_DESDE = "2026-11-25";
  const contaComoContato = (r) => LIGACAO.has(r.tipo) && !(r.tipo === "sem_contato" && r.data >= SEM_CONTATO_NAO_CONTA_DESDE);
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
  // data e hora em São Paulo: um formatador só, e cada timestamp convertido uma vez (guardado num Map)
  const FMT_SP = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const partesSP = (d) => { const p = {}; for (const x of FMT_SP.formatToParts(d)) p[x.type] = x.value; return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`; };
  const CACHE_SP = new Map();
  const dataHoraBR = (ts) => { const l = localSP(ts); return l ? `${l.slice(8, 10)}/${l.slice(5, 7)}/${l.slice(0, 4)}, ${l.slice(11, 16)}` : ""; };
  function localSP(ts) {
    if (!ts) return "";
    let v = CACHE_SP.get(ts);
    if (v === undefined) { const d = new Date(ts); v = isNaN(d) ? "" : partesSP(d); if (CACHE_SP.size > 60000) CACHE_SP.clear(); CACHE_SP.set(ts, v); }
    return v;
  }
  // "hoje" calculado no máximo uma vez por minuto
  let HOJE = { ate: 0, v: "" };
  const hojeISO = () => { const n = Date.now(); if (n >= HOJE.ate) HOJE = { ate: n - (n % 60000) + 60000, v: partesSP(new Date(n)).slice(0, 10) }; return HOJE.v; };
  const isoData = (iso) => new Date(iso + "T12:00:00Z");
  const somaDias = (iso, n) => { const d = isoData(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const segundaDe = (iso) => somaDias(iso, -((isoData(iso).getUTCDay() + 6) % 7));
  const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const ddmmaaaa = (iso) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";
  const extenso = (iso, hora) => `${iso.slice(8, 10)} de ${MESES[+iso.slice(5, 7) - 1]}${hora ? ` às ${hora}` : ""}`;

  S.lg = { dono: null, carregado: false, carregando: false, fichas: [], regs: [], base: [], rels: [], pessoas: null, busca: "", etapa: "todas", sel: null, novo: false, apagar: null, mostrar: 100, dadosAberto: true, idx: new Map(), modo: (() => { try { return localStorage.getItem("mapa-adm-modo") || "quadro"; } catch { return "quadro"; } })(), porColuna: {}, arrastando: null, arrastou: false };
  S.rl = { periodo: "dia", ref: hojeISO(), editObs: false, editAj: false, editReg: null };

  const donoAtual = () => S.lg.dono || S.user.id;
  const souDono = () => donoAtual() === S.user.id;

  // busca tudo em páginas de 1000, várias ao mesmo tempo: quantas páginas pedir de uma vez vem do tamanho da última busca (guardado por chave)
  async function tudo(montar, chave) {
    let guardado = 0; try { guardado = +localStorage.getItem("mc-tam-" + chave) || 0; } catch { /* sem armazenamento */ }
    // sem tamanho guardado (primeira vez neste navegador): pede 3 páginas de uma vez
    let lote = !chave ? 1 : guardado ? Math.min(8, Math.ceil((guardado + 1) / 1000)) : 3;
    const out = [];
    for (let de = 0; ; de += lote * 1000) {
      const res = await Promise.all(Array.from({ length: lote }, (_, i) => montar().range(de + i * 1000, de + i * 1000 + 999)));
      let cheia = true;
      for (const { data, error } of res) { if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) cheia = false; }
      if (!cheia) break;
      lote = 2;
    }
    if (chave) try { localStorage.setItem("mc-tam-" + chave, String(out.length)); } catch { /* sem armazenamento */ }
    return out;
  }
  const COLS_REG = "id,ficha_id,usuario_id,data,tipo,detalhe,detalhes,envio,canal,criado_em,brecha_id";
  const COLS_FICHA = "id,usuario_id,cnpj,nome,telefones,whatsapp,horario_funcionamento,cidade,uf,sistema,qtd_condominios,qtd_unidades,atendente,email,numero_responsavel,melhor_horario,responsavel,etapa,funil,demo_em,demo_formato,contrato_em,criado_em,atualizado_em,contato_anterior,retorno_em,retorno_nota,observacoes";
  // busca as anotações de uma ficha (as importadas do Agendor não vêm na abertura do sistema)
  async function garantirTextos(fichaId) {
    const L = S.lg; if (!L.textosFicha || L.textosFicha.has(fichaId)) return;
    L.textosFicha.add(fichaId);
    const regs = L.porFicha.get(fichaId) || []; if (!regs.some((r) => r.texto === undefined)) return;
    const { data, error } = await sb.from("registros").select("id,texto").eq("ficha_id", fichaId);
    if (error) { L.textosFicha.delete(fichaId); return; }
    const t = new Map((data || []).map((r) => [r.id, r.texto])); for (const r of regs) if (t.has(r.id)) r.texto = t.get(r.id);
    if (!preencherTextos(fichaId)) render();
  }
  // os textos chegaram: preenche só os cartões que já estão na tela (sem refazer a ficha, sem reiniciar as animações)
  function preencherTextos(fichaId) {
    const lugares = app.querySelectorAll("[data-texto]"); if (!lugares.length) return S.view !== "mapa";
    const porId = new Map((S.lg.porFicha.get(fichaId) || []).map((r) => [r.id, r]));
    let achou = false;
    for (const el of lugares) {
      const r = porId.get(el.dataset.texto); if (!r || r.texto === undefined) continue;
      achou = true;
      if (el.classList.contains("mc-texto")) el.outerHTML = textoReg(r);
      else el.outerHTML = esc(tituloReg(r));
    }
    return achou;
  }
  async function carregarLig() {
    const L = S.lg; if (L.carregando) return; L.carregando = true;
    const pessoasP = (S.perfilP || Promise.resolve()).then(garantirPessoas);
    const dono = donoAtual();
    const q = (t, cols) => () => { let x = sb.from(t).select(cols); if (dono !== "todos") x = x.eq("usuario_id", dono); return x.order(t === "acumulado_base" ? "usuario_id" : t === "relatorios" ? "inicio" : "id"); };
    try {
      const [fichas, regs, base, rels] = await Promise.all([
        tudo(q("fichas", COLS_FICHA), "fichas-" + dono),
        // o texto vem junto só dos contatos registrados no sistema; o das anotações importadas é buscado ao abrir a ficha
        tudo(() => { let x = sb.from("registros").select(COLS_REG + ",texto").neq("tipo", "anotacao"); if (dono !== "todos") x = x.eq("usuario_id", dono); return x.order("id"); }, "regs-" + dono),
        tudo(q("acumulado_base", "*"), "base-" + dono), tudo(q("relatorios", "*"), "rels-" + dono),
        tudo(() => { let x = sb.from("registros").select(COLS_REG).eq("tipo", "anotacao"); if (dono !== "todos") x = x.eq("usuario_id", dono); return x.order("id"); }, "anot-" + dono),
      ]).then(([fichas, regs, base, rels, anot]) => { L.textosFicha = new Set(); return [fichas, regs.concat(anot), base, rels]; });
      Object.assign(L, { fichas, regs, base, rels });
      pessoasP.then(() => { if (S.view !== "inicio") renderDados(); }); // a lista de pessoas não segura as fichas
      derivar();
      L.carregado = true; S.carregadoEm = Date.now();
    } catch (e) { console.error(e); toast("Não deu para carregar as ligações. Tente de novo."); }
    finally { L.carregando = false; if (L.carregado && !L.dono) carregarAgenda(); renderDados(); }
  }
  function derivar() {
    const L = S.lg; S.dv = (S.dv || 0) + 1;
    L.fichaPorId = new Map(L.fichas.map((f) => [f.id, f]));
    L.porFicha = new Map();
    const ord = [...L.regs].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.criado_em < b.criado_em ? -1 : 1));
    for (const r of ord) { if (!L.porFicha.has(r.ficha_id)) L.porFicha.set(r.ficha_id, []); L.porFicha.get(r.ficha_id).push(r); }
    for (const [id, lista] of L.porFicha) {
      let primeira = !L.fichaPorId.get(id)?.contato_anterior;
      for (const r of lista) { r.nova = false; if (contaComoContato(r)) { r.nova = primeira; primeira = false; } }
    }
    // texto de busca de cada ficha: todos os campos e todas as anotações
    L.idx = new Map(L.fichas.map((f) => [f.id, norm([f.nome, f.cidade, f.uf, f.sistema, f.responsavel, f.telefones, f.whatsapp, f.email, f.atendente, f.numero_responsavel, f.melhor_horario, f.horario_funcionamento, f.cnpj, f.observacoes, f.retorno_nota, ...(L.porFicha.get(f.id) || []).map((r) => r.texto)].join(" ")).replace(/\s+/g, " ")]));
  }
  const nomePessoa = (id) => id === S.user.id ? S.perfil?.nome : (S.lg.pessoas || []).find((p) => p.id === id)?.nome || "";
  const jaLigou = (f) => f.contato_anterior || (S.lg.porFicha.get(f.id) || []).some(contaComoContato);

  function metricas(ini, fim) {
    const rs = S.lg.regs.filter((r) => r.data >= ini && r.data <= fim);
    const lig = rs.filter(contaComoContato);
    const n = (t) => rs.filter((r) => r.tipo === t).length;
    return { rs, lig, ligacoes: lig.length, pessoas: new Set(lig.map((r) => r.ficha_id)).size, primeira_ligacao: lig.filter((r) => r.nova).length, follow_up: lig.filter((r) => !r.nova).length,
      sem_contato: n("sem_contato"), negativa: n("negativa"), demo_agendada: n("demo_agendada"), demo_realizada: n("demo_realizada"), contrato: n("contrato") };
  }
  function acumulado(fim) {
    const L = S.lg; let tentativas = 0, prospectadas = 0;
    const baseAte = new Map();
    for (const b of L.base) if (b.ate <= fim) { tentativas += b.tentativas; prospectadas += b.prospectadas; baseAte.set(b.usuario_id, b.ate); }
    for (const r of L.regs) {
      if (r.data > fim || !contaComoContato(r)) continue;
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
    ["conversou", "Contato realizado", "conversou", null],
    ["material_enviado", "Só atende por e-mail / WhatsApp", "conversou", "material_enviado"],
    ["pediu_retorno", "Pediu para retornar", "conversou", "pediu_retorno"],
    ["sem_abertura", "Sem abertura", "conversou", "sem_abertura"],
    ["negativa", "Sem interesse", "negativa", null],
    ["demo_agendada", "Demo agendada", "demo_agendada", null],
    ["demo_realizada", "Demo realizada", "demo_realizada", null],
    ["contrato", "Contrato fechado", "contrato", null],
    ["anotacao", "Só anotação", "anotacao", null],
    ["sem_contato", "Sem contato", "sem_contato", null],
  ];
  // o que aparece no formulário: uma escolha só, na ordem do Relatório diário
  const OPCOES = [["sem_contato", "Sem contato"], ["conversou", "Contato realizado"], ["demo_agendada", "Demo agendada"], ["demo_realizada", "Demo realizada"], ["negativa", "Negativa"]];
  // Demo realizada: os dados do cartão do Painel de Demonstrações Realizadas (todos obrigatórios)
  const DADOS_DEMO = [["sistema", "Sistema usado"], ["qtd_condominios", "Quantos condomínios atende"], ["responsavel", "Nome do responsável"], ["cidade", "Cidade"], ["uf", "UF"]];
  function dadosDoForm(form) {
    const v = (n) => String(form.elements[n]?.value ?? "").trim();
    const dt = v("rg_demo_em");
    return { nome: v("nome") || form.dataset.nome || "", sistema: sistemaDoForm(form) || "", qtd_condominios: v("qtd_condominios").replace(/\D/g, ""), qtd_unidades: v("qtd_unidades").replace(/\D/g, ""), responsavel: v("responsavel"), cidade: v("cidade"), uf: v("uf"), demo: dt, formato: v("rg_formato") || "virtual" };
  }
  function faltaDemo(form) {
    const d = dadosDoForm(form), falta = DADOS_DEMO.filter(([k]) => !d[k]).map(([k, l]) => [k, l]);
    if (!d.demo) falta.unshift(["rg_demo_em", "Dia e hora da demonstração"]);
    return falta;
  }
  function atualizarBlocoDemo(form, abrir) {
    const res = form.querySelector('[name="res"]:checked')?.value, demo = res === "demo_agendada" || res === "demo_realizada";
    const bloco = $("#rg-demo"); if (bloco) bloco.hidden = !demo;
    const apres = $("#rg-apres-c"); if (apres) apres.hidden = res !== "demo_realizada";
    const lbl = form.querySelector('label[for="rg-demo-em"]'); if (lbl) lbl.textContent = res === "demo_realizada" ? "Dia e hora em que a demonstração foi feita" : "Dia e hora da demonstração";
    const p = $("#rg-painel"); if (!p) return;
    p.hidden = res !== "demo_realizada"; if (p.hidden) return;
    if (abrir) { const dm = form.elements.rg_demo_em; if (dm && !dm.value) { const a = localSP(new Date().toISOString()); dm.value = a.slice(0, 14) + "00"; } }
    const d = dadosDoForm(form), linha = (l, v) => `<span>${l}: ${v ? esc(v) : '<i class="rg-falta">falta preencher</i>'}</span>`;
    const dt = d.demo ? `${d.demo.slice(8, 10)} de ${MESES[+d.demo.slice(5, 7) - 1]} às ${d.demo.slice(11, 16)}` : "";
    p.innerHTML = `<span class="rg-painel-tit">Vai entrar assim no Painel de Demonstrações Realizadas</span>
      <div class="rel-card"><b class="rel-card-nome">${esc(d.nome || "—")}</b><b class="t12">Demonstração ${d.formato === "presencial" ? "presencial" : "virtual"} realizada: ${dt ? esc(dt) : '<i class="rg-falta">falta o dia e a hora</i>'}</b>
      ${linha("Sistema usado", d.sistema)}${linha("Quantos condomínios atende", d.qtd_condominios ? `${fmtN(+d.qtd_condominios)} ${+d.qtd_condominios === 1 ? "condomínio" : "condomínios"}${d.qtd_unidades ? ` | ${fmtN(+d.qtd_unidades)} unidades` : ""}` : "")}${linha("Nome do responsável", d.responsavel)}${linha("Cidade", d.cidade && d.uf ? `${d.cidade} - ${d.uf}` : d.cidade && !d.uf ? "" : "")}</div>
      <span class="t12 fraco">Os dados vêm do Cadastro (etapa 1). Todos são obrigatórios para a demonstração.</span>${DADOS_DEMO.some(([k]) => !d[k]) ? '<button type="button" class="mini" data-acao="lg-passo" data-v="dados" style="align-self:flex-start">Completar no cadastro</button>' : ""}`;
  }
  // aviso ao lado do Salvar: como este contato entra no relatório (mesma regra dos relatórios)
  function avisoContagem(form) {
    const k = form.querySelector('[name="res"]:checked')?.value || (form.querySelector('[name="envio"]:checked') ? "conversou" : "");
    const fid = form.dataset.ficha, f = fid ? S.lg.fichaPorId?.get(fid) : null, nova = !f || !jaLigou(f);
    if (!k) return "Escolha o que aconteceu.";
    if (k === "anotacao") return "Só anotação: não conta no relatório.";
    if (k === "demo_realizada") return "Vai contar como <b>demonstração realizada</b>.";
    const tipo = nova ? "contato novo" : "follow-up";
    return k === "sem_contato" ? "Vai contar como <b>sem contato</b> (não é contato novo nem follow-up)." : `Vai contar como <b>${tipo}</b>.`;
  }
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
  function filtrosAdms() {
    const V = S.vd, out = [["todas", "Todas"]];
    if (V.carregado) for (const e of V.etapas.filter((x) => x.funil === V.scc && x.ordem !== 5)) if (S.lg.fichas.some((f) => V.porFicha.get(f.id)?.etapa === e.id)) out.push(["e:" + e.id, e.nome]);
    if (V.carregado) out.push(["sem_negocio", "Sem negócio"]);
    out.push(["fez_demo", "Fizeram demonstração"], ["retorno", "Com retorno marcado"]);
    return out;
  }
  const fezDemo = (f) => f.funil === "contrato" || (etapaSCC(f)?.ordem || 0) >= 6 || ["demo_realizada", "contrato"].includes(f.etapa) || (S.lg.porFicha.get(f.id) || []).some((r) => r.tipo === "demo_realizada");
  // Sem interesse fica numa aba própria, fora das listas de trabalho
  const ehSemInteresse = (f) => { const e = etapaSCC(f); return e ? e.ordem === 5 : f.funil === "sem_interesse"; };
  const semInteresseDesde = (f) => { const n = S.vd.porFicha.get(f.id); return localSP((n && n.desde) || f.atualizado_em || f.criado_em).slice(0, 10); };
  const retomarEm = (f) => { const d = semInteresseDesde(f); return d ? somaDias(d, 365) : ""; };
  function naEtapa(f, k) {
    if (k === "todas") return true;
    if (k === "retorno") return !!f.retorno_em;
    if (k === "fez_demo") return fezDemo(f);
    if (k === "sem_negocio") return !S.vd.porFicha.get(f.id);
    if (k.startsWith("e:")) return S.vd.porFicha.get(f.id)?.etapa === +k.slice(2);
    // Demonstração conta também quem já fechou: o contrato só vem depois da demo
    if (k === "demonstracao") return (f.funil || "mapeamento") === "demonstracao" || fezDemo(f);
    return (f.funil || "mapeamento") === k;
  }
  function fichasFiltradas() {
    const L = S.lg, si = L.aba === "sem_interesse", chave = `${S.dv}|${si ? "si" : L.etapa}|${L.busca}`;
    if (L.ff && L.ffChave === chave) return L.ff;
    const palavras = norm(L.busca).split(/\s+/).filter(Boolean);
    L.ff = L.fichas.filter((f) => {
      if (ehSemInteresse(f) !== si) return false;
      if (!si && !naEtapa(f, L.etapa)) return false;
      if (!palavras.length) return true;
      const t = L.idx.get(f.id) || ""; return palavras.every((p) => t.includes(p));
    }).map((f) => [ultimaDe(f)?.data || (f.criado_em || "").slice(0, 10), f.atualizado_em || "", f])
      .sort((x, y) => (x[0] < y[0] ? 1 : x[0] > y[0] ? -1 : x[1] < y[1] ? 1 : -1)).map((x) => x[2]);
    L.ffChave = chave; return L.ff;
  }
  // contagem de cada chip numa passada só, guardada até os dados mudarem
  function contagensChips(chips) {
    const L = S.lg, chave = `${S.dv}|${chips.map((c) => c[0]).join(",")}`;
    if (L.cc && L.ccChave === chave) return L.cc;
    const c = new Map(chips.map(([k]) => [k, 0]));
    for (const f of L.fichas) if (!ehSemInteresse(f)) for (const [k] of chips) if (naEtapa(f, k)) c.set(k, c.get(k) + 1);
    L.cc = c; L.ccChave = chave; return c;
  }
  function celulaRetorno(f) {
    if (!f.retorno_em) return '<span class="fraco t12">—</span>';
    const atr = diaDe(f.retorno_em) < hojeISO();
    return `<span class="selo ${atr ? "s-errado" : diaDe(f.retorno_em) === hojeISO() ? "s-nao" : "s-ident"}">${atr ? "Atrasado · " : ""}${esc(quandoTxt(f.retorno_em))}</span>`;
  }
  function linhasSemInteresse() {
    const hj = hojeISO(), ro = !souDono();
    const lista = fichasFiltradas().map((f) => [retomarEm(f), f]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    if (!lista.length) return `<div class="vazio">${S.lg.busca ? "Nenhuma administradora sem interesse com essa busca." : "Nenhuma administradora sem interesse. Quando você marcar uma negativa como Sem interesse, ela aparece aqui."}</div>`;
    return lista.slice(0, S.lg.mostrar).map(([ret, f]) => {
      const pronta = ret && ret <= hj, u = ultimaDe(f);
      return `<div class="si-linha ${pronta ? "si-pronta" : ""}">
        <button type="button" class="si-nome" data-acao="lg-sel" data-id="${f.id}"><span class="t-nome">${esc(f.nome)}</span><span class="t12 fraco">${esc([f.cidade, f.uf].filter(Boolean).join(" - ") || "Cidade não informada")}${f.sistema ? ` · ${esc(f.sistema)}` : ""}${S.lg.dono === "todos" ? ` · ${esc(nomePessoa(f.usuario_id))}` : ""}</span></button>
        <span class="t12"><span class="fraco">Sem interesse desde</span><br><b class="num">${ddmmaaaa(semInteresseDesde(f))}</b></span>
        <span class="t12">${u ? `<span class="fraco">Último contato</span><br>${ddmm(u.data)} · ${esc(rotuloReg(u))}` : '<span class="fraco">Sem contato registrado</span>'}</span>
        <span>${pronta ? '<span class="selo s-conf">Pronta para retomar</span>' : `<span class="t12 fraco">Pode retomar em</span><br><b class="t12 num">${ddmmaaaa(ret)}</b>`}</span>
        <span>${ro ? "" : `<button type="button" class="mini ${pronta ? "mini-ok" : ""}" data-acao="lg-retomar" data-id="${f.id}">Retomar contato</button>`}</span>
      </div>`;
    }).join("") + (lista.length > S.lg.mostrar ? `<div style="padding:14px 18px"><button type="button" class="mini" data-acao="lg-mais">Mostrar mais (${fmtN(lista.length - S.lg.mostrar)})</button></div>` : "");
  }
  function linhasFichas() {
    if (S.lg.aba === "sem_interesse") return linhasSemInteresse();
    const lista = fichasFiltradas();
    if (!lista.length) return `<div class="vazio">${S.lg.fichas.length ? "Nenhuma administradora com essa busca." : "Nenhuma administradora ainda. Clique em <b>+ Nova administradora</b> ou, no Mapeamento, abra uma empresa e clique em <b>Registrar ligação</b>."}</div>`;
    return lista.slice(0, S.lg.mostrar).map((f) => {
      const u = ultimaDe(f), lig = (S.lg.porFicha.get(f.id) || []).filter(contaComoContato).length, { nome: el, cor: ec } = etapaDaFicha(f);
      return `<button type="button" class="lg-linha" data-acao="lg-sel" data-id="${f.id}" aria-pressed="${S.lg.sel === f.id}">
        <span class="pilha" style="gap:1px;min-width:0"><span class="t-nome">${esc(f.nome)}</span><span class="t12 fraco">${esc([f.cidade, f.uf].filter(Boolean).join(" - ") || "Cidade não informada")}${S.lg.dono === "todos" ? ` · ${esc(nomePessoa(f.usuario_id))}` : ""}</span></span>
        <span class="t13">${f.sistema ? esc(f.sistema) : '<span class="fraco">Sistema ?</span>'}</span>
        <span><span class="selo ${ec}">${esc(el)}</span></span>
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
    if (!S.vd.carregado && !S.vd.carregando) carregarVendas();
    const hoje = hojeISO(), m = metricas(hoje, hoje);
    const ind = (v, l, sub = "") => `<div class="ind ${v ? "" : "zero"}"><span class="v">${fmtN(v)}</span><span class="t12 fraco">${l}${sub}</span></div>`;
    return cab + `
      <section class="cartao" style="overflow:hidden"><div class="lista-cab"><b>Hoje, ${DIAS[isoData(hoje).getUTCDay()]} ${ddmm(hoje)}</b><button type="button" class="mini" data-acao="lg-rel-dia">Ver relatório do dia →</button></div>
        <div class="resumo resumo6">${ind(m.ligacoes, "Contatos", m.ligacoes ? ` com ${fmtN(m.pessoas)} administradora${m.pessoas === 1 ? "" : "s"}` : "")}${ind(m.primeira_ligacao, "Contatos novos")}${ind(m.follow_up, "Follow-ups")}${ind(m.sem_contato, "Sem contato")}${ind(m.negativa, "Negativas")}${ind(m.demo_agendada, "Demos agendadas")}</div></section>
      ${(() => { let at = 0, si = 0, pr = 0; const hj = hojeISO(); for (const f of L.fichas) { if (ehSemInteresse(f)) { si++; if (retomarEm(f) <= hj) pr++; } else at++; }
        return `<div class="si-abas" role="tablist" aria-label="Listas"><button type="button" role="tab" data-acao="lg-aba" data-v="ativas" aria-selected="${L.aba !== "sem_interesse"}">Em prospecção <b>${fmtN(at)}</b></button><button type="button" role="tab" data-acao="lg-aba" data-v="sem_interesse" aria-selected="${L.aba === "sem_interesse"}">Sem interesse <b>${fmtN(si)}</b>${pr ? `<span class="si-prontas">${fmtN(pr)} ${pr === 1 ? "pronta" : "prontas"} para retomar</span>` : ""}</button></div>`; })()}
      <section class="cartao filtros"><div class="linha-filtros">
        <div class="campo" style="flex:1 1 300px"><label for="lg-busca">Procurar</label><input id="lg-busca" class="input" type="search" value="${esc(L.busca)}" placeholder="Nome, cidade, responsável, e-mail, anotação…" autocomplete="off"></div>
      </div>
      ${L.aba === "sem_interesse" ? '<span class="t13 fraco">Administradoras que disseram não. Ficam fora das listas de ligação; depois de 1 ano aparecem como prontas para retomar, mas só voltam quando você clicar em <b>Retomar contato</b>.</span>' : `<div class="campo"><span class="rotulo">Mostrar <span class="fraco" style="font-weight:500">· etapa do negócio no funil SCC</span></span><div class="chips">${(() => { const ch = filtrosAdms(), n = contagensChips(ch); return ch.map(([k, l]) => `<button type="button" class="chip" data-acao="lg-etapa" data-v="${k}" aria-pressed="${L.etapa === k}">${esc(l)}<b>${fmtN(n.get(k))}</b></button>`).join(""); })()}</div></div>`}
      </section>
        <section class="cartao lista"><div class="lista-cab"><b>${L.aba === "sem_interesse" ? "Sem interesse" : "Administradoras"}</b><span class="t12 fraco">${L.aba === "sem_interesse" ? "as prontas para retomar primeiro" : "o contato mais recente primeiro"}</span></div>
          <div class="rolagem"><div class="lg-tabela">${L.aba === "sem_interesse" ? "" : '<div class="lg-cab"><span>Administradora</span><span>Sistema</span><span>Etapa</span><span>Último contato</span><span>Ligar de novo</span></div>'}<div id="lg-lista">${linhasFichas()}</div></div></div></section>
      ${L.sel || L.novo ? gaveta(painelFicha(), "lg-fechar") : ""}`;
  }

  /* ---- Vendas: quadro de negócios por funil, no jeito do Agendor */
  const MOTIVOS_PERDA = ["Desistência", "Prazo", "Preço", "Produto/Serviço"];
  const MOEDA0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }), MOEDA2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const moeda = (v) => (v == null || isNaN(v) ? "" : (Number(v) % 1 ? MOEDA2 : MOEDA0).format(Number(v)));
  const COLL = new Intl.Collator("pt-BR");
  const diasDesde = (ts) => Math.max(0, Math.floor((Date.now() - (typeof ts === "number" ? ts : Date.parse(ts))) / 864e5));
  const STATUS_VD = [["em_andamento", "Em andamento"], ["ganho", "Ganhos"], ["perdido", "Perdidos"], ["todos", "Todos"]];
  const curtoFunil = (f) => ({ SCC: "SCC · Adm. Condomínios", SCL: "SCL · Imobiliárias", CON: "Construtoras", POS: "Serviços Adicionais", ACO: "Acompanhamento" }[f.sigla] || f.nome);

  function negociosFiltrados() {
    const V = S.vd, chave = `${S.dv}|${V.status}|${V.resp}|${V.busca}`;
    if (V.nf && V.nfChave === chave) return V.nf;
    const palavras = norm(V.busca).split(/\s+/).filter(Boolean);
    V.nf = V.negocios.filter((n) => {
      if (V.status !== "todos" && n.status !== V.status) return false;
      if (V.resp !== "todos" && (n.responsavel || "") !== V.resp) return false;
      return !palavras.length || palavras.every((p) => n.busca.includes(p));
    }).sort((a, b) => a.t - b.t); // há mais tempo na etapa primeiro
    V.nfChave = chave; return V.nf;
  }
  function cartaoNegocio(n, etapa) {
    const V = S.vd, dias = diasDesde(n.t), alerta = n.status === "em_andamento" && etapa.alerta != null && dias > etapa.alerta;
    const prods = (n.produtos || []).map((id) => V.produtoPorId.get(id)?.nome).filter(Boolean);
    const titulo = n.titulo && norm(n.titulo) !== norm(n.empresa) ? n.titulo : "";
    const pode = n.dono === S.user.id;
    return `<div class="vd-card ${alerta ? "vd-alerta" : ""} ${n.status !== "em_andamento" ? "vd-" + n.status : ""}" ${pode && n.status === "em_andamento" ? `draggable="true" data-vd-arrastar="${n.id}"` : ""}>
      <button type="button" class="vd-abrir" data-acao="vd-abrir" data-id="${n.id}" aria-label="Abrir a ficha de ${esc(n.empresa)}">
        <span class="vd-emp">${esc(n.empresa)}</span>
        ${titulo ? `<span class="vd-tit">${esc(titulo)}</span>` : ""}
        <span class="vd-linha"><b class="vd-valor ${n.valor ? "" : "vd-sem"}">${n.valor ? moeda(n.valor) : "Sem valor"}</b><span class="vd-dias" title="${alerta ? `Passou de ${etapa.alerta} dias nesta etapa` : "Dias nesta etapa"}">${ICONE_RELOGIO}${dias}d</span></span>
        ${prods.length ? `<span class="vd-prods">${prods.map((p) => `<span>${esc(p)}</span>`).join("")}</span>` : ""}
        <span class="vd-pe">${n.cidade ? `<span class="t12 fraco">${esc(n.cidade)}${n.uf ? ` - ${esc(n.uf)}` : ""}</span>` : "<span></span>"}${n.responsavel ? `<span class="vd-resp" title="Responsável">${esc(n.responsavel.split(" ")[0])}</span>` : ""}</span>
      </button>
      ${n.status === "em_andamento" ? (pode ? `<div class="vd-acoes"><button type="button" class="vd-ganho" data-acao="vd-ganho" data-id="${n.id}">Ganho</button><button type="button" class="vd-perdido" data-acao="vd-perdido" data-id="${n.id}">Perdido</button></div>` : "")
        : `<div class="vd-acoes"><span class="selo ${n.status === "ganho" ? "s-conf" : "s-errado"}">${n.status === "ganho" ? "Ganho" : `Perdido${n.motivo ? ` · ${esc(n.motivo)}` : ""}`}</span>${pode ? `<button type="button" class="vd-reabrir" data-acao="vd-reabrir" data-id="${n.id}">Reabrir</button>` : ""}</div>`}
    </div>`;
  }
  function telaVendas() {
    const V = S.vd;
    const cab = `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Vendas</h1><p class="fraco" style="margin:0">Os negócios de cada funil, etapa por etapa. Arraste o cartão para mudar de etapa e clique para abrir a ficha da administradora.</p></div></div>`;
    if (!V.carregado) { if (!V.carregando) carregarVendas(); return cab + `<div class="cartao vazio">Carregando os negócios…</div>`; }
    const funil = V.funis.find((f) => f.id === V.funil) || V.funis[0];
    const etapas = V.etapas.filter((e) => e.funil === funil.id);
    const lista = negociosFiltrados(), doFunil = lista.filter((n) => n.funil === funil.id);
    const porEtapa = new Map(etapas.map((e) => [e.id, []]));
    for (const n of doFunil) porEtapa.get(n.etapa)?.push(n);
    const total = doFunil.reduce((s, n) => s + (Number(n.valor) || 0), 0);
    const resps = V.resps || [];
    const contaFunil = (f) => lista.filter((n) => n.funil === f.id).length;
    const colunas = etapas.map((e) => {
      const cs = porEtapa.get(e.id);
      const soma = cs.reduce((s, n) => s + (Number(n.valor) || 0), 0), lim = V.porColuna[e.id] || 40;
      const nAlerta = e.alerta != null ? cs.filter((n) => n.status === "em_andamento" && diasDesde(n.t) > e.alerta).length : 0;
      return `<section class="qd-col vd-col ${e.resultado !== "aberta" ? "vd-col-" + e.resultado : ""}" data-etapa="${e.id}" aria-label="${esc(e.nome)}">
        <div class="qd-cab"><span class="qd-titulo">${esc(e.nome)}</span><span class="qd-cont num">${fmtN(cs.length)}</span>
          <span class="vd-soma">${soma ? moeda(soma) : "R$ 0"}</span>
          ${e.alerta != null ? `<span class="t11 fraco qd-sub">Alerta depois de ${e.alerta} ${e.alerta === 1 ? "dia" : "dias"}${nAlerta ? ` · <b style="color:var(--vermelho)">${nAlerta} ${nAlerta === 1 ? "atrasado" : "atrasados"}</b>` : ""}</span>` : ""}</div>
        <div class="qd-cards">${cs.slice(0, lim).map((n) => cartaoNegocio(n, e)).join("") || '<span class="t12 fraco qd-vazio">Nenhum negócio</span>'}${cs.length > lim ? `<button type="button" class="mini" data-acao="vd-mais" data-v="${e.id}">Mostrar mais ${fmtN(cs.length - lim)}</button>` : ""}</div>
      </section>`;
    }).join("");
    return cab + `
      <section class="cartao filtros">
        <div class="campo"><span class="rotulo">Funil</span><div class="chips">${V.funis.map((f) => `<button type="button" class="chip" data-acao="vd-funil" data-v="${f.id}" aria-pressed="${f.id === funil.id}">${esc(curtoFunil(f))}<b>${fmtN(contaFunil(f))}</b></button>`).join("")}</div></div>
        <div class="linha-filtros">
          <div class="campo" style="flex:1 1 260px"><label for="vd-busca">Procurar</label><input id="vd-busca" class="input" type="search" value="${esc(V.busca)}" placeholder="Empresa, título, cidade, produto…" autocomplete="off"></div>
          <div class="campo" style="min-width:200px"><label for="vd-resp">Responsável</label><select id="vd-resp" class="input"><option value="todos">Todos</option>${resps.map((r) => `<option ${V.resp === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></div>
          <div class="campo"><span class="rotulo">Mostrar</span><div class="abas" role="tablist">${STATUS_VD.map(([k, l]) => `<button type="button" role="tab" class="aba" data-acao="vd-status" data-v="${k}" aria-selected="${V.status === k}">${l}</button>`).join("")}</div></div>
        </div>
      </section>
      <div class="vd-resumo"><b>${fmtN(doFunil.length)}</b> ${doFunil.length === 1 ? "negócio" : "negócios"} ${V.status === "em_andamento" ? "em andamento" : V.status === "ganho" ? "ganhos" : V.status === "perdido" ? "perdidos" : ""} no ${esc(curtoFunil(funil))}${total ? ` · <b>${moeda(total)}</b> somados` : ""}</div>
      <div class="quadro vd-quadro">${colunas}</div>
      ${V.perder ? modalPerda() : ""}`;
  }
  // atualiza só o quadro, o resumo e os contadores de Vendas, sem refazer a tela (a busca e a rolagem ficam onde estão)
  function atualizarVendas() {
    const q = app.querySelector(".vd-quadro");
    if (S.view !== "vendas" || !q || S.lg.sel || S.vd.perder || app.querySelector(".vd-modal")) return render();
    const t = document.createElement("template"); t.innerHTML = telaVendas();
    const x = q.scrollLeft;
    for (const sel of [".vd-resumo", ".vd-quadro", '.filtros .chips', '.filtros .abas']) { const a = app.querySelector(sel), b = t.content.querySelector(sel); if (a && b) a.replaceWith(b); }
    app.querySelector(".vd-quadro").scrollLeft = x;
    sincronizarRota();
  }
  function modalPerda() {
    const n = S.vd.negocios.find((x) => x.id === S.vd.perder);
    return `<div class="gaveta-fundo" data-acao="vd-perda-cancelar"></div>
      <div class="vd-modal" role="dialog" aria-modal="true" aria-labelledby="vd-perda-t">
        <form class="pilha" data-acao="vd-perda" style="gap:16px">
          <div class="pilha" style="gap:4px"><h2 id="vd-perda-t">Marcar como perdido</h2><span class="t13 fraco">${esc(n?.empresa || "")}${n?.valor ? ` · ${moeda(n.valor)}` : ""}</span></div>
          <div class="pilha" style="gap:8px"><span class="rotulo">Por que o negócio foi perdido?</span>
            <div class="vd-motivos">${MOTIVOS_PERDA.map((m, i) => `<label class="vd-motivo"><input type="radio" name="motivo" value="${m}" ${i === 0 ? "required" : ""}><span>${m}</span></label>`).join("")}</div></div>
          <div class="linha-flex" style="justify-content:flex-end"><button type="button" class="btn btn-sec" data-acao="vd-perda-cancelar">Cancelar</button><button type="submit" class="btn btn-perigo">Marcar como perdido</button></div>
        </form>
      </div>`;
  }

  S.vd = { carregado: false, carregando: false, funil: null, status: "em_andamento", resp: "todos", busca: "", perder: null, porColuna: {}, negocios: [], funis: [], etapas: [], produtoPorId: new Map(), porFicha: new Map(), etapaPorId: new Map() };
  const mapNeg = (n) => ({ id: n.id, ficha: n.ficha_id, dono: n.usuario_id, titulo: n.titulo, funil: n.funil_id, etapa: n.etapa_id, etapaAnterior: n.etapa_anterior_id, desde: n.etapa_desde || n.atualizado_em, status: n.status, valor: n.valor, motivo: n.motivo_perda,
    responsavel: n.responsavel_agendor || nomePessoa(n.usuario_id) || "", empresa: n.fichas?.nome || n.titulo || "", cidade: n.fichas?.cidade || "", uf: n.fichas?.uf || "", produtos: (n.negocio_produtos || []).map((p) => p.produto_id) });
  const COLS_NEG = "id,ficha_id,usuario_id,titulo,funil_id,etapa_id,etapa_anterior_id,etapa_desde,status,valor,motivo_perda,responsavel_agendor,atualizado_em,fichas(nome,cidade,uf),negocio_produtos(produto_id)";
  const dados = (r) => { if (r.error) throw r.error; return r.data || []; };
  async function carregarVendas() {
    const V = S.vd; if (V.carregando || !S.user) return; V.carregando = true;
    const pessoasP = (S.perfilP || Promise.resolve()).then(garantirPessoas);
    try {
      const [funis, etapas, produtos, negs] = await Promise.all([
        sb.from("funis").select("id,nome,sigla,ordem").eq("ativo", true).order("ordem").then(dados),
        sb.from("etapas").select("id,funil_id,nome,ordem,dias_alerta,resultado").order("funil_id").order("ordem").then(dados),
        sb.from("produtos").select("id,nome").then(dados),
        tudo(() => sb.from("negocios").select(COLS_NEG).order("id"), "negocios"),
      ]);
      await pessoasP;
      V.funis = funis; V.etapas = etapas.map((e) => ({ id: e.id, funil: e.funil_id, nome: e.nome, ordem: e.ordem, alerta: e.dias_alerta, resultado: e.resultado }));
      V.produtoPorId = new Map(produtos.map((p) => [p.id, p]));
      V.negocios = negs.map(mapNeg);
      if (V.funil == null) V.funil = (funis.find((f) => f.sigla === "SCC") || funis[0])?.id;
      derivarVendas(); V.carregado = true;
    } catch (e) { console.error(e); toast("Não deu para carregar os negócios. Tente de novo."); }
    finally { V.carregando = false; aplicarFunilDaRota(); renderDados(); }
  }
  function derivarVendas() {
    const V = S.vd; S.dv = (S.dv || 0) + 1;
    for (const n of V.negocios) {
      n.t = Date.parse(n.desde) || 0;
      n.busca = norm([n.empresa, n.titulo, n.cidade, n.responsavel, ...(n.produtos || []).map((p) => V.produtoPorId.get(p)?.nome)].join(" "));
    }
    V.resps = [...new Set(V.negocios.map((n) => n.responsavel).filter(Boolean))].sort(COLL.compare);
    V.etapaPorId = new Map(V.etapas.map((e) => [e.id, e]));
    V.scc = V.funis.find((f) => f.sigla === "SCC")?.id;
    V.porFicha = new Map();
    // o negócio do funil SCC de cada ficha: o em andamento mais recente; se não houver, o último fechado
    const peso = (n) => (n.status === "em_andamento" ? "1" : "0") + (n.desde || "");
    for (const n of V.negocios) if (n.funil === V.scc) { const a = V.porFicha.get(n.ficha); if (!a || peso(n) > peso(a)) V.porFicha.set(n.ficha, n); }
  }
  async function recarregarNegociosDaFicha(fichaId) {
    if (!S.vd.carregado) return;
    const { data, error } = await sb.from("negocios").select(COLS_NEG).eq("ficha_id", fichaId);
    if (error) return;
    S.vd.negocios = S.vd.negocios.filter((n) => n.ficha !== fichaId).concat((data || []).map(mapNeg)); derivarVendas();
  }
  const etapaSCC = (f) => { const n = S.vd.porFicha.get(f.id); return n ? S.vd.etapaPorId.get(n.etapa) : null; };
  function etapaDaFicha(f) {
    const n = S.vd.porFicha.get(f.id), e = n && S.vd.etapaPorId.get(n.etapa);
    if (!e) return { nome: FUNIL_NOME[f.funil] || "Mapeamento", cor: FUNIL_COR[f.funil] || "s-neutro", ordem: null };
    const cor = n.status === "ganho" || e.resultado === "ganho" ? "s-conf" : n.status === "perdido" || e.resultado === "perdido" ? "s-errado" : e.ordem >= 6 ? "s-roxo" : e.ordem >= 3 ? "s-ident" : "s-neutro";
    return { nome: n.status === "perdido" && e.resultado !== "perdido" ? `${e.nome} · perdido` : e.nome, cor, ordem: e.ordem, negocio: n };
  }
  const agoraISO = () => new Date().toISOString();
  // depois de mudar um negócio: em Vendas troca só o quadro; com a ficha aberta, só o painel dela
  function redesenharNegocios() {
    if (S.view === "vendas" && !S.lg.sel) return atualizarVendas();
    render();
  }
  async function gravarNegocio(n, mud, local, aviso) {
    const antes = { ...n }; Object.assign(n, local); derivarVendas(); redesenharNegocios();
    const { error } = await sb.from("negocios").update(mud).eq("id", n.id);
    if (error) { console.error(error); Object.assign(n, antes); derivarVendas(); toast("Não foi possível salvar. Tente de novo."); redesenharNegocios(); return false; }
    if (aviso) toast(aviso); return true;
  }
  async function moverNegocio(id, etapaId) {
    const V = S.vd, n = V.negocios.find((x) => x.id === id), e = V.etapaPorId.get(etapaId);
    if (!n || !e || n.etapa === etapaId || n.dono !== S.user.id) return;
    const agora = agoraISO();
    if (!(await gravarNegocio(n, { etapa_id: etapaId, etapa_desde: agora }, { etapa: etapaId, desde: agora }, `${n.empresa} foi para ${e.nome}.`))) return;
    if (norm(e.nome) === "follow-up semestral") retornoSemestral(n.ficha);
  }
  async function retornoSemestral(fichaId) {
    const f = S.lg.fichaPorId?.get(fichaId) || S.ag.fichas.find((x) => x.id === fichaId);
    if (f?.retorno_em && diaDe(f.retorno_em) > hojeISO()) return;
    const d = isoData(hojeISO()); d.setUTCMonth(d.getUTCMonth() + 6); let dia = d.toISOString().slice(0, 10);
    while ([0, 6].includes(isoData(dia).getUTCDay())) dia = somaDias(dia, 1);
    const mud = { retorno_em: tsSP(dia, "09:00"), retorno_nota: f?.retorno_nota || "Follow-up semestral" };
    const { error } = await sb.from("fichas").update(mud).eq("id", fichaId);
    if (error) return;
    if (f) Object.assign(f, mud); S.dv++;
    toast(`Retorno marcado para ${ddmmaaaa(dia)} na Agenda.`); carregarAgenda();
  }
  async function ganharNegocio(id) {
    const V = S.vd, n = V.negocios.find((x) => x.id === id); if (!n) return;
    const g = V.etapas.find((e) => e.funil === n.funil && e.resultado === "ganho"), agora = agoraISO();
    await gravarNegocio(n, { status: "ganho", etapa_anterior_id: n.etapa, etapa_id: g ? g.id : n.etapa, etapa_desde: agora, conclusao_em: hojeISO(), motivo_perda: null },
      { status: "ganho", etapaAnterior: n.etapa, etapa: g ? g.id : n.etapa, desde: agora, motivo: null }, `${n.empresa}: negócio ganho${g ? `, foi para ${g.nome}` : ""}. Parabéns!`);
  }
  async function perderNegocio(id, motivo) {
    const n = S.vd.negocios.find((x) => x.id === id); if (!n) return;
    await gravarNegocio(n, { status: "perdido", motivo_perda: motivo, conclusao_em: hojeISO() }, { status: "perdido", motivo }, `${n.empresa}: negócio perdido (${motivo}).`);
  }
  async function reabrirNegocio(id) {
    const n = S.vd.negocios.find((x) => x.id === id); if (!n) return;
    const volta = n.status === "ganho" && n.etapaAnterior ? n.etapaAnterior : n.etapa, agora = agoraISO();
    await gravarNegocio(n, { status: "em_andamento", etapa_id: volta, etapa_anterior_id: null, etapa_desde: agora, conclusao_em: null, motivo_perda: null },
      { status: "em_andamento", etapa: volta, etapaAnterior: null, desde: agora, motivo: null }, `${n.empresa} voltou para ${S.vd.etapaPorId.get(volta)?.nome || "em andamento"}.`);
  }
  // Mover a etapa pela ficha: move o negócio do funil SCC; se a ficha ainda não tem, cria
  async function moverEtapaFicha(fichaId, etapaId) {
    const V = S.vd, n = V.porFicha.get(fichaId);
    if (n) { if (n.status !== "em_andamento") { toast("Esse negócio está fechado. Reabra na aba Vendas para mudar a etapa."); render(); return; } return moverNegocio(n.id, etapaId); }
    const f = S.lg.fichaPorId.get(fichaId); if (!f || f.usuario_id !== S.user.id) return;
    const { data, error } = await sb.from("negocios").insert({ ficha_id: fichaId, usuario_id: S.user.id, titulo: f.nome.slice(0, 200), funil_id: V.scc, etapa_id: etapaId, etapa_desde: agoraISO(), status: "em_andamento", origem: "prospeccao", inicio_em: hojeISO() }).select(COLS_NEG).single();
    if (error) { console.error(error); toast("Não foi possível criar o negócio. Tente de novo."); return; }
    V.negocios.push(mapNeg(data)); derivarVendas(); render();
    const e = V.etapaPorId.get(etapaId); toast(`${f.nome} foi para ${e?.nome}.`);
    if (e && norm(e.nome) === "follow-up semestral") retornoSemestral(fichaId);
  }
  // depois de uma negativa: a ficha vai para a etapa que ela escolheu (Follow-up semestral ou Sem interesse)
  async function destinoNegativa(fichaId, dest) {
    const V = S.vd; if (!V.carregado) return;
    const alvo = V.etapas.find((e) => e.funil === V.scc && e.ordem === (dest === "follow" ? 4 : 5)); if (!alvo) return;
    const n = V.porFicha.get(fichaId);
    if (n && n.etapa === alvo.id && n.status === "em_andamento") return;
    await moverEtapaFicha(fichaId, alvo.id);
  }
  function seletorEtapa(f, cls, id) {
    const V = S.vd; if (!V.carregado) return "";
    const n = V.porFicha.get(f.id), etapas = V.etapas.filter((e) => e.funil === V.scc);
    return `<select ${id ? `id="${id}"` : ""} class="${cls} sel-etapa" data-id="${f.id}" ${n && n.status !== "em_andamento" ? "disabled" : ""}>${n ? "" : '<option value="" selected>Sem negócio no funil SCC</option>'}${etapas.map((e) => `<option value="${e.id}" ${n?.etapa === e.id ? "selected" : ""}>${esc(e.nome)}</option>`).join("")}</select>`;
  }
  const ICONE_RELOGIO = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

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
  // o Início só aparece quando fichas, registros, agenda e negócios chegaram (e a lista da cidade, ou 2,5 s)
  S.inicio = { t0: 0, desenhado: false, timer: null };
  function inicioPronto() {
    const L = S.lg;
    if (!(S.perfil && L.carregado && !L.dono && S.ag.carregado && S.vd.carregado)) return false;
    if (!S.cidade || S.rowsProntas) return true;
    const resta = 2500 - (performance.now() - S.inicio.t0);
    if (resta <= 0) return true;
    clearTimeout(S.inicio.timer); S.inicio.timer = setTimeout(tentarInicio, resta);
    return false;
  }
  function tentarInicio() {
    if (S.view !== "inicio" || S.inicio.desenhado || !S.user || !S.perfil?.aprovado || !app.querySelector(".in-esqueleto")) return;
    if (inicioPronto()) { S.inicio.doEsqueleto = true; render(); S.inicio.doEsqueleto = false; }
  }
  function esqueletoInicio() {
    const barra = (w, h, extra = "") => `<i class="esq-barra" style="width:${w};height:${h}px;${extra}"></i>`;
    const cartao = () => `<section class="in-cartao in-esq-cartao" aria-hidden="true">${barra("55%", 18)}<div class="in-esq-linha">${barra("30%", 56)}${barra("30%", 56)}${barra("30%", 56)}</div>${barra("100%", 44)}${barra("100%", 44)}${barra("70%", 14)}</section>`;
    return `<div class="in-esqueleto" role="status" aria-label="Carregando a página inicial"><section class="in-hero"><div class="in-grade" aria-hidden="true"></div>
      <div class="in-hero-dentro"><div class="pilha in-esq-ola" aria-hidden="true">${barra("190px", 14, "opacity:.5")}${barra("min(420px,70%)", 52)}${barra("min(520px,80%)", 18, "opacity:.6")}</div></div></section>
      <div class="in-cartoes">${cartao()}${cartao()}${cartao()}</div></div>`;
  }
  function telaInicio() {
    if (ehVendedor()) return telaInicioVendedor();
    if (ehPos()) return telaInicioPos();
    if (!S.inicio.desenhado && !inicioPronto()) {
      if (!S.lg.carregado && !S.lg.carregando) carregarLig();
      if (!S.vd.carregado && !S.vd.carregando) carregarVendas();
      return esqueletoInicio();
    }
    S.inicio.desenhado = true;
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
    if (!S.vd.carregado && !S.vd.carregando) carregarVendas();
    const meus = S.vd.negocios.filter((n) => n.dono === S.user.id && n.funil === S.vd.scc);
    const porEtapa = S.vd.etapas.filter((e) => e.funil === S.vd.scc && (e.resultado === "aberta" || e.resultado === "ganho")).map((e) => [e.ordem, e.nome, meus.filter((n) => n.etapa === e.id && (e.resultado === "ganho" ? n.status === "ganho" : n.status === "em_andamento")).length]).filter((x) => x[2] || [1, 3, 6, 12].includes(x[0]));
    const maxE = Math.max(1, ...porEtapa.map((x) => x[2]));
    const corE = { mapeamento: "#9AAAC6", indisponivel: "#9AAAC6", contato: "#2C63DB", follow_semestral: "#FDB601", sem_interesse: "#E3B4AE", demonstracao: "#5B2A86", contrato: "#1E7A46" };
    const Ac = pronto ? acumulado(hj) : null;
    const ind = (v, l, cls) => `<span class="in-num ${cls}"><b class="num">${v}</b><span>${l}</span></span>`;
    return `<section class="in-hero ${S.mesmaTela ? "ja-visto" : ""} ${S.inicio.doEsqueleto ? "de-esq" : ""}"><div class="in-grade" aria-hidden="true"></div><div class="in-aro" aria-hidden="true"></div><div class="in-aro2" aria-hidden="true"></div>
      <div class="in-hero-dentro">
        <div class="pilha in-ola" data-pedaco="ola"><span class="in-data">${esc(dataTxt)}</span><h1>${saud}${nome ? `, ${esc(nome)}` : ""}.</h1><p>${esc(frase)}</p></div>
        <div class="pilha in-cta" data-pedaco="cta">
          ${S.cidade ? `<button type="button" class="in-btn" data-acao="in-continuar">Continuar em ${esc(S.cidade)}/${esc(S.uf)} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
            <span class="in-cta-sub">${aLigar != null ? `${fmtN(aLigar)} ${aLigar === 1 ? "empresa ainda não contatada" : "empresas ainda não contatadas"}` : "abre a próxima empresa da lista"}</span>
            <button type="button" class="in-btn2" data-acao="ir" data-view="mapeamento">Escolher outra cidade</button>`
          : `<button type="button" class="in-btn" data-acao="ir" data-view="mapeamento">Começar a prospectar <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>`}
        </div>
      </div></section>
    <div class="in-cartoes ${S.mesmaTela ? "ja-visto" : ""} ${S.inicio.doEsqueleto ? "de-esq" : ""}">
      ${cartaoConcorrenciaInicio()}
      <section class="in-cartao" data-pedaco="agenda"><div class="in-cab"><h2>Sua agenda de hoje</h2><button type="button" class="in-link" data-acao="ir" data-view="agenda">Ver agenda →</button></div>
        <div class="in-nums">${ind(hojeRet.length, hojeRet.length === 1 ? "retorno" : "retornos", "in-azul")}${ind(atr.length, atr.length === 1 ? "atrasado" : "atrasados", "in-verm")}${ind(hojeDemo.length, hojeDemo.length === 1 ? "demo" : "demos", "in-roxo")}</div>
        ${proximos.length ? `${lista.length ? "" : '<span class="t12 fraco">Nada para hoje. Os próximos:</span>'}<div class="pilha" style="gap:8px">${proximos.map(itemAg).join("")}</div>` : '<span class="t13 fraco">Nenhum retorno marcado. Quando marcar "Ligar de novo" numa ficha, ele aparece aqui.</span>'}
      </section>
      <section class="in-cartao" data-pedaco="dia"><div class="in-cab"><h2>Seu dia até agora</h2><button type="button" class="in-link" data-acao="lg-rel-dia">Relatório do dia →</button></div>
        ${m ? `<div class="in-grande"><b class="num">${fmtN(m.ligacoes)}</b><span>${m.ligacoes === 1 ? "contato" : "contatos"}${m.pessoas ? ` com ${fmtN(m.pessoas)} ${m.pessoas === 1 ? "administradora" : "administradoras"}` : " hoje"}</span></div>
        <div class="in-mini">${[["Contatos novos", m.primeira_ligacao], ["Follow-ups", m.follow_up], ["Sem contato", m.sem_contato], ["Demos agendadas", m.demo_agendada]].map(([l, v]) => `<span><span class="fraco">${l}</span><b class="num">${fmtN(v)}</b></span>`).join("")}</div>
        <div class="pilha" style="gap:6px"><span class="t12 fraco">Contatos por hora</span><div class="in-barras" aria-hidden="true">${horas.map(([h, v]) => `<i style="height:${v ? Math.max(10, Math.round((v / maxH) * 100)) : 6}%" class="${h === horaAgora ? "agora" : v ? "tem" : ""}" title="${h}h: ${v}"></i>`).join("")}</div><span class="in-eixo"><span>8h</span><span>12h</span><span>16h</span><span>19h</span></span></div>`
        : '<span class="t13 fraco">Carregando…</span>'}
      </section>
      <section class="in-cartao" data-pedaco="adms"><div class="in-cab"><h2>Suas administradoras</h2><button type="button" class="in-link" data-acao="ir" data-view="vendas">Ver funil →</button></div>
        ${pronto ? `<div class="pilha" style="gap:9px">${porEtapa.map(([k, l, v]) => `<span class="in-etapa"><span class="fraco">${l}</span><span class="in-trilho"><i style="width:${v ? Math.max(3, Math.round((v / maxE) * 100)) : 0}%;background:${corE[k]}"></i></span><b class="num">${fmtN(v)}</b></span>`).join("")}</div>
        <div class="in-acum"><b>${fmtN(Ac.demos.length)} ${Ac.demos.length === 1 ? "demonstração" : "demonstrações"}</b> e <b>${fmtN(Ac.contratos.length)} ${Ac.contratos.length === 1 ? "contrato" : "contratos"}</b> no acumulado. ${periodo === "noite" ? "Amanhã tem mais." : "Falta pouco para a próxima."}</div>` : '<span class="t13 fraco">Carregando…</span>'}
      </section>
    </div>`;
  }

  function campoFicha(k, label, f, ro) {
    const v = f?.[k] ?? "", dis = ro ? "disabled" : "";
    if (k === "uf") return `<div class="campo"><label for="fx-uf">${label}</label><select id="fx-uf" name="uf" class="input" ${dis}><option value=""></option>${UFS.map(([u]) => `<option ${v === u ? "selected" : ""}>${u}</option>`).join("")}</select></div>`;
    if (k === "sistema") {
      const atual = v ? nomeSistema(v) : "", lista = sistemasConhecidos();
      return `<div class="campo"><label for="fx-sistema">${label}</label><select id="fx-sistema" name="sistema" class="input" ${dis}><option value="">Não sei ainda</option>${lista.map((n) => `<option value="${esc(n)}" ${n === atual ? "selected" : ""}>${esc(n === NOSSO ? "SCC Online (PRG) · já é cliente" : n)}</option>`).join("")}${atual && !lista.includes(atual) ? `<option selected>${esc(atual)}</option>` : ""}<option value="__outro">Outro sistema…</option></select>
        <input name="sistema_outro" class="input" maxlength="80" placeholder="Nome do sistema" hidden style="margin-top:6px"></div>`;
    }
    const tipo = k.startsWith("qtd_") ? 'type="number" min="0"' : k === "email" ? 'type="email"' : "";
    return `<div class="campo ${["nome", "telefones", "melhor_horario"].includes(k) ? "campo-largo" : ""}"><label for="fx-${k}">${label}</label><input id="fx-${k}" name="${k}" class="input" ${tipo} value="${esc(v)}" ${k === "nome" ? "required maxlength=\"200\"" : ""} ${dis}></div>`;
  }
  // no cadastro os campos vêm agrupados por assunto, na ordem em que a conversa costuma acontecer
  const GRUPOS_CADASTRO = [
    ["A administradora", ["nome", "cnpj", "sistema", "cidade", "uf", "qtd_condominios", "qtd_unidades", "horario_funcionamento"]],
    ["Quem atende", ["atendente", "responsavel", "numero_responsavel", "melhor_horario"]],
    ["Como falar", ["telefones", "whatsapp", "email"]],
  ];
  function camposAgrupados(f) {
    const rot = Object.fromEntries(CAMPOS);
    return GRUPOS_CADASTRO.map(([t, ks]) => `<div class="rg-grupo campo-largo"><span class="rg-grupo-t">${t}</span><div class="rg-grupo-campos">${ks.map((k) => campoFicha(k, rot[k], f, false).replace('class="campo campo-largo"', `class="campo ${["nome", "telefones"].includes(k) ? "rg-duplo" : ""}"`)).join("")}</div></div>`).join("");
  }
  function camposDados(f, ro, agrupado) {
    return `<div class="lg-form">
      ${agrupado ? camposAgrupados(f) : CAMPOS.map(([k, l]) => campoFicha(k, l, f, ro)).join("")}
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
  // a ficha abre no cadastro enquanto ninguém atendeu de verdade; depois, direto no registro do contato
  const primeiraConversa = (f) => !f?.id || !(jaLigou(f) || (etapaSCC(f)?.ordem || 0) >= 3 || ["contato", "follow_semestral", "sem_interesse", "demonstracao", "contrato"].includes(f.funil));
  function passoDoForm(f, op) {
    const L = S.lg, chave = f?.id || op.cnpj || "novo";
    if (L.passo && L.passo.k === chave) return L.passo.v;
    return primeiraConversa(f) ? "dados" : "contato";
  }
  // retorno do follow-up semestral: daqui a 6 meses, em dia útil
  function diaSemestral() {
    const d = isoData(hojeISO()); d.setUTCMonth(d.getUTCMonth() + 6); let dia = d.toISOString().slice(0, 10);
    while ([0, 6].includes(isoData(dia).getUTCDay())) dia = somaDias(dia, 1);
    return dia;
  }
  function resumoCadastro(d) {
    const item = (l, v) => `<div class="rg-res-item"><span>${l}</span><b>${v ? esc(v) : '<i class="fraco">não informado</i>'}</b></div>`;
    return `<div class="rg-res-cab"><b>Cadastro</b><button type="button" class="mini" data-acao="lg-passo" data-v="dados">Editar cadastro</button></div>
      <div class="rg-res-grade">${item("Responsável", d.responsavel)}${item("Quem atendeu", d.atendente)}${item("Telefones", d.telefones)}${item("WhatsApp", d.whatsapp)}${item("E-mail", d.email)}${item("Melhor horário", d.melhor_horario)}${item("Sistema", d.sistema)}${item("Condomínios", d.qtd_condominios ? fmtN(+d.qtd_condominios) : "")}</div>`;
  }
  function ultimosContatos(f) {
    const regs = f?.id ? [...(S.lg.porFicha.get(f.id) || [])].reverse().slice(0, 4) : [];
    if (!regs.length) return `<div class="rg-ult"><b>Últimos contatos</b><span class="t12 fraco">Primeiro contato com esta administradora.</span></div>`;
    return `<div class="rg-ult"><b>Últimos contatos</b>${regs.map((r) => `<div class="rg-ult-item"><span class="t12 fraco num">${ddmmaaaa(r.data)}</span><span class="t13">${esc(rotuloReg(r))}</span>${r.texto ? `<span class="t12 fraco">${esc(r.texto.length > 120 ? r.texto.slice(0, 120) + "…" : r.texto)}</span>` : ""}</div>`).join("")}</div>`;
  }
  function formLigacao(f, op = {}) {
    const L = S.lg, hj = hojeISO(), existe = !!f?.id;
    const ret = f?.retorno_em ? localSP(f.retorno_em) : "", retDia = ret.slice(0, 10), vence = ret && retDia <= hj;
    const passo = passoDoForm(f, op), editar = passo === "editar", noCadastro = passo !== "contato";
    const semestral = diaSemestral();
    return `<form class="pilha lg-lig" style="gap:16px" data-acao="lg-salvar" autocomplete="off" novalidate ${existe ? `data-ficha="${f.id}"` : ""} ${op.cnpj ? `data-origem="mapa" data-cnpj="${esc(op.cnpj)}"` : ""} data-chave="${esc(f?.id || op.cnpj || "novo")}">
      <input type="hidden" name="retorno_orig" value="${esc(ret)}">
      ${editar ? "" : `<div class="rg-etapas" role="tablist" aria-label="Etapas">
        <button type="button" class="rg-etapa" data-acao="lg-passo" data-v="dados" role="tab" aria-selected="${noCadastro}"><i>1</i>Cadastro</button>
        <span class="rg-etapa-linha" aria-hidden="true"></span>
        <button type="button" class="rg-etapa" data-acao="lg-passo" data-v="contato" role="tab" aria-selected="${!noCadastro}"><i>2</i>Registrar contato</button>
      </div>`}

      <section class="rg-passo rg-cadastro" data-passo="dados" ${noCadastro ? "" : "hidden"}>
        <div class="rg-passo-cab"><b>${editar ? "Editar cadastro" : "Cadastro da administradora"}</b><span class="t12 fraco">${editar ? "Mude o que precisar e salve." : "Preencha enquanto conversa. Depois ele fica só para consulta."}</span></div>
        ${camposDados(f, false, true)}
        <div class="rg-rodape">${editar
          ? `<button type="button" class="btn btn-sec" data-acao="lg-voltar-ficha">Cancelar</button><button type="submit" name="modo" value="dados" class="btn btn-primario">Salvar cadastro</button>`
          : `<button type="submit" name="modo" value="dados" class="btn btn-sec">${existe ? "Salvar só o cadastro" : op.cnpj ? "Só guardar a ficha" : "Só criar a ficha"}</button><button type="button" class="btn btn-primario" data-acao="lg-passo" data-v="contato">Registrar contato →</button>`}
          ${editar ? "" : '<span class="t12 fraco rg-rodape-nota">O cadastro é salvo junto com o contato.</span>'}</div>
      </section>

      <section class="rg-passo rg-registro" data-passo="contato" ${noCadastro ? "hidden" : ""}>
        <div class="rg-grade">
          <div class="pilha" style="gap:14px;min-width:0">
            <div class="caixa-cinza rg-caixa"><b>Registrar contato</b>
              <div class="rg-linha2">
                <div class="campo"><label for="rg-data">Dia</label><input id="rg-data" name="data" type="date" class="input" value="${hj}" max="${hj}"></div>
                <div class="campo" style="min-width:0"><span class="rotulo">Contato feito por</span><div class="chips">${Object.entries(CANAL).map(([k, l], i) => `<label class="chip-radio"><input type="radio" name="canal" value="${k}" ${i === 0 ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
              </div>
              <fieldset class="rg-res"><legend class="rotulo">O que aconteceu</legend>
                <div class="rg-opcoes">${OPCOES.map(([k, l]) => `<label class="chip-radio"><input type="radio" name="res" value="${k}"><span>${l}</span></label>`).join("")}</div>
                <label class="rg-so-anot"><input type="radio" name="res" value="anotacao"><span>Só anotação (não conta no relatório)</span></label></fieldset>
              <div id="rg-neg" class="rg-neg" hidden>
                <span class="rotulo">Para onde vai essa negativa?</span>
                <div class="rg-opcoes rg-opcoes2"><label class="chip-radio"><input type="radio" name="neg_destino" value="follow"><span>Follow-up semestral</span></label><label class="chip-radio"><input type="radio" name="neg_destino" value="sem"><span>Sem interesse</span></label></div>
                <div id="rg-neg-follow" class="linha-flex" style="align-items:flex-end;gap:12px" hidden><div class="campo" style="min-width:160px"><label for="rg-neg-data">Próximo contato</label><input id="rg-neg-data" name="neg_retorno" type="date" class="input" value="${semestral}" min="${hj}"></div><span class="t12 fraco" style="padding-bottom:10px">Daqui a 6 meses. Se quiser, mude a data.</span></div>
                <span id="rg-neg-sem" class="t12 fraco" hidden>Sai das listas de ligação e vai para a aba <b>Sem interesse</b>. Depois de 1 ano ela fica marcada como pronta para retomar, mas só volta quando você clicar em <b>Retomar contato</b>.</span>
              </div>
              <span class="rotulo">Enviei a apresentação por</span>
              <div class="linha-flex" style="gap:8px">${Object.entries(ENVIO).map(([k, l]) => `<label class="chip-radio chip-check"><input type="checkbox" name="envio" value="${k}"><span>${k === "email" ? "E-mail" : l}</span></label>`).join("")}
                <span class="linha-flex" style="gap:6px;margin-left:auto"><button type="button" class="mini mini-ok" data-acao="lg-abrir-wpp">Abrir WhatsApp</button><button type="button" class="mini" data-acao="lg-abrir-email">Abrir e-mail</button></span></div>
              <div id="rg-demo" class="linha-flex" hidden><div class="campo"><label for="rg-demo-em">Dia e hora da demonstração</label><input id="rg-demo-em" name="rg_demo_em" type="datetime-local" class="input" value="${esc(f?.demo_em ? localSP(f.demo_em) : "")}" max="${esc(localSP(new Date().toISOString()).slice(0, 10))}T23:59"></div><div class="campo"><label for="rg-formato">Formato</label><select id="rg-formato" name="rg_formato" class="input"><option value="virtual">Virtual</option><option value="presencial" ${f?.demo_formato === "presencial" ? "selected" : ""}>Presencial</option></select></div><div class="campo" id="rg-apres-c" hidden><label for="rg-apres">Quem apresentou</label><select id="rg-apres" name="rg_apresentador" class="input"><option value="Leonardo">Leonardo</option><option value="Matheus">Matheus (cobrindo férias)</option></select></div></div>
              <div id="rg-painel" class="rg-painel" hidden></div>
              <div class="campo"><label for="rg-texto">Anotação</label><textarea id="rg-texto" name="texto" class="input lg-texto" rows="3" placeholder="Com quem falou, o que disse, próximo passo…"></textarea></div>
            </div>
            <div class="caixa-cinza" id="rg-ligar"><b>Ligar de novo</b>
              <div class="chips">${[[1, "Amanhã"], [2, "Em 2 dias"], [5, "Em 1 semana"], [10, "Em 2 semanas"]].map(([n, l]) => `<button type="button" class="mini" data-acao="lg-ret" data-d="${n}">${l}</button>`).join("")}<button type="button" class="mini" data-acao="lg-ret" data-d="0">Sem retorno</button></div>
              <div class="linha-flex" style="align-items:flex-end;gap:12px">
                <div class="campo" style="min-width:150px"><label for="rt-data">Dia</label><input id="rt-data" name="retorno_data" type="date" class="input" value="${esc(retDia)}" min="${vence ? retDia : hj}"></div>
                <div class="campo" style="min-width:110px"><label for="rt-hora">Hora</label><input id="rt-hora" name="retorno_hora" type="time" class="input" value="${esc(ret.slice(11, 16))}"></div>
                <div class="campo" style="flex:1 1 200px"><label for="rt-nota">Lembrete</label><input id="rt-nota" name="retorno_nota" class="input" maxlength="300" value="${esc(f?.retorno_nota || "")}" placeholder="Ex.: falar com a Isabeli"></div>
              </div>
              <span class="t12 fraco">${vence ? `Este retorno é de ${retDia === hj ? "hoje" : ddmm(retDia)}: ao salvar o contato ele sai da agenda. Para marcar outro, mude o dia.` : "Sem hora, o aviso chega às 9h. O retorno aparece na Agenda e você recebe um aviso no horário."}</span>
            </div>
            ${op.cnpj ? `<label class="lg-check"><input type="checkbox" name="proxima" ${L.proxima !== false ? "checked" : ""}> <span>Depois de salvar, abrir a próxima da lista</span></label>` : ""}
            <div class="linha-flex rg-salvar"><button type="submit" name="modo" value="ligacao" class="btn btn-primario">${existe ? "Salvar contato" : op.cnpj ? "Salvar contato" : "Criar e salvar contato"}</button><span class="rg-conta t12" id="rg-conta" aria-live="polite">Escolha o que aconteceu.</span></div>
          </div>
          <aside class="rg-lado"><div class="rg-resumo" id="rg-resumo">${resumoCadastro(f || {})}</div>${ultimosContatos(f)}</aside>
        </div>
      </section>
    </form>`;
  }
  // troca de etapa sem redesenhar: o que foi digitado fica no formulário
  function irPasso(form, v, silencioso) {
    if (!form) return;
    if (v === "contato" && !String(form.elements.nome?.value || "").trim()) { toast("Informe o nome da administradora."); form.elements.nome?.focus(); return; }
    S.lg.passo = { k: form.dataset.chave, v };
    form.querySelectorAll(".rg-passo").forEach((s) => (s.hidden = s.dataset.passo !== v));
    form.querySelectorAll(".rg-etapa").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.v === v)));
    if (v === "contato") { const r = form.querySelector("#rg-resumo"); if (r) r.innerHTML = resumoCadastro({ ...Object.fromEntries(CAMPOS.map(([k]) => [k, String(form.elements[k]?.value ?? "").trim()])), sistema: sistemaDoForm(form) || "" }); }
    if (!silencioso) { (form.closest(".painel") || form).scrollIntoView?.({ block: "start" }); document.querySelector(".gaveta .painel")?.scrollTo(0, 0); }
  }
  function atualizarNegativa(form) {
    const neg = form.querySelector('[name="res"]:checked')?.value === "negativa", dest = form.querySelector('[name="neg_destino"]:checked')?.value;
    const b = form.querySelector("#rg-neg"); if (!b) return;
    b.hidden = !neg;
    form.querySelector("#rg-neg-follow").hidden = !(neg && dest === "follow");
    form.querySelector("#rg-neg-sem").hidden = !(neg && dest === "sem");
    // a negativa decide o próximo contato: o "Ligar de novo" sai de cena
    const lig = form.querySelector("#rg-ligar"); if (lig) lig.hidden = neg;
  }

  /* ---- ficha da administradora: pilha de contatos (visual de gaveta.js) */
  const CURTO = { nao_atende: "Sem contato", caixa_postal: "Sem contato", numero_invalido: "Sem contato", conversou: "Conversa", material_enviado: "Material", pediu_retorno: "Retorno", sem_abertura: "Conversa", negativa: "Sem interesse", demo_agendada: "Demo", demo_realizada: "Demo feita", contrato: "Contrato", anotacao: "Anotação" };
  const SELO_RES = { sem_contato: "Sem contato", negativa: "Sem interesse", demo_agendada: "Demo agendada", demo_realizada: "Demo realizada", contrato: "Contrato fechado", anotacao: "Anotação" };
  function visualReg(r) {
    const ds = r.detalhes?.length ? r.detalhes : r.detalhe ? [r.detalhe] : [r.tipo];
    const envio = r.envio?.length || ds.includes("material_enviado");
    let cor = "azul", cat = "conversa", curto = CURTO[ds[0]] || "Contato", selo = SELO_RES[r.tipo] || (envio ? "Material enviado" : ds.includes("pediu_retorno") ? "Pediu retorno" : "Conversa");
    if (r.tipo === "sem_contato") { cor = "vermelho"; cat = "sem"; curto = "Sem contato"; }
    else if (r.tipo === "negativa") { cor = "vermelho"; curto = "Sem interesse"; }
    else if (["demo_agendada", "demo_realizada"].includes(r.tipo)) { cor = "roxo"; cat = "demo"; curto = r.tipo === "demo_realizada" ? "Demo feita" : "Demo"; }
    else if (r.tipo === "contrato") { cor = "verde"; cat = "demo"; curto = "Contrato"; }
    else if (envio) { cor = "amarelo"; curto = "Material"; }
    else if (r.tipo === "conversou") curto = ds.includes("pediu_retorno") ? "Retorno" : "Conversa";
    return { cor, cat, curto, selo };
  }
  const textoReg = (r) => (r.texto ? `<p class="mc-texto">${esc(r.texto).replace(/\n/g, "<br>")}</p>` : `<p class="mc-texto" style="color:#5B6475">Sem anotação.</p>`);
  // enquanto o texto da anotação importada não chega: um espaço reservado do mesmo tamanho
  const TEXTO_CARREGANDO = (id) => `<p class="mc-texto mc-esqueleto" data-texto="${id}" aria-label="Carregando a anotação"><span></span><span></span></p>`;
  function tituloReg(r) {
    const t = String(r.texto || "").replace(/\s+/g, " ").trim();
    if (!t) return rotuloRes(r);
    const frase = t.split(/(?<=[.!?])\s/)[0];
    return frase.length > 78 ? frase.slice(0, 76).replace(/\s+\S*$/, "") + "…" : frase.replace(/[.]$/, "");
  }
  const diasEntre = (a, b) => Math.round((isoData(b) - isoData(a)) / 864e5);
  function fichaGaveta(f, ro) {
    const L = S.lg, hj = hojeISO(); garantirTextos(f.id);
    const regs = [...(L.porFicha.get(f.id) || [])].reverse();
    const lig = regs.filter((r) => r.tipo !== "anotacao");
    // histórico longo: os 20 mais recentes, e mais 20 a cada clique
    const visiveis = regs.slice(0, L.gvTodos === f.id ? L.gvMostrar || 20 : 20);
    const aberto = regs.some((r) => r.id === L.gvAberto) && visiveis.some((r) => r.id === L.gvAberto) ? L.gvAberto : visiveis[0]?.id;
    const ef = etapaDaFicha(f), semInt = ef.ordem === 5 || ef.ordem === 10 || f.funil === "sem_interesse";
    const passo = ef.ordem != null ? (ef.ordem <= 2 ? 0 : ef.ordem <= 5 ? 1 : ef.ordem <= 11 ? 2 : 3) : { mapeamento: 0, indisponivel: 0, contato: 1, follow_semestral: 1, sem_interesse: 1, demonstracao: 2, contrato: 3 }[f.funil || "mapeamento"];
    const passos = ["Mapeamento", "Contato", "Demonstração", "Contrato"].map((l, i) => `<span class="mc-passo ${i < passo || (i === 3 && passo === 3) ? "feito" : i === passo ? "agora" : ""}"><i></i>${i === passo && ef.ordem != null && ![1, 3, 6, 12].includes(ef.ordem) ? esc(ef.nome) : i === 1 && semInt ? "Sem interesse" : l}</span>`).join("");
    const demoFut = f.demo_em && f.etapa === "demo_agendada" && diaDe(f.demo_em) >= hj ? f.demo_em : null;
    const primeiro = regs.length ? regs[regs.length - 1].data : null, ultimo = regs[0]?.data;
    const terceiro = demoFut ? [diasEntre(hj, diaDe(demoFut)), diasEntre(hj, diaDe(demoFut)) === 1 ? "dia para a demo" : "dias para a demo"]
      : f.retorno_em && diaDe(f.retorno_em) >= hj ? [diasEntre(hj, diaDe(f.retorno_em)), diasEntre(hj, diaDe(f.retorno_em)) === 1 ? "dia para o retorno" : "dias para o retorno"]
      : ultimo ? [diasEntre(ultimo, hj), diasEntre(ultimo, hj) === 1 ? "dia sem contato" : "dias sem contato"] : [0, "dias sem contato"];
    const conversa = primeiro ? diasEntre(primeiro, hj) : 0;
    const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
    const I = { cidade: ic('<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'), pessoa: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'), tel: ic('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'), email: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'), fone: ic('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'), relogio: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), wpp: ic('<path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12z"/>'), nota: ic('<path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h4"/>'), predio: ic('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>') };
    const dados = [
      ["cidade", "Cidade", [f.cidade, f.uf].filter(Boolean).join(" - ")],
      ["pessoa", "Responsável", f.responsavel],
      ["fone", "Atendente", f.atendente],
      ["relogio", "Melhor horário", f.melhor_horario],
      ["relogio", "Funcionamento", f.horario_funcionamento],
      ["predio", "Unidades", f.qtd_unidades ? fmtN(f.qtd_unidades) : ""],
      ["nota", "Informações adicionais", f.observacoes, false, true],
    ].filter((d) => d[2]).map(([i, l, v, html, largo]) => `<div class="mc-dado ${largo ? "mc-largo-sempre" : ""}"><span>${I[i]}${l}</span><b>${html ? v : esc(v)}</b></div>`).join("");
    const proximo = demoFut ? `Demonstração ${f.demo_formato === "presencial" ? "presencial" : "virtual"} ${quandoTxt(demoFut).toLowerCase().replace(" · ", " às ")}.`
      : f.retorno_em ? `${diaDe(f.retorno_em) < hj ? "Retorno atrasado: era" : "Ligar de novo"} ${quandoTxt(f.retorno_em).toLowerCase().replace(" · ", " às ")}${f.retorno_nota ? `. ${f.retorno_nota}` : ""}.`
      : (ef.ordem != null ? ef.negocio?.status === "ganho" || passo === 3 : f.funil === "contrato") ? "Contrato fechado. Agora é com o time de implantação." : "Nenhum próximo passo marcado ainda.";
    const atrasado = !demoFut && f.retorno_em && diaDe(f.retorno_em) < hj;
    const filtro = L.histFiltro?.f === f.id ? L.histFiltro.v : "todas";
    const itens = visiveis.map((r) => {
      const v = visualReg(r), h = horaReg(r), q = `${ddmm(r.data)}${h ? ` às ${h}` : ""}`;
      const ds = r.detalhes?.length ? r.detalhes : r.detalhe ? [r.detalhe] : [];
      const chips = [r.canal ? CANAL[r.canal] : r.tipo === "anotacao" ? "" : CANAL.ligacao, ...ds.map((k) => NOME_BOTAO[k] || k), ...(r.envio || []).map((k) => `Apresentação por ${ENVIO[k] || k}`)];
      const meta = [contaComoContato(r) ? (r.nova ? "Contato novo" : "Follow-up") : { sem_contato: "Sem contato", demo_realizada: "Demonstração", contrato: "Contrato", anotacao: "Anotação" }[r.tipo] || "Registro", L.dono === "todos" ? nomePessoa(r.usuario_id) : ""].filter(Boolean).join(" · ");
      return `<li class="fc-reg" data-cat="${v.cat}" data-cor="${v.cor}" ${filtro !== "todas" && filtro !== v.cat ? "hidden" : ""}><details ${r.id === aberto ? "open" : ""} data-id="${r.id}">
        <summary><span class="fc-reg-quando">${esc(q)}</span><span class="fc-reg-tit">${r.texto === undefined ? `<span class="mc-esq-tit" data-texto="${r.id}"></span>` : esc(tituloReg(r))}</span><span class="fc-reg-selo">${esc(v.selo)}</span></summary>
        <div class="fc-reg-corpo"><div class="mc-chips">${chips.filter(Boolean).map((c) => `<span class="mc-chip">${esc(c)}</span>`).join("")}</div>
          <span class="mc-meta">${esc(meta)}</span>
          ${r.texto === undefined ? TEXTO_CARREGANDO(r.id) : textoReg(r)}
          ${ro ? "" : `<div class="mc-rodape"><button type="button" class="fc-apagar" data-acao="lg-apagar-reg" data-id="${r.id}">${L.apagar === r.id ? "Confirmar: apagar este registro" : "Apagar"}</button></div>`}</div>
      </details></li>`;
    }).join("");
    const filtros = [["todas", "Todos"], ["conversa", "Conversas"], ["sem", "Sem contato"], ["demo", "Demos"]].map(([k, l]) => `<button type="button" class="fc-filtro" data-acao="fc-filtro" data-v="${k}" data-ficha="${f.id}" aria-pressed="${k === filtro}">${l}</button>`).join("");
    L.gvVisto = f.id;
    return `<section class="fc" aria-label="Ficha de ${esc(f.nome)}">
      <div class="fc-barra"><button type="button" class="fc-voltar" data-acao="voltar">← Voltar</button></div>
      <header class="fc-cab">
        <div class="fc-id">
          <p class="fc-olho">Ficha da administradora${ro ? ` · ${esc(nomePessoa(f.usuario_id))}` : ""}</p>
          <h2 class="fc-nome">${esc(f.nome)}</h2>
          <div class="fc-selos"><span class="fc-selo fc-selo-etapa">${esc(ef.nome)}</span>${f.cidade ? `<span class="fc-selo">${esc([f.cidade, f.uf].filter(Boolean).join(" - "))}</span>` : ""}${ef.negocio?.valor ? `<span class="fc-selo">${moeda(ef.negocio.valor)}</span>` : ""}${f.sistema ? `<span class="fc-selo">${esc(f.sistema)}</span>` : ""}${f.qtd_condominios ? `<span class="fc-selo">${fmtN(f.qtd_condominios)} condomínios</span>` : ""}${fezDemo(f) && f.funil !== "demonstracao" ? '<span class="fc-selo">Fez demonstração</span>' : ""}</div>
        </div>
        <div class="fc-prox ${atrasado ? "fc-prox-atrasado" : ""}">
          <span class="fc-prox-k">Próximo passo</span>
          <p class="fc-prox-t">${esc(proximo)}</p>
          ${ro ? "" : `<div class="fc-prox-acoes"><button type="button" class="btn btn-primario" data-acao="lg-registrar">Registrar contato</button><button type="button" class="btn btn-sec" data-acao="lg-registrar" data-v="dados">Editar dados</button></div>`}
        </div>
      </header>
      <div class="fc-faixa">
        <div class="mc-jornada" style="--mc-passo: ${passo}" aria-label="Etapa atual: ${esc(ef.nome)}">${passos}</div>
        <div class="fc-numeros">
          <div><b>${lig.length}</b><span>${lig.length === 1 ? "contato" : "contatos"}</span></div>
          <div><b>${conversa}</b><span>${conversa === 1 ? "dia de conversa" : "dias de conversa"}</span></div>
          <div><b>${terceiro[0]}</b><span>${terceiro[1]}</span></div>
        </div>
        ${ro || !S.vd.carregado ? "" : `<label class="fc-etapa">Etapa no funil SCC ${seletorEtapa(f, "")}</label>`}
      </div>
      <div class="fc-grade">
        <div class="fc-col">
          ${(() => { const reg = garantirFx(f.id); return blocoCanais(f, reg.emp, reg.contatos, reg.estado === "carregando"); })()}
          ${dados ? `<div class="fc-cartao"><h3 class="fc-tit">Dados</h3><div class="mc-dados">${dados}</div></div>` : ""}
          ${painelFx(f, ro)}
        </div>
        <section class="fc-cartao fc-hist" aria-label="Histórico de contatos">
          <div class="fc-hist-cab"><h3 class="fc-tit">Histórico</h3>${regs.length ? `<div class="fc-filtros" role="group" aria-label="Filtrar contatos">${filtros}</div>` : ""}</div>
          ${regs.length ? `<ol class="fc-lista">${itens}</ol>${regs.length > visiveis.length ? `<button type="button" class="fc-mais" data-acao="lg-gv-todos" data-id="${f.id}">Ver mais ${fmtN(Math.min(20, regs.length - visiveis.length))} contatos antigos (faltam ${fmtN(regs.length - visiveis.length)})</button>` : ""}`
          : `<p class="fc-vazio">Nenhum contato registrado ainda. Cada contato que você registrar aparece aqui.</p>`}
        </section>
      </div></section>`;
  }
  function painelFicha() {
    const L = S.lg;
    if (L.novo) return `<aside class="cartao painel painel-lg" aria-label="Nova administradora"><button type="button" class="mini fechar-painel" data-acao="lg-fechar">Fechar ✕</button><div class="pilha"><h2>Nova administradora</h2><span class="t13 fraco">Preencha o que souber. Se já estiver ligando, registre o contato no mesmo lugar.</span></div>${formLigacao(null)}</aside>`;
    const f = L.sel && L.fichaPorId.get(L.sel);
    if (!f) return `<aside class="cartao painel painel-lg" data-vazio="true"><div class="painel-vazio"><span class="painel-vazio-icone">${ICONE.busca}</span><b>Nenhuma administradora aberta</b><span class="fraco t13">Clique numa administradora da lista para ver a ficha, o histórico e registrar um contato.</span></div></aside>`;
    const ro = f.usuario_id !== S.user.id;
    if (L.registrar !== f.id) return `<aside class="cartao painel painel-lg ficha-clara" aria-label="Ficha da administradora"><button type="button" class="mini fechar-painel" data-acao="lg-fechar">Fechar ✕</button>${fichaGaveta(f, ro)}</aside>`;
    const regs = [...(L.porFicha.get(f.id) || [])].reverse();
    const { nome: el, cor: ec } = etapaDaFicha(f);
    const tels = String(f.telefones || "").split(/[|,/]| e /).map((t) => t.trim()).filter((t) => t.replace(/\D/g, "").length >= 10);
    const wpp = String(f.whatsapp || "").replace(/\D/g, "");
    const links = (wpp.length >= 10 ? `<a class="mini mini-ok" target="_blank" rel="noopener" href="https://wa.me/55${wpp.slice(-11)}">WhatsApp ${esc(f.whatsapp)}</a>` : "") + tels.slice(0, 3).map((t) => { const n = t.replace(/\D/g, ""); return `<a class="mini" href="tel:+55${n}">Ligar ${esc(t.replace(/\s*(wpp|whats.*|google)\s*$/i, ""))}</a>${/^\d{2}9/.test(n) ? `<a class="mini mini-ok" target="_blank" rel="noopener" href="https://wa.me/55${n}">WhatsApp</a>` : ""}`; }).join("");
    if (ro) return `<aside class="cartao painel painel-lg" aria-label="Ficha da administradora">
      <button type="button" class="mini fechar-painel" data-acao="lg-fechar">Fechar ✕</button>
      <button type="button" class="mini mc-voltar" data-acao="lg-voltar-ficha">← Voltar à ficha</button>
      <div class="pilha"><span class="t11 fraco" style="font-weight:700;text-transform:uppercase;letter-spacing:.05em">Ficha da administradora · ${esc(nomePessoa(f.usuario_id))}</span><h2>${esc(f.nome)}</h2><span class="linha-flex" style="gap:6px"><span class="selo ${ec}">${el}</span></span></div>
      <details class="lg-bloco" open><summary><b>Dados da administradora</b></summary>${camposDados(f, true)}</details>
    </aside>`;
    return `<aside class="cartao painel painel-lg rg-painel-lg" aria-label="Ficha da administradora">
      <button type="button" class="mini fechar-painel" data-acao="lg-fechar">Fechar ✕</button>
      <div class="rg-cab">
        <div class="pilha" style="gap:6px;min-width:0">
          <button type="button" class="rg-voltar" data-acao="lg-voltar-ficha">← Ficha da administradora</button>
          <h2>${esc(f.nome)}</h2>
          <span class="linha-flex" style="gap:6px;align-items:center"><span class="t13 fraco">${esc([f.cidade, f.uf].filter(Boolean).join(" - ") || "Cidade não informada")}</span>${f.sistema ? `<span class="selo s-sis">${esc(f.sistema)}</span>` : ""}${f.demo_em ? `<span class="selo s-roxo">Demo ${esc(dataHoraBR(f.demo_em))}</span>` : ""}${f.retorno_em ? celulaRetorno(f) : ""}${f.retorno_nota && f.retorno_em ? `<span class="t12 fraco">${esc(f.retorno_nota)}</span>` : ""}</span>
        </div>
        <div class="rg-cab-dir">
          ${links ? `<span class="linha-flex" style="gap:6px;justify-content:flex-end">${links}</span>` : ""}
          ${S.vd.carregado ? `<label class="rg-etapa-sel"><span>Etapa no funil SCC</span>${seletorEtapa(f, "input", "fx-etapa")}</label>` : ""}
        </div>
      </div>
      ${formLigacao(f)}
      <div class="acoes-painel"><button type="button" class="btn btn-perigo" data-acao="lg-apagar-ficha" data-id="${f.id}">${L.apagar === f.id ? "Clique de novo para apagar" : "Apagar ficha"}</button></div>
    </aside>`;
  }

  const igual = (k, a, b) => (k.endsWith("_em") && k !== "contrato_em" ? localSP(a) === localSP(b) : (a ?? null) === (b ?? null));
  async function salvarTudo(form, modo) {
    const L = S.lg, fd = new FormData(form), mapa = form.dataset.origem === "mapa";
    const f = form.dataset.ficha ? L.fichaPorId.get(form.dataset.ficha) : mapa ? null : L.novo ? null : L.fichaPorId.get(L.sel);
    const d = {};
    for (const [k] of CAMPOS) { const v = String(fd.get(k) ?? "").trim(); d[k] = k.startsWith("qtd_") ? (v === "" ? null : Math.max(0, parseInt(v, 10) || 0)) : (v || null); }
    if (form.elements.sistema?.tagName === "SELECT") {
      if (form.elements.sistema.value === "__outro" && !String(form.elements.sistema_outro?.value || "").trim()) { toast("Escreva o nome do sistema."); irPasso(form, "dados", true); form.elements.sistema_outro?.focus(); return; }
      d.sistema = sistemaDoForm(form);
    }
    if (d.cnpj) d.cnpj = d.cnpj.replace(/\D/g, "") || null;
    d.observacoes = String(fd.get("observacoes") || "").trim() || null;
    const demo = String(fd.get("demo_em") || ""); d.demo_em = demo ? demo + ":00-03:00" : null;
    d.demo_formato = fd.get("demo_formato") || "virtual"; d.contrato_em = fd.get("contrato_em") || null; d.contato_anterior = fd.get("contato_anterior") === "on";
    const rd = String(fd.get("retorno_data") || ""), rh = String(fd.get("retorno_hora") || "");
    d.retorno_em = rd ? tsSP(rd, rh) : null;
    d.retorno_nota = rd ? (String(fd.get("retorno_nota") || "").trim() || null) : null;
    if (!d.nome) { toast("Informe o nome da administradora."); irPasso(form, "dados", true); $("#fx-nome")?.focus(); return; }

    const marcados = modo === "ligacao" ? fd.getAll("res").map(String) : [];
    const envio = modo === "ligacao" ? fd.getAll("envio").map(String) : [];
    // só marcou o envio da apresentação: conta como conversa
    if (envio.length && !marcados.length) marcados.push("conversou");
    const escolhidos = BOTOES.filter((b) => marcados.includes(b[0]));
    const res = escolhidos.length ? [...escolhidos].sort((a, b) => PRIORIDADE.indexOf(a[2]) - PRIORIDADE.indexOf(b[2]))[0] : null;
    let demoDia = null;
    const data0 = String(fd.get("data") || "") || hojeISO(), texto = String(fd.get("texto") || "").trim() || null;
    if (modo === "ligacao") {
      if (!res) { toast("Escolha o que aconteceu no contato."); form.querySelector('[name="res"]')?.focus(); return; }
      if (escolhidos.length === 1 && res[0] === "anotacao" && !texto) { toast("Escreva a anotação."); $("#rg-texto")?.focus(); return; }
      if (marcados.includes("pediu_retorno") && !rd) { toast("Marque o dia de ligar de novo."); $("#rt-data")?.focus(); return; }
      // o contato de hoje cumpre o retorno que vencia hoje (ou antes), a não ser que ela tenha marcado outro
      const orig = String(fd.get("retorno_orig") || "");
      if (orig && rd && localSP(d.retorno_em) === orig && orig.slice(0, 10) <= hojeISO()) { d.retorno_em = null; d.retorno_nota = null; }
      if (escolhidos.some((b) => b[2] === "demo_agendada") && fd.get("rg_demo_em")) { d.demo_em = fd.get("rg_demo_em") + ":00-03:00"; d.demo_formato = fd.get("rg_formato") || "virtual"; }
      if (escolhidos.some((b) => b[2] === "demo_realizada")) {
        const falta = faltaDemo(form);
        if (falta.length) { toast(`Para a demonstração entrar no painel, preencha: ${falta.map((x) => x[1]).join(", ")}.`); if (falta[0][0] !== "rg_demo_em") irPasso(form, "dados", true); (form.elements[falta[0][0]] || form.querySelector(`#fx-${falta[0][0]}`))?.focus?.(); return; }
        const dm = String(fd.get("rg_demo_em")); d.demo_em = dm + ":00-03:00"; d.demo_formato = fd.get("rg_formato") || "virtual";
        demoDia = dm.slice(0, 10);
      }
    }
    // negativa: ela escolhe o destino; o follow-up semestral marca o próximo contato
    const negDest = modo === "ligacao" && res?.[2] === "negativa" ? String(fd.get("neg_destino") || "") : "";
    if (modo === "ligacao" && res?.[2] === "negativa") {
      if (!negDest) { toast("Escolha para onde vai a negativa: Follow-up semestral ou Sem interesse."); form.querySelector('[name="neg_destino"]')?.focus(); return; }
      if (negDest === "follow") {
        const nd = String(fd.get("neg_retorno") || "");
        if (!nd || nd < hojeISO()) { toast("Escolha a data do próximo contato."); $("#rg-neg-data")?.focus(); return; }
        d.retorno_em = tsSP(nd, "09:00"); d.retorno_nota = "Follow-up semestral";
      } else { d.retorno_em = null; d.retorno_nota = null; }
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
        const { data: r, error } = await sb.from("registros").insert({ ficha_id: id, usuario_id: S.user.id, data: res[2] === "demo_realizada" && demoDia && demoDia <= hojeISO() ? demoDia : data0, tipo: res[2], detalhe: escolhidos.length === 1 ? res[3] : null, detalhes: escolhidos.map((b) => b[0]), envio: envio.length ? envio : null, canal: fd.get("canal") || "ligacao", texto, apresentador: res[2] === "demo_realizada" ? String(fd.get("rg_apresentador") || "Leonardo") : null }).select().single(); if (error) throw error;
        L.regs.push(r); novo = r;
      }
      const { data: nf } = await sb.from("fichas").select(COLS_FICHA).eq("id", id).single();
      if (nf) L.fichas[L.fichas.findIndex((x) => x.id === nf.id)] = nf;
      if (!mapa) { L.novo = false; L.sel = id; L.registrar = null; if (novo) L.gvAberto = novo.id; }
      L.passo = null;
      derivar(); form.dataset.sujo = "";
      const salvo = novo && L.regs.find((x) => x.id === novo.id);
      toast(salvo ? (contaComoContato(salvo) ? `Salvo como ${salvo.nova ? "contato novo" : "follow-up"}${nf?.retorno_em ? ` · ligar de novo ${quandoTxt(nf.retorno_em).toLowerCase()}` : ""}.` : salvo.tipo === "sem_contato" ? "Salvo como sem contato." : "Registro salvo.") : f ? "Dados salvos." : "Ficha criada.");
      carregarAgenda();
      // demonstração realizada: vai direto para o Painel de Demonstrações Realizadas, com o cartão novo em destaque
      if (salvo?.tipo === "demo_realizada") {
        recarregarNegociosDaFicha(id);
        const total = acumulado(hojeISO()).demos.length;
        S.view = "relatorios"; S.rl.periodo = "semana"; S.rl.ref = hojeISO(); L.sel = null; L.registrar = null; S.sel = null; S.selRow = null;
        render();
        const card = document.querySelector(`.rel-painel-demos [data-ficha="${id}"]`);
        if (card) { card.classList.add("rel-card-novo"); card.scrollIntoView({ behavior: "smooth", block: "center" }); }
        toast(`Demonstração registrada. Agora são ${fmtN(total)} demonstrações realizadas.`);
        return;
      }
      recarregarNegociosDaFicha(id).then(async () => { if (negDest) await destinoNegativa(id, negDest); render(); });
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
    const f = fichaDoCnpj(r.cnpj), soc = S.socios.get(r.cnpj_basico) || []; if (f) garantirTextos(f.id);
    const wB = wppEmpresa(r);
    const base = f || { nome: nomeEmp(r), telefones: [r.telefone1, r.telefone2].filter(Boolean).join(" / ") || null, whatsapp: wB?.origem === "site" ? fmtTel(nacional(wB.n)) : null, email: r.email || null, cidade: r.municipio ? titulo(r.municipio) : null, uf: r.uf || null, sistema: sistemaDe(r).nome || null, cnpj: r.cnpj };
    const regs = f ? [...(L.porFicha.get(f.id) || [])].reverse() : [];
    const resumo = f ? `<div class="caixa-cinza"><div class="linha-flex" style="justify-content:space-between"><b class="t13">Já está nas suas administradoras</b><button type="button" class="mini" data-acao="lg-abrir" data-id="${f.id}">Ver ficha completa</button></div>
        <span class="linha-flex" style="gap:6px"><span class="selo ${etapaDaFicha(f).cor}">${esc(etapaDaFicha(f).nome)}</span>${f.retorno_em ? celulaRetorno(f) : ""}</span>
        ${regs.slice(0, 3).map((x) => `<span class="t12"><b class="num">${ddmm(x.data)}</b> · ${esc(rotuloReg(x))}${x.texto ? ` · <span class="fraco">${esc(x.texto.length > 110 ? x.texto.slice(0, 110) + "…" : x.texto)}</span>` : ""}</span>`).join("")}${regs.length > 3 ? `<span class="t12 fraco">e mais ${regs.length - 3} no histórico</span>` : ""}</div>`
      : soc.length ? `<span class="t12 fraco">Sócio${soc.length > 1 ? "s" : ""} na Receita: <b>${esc(soc.slice(0, 3).map((x) => titulo(x.nome)).join(", "))}</b></span>` : "";
    return `<div class="pilha" style="gap:12px">${resumo}${formLigacao(base, { cnpj: r.cnpj })}</div>`;
  }
  async function abrirFicha(id, dono) {
    S.voltarAtivo = true;
    const L = S.lg;
    if (dono && dono !== S.user.id) { if (L.dono !== "todos" && L.dono !== dono) { L.dono = "todos"; L.carregado = false; } }
    else if (L.dono && L.dono !== S.user.id && !L.fichaPorId?.get(id)) { L.dono = null; L.carregado = false; }
    S.view = "adms"; S.sel = null; S.selRow = null; L.sel = id; L.novo = false; L.busca = ""; L.etapa = "todas"; L.registrar = null; L.passo = null; L.gvAberto = null; L.gvTodos = null;
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


  /* ---- Concorrência: brechas (atacar hoje) e movimentos (ficar sabendo), vindos do vigia automático e do time */
  S.cc = { carregado: false, carregando: false, eventos: [], portais: [], regs: [], mapa: [], notas: [], pessoas: [], aba: "brechas", sel: null, form: false, mostrarVelhas: false, editando: null, abertura: false };
  const grupoSis = (n) => chaveSis(nomeSistema(n) || n);
  const nomeSis = (n) => (nomeSistema(n) === "Group Software (Condomínio21)" ? "Group Software" : nomeSistema(n) || n);
  const TIPO_EV = { queda: ["Queda", "s-errado"], reclamacoes: ["Reclamações", "s-errado"], noticia: ["Notícia", "s-amarelo"], preco: ["Preço", "s-amarelo"], lancamento: ["Lançamento", "s-roxo"], parceria: ["Parceria", "s-ident"], outro: ["Empresa", "s-vazio"] };
  const CONTATO_REAL = new Set(["conversou", "negativa", "demo_agendada", "demo_realizada", "contrato"]);
  // brecha ativa: queda que ainda não acabou, ou dentro do prazo de 14 dias
  const brechaAtiva = (e) => e.categoria === "brecha" && (e.valido_ate ? new Date(e.valido_ate) >= new Date() : !e.fim);
  async function carregarConcorrencia(forcar) {
    const C = S.cc; if (C.carregando || (C.carregado && !forcar) || !S.user || !S.perfil?.aprovado) return;
    C.carregando = true;
    try {
      const [ev, po, rg, mp, nt, pe] = await Promise.all([
        sb.from("concorrencia_eventos").select("*").eq("descartado", false).order("inicio", { ascending: false }).limit(400),
        sb.from("concorrencia_portais").select("sistema,url,ultimo_teste,ultimo_ok,ultimo_status,falhas"),
        sb.from("registros").select("id,ficha_id,usuario_id,tipo,data,brecha_id").not("brecha_id", "is", null).limit(5000),
        sb.from("mapa").select("cnpj,razao_social,nome_fantasia,municipio,uf,telefone1,telefone2,email,sistema,sistema_status,sistema_marcado,removido").or("sistema.not.is.null,sistema_marcado.not.is.null").limit(5000),
        sb.from("concorrencia_notas").select("*").order("criado_em").limit(3000),
        sb.from("perfis").select("id,nome").eq("aprovado", true),
      ]);
      C.notas = nt.data || []; C.pessoas = pe.data || [];
      C.eventos = ev.data || []; C.portais = po.data || []; C.regs = rg.data || []; C.mapa = (mp.data || []).filter((r) => !r.removido);
      C.carregado = true;
    } catch (e) { console.warn(e); }
    finally { C.carregando = false; if (["inicio", "concorrencia", "relatorios"].includes(S.view)) render(); }
  }
  function numerosBrecha(e) {
    const rs = S.cc.regs.filter((r) => r.brecha_id === e.id && r.tipo !== "anotacao");
    return { ligacoes: rs.length, contatos: rs.filter((r) => CONTATO_REAL.has(r.tipo)).length, demos: rs.filter((r) => r.tipo === "demo_agendada").length, contratos: rs.filter((r) => r.tipo === "contrato").length, fichas: new Set(rs.map((r) => r.ficha_id)) };
  }
  // quem usa o sistema da brecha: as fichas do time e as empresas do mapeamento (sem ficha ainda)
  function quemUsa(sistema) {
    const g = grupoSis(sistema), L = S.lg, out = [], cnpjs = new Set();
    for (const f of L.fichas || []) {
      if (!f.sistema || grupoSis(f.sistema) !== g) continue;
      if ((etapaSCC(f)?.resultado || "") === "ganho") continue;
      if (f.cnpj) cnpjs.add(f.cnpj);
      out.push({ ficha: f, nome: f.nome, cidade: f.cidade, uf: f.uf, tel: f.telefones || f.whatsapp || "", semInt: ehSemInteresse(f) });
    }
    for (const r of S.cc.mapa) {
      const n = sistemaDe(r).nome; if (!n || grupoSis(n) !== g || cnpjs.has(r.cnpj) || fichaDoCnpj(r.cnpj)) continue;
      cnpjs.add(r.cnpj);
      out.push({ empresa: r, nome: nomeEmp(r), cidade: r.municipio ? titulo(r.municipio) : "", uf: r.uf, tel: r.telefone1 || "", semInt: false });
    }
    return out;
  }
  function listaBrecha(e, usa, n) {
    const ord = [...usa].sort((a, b) => (a.semInt - b.semInt) || ((a.ficha && n.fichas.has(a.ficha.id)) - (b.ficha && n.fichas.has(b.ficha.id))) || String(a.nome).localeCompare(String(b.nome), "pt-BR"));
    return `<div class="cc-lista"><div class="cc-lista-cab t12 fraco"><span>Administradora</span><span>Cidade</span><span>Telefone</span><span></span></div>
      ${ord.map((u) => { const feito = u.ficha && n.fichas.has(u.ficha.id); return `<div class="cc-linha ${feito ? "cc-feito" : ""}">
        <span class="pilha" style="gap:1px;min-width:0"><b class="t13">${esc(u.nome)}</b><span class="t11 fraco">${u.ficha ? `Ficha · ${esc(etapaDaFicha(u.ficha).nome)}` : "Mapeamento (sem ficha ainda)"}${u.semInt ? " · sem interesse" : ""}</span></span>
        <span class="t13">${esc([u.cidade, u.uf].filter(Boolean).join(" - "))}</span><span class="t13 num">${esc(u.tel || "—")}</span>
        <span>${feito ? '<span class="selo s-conf">Já ligou</span>' : `<button type="button" class="mini mini-ok" data-acao="cc-ligar" data-ficha="${u.ficha ? u.ficha.id : ""}" data-cnpj="${u.empresa ? esc(u.empresa.cnpj) : ""}">Ligar e registrar</button>`}</span></div>`; }).join("")}
      <span class="t12 fraco" style="padding:8px 2px 0">Toda ligação para quem usa ${esc(nomeSis(e.sistema))} até o fim do prazo conta para esta brecha, mesmo feita fora desta lista.</span></div>`;
  }
  // ---- conteúdo de cada evento: textos que o time edita e anotações das ligações
  const TEXTOS_EV = { resumo: ["Resumo", "Escreva em poucas palavras o que a notícia diz."], roteiro: ["Como usar na ligação", "Ex.: perguntar se tiveram problema para emitir boleto, sem falar mal do concorrente, e oferecer demonstração."], para_vendas: ["Para vendas", "O que o vendedor deve saber ou falar na demonstração."], para_posvenda: ["Para o pós-venda", "Tem risco para os nossos clientes? O que acompanhar."] };
  function blocoTexto(e, campo, opts = {}) {
    const [rot, dica] = TEXTOS_EV[campo], C = S.cc, ed = C.editando && C.editando.id === e.id && C.editando.campo === campo, v = e[campo] || "";
    const quem = e.editado_por && v ? ` · <span class="t11 fraco">editado por ${esc(nomeCC(e.editado_por))}</span>` : "";
    if (ed) return `<form class="cc-texto ${opts.cls || ""}" data-acao="cc-texto" data-id="${e.id}" data-campo="${campo}"><p class="cc-rot">${rot}</p>
      <textarea name="texto" class="input" rows="${campo === "roteiro" ? 4 : 3}" maxlength="2000" placeholder="${esc(dica)}">${esc(v)}</textarea>
      <div class="linha-flex" style="gap:6px"><button type="submit" class="mini mini-ok">Salvar</button><button type="button" class="mini" data-acao="cc-editar" data-id="">Cancelar</button></div></form>`;
    return `<div class="cc-texto ${opts.cls || ""}"><div class="linha-flex" style="justify-content:space-between;gap:8px"><p class="cc-rot">${rot}${quem}</p><button type="button" class="cc-edit" data-acao="cc-editar" data-id="${e.id}" data-campo="${campo}">${v ? "Editar" : "Escrever"}</button></div>
      ${v ? `<div class="cc-txt">${esc(v).replace(/\n/g, "<br>")}</div>` : `<p class="t12 fraco" style="margin:0">${opts.vazio || "Ninguém escreveu ainda."}</p>`}</div>`;
  }
  const nomeCC = (id) => (id === S.user?.id ? "você" : (S.cc.pessoas.find((p) => p.id === id)?.nome || "alguém do time").split(" ")[0]);
  function duracaoTxt(ms) { if (ms >= 2 * 86400000) return `${Math.round(ms / 86400000)} dias`; if (ms >= 3600000) { const h = Math.floor(ms / 3600000), m = Math.round((ms % 3600000) / 60000); return `${h}h${m ? String(m).padStart(2, "0") : ""}`; } return `${Math.max(1, Math.round(ms / 60000))} min`; }
  const horaBR = (iso) => localSP(iso).slice(11, 16).replace(":", "h");
  function historicoSis(sistema) {
    const g = grupoSis(sistema), seis = Date.now() - 183 * 86400000;
    const q = S.cc.eventos.filter((e) => e.tipo === "queda" && grupoSis(e.sistema) === g && new Date(e.inicio).getTime() >= seis);
    const maior = q.reduce((m, e) => Math.max(m, (e.fim ? new Date(e.fim) : new Date()) - new Date(e.inicio)), 0);
    return { quedas: q.length, maior, problemas: S.cc.eventos.filter((e) => e.categoria === "brecha" && e.tipo !== "queda" && grupoSis(e.sistema) === g && new Date(e.inicio).getTime() >= seis).length };
  }
  function oQueAconteceu(e) {
    const s = nomeSis(e.sistema);
    if (e.tipo === "queda") {
      const ini = new Date(e.inicio), hj = localSP(new Date().toISOString()).slice(0, 10) === localSP(e.inicio).slice(0, 10);
      if (!e.fim) return `Os portais da ${s} usados pelas administradoras (área do condômino e segunda via de boleto) pararam de responder ${hj ? "hoje" : `em ${ddmm(localSP(e.inicio).slice(0, 10))}`} às ${horaBR(e.inicio)}. O sistema testa a cada 15 minutos e eles ainda não voltaram. Quem usa ${s} pode estar sem emitir boleto e sem acesso dos moradores neste momento.`;
      return `Os portais da ${s} ficaram fora do ar por cerca de ${duracaoTxt(new Date(e.fim) - ini)}, de ${dataHoraBR(e.inicio)} até ${dataHoraBR(e.fim)}. Nesse período, quem usa ${s} ficou sem portal do condômino e sem segunda via de boleto.`;
    }
    return "";
  }
  function fatosEvento(e) {
    const h = historicoSis(e.sistema), f = [];
    if (e.tipo === "queda") {
      f.push(["Começou", dataHoraBR(e.inicio)], [e.fim ? "Durou" : "Duração até agora", duracaoTxt((e.fim ? new Date(e.fim) : new Date()) - new Date(e.inicio))], ["Afeta", "Portal e boletos"]);
    } else {
      f.push(["Publicada", ddmmaaaa(localSP(e.inicio).slice(0, 10))], ["Fonte", e.fonte || "—"]);
      if (e.valido_ate) f.push(["Vale até", ddmm(localSP(e.valido_ate).slice(0, 10))]);
    }
    f.push(["Quedas em 6 meses", h.quedas ? `${h.quedas}${h.maior ? ` (maior: ${duracaoTxt(h.maior)})` : ""}` : "nenhuma"]);
    return `<div class="cc-fatos">${f.map(([l, v]) => `<div><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join("")}</div>`;
  }
  function notasEvento(e) {
    const ns = S.cc.notas.filter((n) => n.evento_id === e.id);
    return `<div class="cc-texto"><p class="cc-rot">O que as administradoras disseram</p>
      ${ns.length ? `<div class="cc-falas">${ns.map((n) => { const f = n.ficha_id ? S.lg.fichaPorId?.get(n.ficha_id) : null; return `<div class="cc-fala">${f ? `<b class="t13">${esc(f.nome)}${f.cidade ? ` · ${esc(f.cidade)}` : ""}</b>` : ""}<p>${esc(n.texto)}</p><span class="t11 fraco">${esc(nomeCC(n.usuario_id))} · ${esc(dataHoraBR(n.criado_em))}${n.usuario_id === S.user.id ? ` · <button type="button" class="cc-edit" data-acao="cc-nota-apagar" data-id="${n.id}">apagar</button>` : ""}</span></div>`; }).join("")}</div>` : '<p class="t12 fraco" style="margin:0">Nada anotado ainda. Anote aqui o que ouvir nas ligações: vira argumento para o time.</p>'}
      <form class="cc-nova" data-acao="cc-nota" data-id="${e.id}"><input name="texto" class="input" maxlength="2000" placeholder="Anotar o que ouviu numa ligação…" autocomplete="off"><button type="submit" class="mini">Anotar</button></form></div>`;
  }
  function cartaoBrecha(e, grande) {
    const usa = quemUsa(e.sistema), n = numerosBrecha(e), ativa = brechaAtiva(e), [tl, tc] = TIPO_EV[e.tipo] || TIPO_EV.outro, agora = e.tipo === "queda" && !e.fim;
    const feitas = usa.filter((u) => u.ficha && n.fichas.has(u.ficha.id)).length, faltam = usa.length - feitas, aberto = S.cc.sel === e.id;
    const sub = e.tipo === "queda" ? `Detectado pelo teste automático${e.detalhe ? ` · ${e.detalhe}` : ""}` : `${ddmm(localSP(e.inicio).slice(0, 10))} · ${e.fonte || ""}`;
    const link = e.url_original || e.url;
    return `<article class="cc-card ${ativa ? (agora ? "cc-agora" : "cc-ativa") : "cc-velha"}">
      <div class="cc-cab"><div class="pilha" style="gap:6px;min-width:0">
          <span class="linha-flex" style="gap:6px">${agora ? '<span class="selo s-errado">Agora</span>' : ""}<span class="selo ${tc}">${tl}</span><span class="selo s-sis">${esc(nomeSis(e.sistema))}</span></span>
          <h2 class="cc-h">${esc(e.titulo)}</h2>
          <span class="t12 fraco">${esc(sub)}${link && e.tipo !== "queda" ? ` · <a href="${esc(link)}" target="_blank" rel="noopener">abrir a matéria original</a>` : ""}</span></div>
        <span class="t12 fraco cc-prazo">${ativa ? (e.valido_ate ? `Vale até ${ddmm(localSP(e.valido_ate).slice(0, 10))}` : "Em andamento · vale até 14 dias depois de voltar") : "Encerrada"}</span></div>
      <div class="cc-corpo"><div class="cc-esq">
          ${e.tipo === "queda" ? `<div class="cc-texto"><p class="cc-rot">O que aconteceu</p><div class="cc-txt cc-txt-g">${esc(oQueAconteceu(e))}</div></div>` : blocoTexto(e, "resumo", { vazio: e.url ? "Sem resumo ainda. Abra a matéria e escreva em poucas palavras o que ela diz." : "Sem resumo ainda." })}
          ${fatosEvento(e)}
          ${blocoTexto(e, "roteiro", { cls: "cc-roteiro", vazio: "Escreva como abordar quem usa este sistema. Fica para todo o time." })}
          ${notasEvento(e)}
        </div>
        <div class="cc-dir"><p class="cc-rot" style="margin:0">Resultado desta brecha</p>
          <div class="cc-nums">${[[usa.length, `${usa.length === 1 ? "usa" : "usam"} ${nomeSis(e.sistema)}`], [n.ligacoes, n.ligacoes === 1 ? "ligação feita" : "ligações feitas"], [n.contatos, n.contatos === 1 ? "contato" : "contatos"], [n.demos, n.demos === 1 ? "demo agendada" : "demos agendadas"], [n.contratos, n.contratos === 1 ? "contrato" : "contratos"]].map(([v, l]) => `<div><b class="num">${fmtN(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>
          ${ativa && usa.length ? `<button type="button" class="btn ${grande ? "btn-primario" : "btn-sec"}" data-acao="cc-lista" data-id="${e.id}">${aberto ? "Fechar lista" : feitas ? `Continuar lista (${fmtN(faltam)} ${faltam === 1 ? "restante" : "restantes"})` : "Montar lista de ligação"}</button>` : ""}
          ${!usa.length ? `<span class="t12 fraco">Nenhuma administradora mapeada usa ${esc(nomeSis(e.sistema))} ainda.</span>` : `<span class="t12 fraco">Toda ligação para quem usa ${esc(nomeSis(e.sistema))} até o fim do prazo conta para esta brecha no relatório.</span>`}
          <button type="button" class="mini" style="align-self:flex-start" data-acao="cc-descartar" data-id="${e.id}" title="Não é relevante">Descartar</button>
        </div></div>
      ${aberto ? listaBrecha(e, usa, n) : ""}</article>`;
  }
  function cartaoMovimento(e) {
    const [tl, tc] = TIPO_EV[e.tipo] || TIPO_EV.outro, link = e.url_original || e.url;
    return `<article class="cc-mov2"><span class="t12 fraco num" style="font-weight:600">${ddmm(localSP(e.inicio).slice(0, 10))}</span>
      <div class="pilha" style="gap:10px;min-width:0">
        <div class="pilha" style="gap:4px"><span class="linha-flex" style="gap:6px"><span class="selo ${tc}">${tl}</span><span class="selo s-sis">${esc(nomeSis(e.sistema))}</span></span>
          <h3 class="cc-h3">${esc(e.titulo)}</h3><span class="t12 fraco">${esc(e.fonte || "")}${link ? ` · <a href="${esc(link)}" target="_blank" rel="noopener">abrir a matéria original</a>` : ""}</span></div>
        ${blocoTexto(e, "resumo", { vazio: "Sem resumo ainda." })}
        <div class="cc-para">${blocoTexto(e, "para_vendas", { vazio: "O que muda na demonstração?" })}${blocoTexto(e, "para_posvenda", { vazio: "Tem risco para os nossos clientes?" })}</div>
      </div>
      <button type="button" class="mini" style="align-self:flex-start" data-acao="cc-descartar" data-id="${e.id}">Descartar</button></article>`;
  }

  // ---- abertura animada da página: o globo da marca passa pelos concorrentes (toda vez que entra na página; cobre a tela na hora do clique e depois revela a página)
  const Abertura = (() => {
    let el = null, cv, ctx, raf = 0, fase = "off", t0 = 0, ult = 0, atual = -1, trocar = false, pino = -1, pinoT = 0, S2 = 0, dpr = 1, giro = 0, proj = [], timers = [];
    const N = 220, P = [], A = [], ouro = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = ouro * i; P.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r, g: Math.random() < 0.13, f: Math.random() * 6.3 }); }
    const vistos = new Set();
    P.forEach((p, i) => { P.map((q, k) => [k, (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2]).filter(([k]) => k !== i).sort((a, b) => a[1] - b[1]).slice(0, 4).forEach(([k]) => { const c = i < k ? `${i}-${k}` : `${k}-${i}`; if (!vistos.has(c)) { vistos.add(c); A.push([i, k]); } }); });
    const mix = (a, b, t) => a + (b - a) * t, cor = (t, a) => `rgba(${Math.round(mix(52, 110, t))},${Math.round(mix(98, 228, t))},${Math.round(mix(196, 255, t))},${a})`;
    // concorrentes da abertura, com a situação de agora (os que têm brecha ficam mais tempo na tela)
    function paradas() {
      const C = S.cc; if (!C.carregado || !S.lg.carregado) return null;
      const ativas = C.eventos.filter(brechaAtiva), nomes = [...new Set([...C.portais.map((p) => nomeSis(p.sistema)), ...C.eventos.map((e) => nomeSis(e.sistema))])];
      const lista = nomes.map((s) => {
        const g = grupoSis(s), br = ativas.filter((e) => grupoSis(e.sistema) === g), ps = C.portais.filter((p) => grupoSis(p.sistema) === g), u = quemUsa(s).length;
        const fora = ps.length && ps.every((p) => p.falhas >= 2), usaTxt = u ? ` · ${fmtN(u)} ${u === 1 ? "administradora usa" : "administradoras usam"}` : "";
        return { nome: s, sigla: s.replace(/[^A-Za-zÀ-ú]/g, "").slice(0, 3).toUpperCase(), alerta: br.length > 0, chip: fora ? "fora do ar" : br.length ? "brecha aberta" : ps.length ? "portal no ar" : "ok",
          txt: (fora ? "Portal fora do ar agora" : br.length ? (br[0].tipo === "queda" ? "Portal ficou fora do ar" : `Notícia: ${br[0].titulo}`) : ps.length ? "Portal no ar" : "Sem novidades") + usaTxt };
      }).sort((a, b) => (b.alerta - a.alerta) || (a.nome === "Superlógica" ? -1 : b.nome === "Superlógica" ? 1 : 0));
      const fim = ativas.length ? { nome: `${ativas.length} ${ativas.length === 1 ? "brecha aberta" : "brechas abertas"}`, palavra: "Concorrência", alerta: true, chip: "veja abaixo", txt: [...new Set(ativas.map((e) => nomeSis(e.sistema)))].join(", ") + (ativas.length === 1 ? " com brecha aberta" : " com brechas abertas") }
        : { nome: "Nenhuma brecha aberta", palavra: "Concorrência", alerta: false, chip: "tudo calmo", txt: "Todos os portais no ar e nenhuma notícia de problema." };
      return { lista, fim };
    }
    function montar() {
      el = document.createElement("div"); el.className = "ab"; el.setAttribute("aria-hidden", "true");
      el.innerHTML = `<div class="ab-painel"><div class="ab-dentro"><div class="ab-grade"></div><h2 class="ab-palavra"></h2><canvas></canvas>
        <p class="ab-chip"><i></i><b></b><span></span></p><p class="ab-nome"></p><ol class="ab-trilho"></ol>
        <p class="ab-canto ce"><b><i></i>Concorrência</b><span>Mapa Comercial · PRG Software</span></p>
        <p class="ab-canto cd"><b class="ab-qtd">Conferindo os concorrentes</b><span>Portais testados a cada 15 min</span></p>
        <p class="ab-canto be"><span>Último teste</span><b class="ab-hora">--:--</b></p>
        <p class="ab-canto bd"><span>Conferindo a concorrência</span><b class="ab-pct">000%</b></p>
        <button class="ab-pular" type="button">Pular (Esc)</button></div></div>`;
      document.body.appendChild(el); cv = el.querySelector("canvas"); ctx = cv.getContext("2d");
      el.addEventListener("click", () => sair(true));
    }
    const q = (s) => el.querySelector(s);
    function medir() { dpr = Math.min(2, devicePixelRatio || 1); S2 = cv.clientWidth; cv.width = Math.round(S2 * dpr); cv.height = Math.round(S2 * dpr); }
    function desenhar(agora, dados) {
      const c = ctx, R = S2 * 0.42, cx = S2 / 2, cy = S2 / 2, foco = R * 3.2, cg = Math.cos(giro), sg = Math.sin(giro), ci = Math.cos(-0.28), si = Math.sin(-0.28);
      c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, S2, S2);
      const h = c.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.25); h.addColorStop(0, "rgba(70,120,220,.22)"); h.addColorStop(1, "rgba(70,120,220,0)"); c.fillStyle = h; c.beginPath(); c.arc(cx, cy, R * 1.25, 0, 6.283); c.fill();
      proj = P.map((p, i) => { const x = p.x * cg + p.z * sg, z = -p.x * sg + p.z * cg, y2 = p.y * ci - z * si, z2 = p.y * si + z * ci, k = foco / (foco - z2 * R); return { i, x: cx + x * R * k, y: cy + y2 * R * k, t: (z2 + 1) / 2, p }; });
      c.lineWidth = 1;
      for (const [a, b] of A) { const u = proj[a], v = proj[b], tt = (u.t + v.t) / 2; c.strokeStyle = cor(tt, 0.05 + tt * tt * 0.42); c.beginPath(); c.moveTo(u.x, u.y); c.lineTo(v.x, v.y); c.stroke(); }
      for (const p of [...proj].sort((a, b) => a.t - b.t)) {
        const pul = 0.75 + 0.25 * Math.sin(agora * 0.0016 + p.p.f);
        if (p.p.g) { const rr = 5 + 9 * p.t, g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr); g.addColorStop(0, cor(p.t, (0.1 + 0.28 * p.t) * pul)); g.addColorStop(1, cor(p.t, 0)); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, rr, 0, 6.283); c.fill(); }
        c.fillStyle = cor(p.t, (0.18 + 0.82 * p.t * p.t) * pul); c.beginPath(); c.arc(p.x, p.y, 0.7 + 1.9 * p.t, 0, 6.283); c.fill();
      }
      if (pino >= 0 && dados) {
        const pp = proj[pino], mal = dados.alerta, s = Math.min(1, (agora - pinoT) / 350);
        c.strokeStyle = mal ? `rgba(255,107,107,${0.9 - s * 0.6})` : `rgba(111,228,255,${0.9 - s * 0.6})`; c.lineWidth = 1.5; c.beginPath(); c.arc(pp.x, pp.y, 6 + s * 16, 0, 6.283); c.stroke();
        c.fillStyle = mal ? "#FF6B6B" : "#6FE4FF"; c.beginPath(); c.arc(pp.x, pp.y, 4.5, 0, 6.283); c.fill();
        const chip = q(".ab-chip"), base = cv.getBoundingClientRect(), dentro = chip.parentNode.getBoundingClientRect();
        const gx = base.left - dentro.left + pp.x * (base.width / S2), gy = base.top - dentro.top + pp.y * (base.height / S2), w = chip.offsetWidth, x = gx + 16 + w > dentro.width - 10 ? gx - 16 - w : gx + 16;
        chip.style.opacity = 1; chip.style.transform = `translate(${Math.max(10, x).toFixed(1)}px,${(gy - 16).toFixed(1)}px)`;
      }
    }
    function escolherPino() { let m = -1, mt = -1; for (const p of proj) { const t = p.t - Math.abs(p.x - S2 * 0.56) / S2 * 0.8 - Math.abs(p.y - S2 * 0.42) / S2 * 0.8; if (t > mt) { mt = t; m = p.i; } } return m; }
    function mostrar(d, i, lista) {
      q(".ab-palavra").textContent = d.palavra || d.nome;
      const n = q(".ab-nome"); n.innerHTML = ""; const b = document.createElement("b"), s = document.createElement("span"); b.textContent = d.nome; s.textContent = d.txt; if (d.alerta) s.className = "alerta"; n.append(b, s);
      q(".ab-chip b").textContent = d.palavra ? d.nome : d.nome; q(".ab-chip span").textContent = d.chip; q(".ab-chip i").className = d.alerta ? "ruim" : "";
      [...q(".ab-trilho").children].forEach((li, k) => { li.className = (k < i ? "foi" : k === i ? "agora" : "") + (lista[k]?.alerta ? " alerta" : ""); });
    }
    let dados = null;
    function quadro(agora) {
      raf = 0; if (fase === "off") return;
      const dt = ult ? Math.min(50, agora - ult) : 16; ult = agora;
      if (fase === "entrando") {
        if (!dados) { dados = paradas(); if (dados) { const ol = q(".ab-trilho"); ol.innerHTML = dados.lista.map((d) => `<li class="${d.alerta ? "alerta" : ""}">${esc(d.sigla)}</li>`).join(""); q(".ab-qtd").textContent = `${dados.lista.length} concorrentes vigiados`; const ult2 = S.cc.portais.map((p) => p.ultimo_teste).filter(Boolean).sort().pop(); q(".ab-hora").textContent = ult2 ? localSP(ult2).slice(11, 16) : "--:--"; t0 = agora; } }
        const seg = (agora - t0) / 1000, MIN = 3.2, pr = dados ? Math.min(1, seg / MIN) : Math.min(0.12, seg / 10);
        if (dados) {
          const pesos = dados.lista.map((d) => (d.alerta ? 4 : 1)).concat([4]), total = pesos.reduce((a, b) => a + b, 0);
          let i = dados.lista.length, acc = 0; for (let k = 0; k < pesos.length; k++) { acc += pesos[k]; if (pr * total < acc) { i = k; break; } }
          if (i !== atual) { atual = i; mostrar(dados.lista[i] || dados.fim, i, dados.lista); trocar = true; }
          if (pr >= 1) sair(false);
        } else if (atual !== -2) { atual = -2; const n = q(".ab-nome"); n.innerHTML = "<b>Conferindo a concorrência…</b>"; }
        const v = Math.round(pr * 100); q(".ab-pct").textContent = `${v < 10 ? "00" : v < 100 ? "0" : ""}${v}%`;
      }
      giro += dt * (fase === "entrando" ? 0.0012 : 0.0004);
      if (S2) { const d = dados && atual >= 0 ? dados.lista[atual] || dados.fim : null; desenhar(agora, d); if (trocar && proj.length) { pino = escolherPino(); pinoT = agora; trocar = false; } }
      raf = requestAnimationFrame(quadro);
    }
    function sair(rapido) { if (fase !== "entrando") return; fase = "saindo"; timers.push(setTimeout(subir, rapido ? 0 : 650)); }
    function subir() {
      el.classList.add("saindo");
      const painel = q(".ab-painel");
      if (painel.animate) painel.animate([{ transform: "translateY(0)", borderBottomLeftRadius: "50% 0", borderBottomRightRadius: "50% 0" }, { transform: "translateY(-120%)", borderBottomLeftRadius: "50% 26vh", borderBottomRightRadius: "50% 26vh" }], { duration: 1000, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" });
      timers.push(setTimeout(fim, 1050));
    }
    function fim() { timers.forEach(clearTimeout); timers = []; if (raf) cancelAnimationFrame(raf); raf = 0; fase = "off"; el?.remove(); el = null; document.removeEventListener("keydown", tecla); }
    const tecla = (e) => { if (e.key === "Escape") sair(true); };
    function abrir() {
      if (fase !== "off" || S.view !== "concorrencia" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      montar(); medir(); dados = null; atual = -1; ult = 0; pino = -1; giro = Math.random() * 6; t0 = performance.now(); fase = "entrando";
      document.addEventListener("keydown", tecla);
      timers.push(setTimeout(() => { if (fase !== "off") fim(); }, 12000)); // nunca prende a pessoa
      raf = requestAnimationFrame(quadro);
    }
    addEventListener("resize", () => { if (fase !== "off") medir(); });
    return { abrir };
  })();

  function formEventoManual() {
    const lista = sistemasConhecidos().filter((n) => n !== NOSSO && n !== "Sem sistema");
    return `<section class="cartao pad"><form class="pilha" style="gap:12px" data-acao="cc-salvar" autocomplete="off">
      <b>Registrar à mão</b><span class="t13 fraco">Para o que o vigia não pega sozinho: algo que você viu no Reclame Aqui, que um cliente contou, que apareceu numa ligação.</span>
      <div class="form-grade">
        <div class="campo"><label for="cc-sis">Concorrente</label><select id="cc-sis" name="sistema" class="input" required><option value="">Escolha</option>${lista.map((n) => `<option>${esc(n)}</option>`).join("")}</select></div>
        <div class="campo"><label for="cc-tipo">O que foi</label><select id="cc-tipo" name="tipo" class="input">
          <optgroup label="Brecha (atacar)"><option value="brecha:reclamacoes">Muitas reclamações (Reclame Aqui)</option><option value="brecha:queda">Sistema fora do ar</option><option value="brecha:preco">Reajuste de preço</option><option value="brecha:noticia">Outro problema</option></optgroup>
          <optgroup label="Movimento (ficar sabendo)"><option value="movimento:lancamento">Lançamento</option><option value="movimento:parceria">Parceria ou aquisição</option><option value="movimento:outro">Mudança na empresa</option></optgroup></select></div>
        <div class="campo"><label for="cc-dia">Quando</label><input id="cc-dia" name="dia" type="date" class="input" value="${hojeISO()}" max="${hojeISO()}"></div>
      </div>
      <div class="campo"><label for="cc-tit">Resumo</label><input id="cc-tit" name="titulo" class="input" maxlength="300" required placeholder="Ex.: Superlógica com boletos duplicados, dezenas de reclamações"></div>
      <div class="form-grade"><div class="campo"><label for="cc-det">Detalhes (opcional)</label><input id="cc-det" name="detalhe" class="input" maxlength="2000"></div><div class="campo"><label for="cc-url">Link (opcional)</label><input id="cc-url" name="url" class="input" type="url" placeholder="https://"></div></div>
      <div class="linha-flex"><button type="submit" class="btn btn-primario">Registrar</button><button type="button" class="btn btn-sec" data-acao="cc-form">Cancelar</button><span class="t12 fraco">Brecha vale por 14 dias a partir do dia informado.</span></div>
    </form></section>`;
  }
  function telaConcorrencia() {
    const C = S.cc, L = S.lg;
    if (!C.abertura) { C.abertura = true; Abertura.abrir(); } // F5 ou Voltar do navegador direto na página: cobre antes de a tela aparecer
    if (!C.carregado) carregarConcorrencia();
    if (!L.carregado && !L.carregando) carregarLig();
    const cab = `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Concorrência</h1><p class="fraco" style="margin:0">O sistema testa os portais dos concorrentes a cada 15 minutos e procura notícias a cada 2 horas. Brecha é hora de ligar para quem usa aquele sistema; movimento é para o time ficar sabendo.</p></div>
      <div class="linha-flex"><button type="button" class="btn ${C.form ? "btn-sec" : "btn-primario"}" data-acao="cc-form">${C.form ? "Fechar" : "+ Registrar à mão"}</button></div></div>`;
    if (!C.carregado || !L.carregado) return cab + `<div class="cartao vazio">Carregando…</div>`;
    const brechas = C.eventos.filter((e) => e.categoria === "brecha"), ativas = brechas.filter(brechaAtiva), velhas = brechas.filter((e) => !brechaAtiva(e));
    const movs = C.eventos.filter((e) => e.categoria === "movimento");
    const abas = `<div class="si-abas" role="tablist">${[["brechas", "Brechas", ativas.length], ["movimentos", "Movimentos", movs.length], ["concorrentes", "Por concorrente", null]].map(([k, l, q]) => `<button type="button" role="tab" data-acao="cc-aba" data-v="${k}" aria-selected="${C.aba === k}">${l}${q != null ? ` <b>${fmtN(q)}</b>` : ""}</button>`).join("")}</div>`;
    let corpo = "";
    if (C.aba === "brechas") {
      corpo = (ativas.length ? `<div class="pilha" style="gap:14px">${ativas.map((e) => cartaoBrecha(e, true)).join("")}</div>` : `<div class="cartao vazio">Nenhuma brecha aberta agora. Quando um concorrente cair ou sair notícia de problema, aparece aqui e no Início.</div>`)
        + (velhas.length ? `<section class="pilha" style="gap:10px;margin-top:8px"><button type="button" class="mini" style="align-self:flex-start" data-acao="cc-velhas">${C.mostrarVelhas ? "Esconder" : "Ver"} brechas encerradas (${fmtN(velhas.length)})</button>${C.mostrarVelhas ? velhas.map((e) => cartaoBrecha(e, false)).join("") : ""}</section>` : "");
    } else if (C.aba === "movimentos") {
      corpo = movs.length ? `<div class="pilha" style="gap:14px">${movs.map(cartaoMovimento).join("")}</div>`
        : `<div class="cartao vazio">Nenhum lançamento, parceria ou mudança registrada ainda.</div>`;
    } else {
      const seis = Date.now() - 183 * 86400000;
      const nomes = [...new Set([...C.portais.map((p) => nomeSis(p.sistema)), ...C.eventos.map((e) => nomeSis(e.sistema))])].sort((a, b) => (a === "Superlógica" ? -1 : b === "Superlógica" ? 1 : a.localeCompare(b, "pt-BR")));
      corpo = `<div class="cc-conc">${nomes.map((s) => {
        const g = grupoSis(s), ps = C.portais.filter((p) => grupoSis(p.sistema) === g), ev = C.eventos.filter((e) => grupoSis(e.sistema) === g);
        const quedas = ev.filter((e) => e.tipo === "queda" && new Date(e.inicio).getTime() >= seis);
        const maior = quedas.reduce((m, e) => Math.max(m, (e.fim ? new Date(e.fim) : new Date()) - new Date(e.inicio)), 0);
        const fora = ps.length && ps.every((p) => p.falhas >= 2), ult = ps.map((p) => p.ultimo_teste).filter(Boolean).sort().pop();
        const durTxt = maior >= 2 * 86400000 ? `${Math.round(maior / 86400000)} dias` : maior >= 3600000 ? `${Math.round(maior / 3600000)} h` : maior ? "menos de 1 h" : "";
        return `<section class="cartao pad pilha" style="gap:10px"><div class="linha-flex" style="justify-content:space-between"><b>${esc(s)}</b>${ps.length ? `<span class="selo ${fora ? "s-errado" : "s-conf"}">${fora ? "Portal fora do ar" : "Portal no ar"}</span>` : '<span class="selo s-vazio">Sem portal para testar</span>'}</div>
          ${(() => { const nu = quemUsa(s).length, np = ev.filter((e) => e.categoria === "brecha" && e.tipo !== "queda").length, nm = ev.filter((e) => e.categoria === "movimento").length;
            return `<div class="cc-mini"><span><b class="num">${fmtN(nu)}</b> ${nu === 1 ? "administradora usa" : "administradoras usam"}</span><span><b class="num">${fmtN(quedas.length)}</b> ${quedas.length === 1 ? "queda" : "quedas"} em 6 meses${durTxt ? ` · maior: ${durTxt}` : ""}</span><span><b class="num">${fmtN(np)}</b> ${np === 1 ? "notícia de problema" : "notícias de problema"}</span><span><b class="num">${fmtN(nm)}</b> ${nm === 1 ? "movimento" : "movimentos"}</span></div>`; })()}
          ${ult ? `<span class="t11 fraco">Último teste do portal: ${esc(dataHoraBR(ult))}</span>` : ""}</section>`; }).join("")}</div>`;
    }
    return cab + (C.form ? formEventoManual() : "") + abas + corpo;
  }
  // Início: alerta quando há brecha aberta; sem brecha, só a última novidade
  function cartaoConcorrenciaInicio() {
    const C = S.cc;
    if (!C.carregado) { carregarConcorrencia(); return ""; }
    const ativas = C.eventos.filter(brechaAtiva).sort((a, b) => ((b.tipo === "queda" && !b.fim) - (a.tipo === "queda" && !a.fim)) || (a.inicio < b.inicio ? 1 : -1));
    if (ativas.length) {
      const e = ativas[0], usa = quemUsa(e.sistema).length, outras = ativas.length - 1;
      return `<section class="in-cartao in-cc in-cc-alerta" data-pedaco="concorrencia"><div class="in-cc-dentro">
        <div class="pilha" style="gap:6px;min-width:0"><span class="linha-flex" style="gap:6px"><span class="selo s-errado">${e.tipo === "queda" && !e.fim ? "Brecha agora" : "Brecha aberta"}</span><span class="selo s-sis">${esc(nomeSis(e.sistema))}</span></span>
          <h2 style="margin:0">${esc(e.titulo)}</h2><span class="t13 fraco">${e.tipo === "queda" && !e.fim ? `Desde ${esc(dataHoraBR(e.inicio))}` : `${esc(ddmm(localSP(e.inicio).slice(0, 10)))} · ${esc(e.fonte || "")}`} · vale até ${esc(ddmm(localSP(e.valido_ate || new Date(Date.now() + 14 * 86400000).toISOString()).slice(0, 10)))}${outras ? ` · e mais ${outras} ${outras === 1 ? "brecha" : "brechas"}` : ""}</span></div>
        <div class="in-cc-acao"><b class="num">${fmtN(usa)}</b><span>${usa === 1 ? "administradora usa" : "administradoras usam"}</span><button type="button" class="btn btn-primario" data-acao="cc-abrir" data-id="${e.id}">Montar lista de ligação</button></div></div></section>`;
    }
    const m = C.eventos.find((e) => e.categoria === "movimento");
    return `<section class="in-cartao in-cc" data-pedaco="concorrencia"><div class="in-cc-dentro"><div class="pilha" style="gap:4px;min-width:0"><span class="t12 fraco">Concorrência · nenhuma brecha aberta</span>
      ${m ? `<span class="t13"><b>${esc(nomeSis(m.sistema))}</b> · ${esc(m.titulo)} <span class="fraco">(${esc(ddmm(localSP(m.inicio).slice(0, 10)))})</span></span>` : '<span class="t13">O vigia está testando os portais e procurando notícias.</span>'}</div>
      <button type="button" class="in-link" data-acao="ir" data-view="concorrencia">Ver concorrência →</button></div></section>`;
  }
  // Relatório: o que cada brecha rendeu no período
  function secaoBrechasRel(m) {
    const C = S.cc; if (!C.carregado) { carregarConcorrencia(); return ""; }
    const por = new Map();
    for (const r of m.rs) if (r.brecha_id && r.tipo !== "anotacao") { if (!por.has(r.brecha_id)) por.set(r.brecha_id, []); por.get(r.brecha_id).push(r); }
    if (!por.size) return "";
    const linhas = [...por].map(([id, rs]) => { const e = C.eventos.find((x) => x.id === id); return { e, rs }; }).filter((x) => x.e);
    if (!linhas.length) return "";
    const n = (rs, f) => fmtN(rs.filter(f).length);
    return `<section class="rel-pg"><h2 class="rel-h">Brechas da concorrência</h2><p class="fraco" style="margin:0 0 10px">Ligações feitas para administradoras que usam o sistema do concorrente enquanto a brecha estava aberta (14 dias). Demonstrações e contratos que vieram depois contam para a brecha que abriu a conversa.</p>
      <div class="rolagem"><table class="tab-simples rel-tab"><thead><tr><th>Brecha</th><th>Ligações</th><th>Contatos</th><th>Demos agendadas</th><th>Demos realizadas</th><th>Contratos</th></tr></thead><tbody>
      ${linhas.map(({ e, rs }) => `<tr><td><b>${esc(nomeSis(e.sistema))}</b> · ${esc(e.titulo)}<br><span class="t11 fraco">${esc(ddmm(localSP(e.inicio).slice(0, 10)))}${e.fim ? ` a ${esc(ddmm(localSP(e.fim).slice(0, 10)))}` : ""}</span></td><td class="num">${fmtN(rs.length)}</td><td class="num">${n(rs, (r) => CONTATO_REAL.has(r.tipo))}</td><td class="num">${n(rs, (r) => r.tipo === "demo_agendada")}</td><td class="num">${n(rs, (r) => r.tipo === "demo_realizada")}</td><td class="num">${n(rs, (r) => r.tipo === "contrato")}</td></tr>`).join("")}
      </tbody></table></div></section>`;
  }

  /* ---- Agenda: retornos marcados e demonstrações agendadas, com aviso na hora */
  S.ag = { fichas: [], carregado: false, cnpjs: new Set(), modo: "mes", ref: hojeISO(), dia: hojeISO(), arrastando: null };
  let buscandoAgenda = null;
  async function carregarAgenda(doBanco) {
    if (!S.user || (S.perfil && !S.perfil.aprovado)) return;
    const L = S.lg, minhas = L.carregado && !L.dono;
    if (minhas && !doBanco) S.ag.fichas = L.fichas.filter((f) => f.usuario_id === S.user.id);
    else if (!doBanco && L.carregando && !L.dono) return; // as fichas já estão vindo; carregarLig chama a agenda no fim
    else {
      if (buscandoAgenda) return buscandoAgenda;
      buscandoAgenda = sb.from("fichas").select("id,usuario_id,nome,cidade,uf,cnpj,telefones,responsavel,etapa,retorno_em,retorno_nota,demo_em,demo_formato").eq("usuario_id", S.user.id).limit(20000);
      const { data, error } = await buscandoAgenda.finally(() => { buscandoAgenda = null; });
      if (error) { console.error(error); return; }
      S.ag.fichas = data || [];
    }
    S.ag.carregado = true; S.ag.cnpjs = new Set(S.ag.fichas.map((f) => f.cnpj).filter(Boolean));
    if (S.view === "agenda" || S.view === "inicio") renderDados(); else atualizarContador();
    verificarAvisos();
  }
  function itensAgenda() {
    const out = [];
    for (const f of S.ag.fichas) {
      if (f.retorno_em) { const l = localSP(f.retorno_em); out.push({ tipo: "retorno", f, ts: f.retorno_em, dia: l.slice(0, 10), hora: l.slice(11, 16) }); }
      if (f.demo_em && f.etapa === "demo_agendada") { const l = localSP(f.demo_em); out.push({ tipo: "demo", f, ts: f.demo_em, dia: l.slice(0, 10), hora: l.slice(11, 16) }); }
    }
    // visitas e ligações do pós-vendas (as da própria pessoa)
    if (S.pv?.clientes) for (const v of S.pv.visitas) if (v.usuario_id === S.user?.id && v.status === "agendada") { const c = pvCliente(v.ficha_id); out.push({ tipo: "visita", vid: v.id, f: { id: v.ficha_id, nome: c?.nome || "Cliente", cidade: c?.cidade, retorno_nota: v.objetivo || (v.tipo === "visita" ? "Visita" : "Ligação de acompanhamento") }, ts: v.quando, dia: v.dia, hora: v.hora }); }
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
    const botaoAviso = st === "granted" ? "" : st === "denied" || st === "sem" ? "" : `<button type="button" class="btn btn-sec" data-acao="av-ativar">${ICONE.sino.replace('width="20" height="20"', 'width="18" height="18"')} Ativar avisos</button>`;
    const cab = `<div class="cabeca agn-cab"><div class="pilha" style="gap:4px"><h1>Agenda</h1><p class="fraco" style="margin:0">Organize seus contatos e próximos passos</p></div><div class="linha-flex">${botaoAviso}<button type="button" class="btn btn-primario agn-novo" data-acao="agn-novo">+ Novo compromisso</button></div></div>`;
    if (!A.carregado) { carregarAgenda(); return cab + `<div class="cartao vazio">Carregando a agenda…</div>`; }
    if (ehPos() && !S.pv.clientes && !S.pv.carregando && !S.pv.erro) carregarPos(true);
    const itens = itensAgenda(), porDia = new Map();
    for (const i of itens) { if (!porDia.has(i.dia)) porDia.set(i.dia, []); porDia.get(i.dia).push(i); }
    const atrasados = itens.filter((i) => i.tipo === "retorno" && i.dia < hj);
    const deHoje = porDia.get(hj) || [];
    const pendentes = itens.filter((i) => i.tipo === "retorno" && i.dia >= hj);
    // foco do dia: ligar para quem tem retorno hoje ou atrasado; concluídas = administradoras com contato registrado hoje
    const aLigar = [...new Map([...atrasados, ...deHoje.filter((i) => i.tipo === "retorno")].map((i) => [i.f.id, i])).values()];
    const feitas = new Set((S.lg.regs || []).filter((r) => r.data === hj && r.usuario_id === S.user.id && LIGACAO.has(r.tipo)).map((r) => r.ficha_id));
    const h = +localSP(new Date().toISOString()).slice(11, 13), saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    const nome = (S.perfil?.nome || "").split(/\s+/)[0];
    const demosHoje = deHoje.filter((i) => i.tipo === "demo").length, retHoje = deHoje.filter((i) => i.tipo === "retorno").length;
    const pl = (n, um, varios) => `${fmtN(n)} ${n === 1 ? um : varios}`;
    const partesHoje = [retHoje ? pl(retHoje, "retorno", "retornos") : "", demosHoje ? pl(demosHoje, "demonstração", "demonstrações") : ""].filter(Boolean);
    const frase = partesHoje.length ? `Hoje você tem <span class="agn-azul">${partesHoje.join(" e ")}</span>.` : "Hoje você não tem retornos marcados.";
    const extra = [atrasados.length ? `${pl(atrasados.length, "retorno atrasado", "retornos atrasados")} para colocar em dia` : "", feitas.size ? `${pl(feitas.size, "contato registrado", "contatos registrados")} hoje` : ""].filter(Boolean);
    const primeiro = deHoje.find((i) => i.tipo === "retorno") || atrasados[0];
    const hero = `<section class="agn-hero"><div class="agn-hero-txt"><span class="agn-oi">${ICONE_SOL} ${saud}, ${esc(nome)}!</span><p class="agn-foco">${frase}</p>${extra.length ? `<span class="agn-sub">${extra.join(" · ")}</span>` : ""}</div>
      ${primeiro ? `<div class="agn-hero-acoes"><button type="button" class="btn btn-primario agn-comecar" data-acao="ag-abrir" data-id="${primeiro.f.id}">${ICONE_FONE_P} Começar ligações</button>${atrasados.length ? `<button type="button" class="agn-link" data-acao="agn-lista">Ver atrasados →</button>` : ""}</div>` : ""}</section>`;
    const card = (ic, rot, val, cls = "") => `<div class="agn-num ${cls}"><span class="agn-num-ic">${ic}</span><span class="pilha" style="gap:0"><span class="agn-num-r">${rot}</span><b>${val}</b></span></div>`;
    const nums = `<div class="agn-nums">${card(ICONE_CAL, "Hoje", `${deHoje.length} ${deHoje.length === 1 ? "compromisso" : "compromissos"}`)}${card(AGN_RELOGIO, "Pendentes", `${pendentes.length} ${pendentes.length === 1 ? "retorno" : "retornos"}`)}${card(ICONE_ALERTA, "Atrasados", `${atrasados.length} ${atrasados.length === 1 ? "item" : "itens"}`, atrasados.length ? "agn-num-atr" : "")}</div>`;
    // calendário
    let corpo;
    const chip = (i) => { const atr = i.tipo === "retorno" && i.dia < hj;
      return `<button type="button" class="agn-ev ${i.tipo === "demo" ? "agn-ev-demo" : i.tipo === "visita" ? "pv-ev" : atr ? "agn-ev-atr" : ""}" data-acao="${i.vid ? "pv-registrar" : "ag-abrir"}" data-id="${i.vid || i.f.id}" ${i.tipo === "retorno" ? 'draggable="true" data-arrastar="1"' : ""} title="${esc(`${i.hora} · ${i.f.nome}${i.tipo === "demo" ? " (demonstração)" : i.f.retorno_nota ? " · " + i.f.retorno_nota : ""}`)}"><span class="agn-ev-l1"><b class="num">${i.hora}</b> ${esc(i.f.nome)}</span><span class="agn-ev-l2">${i.tipo === "demo" ? "Demonstração" : esc(i.f.retorno_nota || i.f.responsavel || "Retorno")}</span></button>`; };
    if (A.modo === "mes") {
      const ini = A.ref.slice(0, 8) + "01", fimM = (() => { const d = isoData(ini); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d.toISOString().slice(0, 10); })();
      const dias = []; for (let d = segundaDe(ini); d <= somaDias(segundaDe(fimM), 6); d = somaDias(d, 1)) dias.push(d);
      corpo = `<div class="agn-grade">${["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => `<span class="agn-sem">${d}</span>`).join("")}${dias.map((d) => { const its = porDia.get(d) || [];
        return `<div class="ag-dia agn-dia ${d.slice(0, 7) !== ini.slice(0, 7) ? "agn-fora" : ""} ${d === hj ? "agn-hoje" : ""} ${d === A.dia && d !== hj ? "agn-sel" : ""}" data-dia="${d}"><button type="button" class="agn-n num" data-acao="ag-dia" data-dia="${d}" aria-label="${ddmm(d)}: ${its.length} compromissos">${+d.slice(8)}</button>${its.slice(0, 3).map(chip).join("")}${its.length > 3 ? `<button type="button" class="agn-mais" data-acao="agn-expandir" data-dia="${d}">+${its.length - 3} mais</button>` : ""}${A.aberto === d ? `<div class="agn-pop ${[5, 6].includes((isoData(d).getUTCDay() + 6) % 7) ? "agn-pop-dir" : ""}" role="dialog" aria-label="Compromissos de ${ddmm(d)}"><div class="agn-pop-cab"><b>${+d.slice(8)} de ${MESES[+d.slice(5, 7) - 1]} de ${d.slice(0, 4)}</b><button type="button" class="agn-pop-x" data-acao="agn-fechar-pop" aria-label="Fechar">×</button></div><div class="agn-pop-lista">${its.map(chip).join("")}</div></div>` : ""}</div>`; }).join("")}</div>`;
    } else {
      const ini = segundaDe(A.ref), dias = [0, 1, 2, 3, 4, 5, 6].map((n) => somaDias(ini, n));
      corpo = `<div class="agn-grade agn-grade-sem">${dias.map((d) => `<span class="agn-sem">${DIAS[isoData(d).getUTCDay()].slice(0, 3)} ${ddmm(d)}</span>`).join("")}${dias.map((d) => { const its = porDia.get(d) || [];
        return `<div class="ag-dia agn-dia agn-col ${d === hj ? "agn-hoje" : ""} ${d === A.dia && d !== hj ? "agn-sel" : ""}" data-dia="${d}">${its.map(chip).join("") || '<span class="t12 fraco" style="padding:6px">—</span>'}</div>`; }).join("")}</div>`;
    }
    const mesNome = MESES[+A.ref.slice(5, 7) - 1], titulo = A.modo === "mes" ? `${mesNome[0].toUpperCase() + mesNome.slice(1)} de ${A.ref.slice(0, 4)}` : `${ddmm(segundaDe(A.ref))} a ${ddmm(somaDias(segundaDe(A.ref), 6))}`;
    const cal = `<section class="agn-cal"><div class="agn-cal-top"><div class="linha-flex"><button type="button" class="agn-seta" data-acao="ag-nav" data-v="-1" aria-label="Anterior">‹</button><button type="button" class="agn-seta" data-acao="ag-nav" data-v="1" aria-label="Próximo">›</button><b class="agn-mes">${titulo}</b></div>
      <div class="linha-flex"><div class="agn-seg" role="tablist">${[["mes", "Mês"], ["semana", "Semana"]].map(([k, l]) => `<button type="button" role="tab" data-acao="ag-modo" data-v="${k}" aria-selected="${A.modo === k}">${l}</button>`).join("")}</div><button type="button" class="agn-hojebt" data-acao="ag-hoje">Hoje</button></div></div>${corpo}</section>`;
    // lado direito: compromissos do dia escolhido e retornos prioritários (atrasados)
    const doDia = (porDia.get(A.dia) || []).filter((i) => A.dia !== hj || i.tipo === "demo" || !i.ts || new Date(i.ts) >= new Date(Date.now() - 30 * 60e3) || true);
    const linhaLado = (i, comData) => { const atr = i.tipo === "retorno" && i.dia < hj;
      return `<button type="button" class="agn-li" data-acao="ag-abrir" data-id="${i.f.id}"><span class="agn-li-h num">${comData ? ddmm(i.dia) : i.hora}</span><span class="agn-li-t"><b>${esc(i.f.nome)}</b><span>${i.tipo === "demo" ? `Demonstração ${i.f.demo_formato === "presencial" ? "presencial" : "virtual"}` : esc(i.f.retorno_nota || "Ligar de novo")}</span></span><i class="agn-pt ${i.tipo === "demo" ? "agn-pt-demo" : atr ? "agn-pt-atr" : ""}"></i></button>`; };
    const nomeDiaLado = A.dia === hj ? "Hoje" : `${DIAS[isoData(A.dia).getUTCDay()][0].toUpperCase() + DIAS[isoData(A.dia).getUTCDay()].slice(1)}`;
    const doDiaL = porDia.get(A.dia) || [], demosL = doDiaL.filter((i) => i.tipo === "demo"), retL = doDiaL.filter((i) => i.tipo !== "demo");
    const demoCard = (i) => `<button type="button" class="agn-demo" data-acao="ag-abrir" data-id="${i.f.id}"><span class="agn-demo-r">Demonstração ${i.f.demo_formato === "presencial" ? "presencial" : "virtual"}</span><span class="agn-demo-l"><b class="num">${i.hora}</b><span>${esc(i.f.nome)}</span></span>${i.f.responsavel || i.f.cidade ? `<span class="agn-demo-s">${esc([i.f.responsavel, i.f.cidade].filter(Boolean).join(" · "))}</span>` : ""}</button>`;
    const verAtr = A.verAtr;
    const lado = `<aside class="agn-lado"><section><h2>${nomeDiaLado}<span class="agn-lado-data">${ddmm(A.dia)}</span></h2>
        ${demosL.length ? `<div class="agn-bloco">${demosL.map(demoCard).join("")}</div>` : ""}
        <div class="agn-bloco"><span class="agn-bloco-t">${ehPos() ? "Visitas e ligações" : "Retornos"}${retL.length ? ` · ${retL.length}` : ""}</span>${retL.length ? retL.map(chip).join("") : `<p class="agn-vazio">Nenhum retorno ${A.dia === hj ? "para hoje" : "neste dia"}.</p>`}</div>
        ${!doDiaL.length && A.dia !== hj ? "" : ""}</section>
      ${atrasados.length ? `<section id="agn-prioritarios"><button type="button" class="agn-atr-cab" data-acao="agn-veratr" aria-expanded="${!!verAtr}"><span><b>Atrasados</b> · ${fmtN(atrasados.length)}</span><span class="agn-link">${verAtr ? "Esconder" : "Ver"}</span></button>
        ${verAtr ? `<div class="agn-bloco agn-atr-lista">${atrasados.slice(0, A.todosAtr ? atrasados.length : 30).map((i) => chip(i).replace('<b class="num">' + i.hora + "</b>", `<b class="num">${ddmm(i.dia)}</b>`)).join("")}${atrasados.length > 30 && !A.todosAtr ? `<button type="button" class="agn-mais" data-acao="agn-todos">Ver todos os ${fmtN(atrasados.length)}</button>` : ""}</div>` : ""}</section>` : ""}</aside>`;
    return cab + `<div class="agn-duas"><div class="agn-esq">${hero}${nums}${cal}</div>${lado}</div>` + (A.novo ? gaveta(painelNovoCompromisso(), "agn-fechar") : S.pv.vis || S.pv.sel ? pvGavetas() : "");
  }
  const ICONE_SOL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const ICONE_CAL = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/></svg>';
  const ICONE_FONE = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/><path d="M15 3a6 6 0 0 1 6 6M15 6.5a2.5 2.5 0 0 1 2.5 2.5"/></svg>';
  const ICONE_FONE_P = ICONE_FONE.replace(/width="24" height="24"/, 'width="18" height="18"');
  const AGN_RELOGIO = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
  const ICONE_ALERTA = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a6 6 0 0 0-6 6v3.5L4.5 15.5h15L18 12.5V9a6 6 0 0 0-6-6zM10 18a2 2 0 0 0 4 0z"/></svg>';
  function painelNovoCompromisso() {
    const A = S.ag, q = (A.novoBusca || "").trim().toLowerCase(), hj = hojeISO();
    const sel = A.novoFicha ? A.fichas.find((f) => f.id === A.novoFicha) : null;
    const achadas = q.length >= 2 ? A.fichas.filter((f) => `${f.nome} ${f.cidade || ""}`.toLowerCase().includes(q)).slice(0, 8) : [];
    return `<aside class="cartao painel agn-novo-p" aria-label="Novo compromisso"><button type="button" class="mini fechar-painel" data-acao="agn-fechar">Fechar ✕</button>
      <div class="pilha" style="gap:2px"><h2>Novo compromisso</h2><span class="t13 fraco">Marca um retorno para uma administradora sua. Ele aparece na agenda e avisa na hora.</span></div>
      ${sel ? `<div class="agn-escolhida"><span class="pilha" style="gap:0"><b>${esc(sel.nome)}</b><span class="t12 fraco">${esc([sel.cidade, sel.uf].filter(Boolean).join(" - "))}</span></span><button type="button" class="mini" data-acao="agn-trocar">Trocar</button></div>`
      : `<div class="campo"><label for="agn-busca">Administradora</label><input id="agn-busca" class="input" placeholder="Digite o nome" value="${esc(A.novoBusca || "")}" autocomplete="off"></div><div class="agn-achadas">${achadas.map((f) => `<button type="button" class="agn-li" data-acao="agn-escolher" data-id="${f.id}"><span class="agn-li-t"><b>${esc(f.nome)}</b><span>${esc([f.cidade, f.uf].filter(Boolean).join(" - "))}</span></span></button>`).join("") || (q.length >= 2 ? '<p class="agn-vazio">Nenhuma administradora com esse nome.</p>' : "")}</div>`}
      <form class="pilha" style="gap:12px" data-acao="agn-salvar"><div class="linha-flex"><div class="campo"><label for="agn-dia">Dia</label><input id="agn-dia" name="dia" type="date" class="input" min="${hj}" value="${hj}" required></div><div class="campo"><label for="agn-hora">Hora</label><input id="agn-hora" name="hora" type="time" class="input" value="09:00" required></div></div>
        <div class="campo"><label for="agn-nota">O que fazer</label><input id="agn-nota" name="nota" class="input" maxlength="300" placeholder="Ex.: retornar sobre a proposta"></div>
        <div><button type="submit" class="btn btn-primario" ${sel ? "" : "disabled"}>Salvar compromisso</button></div></form></aside>`;
  }
  app.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b || b.tagName === "FORM" || !b.dataset.acao.startsWith("agn-")) return;
    const A = S.ag;
    switch (b.dataset.acao) {
      case "agn-novo": A.novo = true; A.novoFicha = null; A.novoBusca = ""; render(); setTimeout(() => $("#agn-busca")?.focus(), 30); break;
      case "agn-fechar": A.novo = false; render(); break;
      case "agn-escolher": A.novoFicha = b.dataset.id; render(); break;
      case "agn-trocar": A.novoFicha = null; render(); setTimeout(() => $("#agn-busca")?.focus(), 30); break;
      case "agn-todos": A.todosAtr = !A.todosAtr; render(); break;
      case "agn-expandir": A.aberto = A.aberto === b.dataset.dia ? null : b.dataset.dia; render(); break;
      case "agn-fechar-pop": A.aberto = null; render(); break;
      case "agn-veratr": A.verAtr = !A.verAtr; render(); break;
      case "agn-lista": A.verAtr = true; render(); setTimeout(() => $("#agn-prioritarios")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30); break;
    }
  });
  document.addEventListener("click", (ev) => { if (!S.ag.aberto || S.view !== "agenda") return; if (ev.target.closest?.(".agn-pop, .agn-mais")) return; S.ag.aberto = null; render(); }, true);
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && S.ag.aberto && S.view === "agenda") { S.ag.aberto = null; render(); } });
  app.addEventListener("input", (ev) => { if (ev.target.id !== "agn-busca") return; clearTimeout(S.ag.esperaNovo); S.ag.esperaNovo = setTimeout(() => { const el = $("#agn-busca"); if (!el) return; S.ag.novoBusca = el.value; const p = el.selectionStart; render(); const n = $("#agn-busca"); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch { /* */ } } }, 200); });
  app.addEventListener("submit", async (ev) => {
    const f = ev.target; if (f.dataset.acao !== "agn-salvar") return; ev.preventDefault();
    const A = S.ag, ficha = A.fichas.find((x) => x.id === A.novoFicha); if (!ficha) { toast("Escolha a administradora."); return; }
    const fd = new FormData(f), dia = String(fd.get("dia") || ""), hora = String(fd.get("hora") || "09:00"), nota = String(fd.get("nota") || "").trim() || null;
    if (!dia || dia < hojeISO()) { toast("Escolha hoje ou um dia que ainda vai chegar."); return; }
    const btn = f.querySelector("button[type=submit]"); if (btn) btn.disabled = true;
    const { data, error } = await sb.from("fichas").update({ retorno_em: tsSP(dia, hora), retorno_nota: nota }).eq("id", ficha.id).select("retorno_em,retorno_nota").single();
    if (error) { console.error(error); toast("Não foi possível salvar. Tente de novo."); if (btn) btn.disabled = false; return; }
    Object.assign(ficha, data); const lf = S.lg.fichas.find((x) => x.id === ficha.id); if (lf) Object.assign(lf, data); S.dv = (S.dv || 0) + 1;
    A.novo = false; A.dia = dia; A.ref = dia; toast(`Compromisso marcado: ${ddmm(dia)} às ${hora}, ${ficha.nome}.`); render();
  });
  async function remarcar(id, dia) {
    const f = S.ag.fichas.find((x) => x.id === id); if (!f?.retorno_em) return;
    const hora = localSP(f.retorno_em).slice(11, 16);
    if (diaDe(f.retorno_em) === dia) return;
    if (dia < hojeISO()) { toast("Esse dia já passou. Escolha hoje ou outro dia."); return; }
    const novo = tsSP(dia, hora);
    const { data, error } = await sb.from("fichas").update({ retorno_em: novo }).eq("id", id).select("retorno_em").single();
    if (error) { console.error(error); toast("Não foi possível remarcar. Tente de novo."); return; }
    f.retorno_em = data.retorno_em;
    const lf = S.lg.fichas.find((x) => x.id === id); if (lf) lf.retorno_em = data.retorno_em; S.dv = (S.dv || 0) + 1;
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
  // voltando para a aba depois de 10 minutos: busca de novo (pode ter mudado em outro computador)
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.user && S.perfil?.aprovado && Date.now() - (S.carregadoEm || 0) > 6e5) atualizarDados(true); });
  // esquece o que estava guardado e busca tudo de novo (botão "Atualizar dados" no menu)
  function atualizarDados(silencioso) {
    if (S.lg.carregando || S.vd.carregando) return;
    Object.assign(S.lg, { carregado: false, textosFicha: new Set() });
    Object.assign(S.vd, { carregado: false });
    S.fx.cache.clear(); S.listas = null; S.equipe = null; S.carregadoEm = Date.now(); if (S.ind) S.ind.em = 0; if (S.op) S.op.em = 0; if (S.pv) S.pv.em = 0;
    S.inicio.desenhado = false; S.inicio.t0 = performance.now(); S.rowsProntas = !S.cidade || S.rowsProntas;
    carregarLig(); carregarVendas();
    if (!silencioso) toast("Atualizando os dados…");
  }
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
    if (f.demo_em && localSP(f.demo_em).slice(0, 10) === r.data && localSP(f.demo_em).slice(11, 16) !== "12:00") return localSP(f.demo_em).slice(11, 16);
    const m = (r.texto || "").match(/às (\d{1,2}[:h]\d{2})/); if (m) return m[1].replace("h", ":");
    if (f.demo_em && localSP(f.demo_em).slice(0, 10) === r.data) return localSP(f.demo_em).slice(11, 16);
    return "";
  }
  function cartaoDemo(f, linha, extra = "") {
    // condomínios, e as unidades só quando a ficha tem essa informação
    const qtd = f.qtd_condominios != null && f.qtd_condominios !== "" ? `${fmtN(f.qtd_condominios)} ${+f.qtd_condominios === 1 ? "condomínio" : "condomínios"}${f.qtd_unidades ? ` | ${fmtN(f.qtd_unidades)} unidades` : ""}` : "—";
    return `<div class="rel-card" data-ficha="${f.id}"><b class="rel-card-nome">${esc(f.nome)}</b><b class="t12">${linha}</b>
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

    const listaLig = (rs) => rs.length ? `<table class="tab-simples rel-tab"><thead><tr>${R.periodo === "dia" ? "" : "<th>Dia</th>"}<th>Administradora</th><th>Cidade</th><th>Ligação</th><th>Resultado</th><th>Anotação</th>${donoAtual() === "todos" ? "<th>Quem</th>" : ""}<th class="rel-tela"></th></tr></thead><tbody>${rs.map((r) => { const f = L.fichaPorId.get(r.ficha_id) || {}; return `<tr>${R.periodo === "dia" ? "" : `<td class="num">${ddmm(r.data)}</td>`}<td><b>${esc(f.nome || "")}</b></td><td>${esc([f.cidade, f.uf].filter(Boolean).join(" - "))}</td><td>${contaComoContato(r) ? (r.nova ? "Contato novo" : "Follow-up") : r.tipo === "sem_contato" ? "Sem contato" : "—"}</td><td><span class="selo ${RES[r.tipo]?.c}">${esc(rotuloReg(r))}</span></td><td class="rel-anot">${esc(r.texto || "")}</td>${donoAtual() === "todos" ? `<td>${esc(nomePessoa(r.usuario_id))}</td>` : ""}<td class="rel-tela">${r.usuario_id === S.user.id ? `<button type="button" class="mini" data-acao="rl-reg-editar" data-id="${r.id}">Editar</button>` : ""}</td></tr>`; }).join("")}</tbody></table>` : `<div class="vazio" style="padding:20px">Nenhuma ligação registrada ${R.periodo === "dia" ? "neste dia" : "neste período"}.</div>`;
    const ordenados = [...m.rs].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.criado_em < b.criado_em ? -1 : 1));
    const secLista = R.periodo === "dia" ? `<section class="rel-pg"><h2 class="rel-h">Ligações do dia</h2><div class="rolagem">${listaLig(ordenados)}</div></section>`
      : `<section class="rel-pg rel-sem-print"><details class="rel-tela"><summary><b>Ver todos os registros ${P.curto} (${m.rs.length})</b></summary><div class="rolagem" style="margin-top:10px">${listaLig(ordenados)}</div></details></section>`;

    const ag = m.rs.filter((r) => r.tipo === "demo_agendada"), re = m.rs.filter((r) => r.tipo === "demo_realizada");
    const cardsAg = ag.map((r) => { const f = L.fichaPorId.get(r.ficha_id); if (!f) return ""; const dt = f.demo_em ? localSP(f.demo_em) : ""; return cartaoDemo(f, dt ? `Demonstração ${f.demo_formato === "presencial" ? "presencial" : "virtual"} agendada: ${extenso(dt.slice(0, 10), dt.slice(11, 16))}` : `Demonstração agendada em ${ddmm(r.data)} (data da demo não informada)`); }).join("");
    const cardsRe = re.map((r) => { const f = L.fichaPorId.get(r.ficha_id); return f ? cartaoDemo(f, `Demonstração ${f.demo_formato === "presencial" ? "presencial" : "virtual"} realizada: ${extenso(r.data, horaDe(r, f))}`) : ""; }).join("");
    const secDestaque = `<section class="rel-pg"><span class="selo s-ident" style="align-self:flex-start">${R.periodo === "dia" ? "DIA" : R.periodo === "semana" ? "SEMANA" : "MÊS"} EM DESTAQUE</span>
      <h2 class="rel-h">Demonstrações agendadas</h2>${cardsAg ? `<div class="rel-cards">${cardsAg}</div>` : '<p class="fraco">Nenhuma demonstração agendada no período.</p>'}
      <h2 class="rel-h" style="margin-top:18px">Demonstrações realizadas</h2>${cardsRe ? `<div class="rel-cards">${cardsRe}</div>` : '<p class="fraco">Nenhuma demonstração realizada no período.</p>'}</section>`;

    let resto = ""; R._pdfAcum = null;
    if (R.periodo !== "dia") {
      const A = acumulado(P.fim);
      const ufs = [...new Set(L.fichas.filter((f) => f.uf && (L.porFicha.get(f.id) || []).some((r) => r.data <= P.fim)).map((f) => f.uf))].sort();
      const sis = {}; A.demos.forEach((f) => { if (f.sistema && !/sem sistema/i.test(f.sistema)) sis[f.sistema] = (sis[f.sistema] || 0) + 1; });
      const top = Object.entries(sis).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
      const listaUf = ufs.length > 1 ? ufs.slice(0, -1).join(", ") + " e " + ufs[ufs.length - 1] : ufs[0] || "";
      const fimTxt = R.periodo === "semana" ? somaDias(P.ini, 4) : P.fim;
      const ordDemo = (fs) => fs.map((f) => { const r = (L.porFicha.get(f.id) || []).find((x) => x.tipo === "demo_realizada" && x.data <= P.fim); return { f, r }; }).sort((a, b) => (a.r.data < b.r.data ? -1 : 1));
      R._pdfAcum = { A, listaUf, top, fimTxt, ordDemo };
      resto = `<section class="rel-pg"><h2 class="rel-h">Acumulado até ${ddmm(fimTxt)}</h2><div class="rel-acum">${barrasSvg([["Tentativas", A.tentativas], ["Administradoras", A.prospectadas], ["Demonstrações", A.demos.length], ["Contratos", A.contratos.length]])}
        <div class="pilha" style="gap:12px"><b class="rel-sub2">Destaques do período</b><p style="margin:0">Com <b>${fmtN(A.tentativas)} tentativas de contato</b> e <b>${fmtN(A.prospectadas)} administradoras prospectadas</b>, o período acumulado resultou em <b>${fmtN(A.demos.length)} demonstrações realizadas</b> e <b>${fmtN(A.contratos.length)} ${A.contratos.length === 1 ? "contrato fechado" : "contratos fechados"}</b>.${listaUf ? ` Os atendimentos abrangeram administradoras em <b>${esc(listaUf)}</b>, com diferentes sistemas de gestão em uso.` : ""}</p>
        ${top.length ? `<div class="rel-info">As demonstrações contemplaram administradoras com rotinas e plataformas variadas, incluindo ${esc(top.join(", "))} e outros sistemas de administração.</div>` : ""}</div></div></section>
        <section class="rel-pg rel-painel-demos"><div class="rel-painel-cab"><h2 class="rel-h">Painel de Demonstrações Realizadas</h2><b class="t13">TOTAL: ${fmtN(A.demos.length)} ${A.demos.length === 1 ? "Demonstração" : "Demonstrações"}</b></div>
          ${A.demos.length ? `<div class="rel-cards">${ordDemo(A.demos).map(({ f, r }) => cartaoDemo(f, `Demonstração ${f.demo_formato === "presencial" ? "presencial" : "virtual"} realizada: ${extenso(r.data, horaDe(r, f))}`)).join("")}</div>` : '<p class="fraco">Nenhuma demonstração ainda.</p>'}</section>
        <section class="rel-pg"><div class="rel-painel-cab"><h2 class="rel-h">Painel de Contratos Fechados</h2><b class="t13">TOTAL: ${fmtN(A.contratos.length)} ${A.contratos.length === 1 ? "Contrato" : "Contratos"}</b></div>
          ${A.contratos.length ? `<div class="rel-cards">${A.contratos.map((f) => { const d = (L.porFicha.get(f.id) || []).find((x) => x.tipo === "demo_realizada"); return cartaoDemo(f, d ? `Demonstração ${f.demo_formato === "presencial" ? "presencial" : "virtual"} realizada: ${extenso(d.data, horaDe(d, f))}` : "", `<b class="t12">Contrato fechado dia ${ddmmaaaa(f.contrato_em || (L.porFicha.get(f.id) || []).find((x) => x.tipo === "contrato")?.data || "")}</b>`); }).join("")}</div>` : '<p class="fraco">Nenhum contrato fechado ainda.</p>'}</section>`;
    }
    R._pdf = { P, m, val, ajustado, obs, quem, ag, re, ordenados };
    const regEd = R.editReg && L.regs.find((x) => x.id === R.editReg);
    return ctrl + barra + `<div class="relatorio">${capa}${secObs}${secNums}${secLista}${secDestaque}${resto}</div>` + (regEd ? gaveta(painelEditarReg(regEd), "rl-reg-fechar") : "");
  }
  // corrigir um contato já registrado, direto do relatório: o resultado e a anotação
  const RES_EDITAVEL = [["sem_contato", "Sem contato"], ["conversou", "Contato realizado"], ["negativa", "Negativa"], ["anotacao", "Só anotação"]];
  function painelEditarReg(r) {
    const f = S.lg.fichaPorId.get(r.ficha_id) || {}, troca = RES_EDITAVEL.some(([k]) => k === r.tipo);
    const R = S.rl, tipo = R.editTipo || r.tipo, semestral = somaDias(hojeISO(), 182);
    return `<aside class="cartao painel rl-ed" aria-label="Corrigir contato"><button type="button" class="mini fechar-painel" data-acao="rl-reg-fechar">Fechar ✕</button>
      <div class="pilha" style="gap:2px"><h2>${esc(f.nome || "")}</h2><span class="t13 fraco">Contato de ${ddmmaaaa(r.data)}${f.cidade ? ` · ${esc([f.cidade, f.uf].filter(Boolean).join(" - "))}` : ""}</span></div>
      <form class="pilha" style="gap:16px" data-acao="rl-reg" data-id="${r.id}">
        ${troca ? `<div class="pilha" style="gap:8px"><span class="rotulo">O que aconteceu</span><div class="rg-opcoes">${RES_EDITAVEL.map(([k, l]) => `<label class="chip-radio"><input type="radio" name="tipo" value="${k}" ${tipo === k ? "checked" : ""} data-acao="rl-reg-tipo"><span>${l}</span></label>`).join("")}</div></div>`
          : `<p class="t13 fraco" style="margin:0">Este registro é <b>${esc(rotuloReg(r))}</b>. Aqui dá para corrigir só a anotação.</p>`}
        ${troca && tipo === "negativa" ? `<div class="pilha rg-neg" style="gap:8px"><span class="rotulo">Para onde vai essa negativa?</span>
          <div class="rg-opcoes rg-opcoes2"><label class="chip-radio"><input type="radio" name="neg_destino" value="follow" ${R.editDest === "follow" ? "checked" : ""} data-acao="rl-reg-dest"><span>Follow-up semestral</span></label><label class="chip-radio"><input type="radio" name="neg_destino" value="sem" ${R.editDest === "sem" ? "checked" : ""} data-acao="rl-reg-dest"><span>Sem interesse</span></label></div>
          ${R.editDest === "follow" ? `<div class="campo" style="max-width:200px"><label for="rl-neg-data">Próximo contato</label><input id="rl-neg-data" name="neg_retorno" type="date" class="input" value="${f.retorno_em && diaDe(f.retorno_em) > hojeISO() ? diaDe(f.retorno_em) : semestral}" min="${hojeISO()}"></div>` : ""}
          ${R.editDest === "sem" ? `<span class="t12 fraco">Sai das listas de ligação e vai para a aba <b>Sem interesse</b>.</span>` : ""}</div>` : ""}
        <div class="campo"><label for="rl-ed-texto">Anotação</label><textarea id="rl-ed-texto" name="texto" class="input lg-texto" rows="5" maxlength="4000">${esc(r.texto || "")}</textarea></div>
        <div class="linha-flex"><button type="submit" class="btn btn-primario">Salvar correção</button><button type="button" class="btn btn-sec" data-acao="rl-reg-fechar">Cancelar</button></div>
      </form></aside>`;
  }
  async function salvarEdicaoReg(form) {
    const L = S.lg, r = L.regs.find((x) => x.id === form.dataset.id); if (!r) return;
    const fd = new FormData(form), tipo = String(fd.get("tipo") || r.tipo), texto = String(fd.get("texto") || "").trim();
    const mud = {};
    if (texto !== (r.texto || "")) mud.texto = texto || null;
    if (tipo !== r.tipo) { mud.tipo = tipo; mud.detalhe = null; mud.detalhes = [tipo]; }
    let ficha = null;
    if (tipo === "negativa" && RES_EDITAVEL.some(([k]) => k === r.tipo)) {
      const dest = String(fd.get("neg_destino") || "");
      if (tipo !== r.tipo && !dest) { toast("Escolha para onde vai a negativa: Follow-up semestral ou Sem interesse."); return; }
      if (dest === "follow") { const nd = String(fd.get("neg_retorno") || ""); if (!nd || nd < hojeISO()) { toast("Escolha a data do próximo contato."); return; } ficha = { retorno_em: tsSP(nd, "09:00"), retorno_nota: "Follow-up semestral" }; }
      else if (dest === "sem") ficha = { retorno_em: null, retorno_nota: null };
    }
    if (!Object.keys(mud).length && !ficha) { S.rl.editReg = null; render(); return; }
    form.querySelectorAll("button[type=submit]").forEach((b) => (b.disabled = true));
    try {
      if (Object.keys(mud).length) { const { data, error } = await sb.from("registros").update(mud).eq("id", r.id).select().single(); if (error) throw error; Object.assign(r, data); }
      if (ficha) { const { error } = await sb.from("fichas").update(ficha).eq("id", r.ficha_id); if (error) throw error; }
      const { data: nf } = await sb.from("fichas").select(COLS_FICHA).eq("id", r.ficha_id).single();
      if (nf) { const i = L.fichas.findIndex((x) => x.id === nf.id); if (i >= 0) L.fichas[i] = nf; }
      derivar(); carregarAgenda();
      Object.assign(S.rl, { editReg: null, editTipo: null, editDest: null });
      toast("Contato corrigido."); render();
    } catch (e) { console.error(e); toast("Não foi possível salvar. Tente de novo."); form.querySelectorAll("button[type=submit]").forEach((b) => (b.disabled = false)); }
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
  /* PDF dos relatórios: A4 em pé, no layout do Resumo Semanal (Sora + Plus Jakarta Sans).
     Monta blocos, mede cada um e distribui nas páginas sem deixar página quase vazia nem cortar cartão. */
  function pdfCartao(f, linha, extra = "") {
    const qtd = f.qtd_condominios != null && f.qtd_condominios !== "" ? `${fmtN(f.qtd_condominios)} ${+f.qtd_condominios === 1 ? "condomínio" : "condomínios"}${f.qtd_unidades ? ` · ${fmtN(f.qtd_unidades)} unidades` : ""}` : "";
    const l2 = [f.sistema ? `Sistema: <b>${esc(f.sistema)}</b>` : "", esc(qtd)].filter(Boolean).join(" · ");
    const l3 = [f.responsavel, [f.cidade, f.uf].filter(Boolean).join(" - ")].filter(Boolean).map(esc).join(" · ");
    return `<div class="rp-demo"><h4>${esc(f.nome)}</h4>${linha ? `<span>${linha}</span>` : ""}${l2 ? `<span>${l2}</span>` : ""}${l3 ? `<span>${l3}</span>` : ""}${extra}</div>`;
  }
  function pdfBlocos() {
    const L = S.lg, R = S.rl, D = R._pdf; if (!D) return null;
    const { P, m, val, ajustado, obs, quem, ag, re, ordenados } = D, dia = R.periodo === "dia";
    const B = [], add = (html, gap = 8, junto = false) => B.push({ html, gap, junto });
    const fmtD = (f, r, tipo) => { const pres = f.demo_formato === "presencial" ? "presencial" : "virtual";
      if (tipo === "ag") { const dt = f.demo_em ? localSP(f.demo_em) : ""; return dt ? `Demonstração ${pres} agendada: <b>${extenso(dt.slice(0, 10), dt.slice(11, 16))}</b>` : `Agendada em ${ddmm(r.data)}`; }
      return `Demonstração ${pres} realizada: <b>${extenso(r.data, horaDe(r, f))}</b>`; };
    // capa
    const grande = dia ? `<b>${ddmm(P.ini)}</b> <small>${P.sub}</small>` : R.periodo === "semana" ? `<b>${ddmm(P.ini)}</b> – ${ddmm(somaDias(P.ini, 4))}` : `<b>${P.rotulo.split(" de ")[0]}</b> ${P.ini.slice(0, 4)}`;
    add(`<section class="rp-capa"><p class="rp-t rp-sobre">${P.nome}</p><p class="rp-t rp-data">${grande}</p><p class="rp-subt">${dia ? "Resumo das atividades de prospecção e follow-ups realizadas no dia." : "Resumo das atividades de prospecção, follow-ups e oportunidades em andamento no período."}</p><p class="rp-quem"><b>${esc(quem || "")}</b>${donoAtual() === "todos" ? "" : " · SDR"} · PRG Software</p></section>`, 0);
    // observações
    if (obs.length) { add(`<h2 class="rp-t rp-h">Observações ${P.curto}</h2>`, 9, true); add(`<div class="rp-obs">${obs.map((o) => `<div class="rp-card"><h3>${esc(o.titulo)}</h3><p>${esc(o.texto)}</p></div>`).join("")}</div>`, 0); }
    // resultados
    const n = ajustado ? (+val("follow_up") + +val("primeira_ligacao")) : m.ligacoes;
    add(`<h2 class="rp-t rp-h">Resultados ${P.curto}</h2><p class="rp-lead"><b>${fmtN(n)} ${n === 1 ? "contato" : "contatos"}</b>${ajustado ? "" : ` com <b>${fmtN(m.pessoas)} ${m.pessoas === 1 ? "administradora" : "administradoras"}</b>${m.pessoas === 1 ? "" : " diferentes"}`}.</p>`, 9, true);
    add(`<div class="rp-nums">${[["follow_up", "Follow-ups"], ["primeira_ligacao", "Novas administradoras"], ["sem_contato", "Sem contato"], ["demo_agendada", "Demos agendadas"], ["demo_realizada", "Demos realizadas"], ["negativa", "Negativas"]].map(([k, l]) => `<div><b>${fmtN(val(k))}</b><span>${l}</span></div>`).join("")}</div>`, 0);
    // ligações do dia (só no diário)
    if (dia) {
      const todos = donoAtual() === "todos", cols = `<colgroup><col style="width:32%"><col style="width:17%"><col></colgroup>`;
      add(`<h2 class="rp-t rp-h">Ligações do Dia</h2>`, 9, true);
      if (!ordenados.length) add(`<p class="rp-vazio">Nenhuma ligação registrada neste dia.</p>`, 0);
      else {
        add(`<table class="rp-tab rp-tab-cab">${cols}<thead><tr><th>Administradora</th><th>Resultado</th><th>Anotação</th></tr></thead></table>`, 0, true);
        ordenados.forEach((r, i) => { const f = L.fichaPorId.get(r.ficha_id) || {};
          const tipo = contaComoContato(r) ? (r.nova ? "Contato novo" : "Follow-up") : r.tipo === "sem_contato" ? "Sem contato" : "";
          const sub = [[f.cidade, f.uf].filter(Boolean).join(" - "), tipo, todos ? nomePessoa(r.usuario_id) : ""].filter(Boolean).map(esc).join(" · ");
          add(`<table class="rp-tab${i === ordenados.length - 1 ? " rp-tab-fim" : ""}">${cols}<tbody><tr><td><b>${esc(f.nome || "")}</b>${sub ? `<small>${sub}</small>` : ""}</td><td><span class="rp-sel ${RES[r.tipo]?.c === "s-errado" ? "rp-no" : ""}">${esc(rotuloReg(r))}</span></td><td>${esc(r.texto || "")}</td></tr></tbody></table>`, 0, i < ordenados.length - 1 && false); });
      }
    }
    // em destaque: agendadas | realizadas, em linhas de dois
    const cAg = ag.map((r) => { const f = L.fichaPorId.get(r.ficha_id); return f ? pdfCartao(f, fmtD(f, r, "ag")) : ""; }).filter(Boolean);
    const cRe = re.map((r) => { const f = L.fichaPorId.get(r.ficha_id); return f ? pdfCartao(f, fmtD(f, r, "re")) : ""; }).filter(Boolean);
    const quando = dia ? "no dia" : R.periodo === "semana" ? "na semana" : "no mês";
    add(`<span class="rp-tag">${dia ? "Dia" : R.periodo === "semana" ? "Semana" : "Mês"} em destaque</span><div class="rp-duas"><h2 class="rp-t2">Demonstrações agendadas</h2><h2 class="rp-t2">Demonstrações realizadas</h2></div>`, 9, true);
    const linhas = Math.max(1, cAg.length, cRe.length);
    for (let i = 0; i < linhas; i++) add(`<div class="rp-duas">${cAg[i] || (i === 0 ? `<p class="rp-vazio">Nenhuma demonstração agendada ${quando}.</p>` : "<div></div>")}${cRe[i] || (i === 0 ? `<p class="rp-vazio">Nenhuma demonstração realizada ${quando}.</p>` : "<div></div>")}</div>`, i ? 3.5 : 0, i < linhas - 1 && i === 0);
    // semanal e mensal: acumulado, contratos e o painel de todas as demos
    const X = R._pdfAcum;
    if (!dia && X) {
      const { A, listaUf, top, fimTxt, ordDemo } = X;
      add(`<h2 class="rp-t rp-h">Acumulado até ${ddmm(fimTxt)}</h2>`, 9, true);
      add(`<div class="rp-acum"><div class="rp-graf">${barrasSvg([["Tentativas", A.tentativas], ["Administradoras", A.prospectadas], ["Demonstrações", A.demos.length], ["Contratos", A.contratos.length]]).replace('class="rel-grafico"', 'class="rp-svg"')}</div>
        <div class="rp-dest"><h3>Destaques do período</h3><p>Com <b>${fmtN(A.tentativas)} tentativas de contato</b> e <b>${fmtN(A.prospectadas)} administradoras prospectadas</b>, o período acumulado resultou em <b>${fmtN(A.demos.length)} demonstrações realizadas</b> e <b>${fmtN(A.contratos.length)} ${A.contratos.length === 1 ? "contrato fechado" : "contratos fechados"}</b>${listaUf ? `, com administradoras em <b>${esc(listaUf)}</b>` : ""}.</p>
        ${top.length ? `<div class="rp-info"><i>i</i><span>As demonstrações contemplaram plataformas variadas, incluindo ${esc(top.join(", "))} e outros sistemas.</span></div>` : ""}</div></div>`, 0);
      const grade = (cards, titulo, total, info) => {
        add(`<div class="rp-topo"><div><h2 class="rp-t rp-h">${titulo}</h2><p class="rp-tot">TOTAL: ${total}</p></div><div class="rp-info"><i>i</i><span>${info}</span></div></div>`, 9, true);
        if (!cards.length) { add(`<p class="rp-vazio">Nada registrado ainda.</p>`, 4); return; }
        for (let i = 0; i < cards.length; i += 3) add(`<div class="rp-demos">${cards.slice(i, i + 3).join("")}</div>`, i ? 4 : 5);
      };
      grade(A.contratos.map((f) => { const d = (L.porFicha.get(f.id) || []).find((x) => x.tipo === "demo_realizada"); const em = f.contrato_em || (L.porFicha.get(f.id) || []).find((x) => x.tipo === "contrato")?.data || "";
        return pdfCartao(f, d ? fmtD(f, d, "re") : "", em ? `<span class="rp-ok">Contrato fechado em ${ddmmaaaa(em)}</span>` : ""); }),
        "Contratos Fechados", `${fmtN(A.contratos.length)} ${A.contratos.length === 1 ? "contrato" : "contratos"}`, "Administradoras que fecharam contrato com a PRG.");
      grade(ordDemo(A.demos).map(({ f, r }) => pdfCartao(f, fmtD(f, r, "re"))), "Painel de Demonstrações Realizadas", `${fmtN(A.demos.length)} ${A.demos.length === 1 ? "demonstração" : "demonstrações"}`, "Painel de acompanhamento com as demonstrações registradas.");
    }
    return { B, P, quem };
  }
  function pdfFontes() {
    if (!document.getElementById("rp-fontes")) document.head.insertAdjacentHTML("beforeend", '<link id="rp-fontes" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Sora:wght@400;600;700&display=block">');
    const esp = ["600 20px Sora", "700 20px Sora", "400 20px Sora", "400 12px 'Plus Jakarta Sans'", "500 12px 'Plus Jakarta Sans'", "600 12px 'Plus Jakarta Sans'", "700 12px 'Plus Jakarta Sans'"];
    const pronto = new Promise((ok) => { const l = document.getElementById("rp-fontes"); if (l.sheet) ok(); else { l.addEventListener("load", ok, { once: true }); l.addEventListener("error", ok, { once: true }); } })
      .then(() => Promise.all(esp.map((f) => document.fonts.load(f).catch(() => null))));
    return Promise.race([pronto, new Promise((ok) => setTimeout(ok, 4000))]);
  }
  async function baixarPdf() {
    const dados = pdfBlocos(); if (!dados) { toast("Abra o relatório antes de baixar."); return; }
    toast("Preparando o PDF…");
    await pdfFontes();
    const { B, P, quem } = dados, mm = 96 / 25.4, ALT = (297 - 16 - 21) * mm;
    document.getElementById("rel-print")?.remove();
    const box = document.createElement("div"); box.id = "rel-print"; document.body.appendChild(box);
    // mede cada bloco na largura útil da página e distribui; se a última página ficar quase vazia,
    // tenta de novo um pouco mais compacto para caber em menos páginas
    const montar = (compacto) => {
      box.className = compacto ? "rp-compacto" : "";
      box.innerHTML = `<div class="rp-pg rp-medir"><div class="rp-corpo">${B.map((b) => `<div class="rp-bl">${b.html}</div>`).join("")}</div></div>`;
      const alt = [...box.querySelectorAll(".rp-bl")].map((el) => el.getBoundingClientRect().height), gap = (k) => B[k].gap * mm * (compacto ? 0.7 : 1);
      const pags = [[]]; let usado = 0;
      for (let i = 0; i < B.length; i++) {
        // um título vai junto com o que vem depois dele
        const grupo = [i]; while (B[grupo[grupo.length - 1]].junto && grupo[grupo.length - 1] + 1 < B.length) grupo.push(grupo[grupo.length - 1] + 1);
        const h = grupo.reduce((t, k, j) => t + alt[k] + (j || pags[pags.length - 1].length ? gap(k) : 0), 0);
        if (usado + h > ALT && pags[pags.length - 1].length) { pags.push([]); usado = 0; }
        const pg = pags[pags.length - 1];
        grupo.forEach((k) => { usado += alt[k] + (pg.length ? gap(k) : 0); pg.push(k); });
        i = grupo[grupo.length - 1];
      }
      return { pags, usado, compacto };
    };
    let res = montar(false);
    if (res.pags.length > 1 && res.usado < ALT * 0.35) { const c = montar(true); if (c.pags.length < res.pags.length) res = c; else box.className = ""; }
    const { pags, compacto } = res, fator = compacto ? 0.7 : 1;
    const rot = `${P.nome} · ${P.rotulo}${quem ? ` · ${esc(quem)}` : ""}`;
    box.innerHTML = pags.map((ks, n) => `<div class="rp-pg"><div class="rp-corpo">${ks.map((k, j) => `<div class="rp-bl" style="margin-top:${j ? (B[k].gap * fator).toFixed(2) : 0}mm">${B[k].html}</div>`).join("")}</div>
      <div class="rp-rod"><span>${rot} · página ${n + 1} de ${pags.length}</span><span class="rp-selo">PRG Software · Grupo WorkOffice</span></div></div>`).join("");
    const antes = document.title;
    document.title = `${P.nome} - ${P.rotulo.replace(/\//g, "-")}${donoAtual() === "todos" ? " - Equipe" : ` - ${nomePessoa(donoAtual()) || ""}`}`;
    document.head.insertAdjacentHTML("beforeend", '<style id="rp-pagina">@page { size: A4 portrait; margin: 0; }</style>');
    document.body.classList.add("imprimindo");
    const volta = () => { document.title = antes; document.body.classList.remove("imprimindo"); document.getElementById("rp-pagina")?.remove(); box.remove(); window.removeEventListener("afterprint", volta); };
    window.addEventListener("afterprint", volta);
    setTimeout(() => window.print(), 80);
  }


  app.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b || b.tagName === "FORM" || !b.dataset.acao.startsWith("cc-")) return;
    const C = S.cc, a = b.dataset.acao;
    switch (a) {
      case "cc-aba": C.aba = b.dataset.v; render(); break;
      case "cc-form": C.form = !C.form; render(); break;
      case "cc-velhas": C.mostrarVelhas = !C.mostrarVelhas; render(); break;
      case "cc-editar": C.editando = b.dataset.id ? { id: +b.dataset.id, campo: b.dataset.campo } : null; render(); if (C.editando) document.querySelector('form[data-acao="cc-texto"] textarea')?.focus(); break;
      case "cc-nota-apagar": {
        const { error } = await sb.from("concorrencia_notas").delete().eq("id", +b.dataset.id);
        if (error) { toast("Não deu para apagar. Tente de novo."); break; }
        C.notas = C.notas.filter((n) => n.id !== +b.dataset.id); render(); break;
      }
      case "cc-lista": C.sel = C.sel === +b.dataset.id ? null : +b.dataset.id; render(); break;
      case "cc-abrir": C.aba = "brechas"; C.sel = +b.dataset.id; S.view = "concorrencia"; C.abertura = true; Abertura.abrir(); S.voltarAtivo = true; render(); window.scrollTo(0, 0); break;
      case "cc-descartar": {
        const e = C.eventos.find((x) => x.id === +b.dataset.id); if (!e) break;
        const { error } = await sb.rpc("descartar_evento", { p_id: e.id, p_descartar: true });
        if (error) { toast("Não deu para descartar. Tente de novo."); break; }
        C.eventos = C.eventos.filter((x) => x.id !== e.id); if (C.sel === e.id) C.sel = null;
        toast("Descartado."); render(); break;
      }
      case "cc-ligar": {
        // abre a ficha já no registro de contato (empresa sem ficha: cria a ficha primeiro)
        b.disabled = true;
        if (b.dataset.ficha) { await abrirFicha(b.dataset.ficha); S.lg.registrar = S.lg.sel; render(); }
        else { const r = C.mapa.find((x) => x.cnpj === b.dataset.cnpj); if (r) { await abrirFichaDaEmpresa(r); if (S.lg.sel) { S.lg.registrar = S.lg.sel; render(); } } }
        break;
      }
    }
  });
  app.addEventListener("submit", async (ev) => {
    const f = ev.target;
    if (f.dataset.acao === "cc-texto") {
      ev.preventDefault();
      const id = +f.dataset.id, campo = f.dataset.campo, texto = String(new FormData(f).get("texto") || "").trim();
      const { error } = await sb.rpc("editar_texto_evento", { p_id: id, p_campo: campo, p_texto: texto });
      if (error) { toast("Não deu para salvar. Tente de novo."); return; }
      const e = S.cc.eventos.find((x) => x.id === id); if (e) { e[campo] = texto || null; e.editado_por = S.user.id; }
      S.cc.editando = null; toast("Salvo."); render(); return;
    }
    if (f.dataset.acao === "cc-nota") {
      ev.preventDefault();
      const inp = f.querySelector("input"), texto = String(inp.value || "").trim(); if (!texto) { inp.focus(); return; }
      const { data, error } = await sb.from("concorrencia_notas").insert({ evento_id: +f.dataset.id, usuario_id: S.user.id, texto }).select().single();
      if (error) { toast("Não deu para anotar. Tente de novo."); return; }
      S.cc.notas.push(data); render(); return;
    }
    if (f.dataset.acao !== "cc-salvar") return;
    ev.preventDefault();
    const fd = new FormData(f), [categoria, tipo] = String(fd.get("tipo") || "").split(":");
    const sistema = String(fd.get("sistema") || ""), titulo = String(fd.get("titulo") || "").trim();
    if (!sistema) { toast("Escolha o concorrente."); return; }
    if (!titulo) { toast("Escreva um resumo do que aconteceu."); return; }
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    const { error } = await sb.rpc("registrar_evento_concorrencia", { p_sistema: sistema, p_categoria: categoria, p_tipo: tipo, p_titulo: titulo, p_detalhe: String(fd.get("detalhe") || ""), p_url: String(fd.get("url") || ""), p_dia: String(fd.get("dia") || hojeISO()) });
    b.disabled = false;
    if (error) { toast("Não deu para registrar. Tente de novo."); console.warn(error); return; }
    S.cc.form = false; S.cc.aba = categoria === "brecha" ? "brechas" : "movimentos";
    toast(categoria === "brecha" ? "Brecha registrada. Vale por 14 dias." : "Movimento registrado.");
    await carregarConcorrencia(true);
  });

  app.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b || b.tagName === "FORM") return;
    const a = b.dataset.acao, L = S.lg, R = S.rl, A = S.ag;
    if (!a.startsWith("lg-") && !a.startsWith("rl-") && !a.startsWith("ag-") && !a.startsWith("av-") && !a.startsWith("vd-") && !a.startsWith("in-") && a !== "ficha-empresa") { if (!a.startsWith("lg-apagar")) L.apagar = null; return; }
    if (a !== "lg-apagar-reg" && a !== "lg-apagar-ficha") L.apagar = null;
    switch (a) {
      case "ficha-empresa": if (S.selRow) { b.disabled = true; await abrirFichaDaEmpresa(S.selRow); } break;
      case "lg-abrir": await abrirFicha(b.dataset.id); break;
      case "vd-funil": S.vd.funil = +b.dataset.v; S.vd.porColuna = {}; atualizarVendas(); break;
      case "vd-status": S.vd.status = b.dataset.v; atualizarVendas(); break;
      case "vd-mais": S.vd.porColuna[b.dataset.v] = (S.vd.porColuna[b.dataset.v] || 40) + 40; atualizarVendas(); break;
      case "vd-abrir": { if (S.vd.arrastou) break; const n = S.vd.negocios.find((x) => x.id === b.dataset.id); if (n) await abrirFicha(n.ficha, n.dono); break; }
      case "vd-ganho": await ganharNegocio(b.dataset.id); break;
      case "vd-perdido": S.vd.perder = b.dataset.id; render(); break;
      case "vd-perda-cancelar": S.vd.perder = null; render(); break;
      case "vd-reabrir": await reabrirNegocio(b.dataset.id); break;
      case "lg-registrar": L.registrar = L.sel; L.passo = b.dataset.v === "dados" ? { k: L.sel, v: "editar" } : null; render(); document.querySelector(".gaveta .painel")?.scrollTo(0, 0); if (b.dataset.v === "dados") $("#fx-nome")?.focus(); else document.querySelector('.gaveta [name="res"]')?.focus(); break;
      case "lg-voltar-ficha": L.registrar = null; L.passo = null; render(); break;
      case "lg-passo": irPasso(b.closest("form"), b.dataset.v); if (b.dataset.v === "contato") document.querySelector('.gaveta [name="res"]')?.focus(); break;
      case "lg-gv-todos": L.gvMostrar = L.gvTodos === b.dataset.id ? (L.gvMostrar || 20) + 20 : 40; L.gvTodos = b.dataset.id; render(); break;
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
      case "lg-sel": if (L.arrastou) { L.arrastou = false; break; } S.voltarAtivo = true; L.sel = b.dataset.id; L.novo = false; L.registrar = null; L.gvAberto = null; L.gvTodos = null; render(); if (window.innerWidth > 900) document.querySelector(".painel-lg")?.scrollIntoView({ block: "nearest" }); break;
      case "lg-fechar": if (S.voltarAtivo && history.state?.voltar) { history.back(); break; } L.sel = null; L.novo = false; L.registrar = null; L.passo = null; render(); break;
      case "lg-nova": L.novo = true; L.sel = null; L.passo = null; render(); $("#fx-nome")?.focus(); break;
      case "lg-etapa": L.etapa = b.dataset.v; L.mostrar = 100; render(); break;
      case "lg-aba": L.aba = b.dataset.v; L.mostrar = 100; render(); break;
      case "lg-retomar": { const e = S.vd.etapas.find((x) => x.funil === S.vd.scc && x.ordem === 3); if (e) moverEtapaFicha(b.dataset.id, e.id); break; }
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
      case "rl-reg-editar": Object.assign(R, { editReg: b.dataset.id, editTipo: null, editDest: null }); render(); document.querySelector(".gaveta .painel")?.scrollTo(0, 0); break;
      case "rl-reg-fechar": Object.assign(R, { editReg: null, editTipo: null, editDest: null }); render(); break;
      case "rl-reg-tipo": case "rl-reg-dest": {
        // guarda o que já foi escrito antes de redesenhar a gaveta
        const fm = b.closest("form"), txt = fm?.elements.texto?.value;
        if (a === "rl-reg-tipo") R.editTipo = b.value; else R.editDest = b.value;
        render(); const t = document.querySelector('form[data-acao="rl-reg"] [name="texto"]'); if (t && txt != null) t.value = txt; break;
      }
      default: break;
    }
  });
  app.addEventListener("submit", async (ev) => {
    const f = ev.target, a = f.dataset.acao;
    if (!a || !(a.startsWith("lg-") || a.startsWith("rl-") || a.startsWith("vd-"))) return;
    ev.preventDefault();
    if (a === "lg-salvar") salvarTudo(f, ev.submitter?.value === "dados" ? "dados" : "ligacao");
    if (a === "vd-perda") { const m = new FormData(f).get("motivo"); if (!m) { toast("Escolha o motivo."); return; } const id = S.vd.perder; S.vd.perder = null; await perderNegocio(id, String(m)); }
    if (a === "rl-obs") { const fd = new FormData(f); const obs = [0, 1, 2].map((i) => ({ titulo: String(fd.get("t" + i) || "").trim(), texto: String(fd.get("x" + i) || "").trim() })).filter((o) => o.titulo || o.texto); if (await salvarRel({ observacoes: obs })) { S.rl.editObs = false; toast("Observações salvas."); render(); } }
    if (a === "rl-reg") salvarEdicaoReg(f);
    if (a === "rl-aj") { const fd = new FormData(f), aj = {}; for (const [k, v] of fd) if (String(v).trim() !== "") aj[k] = Math.max(0, parseInt(v, 10) || 0); if (await salvarRel({ ajustes: aj })) { S.rl.editAj = false; toast(Object.keys(aj).length ? "Números corrigidos." : "Números voltaram a ser contados pelo sistema."); render(); } }
  });
  app.addEventListener("input", (ev) => {
    const fm = ev.target.closest?.('form[data-acao="lg-salvar"]'); if (fm) { fm.dataset.sujo = "1"; if (!$("#rg-painel")?.hidden) atualizarBlocoDemo(fm, false); }
    if (ev.target.id === "vd-busca") { const v = ev.target.value; clearTimeout(S.vd.espera); S.vd.espera = setTimeout(() => { const a = $("#vd-busca"); if (!a) return; S.vd.busca = a.value; atualizarVendas(); }, 200); void v; return; }
    if (ev.target.id === "lg-busca") { clearTimeout(S.lg.espera); S.lg.espera = setTimeout(() => { const a = $("#lg-busca"); if (!a) return; S.lg.busca = a.value; S.lg.mostrar = 100; const l = $("#lg-lista"); if (l) l.innerHTML = linhasFichas(); sincronizarRota(); }, 200); }
  });
  app.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.classList.contains("sel-dono")) { S.lg.dono = t.value === S.user.id ? null : t.value; S.lg.carregado = false; S.lg.sel = null; S.lg.novo = false; S.rl.editObs = S.rl.editAj = false; render(); return; }
    if (t.classList.contains("sel-etapa")) { if (t.value) moverEtapaFicha(t.dataset.id, +t.value); return; }
    if (t.id === "vd-resp") { S.vd.resp = t.value; atualizarVendas(); return; }
    { const fm = t.closest?.('form[data-acao="lg-salvar"]'); if (fm) fm.dataset.sujo = "1"; }
    if (t.closest?.('[data-acao="lg-salvar"]') && !$("#rg-painel")?.hidden && t.name !== "res") atualizarBlocoDemo(t.form, false);
    if ((t.name === "res" || t.name === "neg_destino") && t.closest('[data-acao="lg-salvar"]')) atualizarNegativa(t.form);
    if (t.dataset?.funcaoDe) { chamar("gerenciar-usuarios", { acao: "funcao", id: t.dataset.funcaoDe, funcao: t.value }).then((r) => { if (r.erro) toast(r.erro); else { toast("Função atualizada."); const u = S.equipe?.usuarios?.find((x) => x.id === t.dataset.funcaoDe); if (u) u.funcao = t.value; } }); }
    if (t.name === "sistema" && t.tagName === "SELECT" && t.form) { const o = t.form.elements.sistema_outro; if (o) { o.hidden = t.value !== "__outro"; if (!o.hidden) o.focus(); } }
    if ((t.name === "res" || t.name === "envio") && t.closest('[data-acao="lg-salvar"]')) {
      atualizarBlocoDemo(t.form, t.name === "res" && t.value === "demo_realizada");
      const c = $("#rg-conta"); if (c) c.innerHTML = avisoContagem(t.form);
    }
  });
  app.addEventListener("gaveta-abriu", (ev) => { S.lg.gvAberto = ev.detail; });
  app.addEventListener("toggle", (ev) => { const d = ev.target; if (d.matches?.(".fc-reg > details") && d.open) S.lg.gvAberto = d.dataset.id; }, true);
  // depois de um redesenho a ficha fica sem animação de entrada; ao mexer nela, as animações voltam para as próximas pastas
  const reativarEntrada = (ev) => { const sec = ev.target.closest?.(".mc-sem-entrada"); if (sec) sec.classList.remove("mc-sem-entrada"); };
  app.addEventListener("pointerdown", reativarEntrada, true);
  app.addEventListener("keydown", reativarEntrada, true);
  app.addEventListener("toggle", (ev) => { if (ev.target.classList?.contains("lg-bloco-dados")) S.lg.dadosAberto = ev.target.open; }, true);
  // arrastar um negócio para outra etapa (Vendas)
  app.addEventListener("dragstart", (ev) => { const c = ev.target.closest?.("[data-vd-arrastar]"); if (!c) return; S.vd.arrastando = c.dataset.vdArrastar; ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", S.vd.arrastando); c.classList.add("ag-movendo"); });
  app.addEventListener("dragover", (ev) => { const col = ev.target.closest?.(".vd-col"); if (!col || !S.vd.arrastando) return; ev.preventDefault(); app.querySelectorAll(".qd-alvo").forEach((x) => x !== col && x.classList.remove("qd-alvo")); col.classList.add("qd-alvo"); });
  app.addEventListener("drop", (ev) => { const col = ev.target.closest?.(".vd-col"); if (!col || !S.vd.arrastando) return; ev.preventDefault(); const id = S.vd.arrastando; S.vd.arrastando = null; S.vd.arrastou = true; setTimeout(() => (S.vd.arrastou = false), 300); moverNegocio(id, +col.dataset.etapa); });
  app.addEventListener("dragend", () => { S.vd.arrastando = null; app.querySelectorAll(".qd-alvo").forEach((x) => x.classList.remove("qd-alvo")); });
  // arrastar um retorno para outro dia da agenda
  app.addEventListener("dragstart", (ev) => { const it = ev.target.closest?.("[data-arrastar]"); if (!it) return; S.ag.arrastando = it.dataset.id; ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", it.dataset.id); it.classList.add("ag-movendo"); });
  app.addEventListener("dragend", (ev) => { ev.target.classList?.remove("ag-movendo"); S.ag.arrastando = null; app.querySelectorAll(".ag-alvo").forEach((x) => x.classList.remove("ag-alvo")); });
  app.addEventListener("dragover", (ev) => { const d = ev.target.closest?.(".ag-dia"); if (!d || !S.ag.arrastando) return; ev.preventDefault(); app.querySelectorAll(".ag-alvo").forEach((x) => x !== d && x.classList.remove("ag-alvo")); d.classList.add("ag-alvo"); });
  app.addEventListener("drop", (ev) => { const d = ev.target.closest?.(".ag-dia"); if (!d || !S.ag.arrastando) return; ev.preventDefault(); const id = S.ag.arrastando; S.ag.arrastando = null; S.ag.arrastou = true; setTimeout(() => (S.ag.arrastou = false), 300); remarcar(id, d.dataset.dia); });


  /* ---- Ficha: tarefas, negócios e contatos (carregados só quando a ficha abre) */
  S.fx = { cache: new Map(), aba: null, form: null, verFeitas: false, salvando: false, novoFunil: null };
  const TIPO_TAREFA = [["ligacao", "Ligação"], ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["reuniao", "Reunião"], ["visita", "Visita"], ["proposta", "Proposta"], ["tarefa", "Tarefa"]];
  const NOME_TAREFA = Object.fromEntries(TIPO_TAREFA);
  const COLS_TAREFA = "id,ficha_id,negocio_id,usuario_id,tipo,texto,prazo,dia_todo,concluida,concluida_em";
  const COLS_CONTATO = "id,ficha_id,usuario_id,nome,cargo,email,telefone,celular,whatsapp,observacoes";
  // busca tarefas e contatos de uma ficha (filtrando por ficha_id) e guarda; não busca de novo enquanto nada mudar
  function garantirFx(fichaId) {
    const C = S.fx.cache; if (C.has(fichaId)) return C.get(fichaId);
    const reg = { estado: "carregando", tarefas: [], contatos: [] }; C.set(fichaId, reg);
    if (!S.vd.carregado && !S.vd.carregando) carregarVendas();
    const cnpj = S.lg.fichaPorId?.get(fichaId)?.cnpj;
    Promise.all([
      cnpj ? sb.from("empresas").select("cnpj,whatsapp,whatsapp_em,telefone1,telefone2,email").eq("cnpj", cnpj).maybeSingle().then((r) => r.data || null) : null,
      sb.from("tarefas").select(COLS_TAREFA).eq("ficha_id", fichaId).order("prazo", { ascending: true, nullsFirst: false }).then(dados),
      sb.from("contatos").select(COLS_CONTATO).eq("ficha_id", fichaId).order("nome").then(dados),
    ]).then(([emp, t, c]) => { reg.emp = emp; reg.tarefas = t; reg.contatos = c; reg.estado = "ok"; }, (e) => { console.error(e); reg.estado = "erro"; C.delete(fichaId); })
      .finally(() => { atualizarPainelFx(fichaId); atualizarCanais(fichaId); });
    return reg;
  }
  const tsTarefa = (t) => (t.prazo ? Date.parse(t.prazo) : Infinity);
  const tarefaAtrasada = (t) => !t.concluida && t.prazo && (t.dia_todo ? diaDe(t.prazo) < hojeISO() : Date.parse(t.prazo) < Date.now());
  function quandoTarefa(t) {
    if (!t.prazo) return "Sem prazo";
    const q = quandoTxt(t.prazo); return t.dia_todo ? q.split(" · ")[0] : q;
  }
  const ICO_FX = {
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    mais: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  };
  function abaInicial(fichaId, reg) {
    const pend = reg.tarefas.filter((t) => !t.concluida).length;
    if (pend) return "tarefas";
    return S.vd.negocios.some((n) => n.ficha === fichaId) ? "negocios" : "tarefas";
  }
  function painelFx(f, ro) {
    const X = S.fx, reg = garantirFx(f.id);
    if (X.fichaAba !== f.id) { X.fichaAba = f.id; X.aba = null; X.form = null; X.verFeitas = false; }
    const negs = S.vd.negocios.filter((n) => n.ficha === f.id).sort((a, b) => (a.status === "em_andamento" ? 0 : 1) - (b.status === "em_andamento" ? 0 : 1) || b.t - a.t);
    const pend = reg.tarefas.filter((t) => !t.concluida), atr = pend.filter(tarefaAtrasada).length;
    const aba = X.aba || (reg.estado === "ok" ? abaInicial(f.id, reg) : "tarefas");
    const abas = [["tarefas", "Tarefas", pend.length, atr], ["negocios", "Negócios", negs.length], ["contatos", "Contatos", reg.contatos.length]]
      .map(([k, l, n, a]) => `<button type="button" role="tab" class="fx-aba" data-acao="fx-aba" data-v="${k}" aria-selected="${aba === k}">${l}${reg.estado === "ok" || k === "negocios" ? `<b>${n}</b>` : ""}${a ? `<i title="${a} ${a === 1 ? "atrasada" : "atrasadas"}">${a}</i>` : ""}</button>`).join("");
    let corpo;
    if (reg.estado === "carregando" && aba !== "negocios") corpo = `<p class="fx-vazio">Carregando…</p>`;
    else if (aba === "tarefas") corpo = blocoTarefas(f, reg, ro);
    else if (aba === "negocios") corpo = blocoNegocios(f, negs, ro);
    else corpo = blocoContatos(f, reg, ro);
    return `<div class="fx-painel" id="fx-${f.id}" data-ficha="${f.id}"><div class="fx-abas" role="tablist" aria-label="Tarefas, negócios e contatos">${abas}</div><div class="fx-corpo" role="tabpanel">${corpo}</div></div>`;
  }
  function blocoTarefas(f, reg, ro) {
    const X = S.fx, pend = reg.tarefas.filter((t) => !t.concluida).sort((a, b) => tsTarefa(a) - tsTarefa(b));
    const feitas = reg.tarefas.filter((t) => t.concluida).sort((a, b) => (b.concluida_em || "").localeCompare(a.concluida_em || ""));
    const item = (t) => {
      const at = tarefaAtrasada(t);
      return `<li class="fx-tarefa ${at ? "fx-atrasada" : ""} ${t.concluida ? "fx-feita" : ""}" data-id="${t.id}">
        ${ro || t.concluida ? `<span class="fx-check ${t.concluida ? "on" : ""}" aria-hidden="true">${t.concluida ? ICO_FX.ok : ""}</span>` : `<button type="button" class="fx-check" data-acao="fx-concluir" data-id="${t.id}" aria-label="Concluir: ${esc(t.texto || NOME_TAREFA[t.tipo] || "tarefa")}" title="Concluir">${ICO_FX.ok}</button>`}
        <div class="fx-t"><span class="fx-t-cab"><span class="fx-tipo">${esc(NOME_TAREFA[t.tipo] || t.tipo)}</span><span class="fx-quando">${at ? "Atrasada · " : ""}${esc(t.concluida ? `Feita ${t.concluida_em ? quandoTxt(t.concluida_em).split(" · ")[0].toLowerCase() : ""}` : quandoTarefa(t))}</span></span>
          ${t.texto ? `<span class="fx-texto">${esc(t.texto).replace(/\n/g, "<br>")}</span>` : ""}</div></li>`;
    };
    const form = X.form === "tarefa" ? `<form class="fx-form" data-acao="fx-salvar-tarefa" data-ficha="${f.id}">
        <div class="fx-tipos" role="radiogroup" aria-label="Tipo">${TIPO_TAREFA.map(([k, l], i) => `<label><input type="radio" name="tipo" value="${k}" ${i === 0 ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
        <div class="fx-linha"><label class="fx-campo">Dia<input type="date" name="dia" required value="${diasUteis(1)}" min="${hojeISO()}"></label><label class="fx-campo">Hora<input type="time" name="hora" value="09:00"></label></div>
        <label class="fx-campo">O que fazer<textarea name="texto" rows="3" placeholder="Ex.: ligar para a Meire e pedir o retorno sobre a proposta"></textarea></label>
        <div class="fx-botoes"><button type="submit" class="fx-salvar">Salvar tarefa</button><button type="button" class="fx-cancelar" data-acao="fx-form" data-v="">Cancelar</button></div></form>` : "";
    return `${ro ? "" : X.form === "tarefa" ? form : `<button type="button" class="fx-novo" data-acao="fx-form" data-v="tarefa">${ICO_FX.mais}Nova tarefa</button>`}
      ${pend.length ? `<ul class="fx-lista">${pend.map(item).join("")}</ul>` : `<p class="fx-vazio">Nenhuma tarefa pendente.</p>`}
      ${feitas.length ? `<button type="button" class="fx-mais" data-acao="fx-feitas">${X.verFeitas ? "Esconder" : "Ver"} concluídas (${feitas.length})</button>${X.verFeitas ? `<ul class="fx-lista">${feitas.slice(0, 20).map(item).join("")}</ul>` : ""}` : ""}`;
  }
  function blocoNegocios(f, negs, ro) {
    const V = S.vd, X = S.fx;
    if (!V.carregado) return `<p class="fx-vazio">Carregando…</p>`;
    const sig = (id) => V.funis.find((x) => x.id === id);
    const card = (n) => {
      const e = V.etapaPorId.get(n.etapa), fu = sig(n.funil), prods = (n.produtos || []).map((p) => V.produtoPorId.get(p)?.nome).filter(Boolean);
      const st = n.status === "ganho" ? '<span class="fx-st ganho">Ganho</span>' : n.status === "perdido" ? `<span class="fx-st perdido">Perdido${n.motivo ? ` · ${esc(n.motivo)}` : ""}</span>` : `<span class="fx-st">Em andamento · ${diasDesde(n.t)}d</span>`;
      return `<li class="fx-neg"><div class="fx-neg-cab"><b>${esc(n.titulo || n.empresa)}</b>${n.valor ? `<span class="fx-valor">${moeda(n.valor)}</span>` : ""}</div>
        <span class="fx-etapa">${esc(fu ? curtoFunil(fu) : "Funil")} · ${esc(e?.nome || "Sem etapa")}</span>
        <div class="fx-neg-pe">${st}${prods.map((p) => `<span class="fx-prod">${esc(p)}</span>`).join("")}<button type="button" class="fx-link" data-acao="fx-ver-funil" data-id="${n.id}">Ver no funil →</button></div></li>`;
    };
    let form = "";
    if (X.form === "negocio") {
      const funil = X.novoFunil || V.scc || V.funis[0]?.id, etapas = V.etapas.filter((e) => e.funil === funil && e.resultado === "aberta");
      const prods = [...V.produtoPorId.values()].sort((a, b) => COLL.compare(a.nome, b.nome));
      form = `<form class="fx-form" data-acao="fx-salvar-negocio" data-ficha="${f.id}">
        <div class="fx-linha"><label class="fx-campo">Funil<select name="funil" class="fx-sel-funil">${V.funis.map((x) => `<option value="${x.id}" ${x.id === funil ? "selected" : ""}>${esc(curtoFunil(x))}</option>`).join("")}</select></label>
          <label class="fx-campo">Etapa<select name="etapa">${etapas.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join("")}</select></label></div>
        <div class="fx-linha"><label class="fx-campo">Título<input name="titulo" maxlength="200" placeholder="Ex.: SCC Online" value=""></label><label class="fx-campo fx-curto">Valor (R$)<input name="valor" inputmode="decimal" placeholder="0,00"></label></div>
        <fieldset class="fx-campo"><legend>Produtos</legend><div class="fx-prods">${prods.map((p) => `<label><input type="checkbox" name="produto" value="${p.id}"><span>${esc(p.nome)}</span></label>`).join("")}</div></fieldset>
        <div class="fx-botoes"><button type="submit" class="fx-salvar">Criar negócio</button><button type="button" class="fx-cancelar" data-acao="fx-form" data-v="">Cancelar</button></div></form>`;
    }
    return `${ro ? "" : form || `<button type="button" class="fx-link-novo" data-acao="fx-form" data-v="negocio">+ novo negócio</button>`}
      ${negs.length ? `<ul class="fx-lista">${negs.map(card).join("")}</ul>` : `<p class="fx-vazio">Nenhum negócio nesta administradora.</p>`}`;
  }
  function formContato(f, c) {
    return `<form class="fx-form" data-acao="fx-salvar-contato" data-ficha="${f.id}" data-id="${c?.id || ""}">
      <div class="fx-linha"><label class="fx-campo">Nome<input name="nome" required maxlength="120" value="${esc(c?.nome || "")}"></label><label class="fx-campo">Cargo<input name="cargo" maxlength="80" placeholder="Ex.: Síndica, gerente" value="${esc(c?.cargo || "")}"></label></div>
      <div class="fx-linha"><label class="fx-campo">Telefone<input name="telefone" inputmode="tel" value="${esc(c?.telefone || c?.celular || "")}"></label><label class="fx-campo">WhatsApp<input name="whatsapp" inputmode="tel" value="${esc(c?.whatsapp || "")}"></label></div>
      <label class="fx-campo">E-mail<input name="email" type="email" value="${esc(c?.email || "")}"></label>
      <label class="fx-campo">Observações<textarea name="observacoes" rows="2">${esc(c?.observacoes || "")}</textarea></label>
      <div class="fx-botoes"><button type="submit" class="fx-salvar">${c ? "Salvar" : "Adicionar contato"}</button><button type="button" class="fx-cancelar" data-acao="fx-form" data-v="">Cancelar</button></div></form>`;
  }
  function blocoContatos(f, reg, ro) {
    const X = S.fx;
    const card = (c) => {
      if (X.form === "contato:" + c.id) return `<li>${formContato(f, c)}</li>`;
      const tel = c.telefone || c.celular, ini = c.nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
      const nt = nacional(tel), nw = nacional(c.whatsapp) || (ehCelular(nacional(c.celular)) ? nacional(c.celular) : ehCelular(nt) ? nt : "");
      const links = [nt ? `<span class="num">${esc(fmtTel(nt))}</span>` : "", c.email ? `<span>${esc(c.email)}</span>` : ""].filter(Boolean);
      const botoes = [nw ? botaoWpp(nw, c.nome, "ct-bt") : "", nt ? botaoLigar(nt, c.nome, "ct-bt") : "", c.email ? botaoEmail(c.email, c.nome, "ct-bt") : ""].join("");
      return `<li class="fx-contato"><span class="fx-ini" aria-hidden="true">${esc(ini)}</span><div class="fx-c"><span class="fx-c-cab"><b>${esc(c.nome)}</b>${c.cargo ? `<span>${esc(c.cargo)}</span>` : ""}</span>
        ${links.length ? `<span class="fx-links">${links.join("")}</span>` : ""}${botoes ? `<span class="ct-acoes ct-contato">${botoes}</span>` : ""}${c.observacoes ? `<span class="fx-texto">${esc(c.observacoes)}</span>` : ""}</div>
        ${ro ? "" : `<button type="button" class="fx-editar" data-acao="fx-form" data-v="contato:${c.id}">Editar</button>`}</li>`;
    };
    return `${ro ? "" : X.form === "contato" ? formContato(f, null) : `<button type="button" class="fx-novo" data-acao="fx-form" data-v="contato">${ICO_FX.mais}Adicionar contato</button>`}
      ${reg.contatos.length ? `<ul class="fx-lista">${reg.contatos.map(card).join("")}</ul>` : `<p class="fx-vazio">Nenhuma pessoa cadastrada ainda.</p>`}`;
  }
  // troca só o painel, sem refazer a tela inteira
  function atualizarPainelFx(fichaId) {
    const el = document.getElementById("fx-" + fichaId); if (!el) return;
    const f = S.lg.fichaPorId?.get(fichaId); if (!f) return;
    el.outerHTML = painelFx(f, f.usuario_id !== S.user.id);
  }
  const fichaLocal = (id) => S.lg.fichaPorId?.get(id);
  // o retorno da ficha acompanha a tarefa pendente mais próxima (é assim que veio do Agendor)
  async function ajustarRetorno(fichaId, mud) {
    const { error } = await sb.from("fichas").update(mud).eq("id", fichaId);
    if (error) { console.error(error); return; }
    const f = fichaLocal(fichaId); if (f) Object.assign(f, mud);
    const fa = S.ag.fichas?.find((x) => x.id === fichaId); if (fa) Object.assign(fa, mud);
    S.dv++; atualizarCabecaFicha(fichaId);
  }
  // "Próximo passo" e o número de dias mudam com o retorno: refaz só esse pedaço
  function atualizarCabecaFicha(fichaId) {
    const f = fichaLocal(fichaId), el = document.querySelector(".fc-prox-t"); if (!f || !el) return;
    const hj = hojeISO();
    el.textContent = f.retorno_em ? `${diaDe(f.retorno_em) < hj ? "Retorno atrasado: era" : "Ligar de novo"} ${quandoTxt(f.retorno_em).toLowerCase().replace(" · ", " às ")}${f.retorno_nota ? `. ${f.retorno_nota}` : ""}.` : "Nenhum próximo passo marcado ainda.";
  }
  async function concluirTarefa(id, li) {
    const fichaId = li?.closest(".fx-painel")?.dataset.ficha, reg = S.fx.cache.get(fichaId), t = reg?.tarefas.find((x) => x.id === id);
    if (!t || t.concluida) return;
    const agora = agoraISO();
    t.concluida = true; t.concluida_em = agora;
    li.classList.add("fx-saindo");
    const { error } = await sb.from("tarefas").update({ concluida: true, concluida_em: agora }).eq("id", id);
    if (error) { console.error(error); t.concluida = false; t.concluida_em = null; li.classList.remove("fx-saindo"); toast("Não foi possível concluir. Tente de novo."); return; }
    setTimeout(() => atualizarPainelFx(fichaId), 260);
    const f = fichaLocal(fichaId);
    // o retorno só muda se ele era esta tarefa (ou estava vazio); um retorno marcado por fora fica como está
    if (f && (!f.retorno_em || Date.parse(f.retorno_em) === Date.parse(t.prazo))) {
      const prox = reg.tarefas.filter((x) => !x.concluida && x.prazo).sort((a, b) => tsTarefa(a) - tsTarefa(b))[0];
      await ajustarRetorno(fichaId, prox ? { retorno_em: prox.prazo, retorno_nota: (prox.texto || NOME_TAREFA[prox.tipo] || "").slice(0, 500) } : { retorno_em: null, retorno_nota: null });
      toast(prox ? `Tarefa concluída. Próximo retorno: ${quandoTarefa(prox).toLowerCase()}.` : "Tarefa concluída. Não há mais tarefas pendentes.");
    } else toast("Tarefa concluída.");
    carregarAgenda();
  }
  async function salvarTarefa(form) {
    const fichaId = form.dataset.ficha, fd = new FormData(form), dia = String(fd.get("dia") || ""), hora = String(fd.get("hora") || "");
    if (!dia) { toast("Escolha o dia."); return; }
    const novo = { ficha_id: fichaId, usuario_id: S.user.id, tipo: String(fd.get("tipo") || "tarefa"), texto: String(fd.get("texto") || "").trim() || null, prazo: tsSP(dia, hora || "09:00"), dia_todo: !hora, concluida: false };
    const { data, error } = await sb.from("tarefas").insert(novo).select(COLS_TAREFA).single();
    if (error) { console.error(error); toast("Não foi possível salvar a tarefa. Tente de novo."); return; }
    const reg = S.fx.cache.get(fichaId); reg?.tarefas.push(data);
    S.fx.form = null; atualizarPainelFx(fichaId); toast("Tarefa salva.");
    const f = fichaLocal(fichaId);
    if (f && (!f.retorno_em || Date.parse(data.prazo) < Date.parse(f.retorno_em))) await ajustarRetorno(fichaId, { retorno_em: data.prazo, retorno_nota: (data.texto || NOME_TAREFA[data.tipo]).slice(0, 500) });
    carregarAgenda();
  }
  async function salvarNegocio(form) {
    const V = S.vd, fichaId = form.dataset.ficha, f = fichaLocal(fichaId), fd = new FormData(form);
    const funil = +fd.get("funil"), etapa = +fd.get("etapa"), prods = fd.getAll("produto").map(Number);
    const valor = String(fd.get("valor") || "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
    const titulo = String(fd.get("titulo") || "").trim() || prods.map((p) => V.produtoPorId.get(p)?.nome).filter(Boolean).join(" + ") || f?.nome || "Negócio";
    if (!etapa) { toast("Escolha a etapa."); return; }
    const { data, error } = await sb.from("negocios").insert({ ficha_id: fichaId, usuario_id: S.user.id, titulo: titulo.slice(0, 200), funil_id: funil, etapa_id: etapa, etapa_desde: agoraISO(), status: "em_andamento", valor: valor ? Number(valor) : null, origem: "prospeccao", inicio_em: hojeISO() }).select(COLS_NEG).single();
    if (error) { console.error(error); toast("Não foi possível criar o negócio. Tente de novo."); return; }
    if (prods.length) { const { error: e2 } = await sb.from("negocio_produtos").insert(prods.map((p) => ({ negocio_id: data.id, produto_id: p }))); if (!e2) data.negocio_produtos = prods.map((p) => ({ produto_id: p })); }
    V.negocios.push(mapNeg(data)); derivarVendas();
    S.fx.form = null; S.fx.novoFunil = null; atualizarPainelFx(fichaId); toast(`Negócio criado em ${V.etapaPorId.get(etapa)?.nome}.`);
  }
  async function salvarContato(form) {
    const fichaId = form.dataset.ficha, id = form.dataset.id, fd = new FormData(form);
    const d = Object.fromEntries(["nome", "cargo", "telefone", "whatsapp", "email", "observacoes"].map((k) => [k, String(fd.get(k) || "").trim() || null]));
    if (!d.nome) { toast("Escreva o nome."); return; }
    const reg = S.fx.cache.get(fichaId);
    const q = id ? sb.from("contatos").update(d).eq("id", id).select(COLS_CONTATO).single() : sb.from("contatos").insert({ ...d, ficha_id: fichaId, usuario_id: S.user.id }).select(COLS_CONTATO).single();
    const { data, error } = await q;
    if (error) { console.error(error); toast("Não foi possível salvar o contato. Tente de novo."); return; }
    if (reg) { const i = reg.contatos.findIndex((c) => c.id === data.id); if (i >= 0) reg.contatos[i] = data; else reg.contatos.push(data); reg.contatos.sort((a, b) => COLL.compare(a.nome, b.nome)); }
    S.fx.form = null; atualizarPainelFx(fichaId); atualizarCanais(fichaId); toast(id ? "Contato atualizado." : "Contato adicionado.");
  }
  app.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-acao^='fx-']"); if (!b) return;
    const X = S.fx, painel = b.closest(".fx-painel"), fichaId = painel?.dataset.ficha;
    switch (b.dataset.acao) {
      case "fx-aba": X.aba = b.dataset.v; X.form = null; atualizarPainelFx(fichaId); break;
      case "fx-form": X.form = b.dataset.v || null; X.novoFunil = null; atualizarPainelFx(fichaId); if (X.form) document.querySelector(`#fx-${fichaId} .fx-form input:not([type=radio]):not([type=checkbox]), #fx-${fichaId} .fx-form select`)?.focus(); break;
      case "fx-feitas": X.verFeitas = !X.verFeitas; atualizarPainelFx(fichaId); break;
      case "fx-concluir": b.disabled = true; await concluirTarefa(b.dataset.id, b.closest("li")); break;
      case "fx-ver-funil": { const n = S.vd.negocios.find((x) => x.id === b.dataset.id); if (!n) break; S.voltarAtivo = true; S.vd.funil = n.funil; S.vd.status = n.status; S.vd.busca = n.empresa; S.vd.resp = "todos"; S.lg.sel = null; S.view = "vendas"; render(); window.scrollTo(0, 0); break; }
    }
  });
  app.addEventListener("submit", async (ev) => {
    const f = ev.target, a = f.dataset.acao; if (!a || !a.startsWith("fx-")) return;
    ev.preventDefault(); if (S.fx.salvando) return; S.fx.salvando = true;
    const bt = f.querySelector('[type="submit"]'); if (bt) bt.disabled = true;
    try {
      if (a === "fx-salvar-tarefa") await salvarTarefa(f);
      if (a === "fx-salvar-negocio") await salvarNegocio(f);
      if (a === "fx-salvar-contato") await salvarContato(f);
    } finally { S.fx.salvando = false; if (bt?.isConnected) bt.disabled = false; }
  });
  app.addEventListener("change", (ev) => {
    const t = ev.target; if (!t.classList?.contains("fx-sel-funil")) return;
    const V = S.vd, sel = t.form.querySelector('[name="etapa"]'); S.fx.novoFunil = +t.value;
    sel.innerHTML = V.etapas.filter((e) => e.funil === +t.value && e.resultado === "aberta").map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join("");
  });

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
      case "voltar": voltarTela(); break;
      case "fc-filtro": {
        const v = b.dataset.v; S.lg.histFiltro = { f: b.dataset.ficha, v };
        const sec = b.closest(".fc-hist");
        sec.querySelectorAll(".fc-filtro").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        sec.querySelectorAll(".fc-reg").forEach((li) => { li.hidden = v !== "todas" && li.dataset.cat !== v; });
        break;
      }
      case "atualizar": S.menu = false; atualizarDados(); render(); break;
      case "ir": S.voltarAtivo = !b.closest("header"); S.view = b.dataset.view; if (S.view === "concorrencia") { S.cc.abertura = true; Abertura.abrir(); } S.sel = null; S.selRow = null; S.show = 60; render(); if (b.dataset.view === "regiao") localizarPendentes(S.uf); break;
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
      const data = await chamar("gerenciar-usuarios", { acao: "criar", nome: $("#u-nome").value, email: $("#u-email").value, senha: $("#u-senha").value, papel: $("#u-papel").value, funcao: $("#u-funcao").value });
      if (data.erro) { toast(data.erro === "rede" ? "Não foi possível agora. Tente de novo." : data.erro); btn.disabled = false; return; }
      toast("Pessoa adicionada. Passe o e-mail e a senha inicial para ela."); S.equipe = null; render();
    }
  });

  /* ------------------------------------------------- Início do vendedor */
  // Quem é Vendedor abre o sistema nas demonstrações: as que a SDR agendou (via agenda_vendedor, só o necessário
  // para apresentar), a semana, a concorrência e as oportunidades para retomar.
  const ehVendedor = () => S.perfil?.funcao === "vendedor";
  S.vend = { demos: null, carregando: false, erro: false, em: 0, res: null, salvando: false };
  async function carregarVendedor(silencioso) {
    const V = S.vend; if (V.carregando) return; V.carregando = true; V.erro = false;
    try { const { data, error } = await sb.rpc("agenda_vendedor"); if (error) throw error; V.demos = (data || []).map((d) => ({ ...d, dia: d.demo_em ? localSP(d.demo_em).slice(0, 10) : "", hora: d.demo_em ? localSP(d.demo_em).slice(11, 16) : "" })); V.em = Date.now(); }
    catch (e) { console.error(e); V.erro = true; if (!silencioso) toast("Não deu para carregar as demonstrações."); }
    finally { V.carregando = false; if (S.view === "inicio") renderDados(); }
  }
  const normSis = (s) => String(s || "").toLowerCase().replace(/group software|\(|\)/g, " ").replace(/condom[ií]nio21/, "cond21").trim().split(/\s+/)[0] || "";
  function telaInicioVendedor() {
    const V = S.vend, hj = hojeISO();
    if (!V.demos && !V.carregando && !V.erro) carregarVendedor(true); else if (V.demos && !V.carregando && Date.now() - V.em > 60000) carregarVendedor(true);
    if (!S.op.lista && !S.op.carregando && !S.op.erro) carregarOportunidades(true);
    if (!S.cc.carregado && !S.cc.carregando) carregarConcorrencia();
    if (!S.ag.carregado) carregarAgenda();
    const h = +localSP(new Date().toISOString()).slice(11, 13), saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    const nome = (S.perfil?.nome || "").split(/\s+/)[0];
    if (!V.demos) return `<div class="vn pedaco" data-pedaco="vend"><section class="vn-hero"><span class="agn-oi">${ICONE_SOL} ${saud}, ${esc(nome)}!</span><p class="agn-foco">${V.erro ? 'Não deu para carregar. <button type="button" class="mini" data-acao="vn-recarregar">Tentar de novo</button>' : "Carregando suas demonstrações…"}</p></section></div>`;
    const futuras = V.demos.filter((d) => d.status === "agendada" && d.dia >= hj).sort((a, b) => (a.demo_em < b.demo_em ? -1 : 1));
    const hojeD = futuras.filter((d) => d.dia === hj), depois = futuras.filter((d) => d.dia > hj).slice(0, 8);
    const pendentes = V.demos.filter((d) => d.status === "agendada" && d.dia && d.dia < hj);
    const ops = S.op.lista ? opItens() : [], retomar = ops.filter(opVence);
    const opsHoje = ops.filter((o) => o.aba === "depois" && o.retomar_em === hj).length;
    const brechas = S.cc.carregado ? S.cc.eventos.filter(brechaAtiva) : [], movs = S.cc.carregado ? S.cc.eventos.filter((e) => e.categoria !== "brecha").slice(0, 3) : [];
    const pl = (n, um, v) => `${fmtN(n)} ${n === 1 ? um : v}`;
    const partes = [hojeD.length ? `<span class="roxo">${pl(hojeD.length, "demonstração", "demonstrações")}</span>` : "", retomar.length ? `<span class="agn-azul">${pl(retomar.length, "retomada", "retomadas")}</span>` : ""].filter(Boolean);
    const frase = partes.length ? `Hoje você tem ${partes.join(" e ")}.` : "Hoje você não tem demonstrações marcadas.";
    const prox = hojeD.find((d) => new Date(d.demo_em) > new Date(Date.now() - 60 * 60e3)) || depois[0];
    const sub = [prox ? `Próxima: ${prox.dia === hj ? "hoje" : ddmm(prox.dia)} às ${prox.hora}, ${esc(prox.nome)}` : "", brechas.length ? pl(brechas.length, "alerta da concorrência", "alertas da concorrência") : "", pendentes.length ? `${pl(pendentes.length, "demo sem resultado", "demos sem resultado")}` : ""].filter(Boolean).join(" · ");
    const hero = `<section class="vn-hero"><div><span class="agn-oi">${ICONE_SOL} ${saud}, ${esc(nome)}!</span><p class="agn-foco">${frase}</p>${sub ? `<span class="agn-sub">${sub}</span>` : ""}</div>
      <div class="linha-flex">${prox ? `<a class="btn vn-bt-roxo" href="#vn-demo-${prox.demo_id}">Ver a próxima demo</a>` : ""}<button type="button" class="btn btn-sec" data-acao="ir" data-view="agenda">Minha agenda</button></div></section>`;
    const tels = (d) => { const n = nacional(d.whatsapp || "") || nacional(String(d.numero_responsavel || "").split(/[\/,;]/)[0]) || nacional(String(d.telefones || "").split(/[\/,;]/)[0]); return n; };
    const falta = (d) => { const ms = new Date(d.demo_em) - Date.now(); if (ms < -30 * 60e3) return "Já passou"; if (ms < 0) return "Agora"; const m = Math.round(ms / 60e3); return m < 60 ? `Daqui a ${m} min` : m < 24 * 60 ? `Daqui a ${Math.round(m / 60)} h` : ""; };
    const cartaoDemo = (d) => { const w = tels(d);
      return `<article class="vn-demo" id="vn-demo-${d.demo_id}"><div class="vn-demo-t"><span>Demonstração ${d.formato === "presencial" ? "presencial" : "virtual"}</span>${falta(d) ? `<span class="vn-pill">${falta(d)}</span>` : ""}</div>
        <div class="vn-demo-h"><b class="num">${d.hora}</b><span>${esc(d.nome)}</span></div>
        <dl><dt>Sistema</dt><dd>${esc(d.sistema || "—")}</dd><dt>Tamanho</dt><dd>${d.qtd_condominios ? `${fmtN(d.qtd_condominios)} condomínios${d.qtd_unidades ? ` · ${fmtN(d.qtd_unidades)} unidades` : ""}` : "—"}</dd><dt>Responsável</dt><dd>${esc(d.responsavel || "—")}${w ? ` · ${esc(fmtTel(w))}` : ""}</dd><dt>Cidade</dt><dd>${esc([d.cidade, d.uf].filter(Boolean).join(" - ") || "—")}</dd></dl>
        <span class="vn-por">Agendada${d.agendada_por ? ` pela ${esc(d.agendada_por)}` : ""}${d.agendada_em ? ` em ${ddmm(localSP(d.agendada_em).slice(0, 10))}` : ""}${d.nota ? ` · "${esc(d.nota.length > 140 ? d.nota.slice(0, 140) + "…" : d.nota)}"` : ""}</span>
        <div class="vn-demo-ac"><button type="button" data-acao="vn-resultado" data-id="${d.demo_id}">Registrar resultado</button>${w ? `<a href="https://wa.me/55${w}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${d.email ? `<a href="mailto:${esc(d.email)}">E-mail</a>` : ""}</div></article>`; };
    const linhaProx = (d) => `<div class="vn-pl"><span class="vn-pl-h num">${d.hora}</span><span class="vn-pl-t"><b>${esc(d.nome)}</b><small>${esc([d.sistema, d.qtd_condominios ? `${fmtN(d.qtd_condominios)} condomínios` : "", [d.cidade, d.uf].filter(Boolean).join(" - ")].filter(Boolean).join(" · "))}</small></span><span class="selo ${d.formato === "presencial" ? "s-ident" : "s-roxo"}">${d.formato === "presencial" ? "Presencial" : "Virtual"}</span></div>`;
    let proxHtml = "", diaAnt = "";
    for (const d of depois) { if (d.dia !== diaAnt) { diaAnt = d.dia; const dd = d.dia === somaDias(hj, 1) ? "Amanhã" : DIAS[isoData(d.dia).getUTCDay()]; proxHtml += `<div class="vn-dia-t">${dd[0].toUpperCase() + dd.slice(1)} · ${ddmm(d.dia)}</div>`; } proxHtml += linhaProx(d); }
    const pend = pendentes.length ? `<div class="vn-pend"><b>Sem resultado registrado</b>${pendentes.slice(0, 5).map((d) => `<div class="vn-pl"><span class="vn-pl-h num">${ddmm(d.dia)}</span><span class="vn-pl-t"><b>${esc(d.nome)}</b><small>Demo às ${d.hora}</small></span><button type="button" class="mini" data-acao="vn-resultado" data-id="${d.demo_id}">Registrar</button></div>`).join("")}</div>` : "";
    const secDemos = `<section class="cartao vn-cartao"><h2>Suas demonstrações de hoje</h2><p class="vn-leg">Agendadas pela SDR. Tudo o que você precisa saber antes de entrar.</p>
      ${hojeD.length ? `<div class="vn-demos">${hojeD.map(cartaoDemo).join("")}</div>` : `<p class="agn-vazio">Nenhuma demonstração hoje.</p>`}
      ${pend}${depois.length ? `<div class="vn-prox">${proxHtml}</div>` : ""}</section>`;
    // semana: demos + retomadas das oportunidades + retornos dele
    const seg = segundaDe(hj), dias = [0, 1, 2, 3, 4].map((n) => somaDias(seg, n));
    const evs = new Map(dias.map((d) => [d, []]));
    for (const d of V.demos) if (evs.has(d.dia) && d.status !== "reagendada") evs.get(d.dia).push({ h: d.hora, t: d.nome, s: d.status === "realizada" ? "Demo · feita" : d.status === "nao_realizada" ? "Demo · não aconteceu" : "Demonstração", c: "agn-ev-demo" });
    for (const o of ops) if (o.aba === "depois" && evs.has(o.retomar_em)) evs.get(o.retomar_em).push({ h: "", t: o.nome, s: "Retomar oportunidade", c: "" });
    if (S.ag.carregado) for (const i of itensAgenda()) if (i.tipo === "retorno" && evs.has(i.dia)) evs.get(i.dia).push({ h: i.hora, t: i.f.nome, s: i.f.retorno_nota || "Retorno", c: "", id: i.f.id });
    const semana = `<section class="cartao vn-cartao"><div class="vn-cab"><div><h2>Sua semana</h2><p class="vn-leg">Demonstrações e retornos, de segunda a sexta</p></div><button type="button" class="agn-link" data-acao="ir" data-view="agenda">Abrir a agenda →</button></div>
      <div class="vn-semana">${dias.map((d) => `<div class="vn-sd ${d === hj ? "vn-hoje" : ""}"><span class="vn-sd-t">${DIAS[isoData(d).getUTCDay()].slice(0, 3)} ${+d.slice(8)}${d === hj ? " · hoje" : ""}</span>${(evs.get(d) || []).sort((a, b) => (a.h || "99") < (b.h || "99") ? -1 : 1).map((e) => `<div class="agn-ev ${e.c}"><span class="agn-ev-l1">${e.h ? `<b class="num">${e.h}</b> ` : ""}${esc(e.t)}</span><span class="agn-ev-l2">${esc(e.s)}</span></div>`).join("") || '<span class="t12 fraco">—</span>'}</div>`).join("")}</div></section>`;
    // concorrência: brecha ativa e quantas que já viram a demo usam aquele sistema
    const alerta = (e) => { const viu = ops.filter((o) => o.aba !== "fechou" && normSis(o.sistema) && normSis(o.sistema) === normSis(e.sistema)).length;
      return `<div class="vn-alerta"><span class="vn-alerta-s"><i></i>Brecha · ${esc(e.sistema)} · ${ddmm(localSP(e.inicio).slice(0, 10))}</span><b>${esc(e.titulo)}</b>${viu ? `<p><b>${pl(viu, "administradora", "administradoras")}</b> que já viram a nossa demo ${viu === 1 ? "usa" : "usam"} ${esc(e.sistema)}. Boa hora para ligar.</p><button type="button" class="btn vn-bt-verm" data-acao="vn-ops-sis" data-sis="${esc(e.sistema)}">Ver ${viu === 1 ? "ela" : `as ${viu}`} e ligar</button>` : ""}</div>`; };
    const conc = `<section class="cartao vn-cartao"><div class="vn-cab"><h2>Concorrência agora</h2><button type="button" class="agn-link" data-acao="ir" data-view="concorrencia">Ver tudo →</button></div>
      ${!S.cc.carregado ? '<p class="agn-vazio">Carregando…</p>' : brechas.length ? brechas.slice(0, 2).map(alerta).join("") : '<p class="agn-vazio">Nenhuma brecha aberta agora.</p>'}
      ${movs.length ? `<div class="vn-movs">${movs.map((e) => `<div>${esc(e.titulo)}<small>${esc(e.sistema)} · ${ddmm(localSP(e.inicio).slice(0, 10))}</small></div>`).join("")}</div>` : ""}</section>`;
    const ret = `<section class="cartao vn-cartao"><div class="vn-cab"><h2>Retomar hoje</h2><button type="button" class="agn-link" data-acao="ir" data-view="oportunidades">Oportunidades →</button></div><p class="vn-leg">Quem já viu a demo e pediu para voltar a falar</p>
      ${retomar.length ? retomar.slice(0, 6).map((o) => `<button type="button" class="vn-rt" data-acao="vn-op" data-id="${o.ficha_id}"><span><b>${esc(o.nome)}</b><small>${esc(o.ultimo?.texto ? (o.ultimo.texto.length > 70 ? o.ultimo.texto.slice(0, 70) + "…" : o.ultimo.texto) : o.sistema || "")}</small></span><span class="selo ${o.retomar_em < hj ? "s-errado" : "s-nao"}">${o.retomar_em < hj ? "Atrasado" : "Hoje"}</span></button>`).join("") : '<p class="agn-vazio">Ninguém para retomar hoje.</p>'}</section>`;
    const mes = hj.slice(0, 8) + "01", eu = nome.toLowerCase();
    const feitasMes = V.demos.filter((d) => d.status === "realizada" && d.realizada_em >= mes && String(d.apresentador || "").toLowerCase() === eu).length;
    const nums = `<section class="cartao vn-cartao"><h2>Seu mês</h2><p class="vn-leg">${MESES[+hj.slice(5, 7) - 1][0].toUpperCase() + MESES[+hj.slice(5, 7) - 1].slice(1)}, até hoje</p><div class="vn-nums"><div><b class="num">${fmtN(feitasMes)}</b><span>demos feitas</span></div><div><b class="num">${fmtN(ops.filter((o) => o.aba === "negociando").length)}</b><span>em negociação</span></div><div><b class="num">${fmtN(ops.filter((o) => o.contrato && o.contrato >= mes).length)}</b><span>contratos</span></div></div></section>`;
    const d = V.res ? V.demos.find((x) => x.demo_id === V.res) : null;
    return `<div class="vn pedaco" data-pedaco="vend">${hero}<div class="vn-duas"><div class="vn-col">${secDemos}${semana}</div><div class="vn-col">${conc}${ret}${nums}</div></div></div>` + (d ? gaveta(painelResultadoDemo(d), "vn-fechar") : "");
  }
  function painelResultadoDemo(d) {
    const V = S.vend, como = V.como || "realizada";
    return `<aside class="cartao painel vn-res" aria-label="Resultado da demonstração"><button type="button" class="mini fechar-painel" data-acao="vn-fechar">Fechar ✕</button>
      <div class="pilha" style="gap:2px"><h2>${esc(d.nome)}</h2><span class="t13 fraco">Demonstração ${d.dia ? `de ${ddmmaaaa(d.dia)} às ${d.hora}` : ""}</span></div>
      <form class="op-form" data-acao="vn-salvar" data-id="${d.demo_id}"><div class="pilha" style="gap:6px"><span class="rotulo">Como foi?</span><div class="linha-flex op-como">${[["realizada", "Aconteceu"], ["reagendada", "Reagendar"], ["nao_realizada", "Não aconteceu"]].map(([k, l]) => `<label class="op-chip ${k === "nao_realizada" ? "op-chip-negou" : k === "reagendada" ? "op-chip-depois" : "op-chip-fechou"}"><input type="radio" name="como" value="${k}" ${como === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
        ${como === "reagendada" ? `<div class="campo" style="max-width:260px"><label for="vn-nova">Nova data e hora</label><input id="vn-nova" name="nova" type="datetime-local" class="input" required></div>` : ""}
        ${como === "realizada" ? `<textarea name="texto" class="input op-texto" rows="3" maxlength="2000" placeholder="Como foi? O que ficou combinado?"></textarea><p class="t12 fraco" style="margin:0">Entra nos relatórios da SDR como demo realizada por você, e a administradora vai para Oportunidades.</p>` : ""}
        <div><button type="submit" class="btn btn-primario" ${V.salvando ? "disabled" : ""}>${V.salvando ? "Salvando…" : "Salvar"}</button></div></form></aside>`;
  }
  app.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b || b.tagName === "FORM" || !b.dataset.acao.startsWith("vn-")) return;
    const V = S.vend;
    switch (b.dataset.acao) {
      case "vn-recarregar": carregarVendedor(); break;
      case "vn-resultado": V.res = +b.dataset.id; V.como = "realizada"; render(); break;
      case "vn-fechar": V.res = null; render(); break;
      case "vn-op": { S.op.aba = "depois"; S.op.sel = b.dataset.id; const o = opItens().find((x) => x.ficha_id === b.dataset.id); S.op.como = o?.situacao || "negociando"; S.voltarAtivo = true; S.view = "oportunidades"; render(); break; }
      case "vn-ops-sis": S.op.aba = "negociando"; S.op.busca = b.dataset.sis.split(/\s+/)[0]; S.voltarAtivo = true; S.view = "oportunidades"; render(); break;
    }
  });
  app.addEventListener("change", (ev) => { const t = ev.target; if (t.name === "como" && t.closest('[data-acao="vn-salvar"]')) { S.vend.como = t.value; render(); } });
  app.addEventListener("submit", async (ev) => {
    const f = ev.target; if (f.dataset.acao !== "vn-salvar") return; ev.preventDefault();
    const V = S.vend; if (V.salvando) return;
    const fd = new FormData(f), como = String(fd.get("como") || "realizada"), nova = String(fd.get("nova") || "");
    if (como === "reagendada" && (!nova || new Date(nova + ":00-03:00") <= new Date())) { toast("Escolha uma data e hora que ainda vão chegar."); return; }
    V.salvando = true; render();
    const { error } = await sb.rpc("resultado_demo", { p_demo: +f.dataset.id, p_resultado: como, p_texto: String(fd.get("texto") || "") || null, p_nova: como === "reagendada" ? nova + ":00-03:00" : null });
    V.salvando = false;
    if (error) { console.error(error); toast("Não foi possível salvar. Tente de novo."); render(); return; }
    toast(como === "realizada" ? "Demo registrada como realizada." : como === "reagendada" ? "Demo reagendada." : "Marcada como não aconteceu.");
    V.res = null; S.op.em = 0; if (S.ind) S.ind.em = 0; await carregarVendedor(true); carregarOportunidades(true);
  });

  /* ------------------------------------------------- Pós-vendas: carteira, visitas e Início */
  // Quem é Pós-vendas cuida dos clientes (Funil de Acompanhamento): visitas presenciais, ligações de acompanhamento,
  // como o cliente está (satisfeito, em acompanhamento, insatisfeito) e venda de produtos adicionais.
  const ehPos = () => S.perfil?.funcao === "pos_vendas";
  S.pv = { clientes: null, visitas: [], adicionais: [], produtos: [], pessoas: [], carregando: false, erro: false, em: 0, aba: "todos", busca: "", sel: null, vis: null, como: "feita", salvando: false };
  const PV_SIT = [["Contato", "Para contatar", "s-neutro"], ["Acompanhamento", "Em acompanhamento", "s-ident"], ["Satisfeito", "Satisfeito", "s-conf"], ["Insatisfeito", "Insatisfeito", "s-errado"]];
  const PV_SIT_NOME = Object.fromEntries(PV_SIT.map(([k, l]) => [k, l])), PV_SIT_COR = Object.fromEntries(PV_SIT.map(([k, , c]) => [k, c]));
  const PV_ADICIONAIS = ["Boleto por Whatsapp", "Comprovantes", "Aplicativo administradora", "Integração Bancária", "Checkpay", "Condoconta", "Bureau", "Directbank"];
  async function carregarPos(silencioso) {
    const P = S.pv; if (P.carregando) return; P.carregando = true; P.erro = false;
    try {
      const desde = new Date(Date.now() - 120 * 864e5).toISOString();
      const [c, v, a, p, pe] = await Promise.all([
        sb.rpc("carteira_clientes"), sb.from("visitas").select("*").or(`status.eq.agendada,quando.gte.${desde}`).order("quando").limit(3000),
        sb.rpc("funil_adicionais"), sb.from("produtos").select("id,nome").eq("ativo", true).order("nome"), sb.from("perfis").select("id,nome").eq("aprovado", true),
      ]);
      for (const r of [c, v, a, p, pe]) if (r.error) throw r.error;
      P.clientes = c.data || []; P.visitas = (v.data || []).map((x) => ({ ...x, dia: localSP(x.quando).slice(0, 10), hora: localSP(x.quando).slice(11, 16) }));
      P.adicionais = a.data || []; P.produtos = p.data || []; P.pessoas = pe.data || []; P.em = Date.now();
    } catch (e) { console.error(e); P.erro = true; if (!silencioso) toast("Não deu para carregar os clientes."); }
    finally { P.carregando = false; if (["inicio", "clientes", "agenda"].includes(S.view)) renderDados(); }
  }
  const pvCliente = (id) => (S.pv.clientes || []).find((c) => c.ficha_id === id);
  const pvTel = (c) => nacional(c.whatsapp || "") || nacional(String(c.numero_responsavel || "").split(/[\/,;]/)[0]) || nacional(String(c.telefones || "").split(/[\/,;]/)[0]);
  const pvMapa = (c) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([c.endereco, c.cidade, c.uf].filter(Boolean).join(", ") || c.nome)}`;
  const pvSemContato = (c) => (c.ultimo_contato ? opDias(c.ultimo_contato) : 999);
  function pvAtencao() {
    const futuras = new Set(S.pv.visitas.filter((v) => v.status === "agendada" && v.dia >= hojeISO()).map((v) => v.ficha_id));
    return (S.pv.clientes || []).filter((c) => !futuras.has(c.ficha_id) && (c.situacao === "Insatisfeito" || pvSemContato(c) > 90))
      .sort((a, b) => (a.situacao === "Insatisfeito") - (b.situacao === "Insatisfeito") || pvSemContato(a) - pvSemContato(b)).reverse();
  }
  function pvSugestao() {
    const inf = (S.pv.clientes || []).filter((c) => c.produtos.length); if (inf.length < 3) return null;
    let melhor = null; for (const p of PV_ADICIONAIS) { const n = inf.filter((c) => !c.produtos.includes(p)).length; if (!melhor || n > melhor[1]) melhor = [p, n]; }
    return melhor && melhor[1] ? melhor : null;
  }
  const pvRotuloSem = (c) => { const d = pvSemContato(c); return d >= 999 ? "Nenhum contato registrado" : d === 0 ? "Contato hoje" : `Sem contato há ${d} ${d === 1 ? "dia" : "dias"}`; };

  function telaInicioPos() {
    const P = S.pv, hj = hojeISO();
    if (!P.clientes && !P.carregando && !P.erro) carregarPos(true); else if (P.clientes && !P.carregando && Date.now() - P.em > 60000) carregarPos(true);
    const h = +localSP(new Date().toISOString()).slice(11, 13), saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite", nome = (S.perfil?.nome || "").split(/\s+/)[0];
    if (!P.clientes) return `<div class="vn pedaco" data-pedaco="pos"><section class="vn-hero"><span class="agn-oi">${ICONE_SOL} ${saud}, ${esc(nome)}!</span><p class="agn-foco">${P.erro ? 'Não deu para carregar. <button type="button" class="mini" data-acao="pv-recarregar">Tentar de novo</button>' : "Carregando seus clientes…"}</p></section></div>`;
    const minhas = P.visitas.filter((v) => v.usuario_id === S.user.id && v.status === "agendada");
    const hoje = minhas.filter((v) => v.dia === hj), visHoje = hoje.filter((v) => v.tipo === "visita"), ligHoje = hoje.filter((v) => v.tipo === "ligacao");
    const depois = minhas.filter((v) => v.dia > hj).slice(0, 8), pend = minhas.filter((v) => v.dia < hj);
    const aten = pvAtencao(), insat = aten.filter((c) => c.situacao === "Insatisfeito").length;
    const pl = (n, um, v) => `${fmtN(n)} ${n === 1 ? um : v}`;
    const partes = [visHoje.length ? `<span class="pv-verde">${pl(visHoje.length, "visita", "visitas")}</span>` : "", ligHoje.length ? `<span class="agn-azul">${pl(ligHoje.length, "cliente para ligar", "clientes para ligar")}</span>` : ""].filter(Boolean);
    const prox = hoje.find((v) => new Date(v.quando) > new Date(Date.now() - 60 * 60e3)) || depois[0];
    const proxC = prox ? pvCliente(prox.ficha_id) : null;
    const sub = [prox && proxC ? `Próxima: ${prox.dia === hj ? "hoje" : ddmm(prox.dia)} às ${prox.hora}, ${esc(proxC.nome)}` : "", insat ? pl(insat, "cliente insatisfeito precisa de atenção", "clientes insatisfeitos precisam de atenção") : "", pend.length ? pl(pend.length, "visita sem resultado", "visitas sem resultado") : ""].filter(Boolean).join(" · ");
    const hero = `<section class="vn-hero"><div><span class="agn-oi">${ICONE_SOL} ${saud}, ${esc(nome)}!</span><p class="agn-foco">${partes.length ? `Hoje você tem ${partes.join(" e ")}.` : "Hoje você não tem visitas marcadas."}</p>${sub ? `<span class="agn-sub">${sub}</span>` : ""}</div>
      <div class="linha-flex">${prox ? `<a class="btn pv-bt" href="#pv-v-${prox.id}">Ver a próxima</a>` : ""}<button type="button" class="btn btn-sec" data-acao="ir" data-view="clientes">Meus clientes</button></div></section>`;
    const falta = (v) => { const ms = new Date(v.quando) - Date.now(); if (ms < -30 * 60e3) return "Já passou"; if (ms < 0) return "Agora"; const m = Math.round(ms / 60e3); return m < 60 ? `Daqui a ${m} min` : m < 1440 ? `Daqui a ${Math.round(m / 60)} h` : ""; };
    const cartao = (v) => { const c = pvCliente(v.ficha_id) || { nome: "Cliente", produtos: [] }, w = pvTel(c), faltam = PV_ADICIONAIS.filter((p) => c.produtos.length && !c.produtos.includes(p)).slice(0, 2);
      return `<article class="pv-vis ${v.tipo === "ligacao" ? "pv-vis-lig" : ""}" id="pv-v-${v.id}"><div class="vn-demo-t"><span>${v.tipo === "visita" ? "Visita presencial" : "Ligação de acompanhamento"}</span>${falta(v) ? `<span class="vn-pill">${falta(v)}</span>` : ""}</div>
        <div class="vn-demo-h"><b class="num">${v.hora}</b><span>${esc(c.nome)}</span></div>
        <dl>${v.tipo === "visita" ? `<dt>Endereço</dt><dd>${esc([c.endereco, [c.cidade, c.uf].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") || "—")}</dd>` : ""}<dt>Contato</dt><dd>${esc(c.responsavel || "—")}${w ? ` · ${esc(fmtTel(w))}` : ""}</dd><dt>Cliente</dt><dd>${c.cliente_desde ? `desde ${MESES[+c.cliente_desde.slice(5, 7) - 1].slice(0, 3)}/${c.cliente_desde.slice(0, 4)}` : "—"}${c.qtd_condominios ? ` · ${fmtN(c.qtd_condominios)} condomínios` : ""} · ${esc(PV_SIT_NOME[c.situacao] || "")}</dd></dl>
        <div class="pv-chips">${c.produtos.length ? c.produtos.map((p) => `<span>${esc(p)}</span>`).join("") : '<span class="pv-chip-vazio">Produtos não marcados</span>'}</div>
        ${v.objetivo ? `<div class="pv-oferta"><b>Objetivo</b>${esc(v.objetivo)}</div>` : faltam.length ? `<div class="pv-oferta"><b>Dá para oferecer</b>${esc(faltam.join(" e "))} (ainda não tem)</div>` : ""}
        <div class="vn-demo-ac"><button type="button" data-acao="pv-registrar" data-id="${v.id}">Registrar ${v.tipo === "visita" ? "visita" : "ligação"}</button>${v.tipo === "visita" ? `<a href="${esc(pvMapa(c))}" target="_blank" rel="noopener">Como chegar</a>` : ""}${w ? `<a href="https://wa.me/55${w}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</div></article>`; };
    const linha = (v) => { const c = pvCliente(v.ficha_id) || { nome: "Cliente" }; return `<div class="vn-pl"><span class="vn-pl-h pv-h num">${v.hora}</span><span class="vn-pl-t"><b>${esc(c.nome)}</b><small>${esc(v.objetivo || [c.cidade, c.uf].filter(Boolean).join(" - "))}</small></span><span class="selo ${v.tipo === "visita" ? "pv-selo" : "s-ident"}">${v.tipo === "visita" ? "Visita" : "Ligação"}</span></div>`; };
    let proxHtml = "", ant = ""; for (const v of depois) { if (v.dia !== ant) { ant = v.dia; const dd = v.dia === somaDias(hj, 1) ? "Amanhã" : DIAS[isoData(v.dia).getUTCDay()]; proxHtml += `<div class="vn-dia-t">${dd[0].toUpperCase() + dd.slice(1)} · ${ddmm(v.dia)}</div>`; } proxHtml += linha(v); }
    const pendHtml = pend.length ? `<div class="vn-pend"><b>Sem resultado registrado</b>${pend.slice(0, 5).map((v) => `<div class="vn-pl"><span class="vn-pl-h num">${ddmm(v.dia)}</span><span class="vn-pl-t"><b>${esc(pvCliente(v.ficha_id)?.nome || "Cliente")}</b><small>${v.tipo === "visita" ? "Visita" : "Ligação"} às ${v.hora}</small></span><button type="button" class="mini" data-acao="pv-registrar" data-id="${v.id}">Registrar</button></div>`).join("")}</div>` : "";
    const secHoje = `<section class="cartao vn-cartao"><h2>Suas visitas de hoje</h2><p class="vn-leg">Tudo sobre o cliente antes de chegar: o que ele já tem e o que dá para oferecer.</p>
      ${hoje.length ? `<div class="vn-demos">${hoje.map(cartao).join("")}</div>` : `<p class="agn-vazio">Nada marcado para hoje. Marque visitas e ligações em <button type="button" class="agn-link" data-acao="ir" data-view="clientes">Meus clientes</button>.</p>`}
      ${pendHtml}${depois.length ? `<div class="vn-prox">${proxHtml}</div>` : ""}</section>`;
    const seg = segundaDe(hj), dias = [0, 1, 2, 3, 4].map((n) => somaDias(seg, n));
    const semana = `<section class="cartao vn-cartao"><div class="vn-cab"><div><h2>Sua semana</h2><p class="vn-leg">Visitas e ligações de acompanhamento, de segunda a sexta</p></div></div>
      <div class="vn-semana">${dias.map((d) => `<div class="vn-sd ${d === hj ? "vn-hoje" : ""}"><span class="vn-sd-t">${DIAS[isoData(d).getUTCDay()].slice(0, 3)} ${+d.slice(8)}${d === hj ? " · hoje" : ""}</span>${P.visitas.filter((v) => v.usuario_id === S.user.id && v.dia === d && v.status !== "cancelada").map((v) => `<button type="button" class="agn-ev ${v.tipo === "visita" ? "pv-ev" : ""}" data-acao="pv-registrar" data-id="${v.id}"><span class="agn-ev-l1"><b class="num">${v.hora}</b> ${esc(pvCliente(v.ficha_id)?.nome || "Cliente")}</span><span class="agn-ev-l2">${v.tipo === "visita" ? "Visita" : "Ligação"}${v.status === "feita" ? " · feita" : ""}</span></button>`).join("") || '<span class="t12 fraco">—</span>'}</div>`).join("")}</div>
      <div class="pv-leg"><span><i class="pv-leg-v"></i>Visita</span><span><i></i>Ligação de acompanhamento</span></div></section>`;
    const atenHtml = `<section class="cartao vn-cartao"><div class="vn-cab"><h2>Clientes que precisam de atenção</h2></div><p class="vn-leg">Insatisfeitos ou há mais de 90 dias sem contato</p>
      ${aten.length ? aten.slice(0, 6).map((c) => `<button type="button" class="vn-rt" data-acao="pv-cliente" data-id="${c.ficha_id}"><span><b>${esc(c.nome)}</b><small>${esc(pvRotuloSem(c))}</small></span><span class="selo ${c.situacao === "Insatisfeito" ? "s-errado" : "s-nao"}">${c.situacao === "Insatisfeito" ? "Insatisfeito" : pvSemContato(c) >= 999 ? "Sem contato" : `${pvSemContato(c)} dias`}</span></button>`).join("") + (aten.length > 6 ? `<button type="button" class="agn-link" data-acao="pv-ver-atencao">Ver todos os ${aten.length}</button>` : "") : '<p class="agn-vazio">Todos os clientes estão em dia.</p>'}</section>`;
    const mx = Math.max(1, ...P.adicionais.map((a) => +a.n)), sug = pvSugestao();
    const adic = `<section class="cartao vn-cartao"><div class="vn-cab"><h2>Produtos adicionais</h2><button type="button" class="agn-link" data-acao="ir" data-view="vendas">Ver funil →</button></div><p class="vn-leg">Vendas para quem já é cliente</p>
      <div class="pv-funil">${P.adicionais.filter((a) => a.etapa !== "Sem interesse").map((a) => `<div><span>${esc(a.etapa.replace(" Serviços Adicionais", ""))}<i><b style="width:${(a.n / mx) * 100}%"></b></i></span><b class="num">${fmtN(a.n)}</b></div>`).join("")}</div>
      ${sug ? `<div class="pv-sug"><b>Ideia para vender:</b> ${pl(sug[1], "cliente ainda não tem", "clientes ainda não têm")} ${esc(sug[0])}.</div>` : `<div class="pv-sug">Marque os produtos de cada cliente em <b>Meus clientes</b> para ver sugestões de venda.</div>`}</section>`;
    const cnt = (k) => P.clientes.filter((c) => c.situacao === k).length;
    const cart = `<section class="cartao vn-cartao"><h2>Sua carteira</h2><p class="vn-leg">${pl(P.clientes.length, "cliente", "clientes")} no acompanhamento</p><div class="pv-cart"><div class="pv-ok"><b class="num">${cnt("Satisfeito")}</b><span>satisfeitos</span></div><div><b class="num">${cnt("Acompanhamento")}</b><span>em acompanhamento</span></div><div class="pv-ruim"><b class="num">${cnt("Insatisfeito")}</b><span>insatisfeitos</span></div><div><b class="num">${cnt("Contato")}</b><span>para contatar</span></div></div></section>`;
    return `<div class="vn pedaco" data-pedaco="pos">${hero}<div class="vn-duas"><div class="vn-col">${secHoje}${semana}</div><div class="vn-col">${atenHtml}${adic}${cart}</div></div></div>` + pvGavetas();
  }
  function pvGavetas() { const P = S.pv; const v = P.vis ? P.visitas.find((x) => x.id === P.vis) : null; const c = P.sel ? pvCliente(P.sel) : null; return v ? gaveta(painelVisita(v), "pv-fechar") : c ? gaveta(painelCliente(c), "pv-fechar") : ""; }

  function telaClientes() {
    const P = S.pv;
    if (!P.clientes && !P.carregando && !P.erro) carregarPos(true); else if (P.clientes && !P.carregando && Date.now() - P.em > 60000) carregarPos(true);
    const cab = `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Clientes</h1><p class="fraco" style="margin:0">A carteira do pós-vendas. Marque visitas e ligações, anote como o cliente está e o que ele já usa.</p></div></div>`;
    if (!P.clientes) return cab + `<div class="cartao vazio">${P.erro ? 'Não deu para carregar. <button type="button" class="mini" data-acao="pv-recarregar">Tentar de novo</button>' : "Carregando…"}</div>`;
    const aten = new Set(pvAtencao().map((c) => c.ficha_id)), q = P.busca.trim().toLowerCase();
    const abas = [["todos", "Todos"], ["atencao", "Precisam de atenção"], ...PV_SIT.map(([k, l]) => [k, l])];
    const conta = (k) => k === "todos" ? P.clientes.length : k === "atencao" ? aten.size : P.clientes.filter((c) => c.situacao === k).length;
    const lista = P.clientes.filter((c) => (P.aba === "todos" || (P.aba === "atencao" ? aten.has(c.ficha_id) : c.situacao === P.aba)) && (!q || `${c.nome} ${c.cidade || ""} ${c.responsavel || ""}`.toLowerCase().includes(q))).sort((a, b) => pvSemContato(b) - pvSemContato(a));
    const prox = new Map(); for (const v of P.visitas) if (v.status === "agendada" && v.dia >= hojeISO() && !prox.has(v.ficha_id)) prox.set(v.ficha_id, v);
    const barra = `<section class="cartao op-barra"><div class="abas" role="tablist">${abas.map(([k, l]) => `<button type="button" role="tab" class="aba" data-acao="pv-aba" data-v="${k}" aria-selected="${P.aba === k}">${l} <span class="op-n">${conta(k)}</span></button>`).join("")}</div>
      <input type="search" id="pv-busca" class="input op-busca" placeholder="Procurar cliente, cidade ou responsável" value="${esc(P.busca)}" aria-label="Procurar"></section>`;
    const linhas = lista.map((c) => { const v = prox.get(c.ficha_id); return `<button type="button" class="op-linha pv-linha" data-acao="pv-cliente" data-id="${c.ficha_id}">
      <span class="op-nome"><b>${esc(c.nome)}</b><span class="t12 fraco">${esc([c.cidade, c.uf].filter(Boolean).join(" - "))}${c.qtd_condominios ? ` · ${fmtN(c.qtd_condominios)} condomínios` : ""}</span></span>
      <span class="t12 fraco">${c.produtos.length ? esc(c.produtos.slice(0, 2).join(", ")) + (c.produtos.length > 2 ? ` +${c.produtos.length - 2}` : "") : "Produtos não marcados"}</span>
      <span class="t13 ${pvSemContato(c) > 90 ? "pv-atr" : ""}">${v ? `${v.tipo === "visita" ? "Visita" : "Ligação"} ${ddmm(v.dia)} ${v.hora}` : esc(pvRotuloSem(c))}</span>
      <span class="op-extra"><span class="selo ${PV_SIT_COR[c.situacao] || "s-neutro"}">${esc(PV_SIT_NOME[c.situacao] || c.situacao)}</span></span></button>`; }).join("");
    return cab + barra + `<section class="cartao op-lista">${linhas || '<div class="vazio">Nenhum cliente aqui.</div>'}</section>` + pvGavetas();
  }

  function painelCliente(c) {
    const P = S.pv, hj = hojeISO(), w = pvTel(c), vis = P.visitas.filter((v) => v.ficha_id === c.ficha_id).sort((a, b) => (a.quando < b.quando ? 1 : -1));
    const nomeP = (id) => (P.pessoas.find((p) => p.id === id)?.nome || "").split(/\s+/)[0];
    const tels = [...new Set(String([c.telefones, c.numero_responsavel].filter(Boolean).join(" / ")).split(/\s*[\/,;]\s*/).map((t) => t.trim()).filter(Boolean))];
    return `<aside class="cartao painel op-painel" aria-label="${esc(c.nome)}"><button type="button" class="mini fechar-painel" data-acao="pv-fechar">Fechar ✕</button>
      <div class="pilha" style="gap:2px"><h2>${esc(c.nome)}</h2><span class="t13 fraco">${esc([c.endereco, [c.cidade, c.uf].filter(Boolean).join(" - ")].filter(Boolean).join(" · "))}</span><span class="t13 fraco">${c.cliente_desde ? `Cliente desde ${ddmmaaaa(c.cliente_desde)} · ` : ""}${esc(pvRotuloSem(c))}</span></div>
      <div class="op-contato">${c.responsavel ? `<span>Responsável: <b>${esc(c.responsavel)}</b></span>` : ""}${tels.map((t) => { const n = nacional(t); return n ? `<a href="tel:+55${n}" class="mini">${esc(fmtTel(n))}</a>` : `<span class="t13">${esc(t)}</span>`; }).join("")}${w ? `<a href="https://wa.me/55${w}" target="_blank" rel="noopener" class="mini">WhatsApp</a>` : ""}<a href="${esc(pvMapa(c))}" target="_blank" rel="noopener" class="mini">Como chegar</a></div>
      <div class="pilha" style="gap:6px"><span class="rotulo">Como está o cliente</span><div class="linha-flex">${PV_SIT.map(([k, l]) => `<button type="button" class="pv-sit ${c.situacao === k ? "pv-sit-on" : ""} pv-sit-${k}" data-acao="pv-situacao" data-v="${k}" data-id="${c.ficha_id}" ${!c.negocio_id ? "disabled" : ""}>${l}</button>`).join("")}</div></div>
      <div class="pilha" style="gap:6px"><span class="rotulo">Produtos que já usa</span><div class="pv-prods">${P.produtos.map((p) => `<label class="op-chip"><input type="checkbox" data-pv-prod="${p.id}" data-id="${c.ficha_id}" ${c.produtos.includes(p.nome) ? "checked" : ""}><span>${esc(p.nome)}</span></label>`).join("")}</div></div>
      <form class="op-form" data-acao="pv-agendar" data-id="${c.ficha_id}"><span class="rotulo">Marcar visita ou ligação</span>
        <div class="linha-flex">${[["visita", "Visita"], ["ligacao", "Ligação"]].map(([k, l], i) => `<label class="op-chip"><input type="radio" name="tipo" value="${k}" ${i === 0 ? "checked" : ""}><span>${l}</span></label>`).join("")}<input type="date" name="dia" class="input op-data" min="${hj}" value="${hj}" required aria-label="Dia"><input type="time" name="hora" class="input op-data" value="10:00" required aria-label="Hora" style="margin-left:0"></div>
        <input name="objetivo" class="input" maxlength="500" placeholder="Objetivo (ex.: apresentar o Aplicativo administradora)">
        <div><button type="submit" class="btn btn-primario" ${P.salvando ? "disabled" : ""}>Marcar</button></div></form>
      <div class="pilha" style="gap:8px"><b class="t13">Visitas e ligações</b>${vis.length ? vis.map((v) => `<div class="op-reg"><div class="op-reg-top"><span class="op-autor op-f-pos_vendas">${esc(nomeP(v.usuario_id))}</span><span class="t12 fraco">${ddmmaaaa(v.dia)} ${v.hora} · ${v.tipo === "visita" ? "Visita" : "Ligação"}</span><span class="selo ${v.status === "feita" ? "s-conf" : v.status === "cancelada" ? "s-errado" : "s-ident"}">${v.status === "feita" ? "Feita" : v.status === "cancelada" ? "Cancelada" : "Marcada"}</span>${v.situacao_cliente ? `<span class="selo ${PV_SIT_COR[v.situacao_cliente]}">${PV_SIT_NOME[v.situacao_cliente]}</span>` : ""}${v.status === "agendada" ? `<button type="button" class="mini" data-acao="pv-registrar" data-id="${v.id}">Registrar</button>` : ""}</div>${v.objetivo ? `<p class="fraco">${esc(v.objetivo)}</p>` : ""}${v.resultado ? `<p>${esc(v.resultado)}</p>` : ""}</div>`).join("") : '<p class="fraco t13" style="margin:0">Nenhuma visita ou ligação registrada aqui ainda.</p>'}</div></aside>`;
  }
  function painelVisita(v) {
    const P = S.pv, c = pvCliente(v.ficha_id) || { nome: "Cliente", situacao: "Contato" }, como = P.como;
    return `<aside class="cartao painel op-painel" aria-label="Registrar"><button type="button" class="mini fechar-painel" data-acao="pv-fechar">Fechar ✕</button>
      <div class="pilha" style="gap:2px"><h2>${esc(c.nome)}</h2><span class="t13 fraco">${v.tipo === "visita" ? "Visita" : "Ligação"} de ${ddmmaaaa(v.dia)} às ${v.hora}${v.objetivo ? ` · ${esc(v.objetivo)}` : ""}</span></div>
      <form class="op-form" data-acao="pv-resultado" data-id="${v.id}"><div class="linha-flex op-como">${[["feita", "Aconteceu", "op-chip-fechou"], ["remarcar", "Remarcar", "op-chip-depois"], ["cancelada", "Não aconteceu", "op-chip-negou"]].map(([k, l, cl]) => `<label class="op-chip ${cl}"><input type="radio" name="como" value="${k}" ${como === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
        ${como === "feita" ? `<textarea name="resultado" class="input op-texto" rows="4" maxlength="3000" placeholder="Como foi? O que o cliente falou? Alguma oportunidade de produto adicional?"></textarea>
          <div class="pilha" style="gap:6px"><span class="rotulo">Como está o cliente?</span><div class="linha-flex">${PV_SIT.filter(([k]) => k !== "Contato").map(([k, l]) => `<label class="op-chip ${k === "Insatisfeito" ? "op-chip-negou" : k === "Satisfeito" ? "op-chip-fechou" : ""}"><input type="radio" name="sit" value="${k}" ${c.situacao === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>` : ""}
        ${como === "remarcar" ? `<div class="linha-flex"><input type="date" name="dia" class="input" min="${hojeISO()}" required aria-label="Novo dia"><input type="time" name="hora" class="input" value="${v.hora}" required aria-label="Nova hora"></div>` : ""}
        <div><button type="submit" class="btn btn-primario" ${P.salvando ? "disabled" : ""}>${P.salvando ? "Salvando…" : "Salvar"}</button></div></form></aside>`;
  }
  app.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b || b.tagName === "FORM" || !b.dataset.acao.startsWith("pv-")) return;
    const P = S.pv;
    switch (b.dataset.acao) {
      case "pv-recarregar": carregarPos(); break;
      case "pv-aba": P.aba = b.dataset.v; render(); break;
      case "pv-ver-atencao": P.aba = "atencao"; S.voltarAtivo = true; S.view = "clientes"; render(); break;
      case "pv-cliente": P.sel = b.dataset.id; P.vis = null; render(); break;
      case "pv-registrar": P.vis = +b.dataset.id; P.como = "feita"; render(); break;
      case "pv-fechar": if (P.vis && P.sel) P.vis = null; else { P.vis = null; P.sel = null; } render(); break;
      case "pv-situacao": {
        const c = pvCliente(b.dataset.id); if (!c?.negocio_id || c.situacao === b.dataset.v) break;
        const { error } = await sb.rpc("situacao_cliente", { p_negocio: c.negocio_id, p_etapa: b.dataset.v });
        if (error) { console.error(error); toast("Não foi possível salvar."); break; }
        c.situacao = b.dataset.v; toast(`Cliente marcado como ${PV_SIT_NOME[b.dataset.v].toLowerCase()}.`); render(); break;
      }
    }
  });
  app.addEventListener("change", async (ev) => {
    const t = ev.target;
    if (t.name === "como" && t.closest('[data-acao="pv-resultado"]')) { S.pv.como = t.value; render(); return; }
    if (t.dataset.pvProd) {
      const id = t.dataset.id, prod = +t.dataset.pvProd, c = pvCliente(id), nomeProd = S.pv.produtos.find((p) => p.id === prod)?.nome;
      const r = t.checked ? await sb.from("cliente_produtos").insert({ ficha_id: id, produto_id: prod }) : await sb.from("cliente_produtos").delete().eq("ficha_id", id).eq("produto_id", prod);
      if (r.error) { console.error(r.error); toast("Não foi possível salvar."); t.checked = !t.checked; return; }
      if (c && nomeProd) c.produtos = t.checked ? [...new Set([...c.produtos, nomeProd])].sort() : c.produtos.filter((p) => p !== nomeProd);
    }
  });
  app.addEventListener("input", (ev) => { if (ev.target.id !== "pv-busca") return; clearTimeout(S.pv.espera); S.pv.espera = setTimeout(() => { const el = $("#pv-busca"); if (!el) return; S.pv.busca = el.value; const pos = el.selectionStart; renderDados(); const n = $("#pv-busca"); if (n && document.activeElement !== n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* */ } } }, 200); });
  app.addEventListener("submit", async (ev) => {
    const f = ev.target, a = f.dataset.acao; if (a !== "pv-agendar" && a !== "pv-resultado") return; ev.preventDefault();
    const P = S.pv; if (P.salvando) return; const fd = new FormData(f);
    P.salvando = true; render();
    try {
      if (a === "pv-agendar") {
        const dia = String(fd.get("dia") || ""), hora = String(fd.get("hora") || "10:00");
        if (!dia || dia < hojeISO()) throw new Error("dia");
        const { error } = await sb.from("visitas").insert({ ficha_id: f.dataset.id, usuario_id: S.user.id, tipo: String(fd.get("tipo") || "visita"), quando: tsSP(dia, hora), objetivo: String(fd.get("objetivo") || "").trim() || null });
        if (error) throw error; toast(`Marcado para ${ddmm(dia)} às ${hora}.`);
      } else {
        const id = +f.dataset.id, v = P.visitas.find((x) => x.id === id), como = String(fd.get("como") || "feita");
        if (como === "feita") {
          const sit = String(fd.get("sit") || "") || null;
          const { error } = await sb.from("visitas").update({ status: "feita", feita_em: new Date().toISOString(), resultado: String(fd.get("resultado") || "").trim() || null, situacao_cliente: sit }).eq("id", id);
          if (error) throw error;
          const c = pvCliente(v.ficha_id); if (sit && c?.negocio_id && c.situacao !== sit) { const r = await sb.rpc("situacao_cliente", { p_negocio: c.negocio_id, p_etapa: sit }); if (r.error) throw r.error; }
          toast("Registrado.");
        } else if (como === "remarcar") {
          const dia = String(fd.get("dia") || ""), hora = String(fd.get("hora") || v.hora); if (!dia || dia < hojeISO()) throw new Error("dia");
          const { error } = await sb.from("visitas").update({ quando: tsSP(dia, hora) }).eq("id", id); if (error) throw error; toast(`Remarcado para ${ddmm(dia)} às ${hora}.`);
        } else { const { error } = await sb.from("visitas").update({ status: "cancelada" }).eq("id", id); if (error) throw error; toast("Marcada como não aconteceu."); }
        P.vis = null;
      }
      P.salvando = false; await carregarPos(true);
    } catch (e) { console.error(e); toast(e.message === "dia" ? "Escolha hoje ou um dia que ainda vai chegar." : "Não foi possível salvar. Tente de novo."); }
    finally { P.salvando = false; render(); }
  });

  /* ------------------------------------------------- Oportunidades (pós-demo) */
  // Administradoras que viram a demo e ainda não fecharam. O time anota cada contato de negociação
  // (cada anotação guarda quem fez) e marca como ficou: em negociação, deixou para depois, negou ou fechou.
  S.op = { lista: null, contatos: [], pessoas: [], carregando: false, erro: false, em: 0, aba: "negociando", busca: "", sel: null, como: "negociando", salvando: false };
  const OP_SIT = { negociando: "Em negociação", depois: "Deixou para depois", negou: "Negou", fechou: "Fechou contrato" };
  const OP_ABAS = [["negociando", "Em negociação"], ["depois", "Retomar depois"], ["negou", "Negaram"], ["fechou", "Fecharam"]];
  const OP_MOTIVOS = [["preco", "Preço"], ["contrato_atual", "Contrato com o sistema atual"], ["sem_momento", "Não é o momento"], ["funcionalidade", "Faltou alguma funcionalidade"], ["nao_gostou", "Não gostou do sistema (uso ou visual)"], ["sem_diferencial", "Não viu vantagem sobre o atual"], ["outro_sistema", "Escolheu outro sistema"], ["nao_responde", "Parou de responder"], ["outro", "Outro motivo"]];
  const OP_MOTIVO = Object.fromEntries(OP_MOTIVOS);
  const OP_CANAIS = [["ligacao", "Ligação"], ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["reuniao", "Reunião"]];
  const OP_CANAL = Object.fromEntries(OP_CANAIS);
  const opDias = (d) => Math.round((isoData(hojeISO()) - isoData(d)) / 864e5);
  const opQuando = (d) => { const n = opDias(d); return n <= 0 ? "hoje" : n === 1 ? "ontem" : `há ${n} dias`; };

  async function carregarOportunidades(silencioso) {
    const O = S.op; if (O.carregando) return; O.carregando = true; O.erro = false;
    try {
      const [lista, contatos, pessoas] = await Promise.all([
        sb.rpc("lista_oportunidades"),
        sb.from("oportunidade_contatos").select("id,ficha_id,usuario_id,data,canal,texto,situacao,motivo,retomar_em,criado_em").order("data", { ascending: false }).order("id", { ascending: false }).limit(5000),
        sb.from("perfis").select("id,nome,funcao").eq("aprovado", true),
      ]);
      for (const r of [lista, contatos, pessoas]) if (r.error) throw r.error;
      O.lista = lista.data || []; O.contatos = contatos.data || []; O.pessoas = pessoas.data || []; O.em = Date.now();
    } catch (e) { console.error(e); O.erro = true; if (!silencioso) toast("Não deu para carregar as oportunidades. Tente de novo."); }
    finally { O.carregando = false; if (S.view === "oportunidades") renderDados(); else if (S.user) atualizarContadorOp(); }
  }
  function atualizarContadorOp() { const b = app.querySelector('[data-view="oportunidades"]'); if (b) b.innerHTML = rotuloNavOp(); }
  function opItens() {
    const O = S.op, porFicha = new Map();
    for (const c of O.contatos) { if (!porFicha.has(c.ficha_id)) porFicha.set(c.ficha_id, []); porFicha.get(c.ficha_id).push(c); }
    return (O.lista || []).map((o) => { const cs = porFicha.get(o.ficha_id) || []; return { ...o, aba: o.contrato ? "fechou" : o.situacao === "fechou" ? "fechou" : o.situacao, contatos: cs, ultimo: cs[0] || null }; });
  }
  const opVence = (o) => o.aba === "depois" && o.retomar_em && o.retomar_em <= hojeISO();
  function rotuloNavOp() { return "Oportunidades"; }
  const opPessoa = (id) => { const p = S.op.pessoas.find((x) => x.id === id); return { nome: (p?.nome || "").split(/\s+/)[0] || "Alguém", funcao: p?.funcao || "sdr", eu: id === S.user.id }; };

  function telaOportunidades() {
    const O = S.op;
    if (!O.lista && !O.carregando && !O.erro) carregarOportunidades(true);
    else if (O.lista && !O.carregando && Date.now() - O.em > 60000) carregarOportunidades(true);
    const cab = `<div class="cabeca"><div class="pilha" style="gap:4px"><h1>Oportunidades</h1><p class="fraco" style="margin:0">Administradoras que viram a demo e ainda não fecharam. Anote cada contato e como ficou.</p></div></div>`;
    if (!O.lista) return cab + `<div class="cartao vazio">${O.erro ? 'Não deu para carregar. <button type="button" class="mini" data-acao="op-recarregar">Tentar de novo</button>' : "Carregando…"}</div>`;
    const todos = opItens(), q = O.busca.trim().toLowerCase();
    const conta = (k) => todos.filter((o) => o.aba === k).length, vencem = todos.filter(opVence).length;
    let lista = todos.filter((o) => o.aba === O.aba && (!q || `${o.nome} ${o.cidade || ""} ${o.uf || ""} ${o.sistema || ""}`.toLowerCase().includes(q)));
    const ult = (o) => o.ultimo?.data || o.demo || "";
    if (O.aba === "negociando") lista.sort((a, b) => (ult(a) < ult(b) ? -1 : 1)); // quem está há mais tempo sem contato primeiro
    else if (O.aba === "depois") lista.sort((a, b) => ((a.retomar_em || "9") < (b.retomar_em || "9") ? -1 : 1));
    else lista.sort((a, b) => ((b.contrato || ult(b)) < (a.contrato || ult(a)) ? -1 : 1));
    const barra = `<section class="cartao op-barra"><div class="abas" role="tablist">${OP_ABAS.map(([k, l]) => `<button type="button" role="tab" class="aba" data-acao="op-aba" data-v="${k}" aria-selected="${O.aba === k}">${l} <span class="op-n">${conta(k)}</span></button>`).join("")}</div>
      <input type="search" id="op-busca" class="input op-busca" placeholder="Procurar administradora, cidade ou sistema" value="${esc(O.busca)}" aria-label="Procurar"></section>`;
    const linha = (o) => {
      const u = o.ultimo, p = u ? opPessoa(u.usuario_id) : null;
      const extra = o.aba === "depois" ? (o.retomar_em ? `<span class="selo ${opVence(o) ? "s-errado" : "s-nao"}">${opVence(o) ? "Hora de retomar" : "Retomar"} ${ddmm(o.retomar_em)}</span>` : "")
        : o.aba === "negou" ? (o.motivo ? `<span class="selo s-neutro">${esc(OP_MOTIVO[o.motivo] || "")}</span>` : "")
        : o.aba === "fechou" ? `<span class="selo s-conf">Contrato ${o.contrato ? ddmmaaaa(o.contrato) : ""}</span>` : "";
      return `<button type="button" class="op-linha" data-acao="op-abrir" data-id="${o.ficha_id}">
        <span class="op-nome"><b>${esc(o.nome)}</b><span class="t12 fraco">${esc([o.cidade, o.uf].filter(Boolean).join(" - "))}${o.sistema ? " · " + esc(o.sistema) : ""}</span></span>
        <span class="t12 fraco op-demo">Demo ${o.demo ? ddmmaaaa(o.demo) : "—"}</span>
        <span class="op-ult">${u ? `<span class="t13">${opQuando(u.data)}</span><span class="op-autor op-f-${p.funcao}">${esc(p.nome)}</span>` : `<span class="t13 fraco">Nenhum contato depois da demo</span>`}</span>
        <span class="op-extra">${extra}</span></button>`;
    };
    const vazio = { negociando: "Nenhuma administradora em negociação.", depois: "Nenhuma deixou para depois.", negou: "Nenhuma negou até agora.", fechou: "Nenhum contrato fechado ainda." }[O.aba];
    const corpo = `<section class="cartao op-lista">${lista.length ? lista.map(linha).join("") : `<div class="vazio">${q ? "Nada encontrado com essa busca." : vazio}</div>`}</section>`;
    const sel = O.sel ? todos.find((o) => o.ficha_id === O.sel) : null;
    return cab + barra + corpo + (sel ? gaveta(painelOp(sel), "op-fechar") : "");
  }

  function painelOp(o) {
    const O = S.op, hj = hojeISO();
    const tels = [...new Set(String([o.telefones, o.numero_responsavel].filter(Boolean).join(" / ")).split(/\s*[\/,;]\s*/).map((t) => t.trim()).filter(Boolean))];
    const wpp = nacional(o.whatsapp || "");
    const contato = `<div class="op-contato">${o.responsavel ? `<span>Responsável: <b>${esc(o.responsavel)}</b></span>` : ""}${tels.map((t) => { const n = nacional(t); return n ? `<a href="tel:+55${n}" class="mini">${esc(fmtTel(n))}</a>` : `<span class="t13">${esc(t)}</span>`; }).join("")}
      ${wpp ? `<a href="https://wa.me/55${wpp}" target="_blank" rel="noopener" class="mini">WhatsApp ${esc(fmtTel(wpp))}</a>` : ""}${o.email ? `<a href="mailto:${esc(o.email)}" class="mini">${esc(o.email)}</a>` : ""}</div>`;
    const como = O.como;
    const form = o.aba === "fechou" ? "" : `<form class="op-form" data-acao="op-salvar" data-id="${o.ficha_id}">
      <div class="linha-flex op-canais" role="radiogroup" aria-label="Por onde">${OP_CANAIS.map(([k, l], i) => `<label class="op-chip"><input type="radio" name="canal" value="${k}" ${i === 0 ? "checked" : ""}><span>${l}</span></label>`).join("")}
        <input type="date" name="data" class="input op-data" value="${hj}" max="${hj}" aria-label="Dia do contato"></div>
      <textarea name="texto" class="input op-texto" rows="3" maxlength="2000" placeholder="O que conversaram?"></textarea>
      <div class="pilha" style="gap:6px"><span class="rotulo">Como ficou?</span><div class="linha-flex op-como" role="radiogroup">${Object.entries(OP_SIT).map(([k, l]) => `<label class="op-chip op-chip-${k}"><input type="radio" name="como" value="${k}" ${como === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
      ${como === "depois" ? `<div class="campo" style="max-width:220px"><label for="op-retomar">Retomar em</label><input id="op-retomar" name="retomar_em" type="date" class="input" min="${hj}" value="${esc(o.retomar_em && o.retomar_em >= hj ? o.retomar_em : "")}" required></div>` : ""}
      ${como === "negou" ? `<div class="campo" style="max-width:320px"><label for="op-motivo">Por que não foi para frente?</label><select id="op-motivo" name="motivo" class="input" required><option value="">Escolha o motivo</option>${OP_MOTIVOS.map(([k, l]) => `<option value="${k}" ${o.motivo === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>` : ""}
      ${como === "fechou" ? `<p class="t13 fraco" style="margin:0">Vai registrar o contrato na ficha (entra nos Relatórios e nos Indicadores) com o dia do contato.</p>` : ""}
      <div><button type="submit" class="btn btn-primario" ${O.salvando ? "disabled" : ""}>${O.salvando ? "Salvando…" : "Salvar contato"}</button></div></form>`;
    const hist = o.contatos.length ? o.contatos.map((c) => { const p = opPessoa(c.usuario_id);
      const mud = c.situacao ? `<span class="selo ${c.situacao === "negou" ? "s-errado" : c.situacao === "fechou" ? "s-conf" : c.situacao === "depois" ? "s-nao" : "s-ident"}">${OP_SIT[c.situacao]}${c.situacao === "depois" && c.retomar_em ? ` · retomar ${ddmm(c.retomar_em)}` : ""}${c.situacao === "negou" && c.motivo ? ` · ${esc(OP_MOTIVO[c.motivo])}` : ""}</span>` : "";
      return `<div class="op-reg"><div class="op-reg-top"><span class="op-autor op-f-${p.funcao}">${esc(p.nome)}${p.eu ? " (você)" : ""}</span><span class="t12 fraco">${ddmmaaaa(c.data)} · ${OP_CANAL[c.canal] || ""}</span>${mud}</div>${c.texto ? `<p>${esc(c.texto)}</p>` : ""}</div>`; }).join("")
      : `<p class="fraco t13" style="margin:0">Nenhum contato registrado depois da demo.</p>`;
    return `<aside class="cartao painel op-painel" aria-label="${esc(o.nome)}"><button type="button" class="mini fechar-painel" data-acao="op-fechar">Fechar ✕</button>
      <div class="pilha" style="gap:2px"><h2>${esc(o.nome)}</h2><span class="t13 fraco">${esc([o.cidade, o.uf].filter(Boolean).join(" - "))}${o.sistema ? " · " + esc(o.sistema) : ""}${o.qtd_condominios ? ` · ${fmtN(o.qtd_condominios)} condomínios` : ""} · demo em ${o.demo ? ddmmaaaa(o.demo) : "—"} com ${esc(o.apresentador || "Leonardo")}</span>
      <span class="t13">Agora: <b>${o.aba === "fechou" ? "Fechou contrato" : OP_SIT[o.situacao]}</b>${o.aba === "depois" && o.retomar_em ? ` · retomar em ${ddmmaaaa(o.retomar_em)}` : ""}${o.aba === "negou" && o.motivo ? ` · ${esc(OP_MOTIVO[o.motivo])}` : ""}</span></div>
      ${contato}${form}<div class="pilha" style="gap:8px"><b class="t13">Histórico de contatos</b>${hist}</div></aside>`;
  }

  async function salvarContatoOp(form) {
    const O = S.op; if (O.salvando) return;
    const fd = new FormData(form), id = form.dataset.id, como = String(fd.get("como") || "negociando"), texto = String(fd.get("texto") || "").trim(), hj = hojeISO();
    const data = String(fd.get("data") || hj) > hj ? hj : String(fd.get("data") || hj);
    const item = opItens().find((o) => o.ficha_id === id); if (!item) return;
    const mudou = como !== item.situacao;
    if (!texto && !mudou) { toast("Escreva o que conversaram ou mude como ficou."); form.elements.texto?.focus(); return; }
    const retomar = como === "depois" ? String(fd.get("retomar_em") || "") : null, motivo = como === "negou" ? String(fd.get("motivo") || "") : null;
    if (como === "depois" && !retomar) { toast("Escolha quando retomar."); form.elements.retomar_em?.focus(); return; }
    if (como === "negou" && !motivo) { toast("Escolha o motivo."); form.elements.motivo?.focus(); return; }
    O.salvando = true; render();
    try {
      const c = await sb.from("oportunidade_contatos").insert({ ficha_id: id, usuario_id: S.user.id, data, canal: String(fd.get("canal") || "ligacao"), texto: texto || null, situacao: mudou || como !== "negociando" ? como : null, motivo, retomar_em: retomar });
      if (c.error) throw c.error;
      const s = await sb.from("oportunidades").upsert({ ficha_id: id, situacao: como, motivo, retomar_em: retomar, atualizado_por: S.user.id, atualizado_em: new Date().toISOString() });
      if (s.error) throw s.error;
      if (como === "fechou") { const f = await sb.rpc("fechar_oportunidade", { p_ficha: id, p_data: data, p_texto: texto || null }); if (f.error) throw f.error; S.lg.carregado = false; if (S.ind) S.ind.em = 0; }
      toast(como === "fechou" ? "Contrato registrado." : "Contato salvo.");
      O.como = como === "fechou" ? "negociando" : como;
      await carregarOportunidades(true);
    } catch (e) { console.error(e); toast("Não foi possível salvar. Tente de novo."); }
    finally { O.salvando = false; render(); }
  }
  app.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b || b.tagName === "FORM" || !b.dataset.acao.startsWith("op-")) return;
    const O = S.op;
    switch (b.dataset.acao) {
      case "op-aba": O.aba = b.dataset.v; render(); break;
      case "op-abrir": { O.sel = b.dataset.id; const o = opItens().find((x) => x.ficha_id === O.sel); O.como = o?.aba === "fechou" ? "negociando" : o?.situacao || "negociando"; render(); break; }
      case "op-fechar": O.sel = null; render(); break;
      case "op-recarregar": carregarOportunidades(); break;
    }
  });
  app.addEventListener("change", (ev) => { const t = ev.target; if (t.name === "como" && t.closest(".op-form")) { S.op.como = t.value; const f = t.closest("form"), txt = f.elements.texto?.value || "", dia = f.elements.data?.value, canal = f.querySelector('[name="canal"]:checked')?.value; render(); const n = app.querySelector(".op-form"); if (n) { if (n.elements.texto) n.elements.texto.value = txt; if (dia && n.elements.data) n.elements.data.value = dia; const r = canal && n.querySelector(`[name="canal"][value="${canal}"]`); if (r) r.checked = true; } } });
  app.addEventListener("input", (ev) => { if (ev.target.id !== "op-busca") return; clearTimeout(S.op.espera); S.op.espera = setTimeout(() => { const el = $("#op-busca"); if (!el) return; S.op.busca = el.value; const pos = el.selectionStart; renderDados(); const n = $("#op-busca"); if (n && document.activeElement !== n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* */ } } }, 200); });
  app.addEventListener("submit", (ev) => { const f = ev.target; if (f.dataset.acao !== "op-salvar") return; ev.preventDefault(); salvarContatoOp(f); });

  /* ------------------------------------------------- Indicadores Comerciais */
  // Central de indicadores para a gestão. Nada é digitado aqui além das metas: tudo sai dos registros de contato,
  // das demonstrações (tabela demos, preenchida pelos gatilhos), do histórico de etapas dos negócios e dos contratos.
  // Cada número conta para quem fez aquela parte: a SDR liga e agenda; o vendedor apresenta e fecha;
  // o Matheus (gestor) só aparece com as demos que apresentou cobrindo as férias do Leonardo.
  S.ind = { per: "mes", ref: hojeISO(), ini: "", fim: "", resp: "todos", graf: "vol", bar: "tent", tab: "resp", d: null, carregando: false, em: 0, erro: false, drill: null, metas: false, salvando: false };
  const IND_METAS = [
    ["ligacoes_dia", "Tentativas de contato por dia", "SDR"], ["ligacoes_semana", "Tentativas de contato por semana", "SDR"], ["ligacoes_mes", "Tentativas de contato por mês", "SDR"],
    ["contatos_mes", "Contatos efetivados por mês", "SDR"], ["demos_agendadas_semana", "Demos agendadas por semana", "SDR"], ["demos_agendadas_mes", "Demos agendadas por mês", "SDR"],
    ["demos_realizadas_mes", "Demos realizadas por mês", "Vendedor"], ["contratos_mes", "Contratos por mês", "Vendedor"],
    ["conv_lig_demo", "Conversão desejada: tentativas → demo (%)", "SDR"], ["conv_demo_contrato", "Conversão desejada: demo → contrato (%)", "Vendedor"],
  ];
  const IND_CORES = ["#087CF0", "#0D2854", "#39C8FF", "#5B7FBF", "#2FA6A0", "#B98A2E", "#8FA8D6", "#C2473D", "#9AA6BD"];
  const ehGestao = () => S.perfil?.papel === "admin" || S.perfil?.funcao === "gestor";
  const pct = (a, b) => (b ? (a / b) * 100 : NaN);
  const fP = (v) => (isFinite(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : "–");
  const f1 = (v) => (isFinite(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "–");
  const primeiroNome = (n) => String(n || "").trim().split(/\s+/)[0] || "";
  const diaSP = (ts) => (ts ? localSP(ts).slice(0, 10) : "");
  const diaUtil = (iso) => ![0, 6].includes(isoData(iso).getUTCDay());
  function uteisEntre(a, b) { let n = 0; for (let d = a; d <= b; d = somaDias(d, 1)) if (diaUtil(d)) n++; return n; }
  const fimDoMes = (iso) => { const d = isoData(iso.slice(0, 8) + "01"); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d.toISOString().slice(0, 10); };
  const somaMeses = (iso, n) => { const d = isoData(iso.slice(0, 8) + "01"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };

  // o período escolhido e o período de comparação (mesmo tamanho, logo antes)
  function indPeriodo() {
    const I = S.ind, hj = hojeISO();
    let ini, fim, nome, cmpIni, cmpFim;
    if (I.per === "dia") { ini = fim = I.ref; nome = I.ref === hj ? "Hoje" : ddmmaaaa(I.ref); let p = somaDias(ini, -1); while (!diaUtil(p)) p = somaDias(p, -1); cmpIni = cmpFim = p; }
    else if (I.per === "semana") { ini = segundaDe(I.ref); fim = somaDias(ini, 6); nome = `Semana de ${ddmm(ini)} a ${ddmm(somaDias(ini, 4))}`; cmpIni = somaDias(ini, -7); cmpFim = somaDias(fim, -7); }
    else if (I.per === "mes") { ini = I.ref.slice(0, 8) + "01"; fim = fimDoMes(ini); const m = MESES[+ini.slice(5, 7) - 1]; nome = `${m[0].toUpperCase() + m.slice(1)} de ${ini.slice(0, 4)}`; cmpIni = somaMeses(ini, -1); cmpFim = fimDoMes(cmpIni); }
    else if (I.per === "ano") { ini = I.ref.slice(0, 4) + "-01-01"; fim = I.ref.slice(0, 4) + "-12-31"; nome = `Ano de ${ini.slice(0, 4)}`; cmpIni = (+ini.slice(0, 4) - 1) + "-01-01"; cmpFim = (+ini.slice(0, 4) - 1) + "-12-31"; }
    else { ini = I.ini || somaDias(hj, -29); fim = I.fim || hj; if (ini > fim) [ini, fim] = [fim, ini]; const n = Math.round((isoData(fim) - isoData(ini)) / 864e5) + 1; nome = `${ddmmaaaa(ini)} a ${ddmmaaaa(fim)}`; cmpFim = somaDias(ini, -1); cmpIni = somaDias(ini, -n); }
    // período em andamento: compara só até o mesmo ponto (ex.: 1 a 26/11 com 1 a 26/10)
    const corre = fim >= hj && ini <= hj, ate = corre ? hj : fim;
    if (corre && I.per !== "dia") { const dias = Math.round((isoData(hj) - isoData(ini)) / 864e5); const lim = I.per === "mes" ? somaDias(cmpIni, dias) : I.per === "ano" ? somaDias(cmpIni, dias) : somaDias(cmpIni, dias); if (lim < cmpFim) cmpFim = lim; }
    return { ini, fim, ate, nome, cmpIni, cmpFim, corre };
  }

  async function carregarIndicadores(silencioso) {
    const I = S.ind; if (I.carregando) return; I.carregando = true; I.erro = false;
    if (!silencioso) renderDados();
    try {
      const [regs, demos, fichas, negocios, hist, etapas, funis, metas, pessoas] = await Promise.all([
        tudo(() => sb.from("registros").select("id,ficha_id,usuario_id,data,tipo,detalhe,canal,criado_em").neq("tipo", "anotacao").order("id"), "ind-regs"),
        tudo(() => sb.from("demos").select("id,ficha_id,usuario_id,agendada_por,agendada_em,demo_em,status,realizada_em,apresentador,reagendada_de,origem").order("id"), "ind-demos"),
        tudo(() => sb.from("fichas").select("id,usuario_id,nome,cidade,uf,sistema,qtd_condominios,responsavel,criado_em").order("id"), "ind-fichas"),
        tudo(() => sb.from("negocios").select("id,ficha_id,funil_id,etapa_id,status").order("id"), "ind-neg"),
        tudo(() => sb.from("negocio_etapas").select("negocio_id,etapa_id,em").order("id"), "ind-hist"),
        sb.from("etapas").select("id,funil_id,ordem,nome"), sb.from("funis").select("id,sigla,nome"),
        sb.from("metas_comerciais").select("chave,valor"), sb.from("perfis").select("id,nome,funcao,papel").eq("aprovado", true).order("nome"),
      ]);
      for (const r of [etapas, funis, metas, pessoas]) if (r.error) throw r.error;
      I.d = montarBase({ regs, demos, fichas, negocios, hist, etapas: etapas.data || [], funis: funis.data || [], metas: metas.data || [], pessoas: pessoas.data || [] });
      I.em = Date.now();
    } catch (e) { console.error(e); I.erro = true; if (!silencioso) toast("Não deu para carregar os indicadores. Tente de novo."); }
    finally { I.carregando = false; if (S.view === "indicadores") renderDados(); }
  }

  // organiza o que veio do banco uma vez por carga
  function montarBase(b) {
    const fichaPorId = new Map(b.fichas.map((f) => [f.id, f]));
    const scc = b.funis.find((f) => f.sigla === "SCC")?.id;
    const ordemEtapa = new Map(b.etapas.filter((e) => e.funil_id === scc).map((e) => [e.id, e.ordem]));
    const negPorId = new Map(b.negocios.filter((n) => n.funil_id === scc).map((n) => [n.id, n]));
    // proposta enviada: a primeira vez que o negócio entrou numa etapa de proposta (8 a 11) ou fechou (12)
    const propostas = new Map();
    for (const h of b.hist) {
      const n = negPorId.get(h.negocio_id), o = ordemEtapa.get(h.etapa_id); if (!n || !o || o < 8) continue;
      const dia = diaSP(h.em), p = propostas.get(n.id);
      if (!p) propostas.set(n.id, { negocio: n, ficha_id: n.ficha_id, enviada: dia, recusada: o === 10 ? dia : null });
      else { if (dia < p.enviada) p.enviada = dia; if (o === 10 && (!p.recusada || dia < p.recusada)) p.recusada = dia; }
    }
    for (const p of propostas.values()) { const o = ordemEtapa.get(p.negocio.etapa_id) || 0; p.situacao = o === 12 || p.negocio.status === "ganho" ? "contrato" : o === 10 || p.negocio.status === "perdido" ? "recusada" : "aberta"; }
    // demos: cada agendamento original e a cadeia de reagendamentos até a situação final
    const demoPorId = new Map(b.demos.map((d) => [d.id, d]));
    const raiz = (d) => { let x = d, i = 0; while (x.reagendada_de && demoPorId.has(x.reagendada_de) && i++ < 20) x = demoPorId.get(x.reagendada_de); return x; };
    const finalDe = new Map(); // id da raiz -> última da cadeia
    for (const d of b.demos) { const r = raiz(d); const at = finalDe.get(r.id); if (!at || d.id > at.id) finalDe.set(r.id, d); }
    for (const d of b.demos) { d.raiz = raiz(d); d.dia = diaSP(d.demo_em); d.agDia = diaSP(d.agendada_em); }
    const ultimaRealizada = new Map(); // ficha -> quem apresentou a última demo
    for (const d of b.demos) if (d.status === "realizada") { const u = ultimaRealizada.get(d.ficha_id); if (!u || d.realizada_em > u.realizada_em) ultimaRealizada.set(d.ficha_id, d); }
    const primeiroContato = new Map();
    const regs = b.regs.filter((r) => LIGACAO.has(r.tipo) || ["demo_realizada", "contrato"].includes(r.tipo));
    for (const r of regs) if (LIGACAO.has(r.tipo)) { const p = primeiroContato.get(r.ficha_id); if (!p || r.data < p) primeiroContato.set(r.ficha_id, r.data); }
    const metas = Object.fromEntries(b.metas.filter((m) => m.valor != null).map((m) => [m.chave, +m.valor]));
    // responsáveis: as contas do time e quem apresentou demo sem ter conta (o Matheus)
    const pessoas = b.pessoas.map((p) => ({ k: "u:" + p.id, id: p.id, nome: p.nome, curto: primeiroNome(p.nome), funcao: p.funcao || "sdr" }));
    for (const d of b.demos) { const n = primeiroNome(d.apresentador); if (n && !pessoas.some((p) => p.curto.toLowerCase() === n.toLowerCase())) pessoas.push({ k: "a:" + n, id: null, nome: n, curto: n, funcao: n.toLowerCase() === "matheus" ? "gestor" : "vendedor" }); }
    return { ...b, regs, fichaPorId, propostas: [...propostas.values()], demoPorId, finalDe, ultimaRealizada, primeiroContato, metas, pessoas };
  }

  // quem está filtrado: conta da SDR, conta do vendedor, ou alguém que só aparece como apresentador
  function indQuem() {
    const D = S.ind.d, k = S.ind.resp;
    if (k === "todos" || !D) return { todos: true, papel: "equipe" };
    const p = D.pessoas.find((x) => x.k === k); if (!p) return { todos: true, papel: "equipe" };
    const papel = p.funcao === "vendedor" ? "vendedor" : p.funcao === "gestor" ? "gestor" : p.funcao === "pos_vendas" ? "pos" : "sdr";
    return { todos: false, papel, id: p.id, nome: p.nome, curto: p.curto };
  }
  const apresentou = (Q, nome) => Q.todos || primeiroNome(nome).toLowerCase() === Q.curto.toLowerCase();
  const apresDaFicha = (D, fichaId) => D.ultimaRealizada.get(fichaId)?.apresentador || "Leonardo";

  // todos os números de um período para quem está filtrado
  function indCalcular(ini, fim, ate) {
    const D = S.ind.d, Q = indQuem(), hj = hojeISO();
    const regOk = (r) => Q.todos || r.usuario_id === Q.id;
    const noP = (d) => d && d >= ini && d <= fim;
    const tent = D.regs.filter((r) => LIGACAO.has(r.tipo) && noP(r.data) && regOk(r));
    const cont = tent.filter((r) => r.tipo !== "sem_contato");
    const agendadas = D.demos.filter((d) => !d.reagendada_de && d.agendada_em && noP(d.agDia) && (Q.todos || d.agendada_por === Q.id));
    const reag = D.demos.filter((d) => d.reagendada_de && noP(d.agDia) && (Q.todos || d.agendada_por === Q.id || d.raiz.agendada_por === Q.id));
    const realizadas = D.demos.filter((d) => d.status === "realizada" && noP(d.realizada_em) && (Q.papel === "sdr" ? d.raiz.agendada_por === Q.id : apresentou(Q, d.apresentador)));
    // demos que deveriam ter acontecido no período (data da demo já passou): para o comparecimento
    const previstas = D.demos.filter((d) => d.status !== "reagendada" && noP(d.status === "realizada" ? d.realizada_em : d.dia) && (d.status === "realizada" ? d.realizada_em : d.dia) <= hj
      && (Q.todos || (Q.papel === "sdr" ? d.raiz.agendada_por === Q.id : apresentou(Q, d.apresentador))));
    const naoFeitas = previstas.filter((d) => d.status === "nao_realizada"), semResultado = previstas.filter((d) => d.status === "agendada" && d.dia < hj);
    const contratos = D.regs.filter((r) => r.tipo === "contrato" && noP(r.data) && (Q.todos || (Q.papel !== "sdr" && apresentou(Q, apresDaFicha(D, r.ficha_id)))));
    const propostas = D.propostas.filter((p) => noP(p.enviada) && (Q.todos || (Q.papel !== "sdr" && apresentou(Q, apresDaFicha(D, p.ficha_id)))));
    const vale = Q.todos || Q.papel === "sdr";
    return {
      tent: vale ? tent : [], lig: vale ? tent.filter((r) => r.canal === "ligacao") : [], cont: vale ? cont : [], semContato: vale ? tent.filter((r) => r.tipo === "sem_contato") : [],
      neg: vale ? tent.filter((r) => r.tipo === "negativa") : [], agendadas: Q.papel === "vendedor" || Q.papel === "gestor" ? D.demos.filter((d) => !d.reagendada_de && d.agendada_em && noP(d.agDia) && apresentou(Q, (D.finalDe.get(d.id) || d).apresentador)) : agendadas,
      reag, realizadas, previstas, naoFeitas, semResultado, contratos, propostas, ini, fim, ate: ate || fim, Q,
      uteis: uteisEntre(ini, ate || fim),
    };
  }

  // a situação final de cada demo agendada no período (segue a cadeia de reagendamentos)
  function situacaoDemo(D, d) {
    const f = D.finalDe.get(d.raiz.id) || d, hj = hojeISO();
    if (f.status === "realizada") return "Realizada";
    if (f.status === "nao_realizada") return "Não aconteceu";
    if (f.status === "agendada" && f.dia && f.dia >= hj) return "Ainda vai acontecer";
    return "Aguardando resultado";
  }

  // funil por empresa: cada administradora conta uma vez, em todas as etapas que alcançou até o fim do período
  function indFunil(M) {
    const D = S.ind.d, Q = M.Q, fim = M.ate;
    const set = new Set([...M.tent.map((r) => r.ficha_id), ...M.agendadas.map((d) => d.ficha_id), ...M.realizadas.map((d) => d.ficha_id), ...M.contratos.map((r) => r.ficha_id), ...M.propostas.map((p) => p.ficha_id).filter((id) => D.ultimaRealizada.has(id))]);
    const regsAte = new Map();
    for (const r of D.regs) if (r.data <= fim && set.has(r.ficha_id)) { if (!regsAte.has(r.ficha_id)) regsAte.set(r.ficha_id, []); regsAte.get(r.ficha_id).push(r); }
    const demosAte = new Map();
    for (const d of D.demos) if (set.has(d.ficha_id) && ((d.agDia && d.agDia <= fim) || (d.realizada_em && d.realizada_em <= fim))) { if (!demosAte.has(d.ficha_id)) demosAte.set(d.ficha_id, []); demosAte.get(d.ficha_id).push(d); }
    const propAte = new Set(D.propostas.filter((p) => p.enviada <= fim).map((p) => p.ficha_id));
    const E = { abord: 0, contato: 0, interesse: 0, agend: 0, realiz: 0, prop: 0, ctr: 0 }, ids = { abord: [], contato: [], interesse: [], agend: [], realiz: [], prop: [], ctr: [] };
    for (const id of set) {
      const rs = regsAte.get(id) || [], ds = demosAte.get(id) || [];
      // proposta e contrato só entram no funil de quem teve demo realizada (as propostas do Agendor sem demo ficam fora)
      const realiz = ds.some((d) => d.status === "realizada" && d.realizada_em <= fim);
      const ctrReg = rs.some((r) => r.tipo === "contrato");
      const prop = realiz && (ctrReg || propAte.has(id)), ctr = realiz && ctrReg;
      const agend = realiz || ds.length > 0 || rs.some((r) => r.tipo === "demo_agendada");
      const interesse = agend || rs.some((r) => r.tipo === "conversou");
      const contato = interesse || rs.some((r) => r.tipo === "negativa");
      const marca = (k, v) => { if (v) { E[k]++; ids[k].push(id); } };
      marca("abord", true); marca("contato", contato); marca("interesse", interesse); marca("agend", agend); marca("realiz", realiz); marca("prop", prop); marca("ctr", ctr);
    }
    let etapas = [["abord", "Empresas abordadas"], ["contato", "Contato efetivado"], ["interesse", "Conversa com interesse"], ["agend", "Demo agendada"], ["realiz", "Demo realizada"], ["prop", "Proposta enviada"], ["ctr", "Contrato fechado"]];
    if (Q.papel === "sdr") etapas = etapas.slice(0, 5);
    if (Q.papel === "vendedor" || Q.papel === "gestor") etapas = etapas.slice(3);
    return etapas.map(([k, l]) => ({ k, l, n: E[k], ids: ids[k] }));
  }

  // séries no tempo: dia a dia (até 45 dias), semana a semana (até ~7 meses) ou mês a mês
  function indSerie(M) {
    const ini = M.ini, fim = M.ate, dias = Math.round((isoData(fim) - isoData(ini)) / 864e5) + 1;
    const passo = dias <= 45 ? "dia" : dias <= 215 ? "semana" : "mes";
    const chave = (d) => (passo === "dia" ? d : passo === "semana" ? segundaDe(d) : d.slice(0, 7) + "-01");
    const pontos = new Map();
    for (let d = passo === "semana" ? segundaDe(ini) : passo === "mes" ? ini.slice(0, 8) + "01" : ini; d <= fim; d = passo === "dia" ? somaDias(d, 1) : passo === "semana" ? somaDias(d, 7) : somaMeses(d, 1)) {
      if (passo === "dia" && !diaUtil(d) && !M.tent.some((r) => r.data === d)) continue;
      pontos.set(d, { tent: 0, cont: 0, ag: 0, real: 0, ctr: 0 });
    }
    const soma = (d, k) => { const p = pontos.get(chave(d)); if (p) p[k]++; };
    M.tent.forEach((r) => soma(r.data, "tent")); M.cont.forEach((r) => soma(r.data, "cont")); M.agendadas.forEach((d) => soma(d.agDia, "ag")); M.realizadas.forEach((d) => soma(d.realizada_em, "real")); M.contratos.forEach((r) => soma(r.data, "ctr"));
    const rot = (d) => (passo === "dia" ? ddmm(d) : passo === "semana" ? ddmm(d) : MESES[+d.slice(5, 7) - 1].slice(0, 3));
    return { passo, pontos: [...pontos.entries()].map(([d, v]) => ({ d, r: rot(d), ...v })) };
  }

  /* ---- desenho: gráficos em SVG (largura fixa no viewBox, sem biblioteca) */
  function svgLinha(serie, chaves, nomes, cores, taxa) {
    const W = 640, H = 240, pl = 40, pr = 12, pt = 14, pb = 28, n = serie.length;
    if (!n) return '<p class="fraco t13">Sem dados no período.</p>';
    const val = (p, k) => (taxa ? (k === "tc" ? pct(p.cont, p.tent) : pct(p.ag, p.tent)) || 0 : p[k]);
    const mx = Math.max(1, ...serie.flatMap((p) => chaves.map((k) => val(p, k)))) * 1.12;
    const X = (i) => pl + (n < 2 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (n - 1)), Y = (v) => pt + (H - pt - pb) * (1 - v / mx);
    let g = "";
    for (let k = 0; k <= 4; k++) { const v = (mx * k) / 4; g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" class="bi-grade"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" class="bi-eixo">${taxa ? Math.round(v) + "%" : mx < 10 ? f1(v) : fmtN(Math.round(v))}</text>`; }
    const passo = Math.ceil(n / 10);
    serie.forEach((p, i) => { if (i % passo === 0 || i === n - 1) g += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" class="bi-eixo">${esc(p.r)}</text>`; });
    const linhas = chaves.map((k, j) => { const d = serie.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(val(p, k)).toFixed(1)}`).join("");
      return (j === 0 && !taxa ? `<path d="${d}L${X(n - 1)},${Y(0)}L${X(0)},${Y(0)}Z" class="in-area"/>` : "") + `<path d="${d}" pathLength="1" class="in-linha" style="stroke:${cores[j]}"/>` + serie.map((p, i) => `<circle cx="${X(i)}" cy="${Y(val(p, k))}" r="3.5" style="fill:${cores[j]}" class="in-ponto"><title>${esc(p.r)} · ${nomes[j]}: ${taxa ? fP(val(p, k)) : fmtN(val(p, k))}</title></circle>`).join(""); }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="in-svg" role="img" aria-label="${esc(nomes.join(" e "))} ao longo do período">${g}${linhas}</svg>`;
  }
  function svgBarras(itens) { // [rótulo, atual, anterior]
    const W = 640, H = 240, pl = 34, pb = 28, pt = 16, n = itens.length; if (!n) return '<p class="fraco t13">Sem dados no período.</p>';
    const mx = Math.max(1, ...itens.flatMap((i) => [i[1], i[2]])) * 1.15, cw = (W - pl) / n, bw = Math.min(28, cw * 0.32), Y = (v) => pt + (H - pt - pb) * (1 - v / mx);
    let g = "";
    for (let k = 0; k <= 4; k++) { const v = (mx * k) / 4; g += `<line x1="${pl}" x2="${W}" y1="${Y(v)}" y2="${Y(v)}" class="bi-grade"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end" class="bi-eixo">${mx < 10 ? f1(v) : Math.round(v)}</text>`; }
    itens.forEach(([r, a, b], i) => { const cx = pl + cw * i + cw / 2, b0 = H - pb;
      g += `<rect x="${cx - bw - 2}" y="${Y(b)}" width="${bw}" height="${Math.max(0, b0 - Y(b))}" rx="4" class="in-barra in-barra-ant"><title>${esc(r)} · período anterior: ${fmtN(b)}</title></rect>`;
      g += `<rect x="${cx + 2}" y="${Y(a)}" width="${bw}" height="${Math.max(0, b0 - Y(a))}" rx="4" class="in-barra"><title>${esc(r)}: ${fmtN(a)} · anterior: ${fmtN(b)}</title></rect>`;
      if (n <= 14 || i % 2 === 0) g += `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="bi-eixo">${esc(r)}</text>`; });
    return `<svg viewBox="0 0 ${W} ${H}" class="in-svg" role="img" aria-label="Comparação com o período anterior">${g}</svg>`;
  }
  function rosca(id, itens, rotulo, vazio) {
    itens = itens.filter((i) => i[1] > 0); const tot = itens.reduce((s, i) => s + i[1], 0);
    if (!tot) return `<p class="fraco t13 in-vazio">${esc(vazio || "Nenhum registro neste período.")}</p>`;
    const R = 60, C = 2 * Math.PI * R; let acc = 0;
    const arcos = itens.map(([n, v, cor], i) => { const len = (v / tot) * C, o = `<circle r="${R}" cx="85" cy="85" style="stroke:${cor};--da:${Math.max(0, len - 1.5).toFixed(2)};--c:${C.toFixed(2)}" stroke-dasharray="${Math.max(0, len - 1.5).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" class="in-arco" data-acao="in-drill" data-tipo="${id}" data-cat="${esc(n)}"><title>${esc(n)}: ${fmtN(v)} (${fP((v / tot) * 100)})</title></circle>`; acc += len; return o; }).join("");
    return `<div class="in-rosca"><div class="in-rosca-g"><svg viewBox="0 0 170 170">${arcos}</svg><div class="in-rosca-meio"><b class="num">${fmtN(tot)}</b><span>${esc(rotulo)}</span></div></div>
      <div class="in-leg">${itens.map(([n, v, cor]) => `<button type="button" data-acao="in-drill" data-tipo="${id}" data-cat="${esc(n)}"><i style="background:${cor}"></i><span>${esc(n)}</span><b class="num">${fmtN(v)}</b><em class="num">${fP((v / tot) * 100)}</em></button>`).join("")}</div></div>`;
  }
  function variacao(a, b, inverso) {
    if (!isFinite(a) || !isFinite(b) || b === 0) return "";
    const v = ((a - b) / b) * 100; if (Math.abs(v) < 0.5) return '<span class="in-delta">= anterior</span>';
    const bom = inverso ? v < 0 : v > 0;
    return `<span class="in-delta ${bom ? "in-up" : "in-dn"}" title="Comparado com o período anterior">${v > 0 ? "▲" : "▼"} ${fP(Math.abs(v))}</span>`;
  }

  // a meta do período escolhido (só o que a gestão definiu; nada é inventado)
  function metaDoPeriodo(chaveMes, chaveSemana, chaveDia) {
    const M = S.ind.d.metas, I = S.ind, P = indPeriodo();
    if (I.per === "dia") return chaveDia && M[chaveDia] != null ? M[chaveDia] : null;
    if (I.per === "semana") { if (chaveSemana && M[chaveSemana] != null) return M[chaveSemana]; if (chaveDia && M[chaveDia] != null) return M[chaveDia] * 5; return null; }
    if (I.per === "mes") { if (chaveMes && M[chaveMes] != null) return M[chaveMes]; if (chaveSemana && M[chaveSemana] != null) return Math.round((M[chaveSemana] * uteisEntre(P.ini, P.fim)) / 5); if (chaveDia && M[chaveDia] != null) return M[chaveDia] * uteisEntre(P.ini, P.fim); return null; }
    if (I.per === "ano") { if (chaveMes && M[chaveMes] != null) return M[chaveMes] * 12; return null; }
    const u = uteisEntre(P.ini, P.fim); // personalizado: proporcional aos dias úteis
    if (chaveDia && M[chaveDia] != null) return M[chaveDia] * u;
    if (chaveMes && M[chaveMes] != null) return Math.round(((M[chaveMes] * u) / 21) * 10) / 10;
    return null;
  }

  function telaIndicadores() {
    const I = S.ind, D = I.d;
    if (!D && !I.carregando && !I.erro) carregarIndicadores(true);
    else if (D && !I.carregando && Date.now() - I.em > 60000) carregarIndicadores(true);
    const P = indPeriodo();
    const cab = `<div class="cabeca bi-cab"><div class="pilha" style="gap:4px"><h1>Indicadores Comerciais</h1><p class="fraco" style="margin:0">Calculados sozinhos a partir das ligações, demonstrações, propostas e contratos registrados. Só as metas são digitadas, pela gestão.</p></div>
      <div class="linha-flex in-tela">${ehGestao() ? '<button type="button" class="btn btn-sec" data-acao="in-metas">Metas e parâmetros</button>' : ""}<button type="button" class="btn btn-sec" data-acao="in-excel">Baixar Excel</button><button type="button" class="btn btn-primario" data-acao="in-pdf">Baixar PDF</button></div></div>`;
    if (!D) return cab + `<div class="cartao vazio">${I.erro ? 'Não deu para carregar. <button type="button" class="mini" data-acao="in-recarregar">Tentar de novo</button>' : "Carregando os indicadores…"}</div>`;
    const Q = indQuem();
    const filtros = `<section class="cartao in-filtros in-tela"><div class="abas" role="tablist">${[["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["ano", "Ano"], ["custom", "Personalizado"]].map(([k, l]) => `<button type="button" role="tab" class="aba" data-acao="in-per" data-v="${k}" aria-selected="${I.per === k}">${l}</button>`).join("")}</div>
      ${I.per === "custom" ? `<div class="linha-flex"><input type="date" class="input bi-data" id="in-ini" value="${esc(P.ini)}" aria-label="De"><span class="fraco">até</span><input type="date" class="input bi-data" id="in-fim" value="${esc(P.fim)}" aria-label="Até"></div>`
      : `<div class="linha-flex"><button type="button" class="mini" data-acao="in-ant" aria-label="Período anterior">←</button><b class="num in-per-nome">${esc(P.nome)}</b><button type="button" class="mini" data-acao="in-prox" aria-label="Próximo período">→</button>${P.corre ? "" : '<button type="button" class="mini" data-acao="in-hoje">Atual</button>'}</div>`}
      <div class="campo in-resp"><label for="in-resp">Responsável</label><select id="in-resp" class="input"><option value="todos">Toda a equipe</option>${D.pessoas.map((p) => `<option value="${esc(p.k)}" ${I.resp === p.k ? "selected" : ""}>${esc(p.curto)} · ${esc(rotuloFuncao(p.funcao))}${p.id ? "" : " (sem conta)"}</option>`).join("")}</select></div>
      <span class="in-atual t12 fraco"><i class="in-vivo"></i>${I.carregando ? "Atualizando…" : `Atualizado às ${localSP(new Date(I.em).toISOString()).slice(11, 16)}`} <button type="button" class="mini" data-acao="in-recarregar">Atualizar</button></span></section>`;
    const M = indCalcular(P.ini, P.fim, P.ate), A = indCalcular(P.cmpIni, P.cmpFim, P.cmpFim);
    const quem = Q.todos ? "Equipe comercial" : `${Q.curto} · ${rotuloFuncao(indPapelFuncao(Q))}`;
    const capa = `<div class="in-print-cab"><b>Indicadores Comerciais</b><span>${esc(P.nome)} · ${esc(quem)}</span><span>Comparado com ${ddmmaaaa(P.cmpIni)}${P.cmpIni !== P.cmpFim ? " a " + ddmmaaaa(P.cmpFim) : ""} · Gerado em ${ddmmaaaa(hojeISO())} às ${localSP(new Date().toISOString()).slice(11, 16)} por ${esc(S.perfil?.nome || "")}</span></div>`;
    const html = cab + filtros + `<div class="in-corpo">${capa}${secKpis(M, A)}${secMetas(M, P)}${secFunil(M)}${secGraficos(M, A, P)}${secPartes(M, P)}${secAnalise(M, A, P)}${secTabelas(M, P)}
      <p class="t12 fraco in-nota">Como os números são contados: tentativas de contato = registros de Sem contato, Contato realizado, Negativa e Demo agendada (ligação, WhatsApp ou e-mail), contados desde que os contatos passaram a ser registrados no sistema (25/11/2026). Contato efetivado = tentativas menos as de Sem contato. Demo agendada conta uma vez por agendamento; reagendar não conta de novo. Demo realizada conta para quem apresentou. Contrato = registro de Contrato fechado. Propostas vêm das etapas do funil SCC (datas anteriores a 26/11/2026 são as do Agendor). As demos de antes da página existir entram como realizadas, sem data de agendamento.</p></div>`
      + (I.drill ? gaveta(painelDrill(M), "in-fechar") : "") + (I.metas ? gaveta(painelMetas(), "in-fechar") : "");
    requestAnimationFrame(animarIndicadores);
    return html;
  }
  const indPapelFuncao = (Q) => (Q.papel === "sdr" ? "sdr" : Q.papel === "pos" ? "pos_vendas" : Q.papel);

  function kpiCard(k, rotulo, v, ant, sub, opts = {}) {
    return `<button type="button" class="in-kpi ${opts.taxa ? "in-taxa" : ""}" data-acao="in-drill" data-tipo="${k}"><span class="in-kpi-top"><span>${rotulo}</span>${variacao(v, ant, opts.inverso)}</span>
      <b class="in-kpi-v num in-conta" data-k="${k}" data-v="${isFinite(v) ? v : ""}" data-taxa="${opts.taxa ? 1 : ""}">${opts.taxa ? fP(v) : fmtN(v)}</b><span class="in-kpi-sub">${sub}</span></button>`;
  }
  function secKpis(M, A) {
    const Q = M.Q, mDem = metaDoPeriodo("demos_agendadas_mes", "demos_agendadas_semana"), mTen = metaDoPeriodo("ligacoes_mes", "ligacoes_semana", "ligacoes_dia"), mCtr = metaDoPeriodo("contratos_mes");
    const comp = (r) => r.realizadas.length + r.naoFeitas.length;
    let cards;
    if (Q.papel === "vendedor" || Q.papel === "gestor") cards = [
      kpiCard("real", "Demos realizadas", M.realizadas.length, A.realizadas.length, comp(M) ? `${fP(pct(M.realizadas.length, comp(M)))} de comparecimento` : "nenhuma demo prevista no período"),
      kpiCard("ag", "Demos marcadas para ele", M.agendadas.length, A.agendadas.length, "agendadas pela SDR no período"),
      kpiCard("prop", "Propostas enviadas", M.propostas.length, A.propostas.length, M.propostas.length ? `${M.propostas.filter((p) => p.situacao === "aberta").length} em aberto · ${M.propostas.filter((p) => p.situacao === "recusada").length} recusada(s)` : "nenhuma no período"),
      kpiCard("ctr", "Contratos fechados", M.contratos.length, A.contratos.length, mCtr != null && Q.papel === "vendedor" ? `meta ${f1(mCtr)} · ${fP(pct(M.contratos.length, mCtr))}` : "contrato registrado na ficha"),
      kpiCard("conv", "Conversão demo → contrato", pct(M.contratos.length, M.realizadas.length), pct(A.contratos.length, A.realizadas.length), "contratos ÷ demos realizadas", { taxa: true }),
    ];
    else {
      cards = [
        kpiCard("tent", "Tentativas de contato", M.tent.length, A.tent.length, `${fmtN(M.lig.length)} por ligação · ${fmtN(M.tent.length - M.lig.length)} WhatsApp/e-mail${mTen != null ? ` · ${fP(pct(M.tent.length, mTen))} da meta` : ""}`),
        kpiCard("cont", "Contatos efetivados", M.cont.length, A.cont.length, `${fP(pct(M.cont.length, M.tent.length))} das tentativas`),
        kpiCard("ag", "Demos agendadas", M.agendadas.length, A.agendadas.length, mDem != null ? `meta ${f1(mDem)} · ${fP(pct(M.agendadas.length, mDem))} atingido` : `${fP(pct(M.agendadas.length, M.tent.length))} das tentativas`),
      ];
      if (Q.papel === "sdr") cards.push(
        kpiCard("real", "Demos que aconteceram", M.realizadas.length, A.realizadas.length, comp(M) ? `${fP(pct(M.realizadas.length, comp(M)))} das que tinham data no período` : "das demos que ela agendou"),
        kpiCard("conv", "Conversão tentativa → demo", pct(M.agendadas.length, M.tent.length), pct(A.agendadas.length, A.tent.length), "demos agendadas ÷ tentativas", { taxa: true }));
      else cards.push(
        kpiCard("real", "Demos realizadas", M.realizadas.length, A.realizadas.length, comp(M) ? `${fP(pct(M.realizadas.length, comp(M)))} de comparecimento` : "nenhuma demo prevista no período"),
        kpiCard("ctr", "Contratos fechados", M.contratos.length, A.contratos.length, M.realizadas.length ? `${fP(pct(M.contratos.length, M.realizadas.length))} das demos realizadas` : "contrato registrado na ficha"));
    }
    return `<section class="in-sec"><div class="in-tit"><h2>Visão geral</h2><span class="t13 fraco in-tela">Clique num número para ver os registros que formam ele</span></div><div class="in-kpis">${cards.join("")}</div></section>`;
  }

  function secMetas(M, P) {
    const Q = M.Q, hj = hojeISO();
    const todos = [
      ["Tentativas de contato", "SDR", M.tent.length, metaDoPeriodo("ligacoes_mes", "ligacoes_semana", "ligacoes_dia"), "sdr"],
      ["Contatos efetivados", "SDR", M.cont.length, metaDoPeriodo("contatos_mes"), "sdr"],
      ["Demos agendadas", "SDR", M.agendadas.length, metaDoPeriodo("demos_agendadas_mes", "demos_agendadas_semana"), "sdr"],
      ["Demos realizadas", "Vendedor", M.realizadas.length, metaDoPeriodo("demos_realizadas_mes"), "vend"],
      ["Contratos fechados", "Vendedor", M.contratos.length, metaDoPeriodo("contratos_mes"), "vend"],
    ];
    if (Q.papel === "gestor") return `<section class="in-sec"><div class="in-tit"><h2>Metas do período</h2></div><div class="cartao bi-cartao"><p class="fraco" style="margin:0">O gestor não tem meta própria. Aqui aparecem só as demos que ele apresentou cobrindo as férias do vendedor: <b>${fmtN(M.realizadas.length)}</b> neste período.</p></div></section>`;
    const lista = todos.filter((t) => Q.todos || (Q.papel === "sdr" ? t[4] === "sdr" : t[4] === "vend"));
    const comMeta = lista.filter((t) => t[3] != null), semMeta = lista.filter((t) => t[3] == null);
    const totU = uteisEntre(P.ini, P.fim), passou = uteisEntre(P.ini, P.corre ? hj : P.fim), resta = P.corre ? Math.max(0, totU - uteisEntre(P.ini, hj)) : 0;
    const esperado = totU ? Math.min(100, (passou / totU) * 100) : 100;
    const selo = (p) => !isFinite(p) ? ["", ""] : p >= 100 ? ["in-ok", "Meta batida"] : p >= esperado - 5 ? ["in-ritmo", "Dentro do esperado"] : p >= esperado - 20 ? ["in-abaixo", "Abaixo do esperado"] : ["in-atencao", "Precisa de atenção"];
    const cards = comMeta.map(([n, papel, r, m]) => {
      const p = pct(r, m), [cl, tx] = selo(p), falta = Math.max(0, m - r), proj = P.corre && passou >= 3 && resta > 0 ? (r / passou) * totU : null;
      return `<div class="cartao in-meta"><div class="in-meta-top"><div><b>${n}</b><span class="t12 fraco">${papel}</span></div><span class="selo ${cl}">${tx}</span></div>
        <div class="in-meta-num"><b class="num">${fmtN(r)}</b> <span class="fraco">de ${f1(m)} · ${fP(p)}</span></div>
        <div class="bi-trilho" title="O traço mostra onde deveria estar hoje"><b style="--w:${Math.min(100, p || 0)}%"></b>${P.corre ? `<i style="left:${esperado}%"></i>` : ""}</div>
        <div class="in-meta-det"><span>Falta <b class="num">${falta ? f1(falta) : "nada"}</b></span><span>Diferença <b class="num">${r - m > 0 ? "+" : ""}${f1(r - m)}</b></span>
        <span>Precisa por dia útil <b class="num">${resta && falta ? f1(falta / resta) : "–"}</b></span><span>Projeção <b class="num">${proj != null ? `${fmtN(proj)} (${fP(pct(proj, m))})` : P.corre ? "pouco histórico" : "período fechado"}</b></span></div></div>`;
    });
    const aviso = semMeta.length ? `<p class="t12 fraco" style="margin:6px 0 0">Sem meta definida para: ${semMeta.map((t) => t[0].toLowerCase()).join(", ")}.${ehGestao() ? ' <button type="button" class="mini in-tela" data-acao="in-metas">Definir metas</button>' : " A gestão define em Metas e parâmetros."}</p>` : "";
    return `<section class="in-sec"><div class="in-tit"><h2>Metas do período</h2><span class="t13 fraco">Definidas pela gestão. O realizado vem do sistema.</span></div>${cards.length ? `<div class="in-metas">${cards.join("")}</div>` : ""}${aviso}</section>`;
  }

  function secFunil(M) {
    const E = indFunil(M); M.funil = E;
    const mx = Math.max(1, E[0]?.n || 0); let pior = -1, piorV = -1;
    for (let i = 1; i < E.length; i++) { if (!E[i - 1].n) continue; const perda = 1 - E[i].n / E[i - 1].n; if (perda > piorV) { piorV = perda; pior = i; } }
    M.piorFunil = pior;
    const linhas = E.map((e, i) => { const conv = i ? pct(e.n, E[i - 1].n) : NaN;
      return `${i ? `<div class="in-f-perda ${i === pior && piorV > 0 ? "in-f-pior" : ""}">${i === pior && piorV > 0 ? "● Maior perda: " : ""}${isFinite(conv) ? `${fP(100 - conv)} não passaram` : ""}</div>` : ""}
      <button type="button" class="in-f-linha" data-acao="in-drill" data-tipo="funil" data-cat="${e.k}"><span class="in-f-nome">${e.l}</span><span class="in-f-barra"><b style="--w:${Math.max(7, Math.sqrt(e.n / mx) * 100)}%">${fmtN(e.n)}</b></span><span class="in-f-conv num">${i ? fP(conv) : ""}</span></button>`; }).join("");
    const nota = M.Q.papel === "sdr" ? "A parte da SDR vai até a demo acontecer; proposta e contrato ficam com o vendedor." : M.Q.papel === "vendedor" || M.Q.papel === "gestor" ? "A parte de quem apresenta começa na demo marcada pela SDR." : "SDR: da abordagem à demo agendada · Vendedor: da demo ao contrato.";
    const res = rosca("res", (() => { const c = { "Sem contato": 0, "Conversou": 0, "Pediu retorno": 0, "Só por e-mail/WhatsApp": 0, "Negativa": 0, "Demo agendada": 0 };
      for (const r of M.tent) { const k = r.tipo === "sem_contato" ? "Sem contato" : r.tipo === "negativa" ? "Negativa" : r.tipo === "demo_agendada" ? "Demo agendada" : r.detalhe === "pediu_retorno" ? "Pediu retorno" : r.detalhe === "material_enviado" ? "Só por e-mail/WhatsApp" : "Conversou"; c[k]++; }
      return [["Conversou", c["Conversou"], "#087CF0"], ["Demo agendada", c["Demo agendada"], "#39C8FF"], ["Pediu retorno", c["Pediu retorno"], "#5B7FBF"], ["Só por e-mail/WhatsApp", c["Só por e-mail/WhatsApp"], "#2FA6A0"], ["Negativa", c["Negativa"], "#0D2854"], ["Sem contato", c["Sem contato"], "#C9D2E3"]]; })(),
      "tentativas", M.Q.papel === "vendedor" || M.Q.papel === "gestor" ? "Contatos de prospecção são da SDR." : "Nenhuma tentativa de contato registrada neste período.");
    return `<section class="in-sec in-duas"><div class="cartao bi-cartao"><h3>Funil comercial</h3><p class="in-leg">Cada administradora conta uma vez, em todas as etapas que já alcançou. Em vermelho, onde mais se perde.</p><div class="in-funil">${linhas}</div><p class="t12 fraco" style="margin:8px 0 0">${nota}</p></div>
      <div class="cartao bi-cartao"><h3>Resultado dos contatos</h3><p class="in-leg">O que aconteceu em cada tentativa do período</p>${res}</div></section>`;
  }

  function secGraficos(M, A, P) {
    const I = S.ind, Q = M.Q, vend = Q.papel === "vendedor" || Q.papel === "gestor";
    const S1 = indSerie(M), titPasso = { dia: "dia a dia", semana: "semana a semana", mes: "mês a mês" }[S1.passo];
    let chaves, nomes, cores, taxa = false;
    if (vend) { chaves = ["real", "ctr"]; nomes = ["Demos realizadas", "Contratos"]; cores = ["#087CF0", "#0D2854"]; }
    else if (I.graf === "taxa") { chaves = ["tc", "ta"]; nomes = ["Contato efetivo", "Tentativa → demo"]; cores = ["#087CF0", "#0D2854"]; taxa = true; }
    else { chaves = ["tent", "cont"]; nomes = ["Tentativas", "Contatos efetivados"]; cores = ["#087CF0", "#39C8FF"]; }
    const linha = `<div class="cartao bi-cartao"><div class="in-cab-g"><div><h3>Evolução ${titPasso}</h3><p class="in-leg">${esc(P.nome)}</p></div>${vend ? "" : `<div class="abas in-tela" role="tablist"><button type="button" class="aba" data-acao="in-graf" data-v="vol" aria-selected="${I.graf !== "taxa"}">Volume</button><button type="button" class="aba" data-acao="in-graf" data-v="taxa" aria-selected="${I.graf === "taxa"}">Taxas</button></div>`}</div>
      <div class="in-mini-leg">${nomes.map((n, i) => `<span style="--c:${cores[i]}">${n}</span>`).join("")}</div>${svgLinha(S1.pontos, chaves, nomes, cores, taxa)}</div>`;
    // barras: cada pedaço do período com o mesmo pedaço do período anterior
    const opcoes = vend ? [["real", "Demos realizadas"], ["ctr", "Contratos"]] : [["tent", "Tentativas"], ["cont", "Contatos"], ["ag", "Demos agendadas"], ["real", "Demos realizadas"], ["ctr", "Contratos"]];
    if (!opcoes.some((o) => o[0] === I.bar)) I.bar = opcoes[0][0];
    const S2 = indSerie(A), itens = S1.pontos.map((p, i) => [p.r, p[I.bar], S2.pontos[i]?.[I.bar] || 0]);
    const barras = `<div class="cartao bi-cartao"><div class="in-cab-g"><div><h3>Comparação com o período anterior</h3><p class="in-leg">${titPasso[0].toUpperCase() + titPasso.slice(1)} · ${opcoes.find((o) => o[0] === I.bar)[1].toLowerCase()}</p></div></div>
      <div class="in-chips in-tela">${opcoes.map(([k, l]) => `<button type="button" class="aba" data-acao="in-bar" data-v="${k}" aria-selected="${I.bar === k}">${l}</button>`).join("")}</div>
      <div class="in-mini-leg"><span style="--c:#087CF0">Período escolhido</span><span style="--c:#B9C6DC">Período anterior</span></div>${svgBarras(itens)}</div>`;
    // roscas
    const D = S.ind.d, sit = {}; for (const d of M.agendadas) { const s = situacaoDemo(D, d); sit[s] = (sit[s] || 0) + 1; }
    const situacao = rosca("sit", [["Realizada", sit["Realizada"] || 0, "#087CF0"], ["Ainda vai acontecer", sit["Ainda vai acontecer"] || 0, "#39C8FF"], ["Aguardando resultado", sit["Aguardando resultado"] || 0, "#B98A2E"], ["Não aconteceu", sit["Não aconteceu"] || 0, "#C2473D"]], "demos", "Nenhuma demo agendada neste período.");
    const props = rosca("prop", [["Em aberto", M.propostas.filter((p) => p.situacao === "aberta").length, "#E8A13A"], ["Virou contrato", M.propostas.filter((p) => p.situacao === "contrato").length, "#1E9E5A"], ["Recusada", M.propostas.filter((p) => p.situacao === "recusada").length, "#C2473D"]], "propostas", Q.papel === "sdr" ? "Propostas são do vendedor, não da SDR." : "Nenhuma proposta enviada neste período.");
    const sis = {}; for (const id of new Set(M.tent.map((r) => r.ficha_id))) { const s = D.fichaPorId.get(id)?.sistema || "Não informado"; sis[s] = (sis[s] || 0) + 1; }
    const sisOrd = Object.entries(sis).sort((a, b) => (a[0] === "Não informado") - (b[0] === "Não informado") || b[1] - a[1]);
    const topo = sisOrd.slice(0, 7), resto = sisOrd.slice(7).reduce((s, x) => s + x[1], 0);
    const sistemas = rosca("sis", topo.map(([n, v], i) => [n, v, n === "Não informado" ? "#DCE2EC" : IND_CORES[i % IND_CORES.length]]).concat(resto ? [["Outros", resto, "#9AA6BD"]] : []), "empresas", vend ? "Prospecção é da SDR." : "Nenhuma empresa abordada neste período.");
    return `<section class="in-sec in-duas">${linha}${barras}</section>
      <section class="in-sec in-tres"><div class="cartao bi-cartao"><h3>Situação das demos agendadas</h3><p class="in-leg">O que aconteceu com as demos marcadas no período${M.reag.length ? ` · ${M.reag.length} reagendamento(s), sem contar de novo` : ""}</p>${situacao}</div>
      <div class="cartao bi-cartao"><h3>Propostas enviadas</h3><p class="in-leg">Situação hoje das propostas enviadas no período</p>${props}</div>
      <div class="cartao bi-cartao"><h3>Sistemas das empresas abordadas</h3><p class="in-leg">Do campo “Sistema usado” da ficha</p>${sistemas}</div></section>`;
  }

  // cada um na sua parte: meta × realizado de cada função
  function secPartes(M, P) {
    const D = S.ind.d, Q = M.Q, blocos = [];
    const barra = (rot, r, m, cor) => { const mx = Math.max(r, m || 0, 1) * 1.1; return `<div class="in-bh"><div class="in-bh-top"><span>${rot}</span><span class="num">${fmtN(r)}${m != null ? ` de ${f1(m)} · <b>${fP(pct(r, m))}</b>` : ""}</span></div><div class="in-bh-t"><b style="--w:${(r / mx) * 100}%;background:${cor}"></b>${m != null ? `<i style="left:${(m / mx) * 100}%"></i>` : ""}</div></div>`; };
    for (const p of D.pessoas) {
      if (!Q.todos && p.k !== S.ind.resp) continue;
      const salva = S.ind.resp; S.ind.resp = p.k; const R = indCalcular(P.ini, P.fim, P.ate); S.ind.resp = salva;
      const f = p.funcao;
      if (f === "sdr") blocos.push(`<div class="in-pessoa"><b>${esc(p.curto)}</b> <span class="t12 fraco">SDR · prospecta e agenda</span></div>` + barra("Tentativas de contato", R.tent.length, metaDoPeriodo("ligacoes_mes", "ligacoes_semana", "ligacoes_dia"), "#087CF0") + barra("Demos agendadas", R.agendadas.length, metaDoPeriodo("demos_agendadas_mes", "demos_agendadas_semana"), "#39C8FF"));
      else if (f === "vendedor") blocos.push(`<div class="in-pessoa"><b>${esc(p.curto)}</b> <span class="t12 fraco">Vendedor · apresenta e fecha</span></div>` + barra("Demos realizadas", R.realizadas.length, metaDoPeriodo("demos_realizadas_mes"), "#0D2854") + barra("Contratos", R.contratos.length, metaDoPeriodo("contratos_mes"), "#1E9E5A"));
      else if (f === "gestor" && (R.realizadas.length || !Q.todos)) blocos.push(`<div class="in-pessoa"><b>${esc(p.curto)}</b> <span class="t12 fraco">Gestor · apresentou cobrindo férias</span></div>` + barra("Demos apresentadas", R.realizadas.length, null, "#5B7FBF"));
    }
    // eficiência: fórmulas abertas
    const D2 = S.ind.d, tempos = M.agendadas.map((d) => { const p = D2.primeiroContato.get(d.ficha_id); return p && d.agDia >= p ? (isoData(d.agDia) - isoData(p)) / 864e5 : null; }).filter((x) => x != null);
    const fech = M.contratos.map((r) => { const d = D2.ultimaRealizada.get(r.ficha_id); return d && r.data >= d.realizada_em ? (isoData(r.data) - isoData(d.realizada_em)) / 864e5 : null; }).filter((x) => x != null);
    const media = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
    const vend = Q.papel === "vendedor" || Q.papel === "gestor";
    const linhas = (vend ? [] : [
      ["Tentativas por demo agendada", M.agendadas.length ? f1(M.tent.length / M.agendadas.length) : "–", "tentativas ÷ demos agendadas"],
      ["Contatos por demo agendada", M.agendadas.length ? f1(M.cont.length / M.agendadas.length) : "–", "contatos efetivados ÷ demos agendadas"],
      ["Tempo médio 1º contato → agendamento", isFinite(media(tempos)) ? `${f1(media(tempos))} dias` : "–", "data do agendamento − data do 1º contato registrado"],
    ]).concat(Q.papel === "sdr" ? [] : [
      ["Taxa de comparecimento", fP(pct(M.realizadas.length, M.realizadas.length + M.naoFeitas.length)), "realizadas ÷ (realizadas + não aconteceram)"],
      ["Propostas em aberto", fP(pct(M.propostas.filter((p) => p.situacao === "aberta").length, M.propostas.length)), "em aberto ÷ propostas enviadas"],
      ["Taxa de perda comercial", fP(pct(M.naoFeitas.length + M.propostas.filter((p) => p.situacao === "recusada").length, M.agendadas.length + M.realizadas.length ? Math.max(M.agendadas.length, M.realizadas.length) : 0)), "(demos que não aconteceram + propostas recusadas) ÷ demos"],
      ["Tempo médio demo → fechamento", isFinite(media(fech)) ? `${Math.round(media(fech))} dias` : "sem contratos", "data do contrato − data da demo realizada"],
    ]);
    return `<section class="in-sec in-duas"><div class="cartao bi-cartao"><h3>Cada um na sua parte</h3><p class="in-leg">Meta × realizado de cada função · o traço escuro é a meta</p><div class="in-partes">${blocos.join('<hr class="in-sep">') || '<p class="fraco t13">Sem dados.</p>'}</div></div>
      <div class="cartao bi-cartao"><h3>Indicadores de eficiência</h3><p class="in-leg">Fórmulas abertas, para qualquer um conferir</p><table class="in-efic"><tbody>${linhas.map(([n, v, f]) => `<tr><td>${n}<span>${f}</span></td><td class="num">${v}</td></tr>`).join("")}</tbody></table></div></section>`;
  }

  // análise: só frases que os números sustentam, sempre com o número
  function secAnalise(M, A, P) {
    const pos = [], att = [], gar = [], mel = [], proj = [], Q = M.Q, hj = hojeISO();
    const varr = (a, b) => (b ? ((a - b) / b) * 100 : NaN), cmp = `${ddmm(P.cmpIni)}${P.cmpIni !== P.cmpFim ? "–" + ddmm(P.cmpFim) : ""}`;
    const vend = Q.papel === "vendedor" || Q.papel === "gestor";
    if (!vend) {
      const v = varr(M.tent.length, A.tent.length); if (isFinite(v) && Math.abs(v) >= 5 && A.tent.length >= 10) (v > 0 ? pos : att).push(`Tentativas de contato ${v > 0 ? "subiram" : "caíram"} <b>${fP(Math.abs(v))}</b> em relação a ${cmp} (${fmtN(A.tent.length)} → ${fmtN(M.tent.length)}).`);
      const ta = pct(M.agendadas.length, M.tent.length), tp = pct(A.agendadas.length, A.tent.length);
      if (isFinite(ta) && isFinite(tp) && M.tent.length >= 20 && A.tent.length >= 20 && Math.abs(ta - tp) >= 0.3) { if (ta < tp && M.tent.length > A.tent.length) att.push(`A conversão tentativa → demo caiu de <b>${fP(tp)}</b> para <b>${fP(ta)}</b>, apesar de mais tentativas.`); else (ta > tp ? pos : att).push(`Conversão tentativa → demo ${ta > tp ? "melhorou" : "piorou"}: <b>${fP(tp)}</b> → <b>${fP(ta)}</b>.`); }
      const tc = pct(M.cont.length, M.tent.length); if (M.tent.length >= 20 && tc < 30) mel.push(`Só <b>${fP(tc)}</b> das tentativas viraram conversa. Vale testar outros horários e canais (WhatsApp, e-mail).`);
    }
    if (M.funil && M.piorFunil > 0) { const e = M.funil, i = M.piorFunil; if (e[i - 1].n >= 3) gar.push(`Maior perda entre <b>${e[i - 1].l.toLowerCase()}</b> e <b>${e[i].l.toLowerCase()}</b>: só <b>${fP(pct(e[i].n, e[i - 1].n))}</b> avançam (${fmtN(e[i].n)} de ${fmtN(e[i - 1].n)}).`); }
    if (M.semResultado.length) att.push(`<b>${M.semResultado.length}</b> demo(s) já passaram da data e ainda não têm resultado registrado.`);
    if (M.naoFeitas.length >= 2) { gar.push(`<b>${M.naoFeitas.length}</b> demo(s) marcadas não aconteceram no período.`); mel.push("Confirmar as demos por WhatsApp na véspera ajuda a reduzir as que não acontecem."); }
    if (!Q.todos ? false : M.agendadas.length) { const fe = M.agendadas.filter((d) => situacaoDemo(S.ind.d, d) === "Realizada").length; const dec = M.agendadas.filter((d) => ["Realizada", "Não aconteceu"].includes(situacaoDemo(S.ind.d, d))).length; if (dec >= 2) (pct(fe, dec) >= 80 ? pos : att).push(`Das demos agendadas no período que já tinham data, <b>${fe} de ${dec}</b> (${fP(pct(fe, dec))}) foram realizadas.`); }
    const abertas = M.propostas.filter((p) => p.situacao === "aberta").length; if (Q.papel !== "sdr" && M.propostas.length >= 3 && pct(abertas, M.propostas.length) >= 50) { att.push(`<b>${abertas}</b> de ${M.propostas.length} propostas enviadas no período (${fP(pct(abertas, M.propostas.length))}) ainda estão em aberto.`); mel.push(`Fazer follow-up das <b>${abertas}</b> propostas em aberto.`); }
    if (Q.todos) { const mat = M.realizadas.filter((d) => primeiroNome(d.apresentador).toLowerCase() === "matheus").length; if (mat) pos.push(`O Matheus apresentou <b>${mat}</b> demo(s) cobrindo as férias do Leonardo.`); }
    // projeções: só no período em andamento e com pelo menos 3 dias úteis de histórico
    const totU = uteisEntre(P.ini, P.fim), passou = uteisEntre(P.ini, hj);
    if (P.corre && passou >= 3 && passou < totU) {
      const lin = (rot, r, m) => { if (m == null) return; const pj = (r / passou) * totU; proj.push(`${rot}: mantido o ritmo (${f1(r / passou)} por dia útil), o período fecha com <b>${fmtN(pj)}</b>, <b>${fP(pct(pj, m))}</b> da meta de ${f1(m)}.`); if (pj < m) att.push(`${rot} abaixo do ritmo da meta: faltam <b>${f1(m - r)}</b> em ${totU - passou} dia(s) útil(eis).`); };
      if (!vend) { lin("Tentativas de contato", M.tent.length, metaDoPeriodo("ligacoes_mes", "ligacoes_semana", "ligacoes_dia")); lin("Demos agendadas", M.agendadas.length, metaDoPeriodo("demos_agendadas_mes", "demos_agendadas_semana")); }
      if (Q.papel !== "sdr") lin("Contratos", M.contratos.length, metaDoPeriodo("contratos_mes"));
    }
    const B = [["Destaques positivos", "#1E9E5A", pos], ["Pontos de atenção", "#E8A13A", att], ["Gargalos comerciais", "#C2473D", gar], ["Oportunidades de melhoria", "#087CF0", mel], ["Projeções", "#0D2854", proj]];
    return `<section class="in-sec"><div class="in-tit"><h2>Análise de Performance Comercial</h2><span class="t13 fraco">Só aparece o que os números sustentam</span></div><div class="in-analise">${B.map(([t, c, l]) => `<div class="cartao in-an"><h3><i style="background:${c}"></i>${t}</h3>${l.length ? `<ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>` : '<p class="fraco t13">Nada que os números sustentem neste período.</p>'}</div>`).join("")}</div></section>`;
  }

  function linhasPorResp(P) {
    const D = S.ind.d, Q = indQuem(), out = [];
    for (const p of D.pessoas) {
      if (!Q.todos && p.k !== S.ind.resp) continue;
      const salva = S.ind.resp; S.ind.resp = p.k; const R = indCalcular(P.ini, P.fim, P.ate); S.ind.resp = salva;
      const sdr = p.funcao === "sdr";
      if (!sdr && !R.realizadas.length && !R.contratos.length && !R.propostas.length && p.funcao !== "vendedor") continue;
      out.push({ nome: p.curto, funcao: rotuloFuncao(p.funcao), tent: sdr ? R.tent.length : null, cont: sdr ? R.cont.length : null, ag: R.agendadas.length, agRot: sdr ? "" : "marcadas para ele", real: R.realizadas.length, prop: sdr ? null : R.propostas.length, ctr: sdr ? null : R.contratos.length });
    }
    return out;
  }
  function linhasDemos(M) {
    const D = S.ind.d, ids = new Set([...M.agendadas.map((d) => d.id), ...M.realizadas.map((d) => d.id), ...M.previstas.map((d) => d.id)]);
    return [...ids].map((id) => D.demoPorId.get(id)).filter(Boolean).sort((a, b) => ((b.dia || "") < (a.dia || "") ? -1 : 1));
  }
  function secTabelas(M, P) {
    const I = S.ind, D = I.d, abas = [["resp", "Por responsável"], ["sem", "Por semana"], ["demos", "Demonstrações"]];
    const c = (v) => `<td class="num">${v == null ? "–" : fmtN(v)}</td>`;
    const tResp = () => { const L = linhasPorResp(P); return `<table class="tab-simples in-tab"><thead><tr><th>Responsável</th><th>Função</th><th class="num">Tentativas</th><th class="num">Contatos</th><th class="num">Demos agendadas</th><th class="num">Demos realizadas</th><th class="num">Propostas</th><th class="num">Contratos</th></tr></thead><tbody>${L.map((l) => `<tr><td><b>${esc(l.nome)}</b></td><td>${esc(l.funcao)}</td>${c(l.tent)}${c(l.cont)}<td class="num">${fmtN(l.ag)}${l.agRot ? ` <span class="t11 fraco">${l.agRot}</span>` : ""}</td>${c(l.real)}${c(l.prop)}${c(l.ctr)}</tr>`).join("")}</tbody></table>`; };
    const tSem = () => { const S1 = indSerie(M); return `<table class="tab-simples in-tab"><thead><tr><th>${{ dia: "Dia", semana: "Semana de", mes: "Mês" }[S1.passo]}</th><th class="num">Tentativas</th><th class="num">Contatos</th><th class="num">Demos agendadas</th><th class="num">Demos realizadas</th><th class="num">Contratos</th></tr></thead><tbody>${S1.pontos.map((p) => `<tr><td>${esc(S1.passo === "mes" ? MESES[+p.d.slice(5, 7) - 1] + " " + p.d.slice(0, 4) : ddmmaaaa(p.d))}</td>${c(p.tent)}${c(p.cont)}${c(p.ag)}${c(p.real)}${c(p.ctr)}</tr>`).join("")}</tbody></table>`; };
    const tDemos = () => { const L = linhasDemos(M); if (!L.length) return '<p class="fraco t13" style="padding:12px 0">Nenhuma demonstração neste período.</p>';
      const pode = (d) => S.perfil?.papel === "admin" || D.fichaPorId.get(d.ficha_id)?.usuario_id === S.user.id;
      return `<table class="tab-simples in-tab"><thead><tr><th>Administradora</th><th>Sistema</th><th>Agendada</th><th>Demo</th><th>Apresenta</th><th>Situação</th></tr></thead><tbody>${L.map((d) => { const f = D.fichaPorId.get(d.ficha_id) || {}; const hj = hojeISO(); const st = d.status === "realizada" ? ["s-conf", "Realizada"] : d.status === "nao_realizada" ? ["s-errado", "Não aconteceu"] : d.status === "reagendada" ? ["s-nao", "Reagendada"] : d.dia && d.dia < hj ? ["s-nao", "Aguardando resultado"] : ["s-roxo", "Agendada"];
        const ant = d.reagendada_de ? D.demoPorId.get(d.reagendada_de) : null;
        return `<tr><td><b>${esc(f.nome || "")}</b><br><span class="t12 fraco">${esc([f.cidade, f.uf].filter(Boolean).join(" - "))}</span></td><td>${esc(f.sistema || "—")}</td><td>${d.agDia ? ddmmaaaa(d.agDia) : '<span class="fraco">antes do sistema</span>'}${d.agendada_por ? ` <span class="t12 fraco">· ${esc(primeiroNome(D.pessoas.find((p) => p.id === d.agendada_por)?.nome))}</span>` : ""}</td>
          <td>${d.status === "realizada" ? ddmmaaaa(d.realizada_em) : d.dia ? ddmmaaaa(d.dia) : "—"}${ant ? ` <span class="t12 fraco">(era ${ant.dia ? ddmm(ant.dia) : "—"})</span>` : ""}</td>
          <td>${pode(d) && d.status !== "reagendada" ? `<select class="input in-apres" data-id="${d.id}" aria-label="Quem apresenta">${[...new Set(["Leonardo", "Matheus", d.apresentador])].map((n) => `<option ${n === d.apresentador ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>` : esc(d.apresentador)}</td>
          <td><span class="selo ${st[0]}">${st[1]}</span>${pode(d) && d.status === "agendada" && d.dia && d.dia < hj ? `<div class="linha-flex in-tela" style="margin-top:6px"><button type="button" class="mini mini-erro" data-acao="in-naofeita" data-id="${d.id}">Não aconteceu</button><button type="button" class="mini" data-acao="in-ficha" data-id="${d.ficha_id}">Registrar realizada na ficha</button></div>` : ""}</td></tr>`; }).join("")}</tbody></table>`; };
    const bloco = (k) => (k === "resp" ? tResp() : k === "sem" ? tSem() : tDemos());
    return `<section class="in-sec"><div class="cartao bi-cartao"><div class="in-cab-g"><div><h3>Detalhamento</h3><p class="in-leg">Mesmo período e responsável de toda a página</p></div><div class="abas in-tela" role="tablist">${abas.map(([k, l]) => `<button type="button" class="aba" role="tab" data-acao="in-tab" data-v="${k}" aria-selected="${I.tab === k}">${l}</button>`).join("")}</div></div>
      <div class="rolagem in-tela">${bloco(I.tab)}</div>${abas.map(([k, l]) => `<div class="in-so-print"><h3>${l}</h3>${bloco(k)}</div>`).join("")}</div></section>`;
  }

  // o detalhe de um número: os registros que formam ele
  function painelDrill(M) {
    const D = S.ind.d, { tipo, cat } = S.ind.drill, fichaLinha = (id, extra) => { const f = D.fichaPorId.get(id) || {}; return `<button type="button" class="in-reg" data-acao="in-ficha" data-id="${esc(id)}"><span><b>${esc(f.nome || "Administradora")}</b><span class="t12 fraco">${esc([f.cidade, f.uf].filter(Boolean).join(" - "))}${f.sistema ? " · " + esc(f.sistema) : ""}</span></span><span class="t12 fraco">${extra || ""}</span></button>`; };
    const rotTipo = { sem_contato: "Sem contato", conversou: "Conversou", negativa: "Negativa", demo_agendada: "Demo agendada" };
    let titulo = "", itens = [];
    const regsLista = (rs) => rs.sort((a, b) => (a.data < b.data ? 1 : -1)).map((r) => fichaLinha(r.ficha_id, `${ddmm(r.data)} · ${rotTipo[r.tipo] || r.tipo}${r.canal !== "ligacao" ? ` · ${r.canal === "whatsapp" ? "WhatsApp" : "e-mail"}` : ""}`));
    const demosLista = (ds) => ds.map((d) => fichaLinha(d.ficha_id, `${d.status === "realizada" ? "realizada " + ddmm(d.realizada_em) : d.dia ? "demo " + ddmm(d.dia) : ""}${d.agDia ? ` · agendada ${ddmm(d.agDia)}` : ""} · ${esc(d.apresentador)}`));
    if (tipo === "tent") { titulo = "Tentativas de contato"; itens = regsLista([...M.tent]); }
    else if (tipo === "cont") { titulo = "Contatos efetivados"; itens = regsLista([...M.cont]); }
    else if (tipo === "ag") { titulo = "Demos agendadas"; itens = demosLista(M.agendadas); }
    else if (tipo === "real") { titulo = "Demos realizadas"; itens = demosLista(M.realizadas); }
    else if (tipo === "ctr" || tipo === "conv" && (M.Q.papel === "vendedor" || M.Q.papel === "gestor")) { titulo = "Contratos fechados"; itens = M.contratos.map((r) => fichaLinha(r.ficha_id, `contrato ${ddmm(r.data)}`)); }
    else if (tipo === "conv") { titulo = "Demos agendadas no período"; itens = demosLista(M.agendadas); }
    else if (tipo === "prop") { const m = { "Em aberto": "aberta", "Virou contrato": "contrato", "Recusada": "recusada" }[cat]; titulo = cat ? `Propostas: ${cat.toLowerCase()}` : "Propostas enviadas"; itens = M.propostas.filter((p) => !m || p.situacao === m).map((p) => fichaLinha(p.ficha_id, `enviada ${ddmm(p.enviada)}`)); }
    else if (tipo === "sit") { titulo = `Demos agendadas: ${String(cat).toLowerCase()}`; itens = demosLista(M.agendadas.filter((d) => situacaoDemo(D, d) === cat)); }
    else if (tipo === "res") { titulo = `Contatos: ${String(cat).toLowerCase()}`; const k = (r) => r.tipo === "sem_contato" ? "Sem contato" : r.tipo === "negativa" ? "Negativa" : r.tipo === "demo_agendada" ? "Demo agendada" : r.detalhe === "pediu_retorno" ? "Pediu retorno" : r.detalhe === "material_enviado" ? "Só por e-mail/WhatsApp" : "Conversou"; itens = regsLista(M.tent.filter((r) => k(r) === cat)); }
    else if (tipo === "sis") { titulo = `Empresas abordadas que usam ${cat}`; const ids = [...new Set(M.tent.map((r) => r.ficha_id))].filter((id) => { const s = D.fichaPorId.get(id)?.sistema || "Não informado"; return cat === "Outros" ? true : s === cat; }); itens = ids.map((id) => fichaLinha(id, "")); }
    else if (tipo === "funil") { const e = (M.funil || []).find((x) => x.k === cat); titulo = e ? `Funil: ${e.l.toLowerCase()}` : "Funil"; itens = (e?.ids || []).map((id) => fichaLinha(id, "")); }
    return `<aside class="cartao painel in-drill" aria-label="${esc(titulo)}"><button type="button" class="mini fechar-painel" data-acao="in-fechar">Fechar ✕</button>
      <div class="pilha" style="gap:2px"><h2>${esc(titulo)}</h2><span class="t13 fraco">${esc(indPeriodo().nome)} · ${itens.length} registro(s) · clique para abrir a ficha</span></div>
      <div class="in-regs">${itens.join("") || '<p class="fraco">Nenhum registro.</p>'}</div></aside>`;
  }
  function painelMetas() {
    const M = S.ind.d?.metas || {};
    return `<aside class="cartao painel in-drill" aria-label="Metas e parâmetros"><button type="button" class="mini fechar-painel" data-acao="in-fechar">Fechar ✕</button>
      <div class="pilha" style="gap:2px"><h2>Metas e parâmetros</h2><span class="t13 fraco">Só a gestão muda. Deixe em branco o que não tem meta: nada é inventado. O realizado continua vindo sozinho do sistema.</span></div>
      <form data-acao="in-metas-salvar" class="in-form-metas">${IND_METAS.map(([k, l, papel]) => `<div class="campo"><label for="mt-${k}">${l} <span class="fraco">· ${papel}</span></label><input id="mt-${k}" name="${k}" type="number" min="0" step="any" class="input" value="${M[k] ?? ""}"></div>`).join("")}
      <div class="linha-flex" style="grid-column:1/-1"><button type="submit" class="btn btn-primario" ${S.ind.salvando ? "disabled" : ""}>Salvar metas</button><button type="button" class="btn btn-sec" data-acao="in-fechar">Cancelar</button></div></form></aside>`;
  }

  // números contando até o valor novo; um brilho rápido quando um número mudou desde a última vez
  const IND_ULT = new Map();
  function animarIndicadores() {
    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const el of app.querySelectorAll(".in-conta:not([data-feito])")) {
      el.dataset.feito = "1"; const k = el.dataset.k + "|" + S.ind.per + "|" + S.ind.resp, para = el.dataset.v === "" ? NaN : +el.dataset.v, taxa = !!el.dataset.taxa;
      const de = IND_ULT.has(k) ? IND_ULT.get(k) : 0; IND_ULT.set(k, para);
      const fmt = (v) => (taxa ? fP(v) : fmtN(Math.round(v)));
      if (IND_ULT.has(k) && de !== para && isFinite(de) && de !== 0) el.closest(".in-kpi")?.classList.add("in-mudou");
      if (reduz || !isFinite(para) || de === para) { el.textContent = fmt(para); continue; }
      const t0 = performance.now(), dur = 700, passo = (t) => { const x = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - x, 3); el.textContent = fmt(de + (para - de) * e); if (x < 1) requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
    }
  }

  // Excel: as mesmas tabelas da página, do período e responsável escolhidos
  let xlsxCarregando = null;
  function carregarXlsx() {
    if (window.XLSX) return Promise.resolve();
    if (!xlsxCarregando) xlsxCarregando = new Promise((ok, erro) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload = ok; s.onerror = () => { xlsxCarregando = null; erro(new Error("xlsx")); }; document.head.appendChild(s); });
    return xlsxCarregando;
  }
  async function baixarExcelInd() {
    try { await carregarXlsx(); } catch { toast("Não deu para preparar o Excel agora. Tente de novo."); return; }
    const P = indPeriodo(), M = indCalcular(P.ini, P.fim, P.ate), A = indCalcular(P.cmpIni, P.cmpFim, P.cmpFim), D = S.ind.d, Q = M.Q;
    const quem = Q.todos ? "Toda a equipe" : Q.curto, gerado = `${ddmmaaaa(hojeISO())} ${localSP(new Date().toISOString()).slice(11, 16)}`;
    const resumo = [["Indicadores Comerciais"], ["Período", P.nome, `${ddmmaaaa(P.ini)} a ${ddmmaaaa(P.fim)}`], ["Responsável", quem], ["Comparado com", `${ddmmaaaa(P.cmpIni)} a ${ddmmaaaa(P.cmpFim)}`], ["Gerado em", gerado, S.perfil?.nome || ""], [],
      ["Indicador", "Período", "Período anterior", "Meta", "% da meta"],
      ...[["Tentativas de contato", M.tent.length, A.tent.length, metaDoPeriodo("ligacoes_mes", "ligacoes_semana", "ligacoes_dia")], ["Contatos efetivados", M.cont.length, A.cont.length, metaDoPeriodo("contatos_mes")], ["Demos agendadas", M.agendadas.length, A.agendadas.length, metaDoPeriodo("demos_agendadas_mes", "demos_agendadas_semana")], ["Reagendamentos", M.reag.length, A.reag.length, null], ["Demos realizadas", M.realizadas.length, A.realizadas.length, metaDoPeriodo("demos_realizadas_mes")], ["Demos que não aconteceram", M.naoFeitas.length, A.naoFeitas.length, null], ["Propostas enviadas", M.propostas.length, A.propostas.length, null], ["Contratos fechados", M.contratos.length, A.contratos.length, metaDoPeriodo("contratos_mes")]]
        .map(([n, a, b, m]) => [n, a, b, m ?? "", m ? Math.round((a / m) * 1000) / 10 : ""]),
      [], ["Taxa", "Período (%)", "Período anterior (%)", "Fórmula"],
      ...[["Contato efetivo", pct(M.cont.length, M.tent.length), pct(A.cont.length, A.tent.length), "contatos ÷ tentativas"], ["Tentativa → demo", pct(M.agendadas.length, M.tent.length), pct(A.agendadas.length, A.tent.length), "demos agendadas ÷ tentativas"], ["Comparecimento", pct(M.realizadas.length, M.realizadas.length + M.naoFeitas.length), pct(A.realizadas.length, A.realizadas.length + A.naoFeitas.length), "realizadas ÷ (realizadas + não aconteceram)"], ["Demo → contrato", pct(M.contratos.length, M.realizadas.length), pct(A.contratos.length, A.realizadas.length), "contratos ÷ demos realizadas"]]
        .map(([n, a, b, f]) => [n, isFinite(a) ? Math.round(a * 10) / 10 : "", isFinite(b) ? Math.round(b * 10) / 10 : "", f])];
    const funil = [["Etapa", "Empresas", "% da etapa anterior"], ...indFunil(M).map((e, i, E) => [e.l, e.n, i && E[i - 1].n ? Math.round((e.n / E[i - 1].n) * 1000) / 10 : ""])];
    const resp = [["Responsável", "Função", "Tentativas", "Contatos", "Demos agendadas", "Demos realizadas", "Propostas", "Contratos"], ...linhasPorResp(P).map((l) => [l.nome, l.funcao, l.tent ?? "", l.cont ?? "", l.ag, l.real, l.prop ?? "", l.ctr ?? ""])];
    const S1 = indSerie(M), serie = [[{ dia: "Dia", semana: "Semana de", mes: "Mês" }[S1.passo], "Tentativas", "Contatos", "Demos agendadas", "Demos realizadas", "Contratos"], ...S1.pontos.map((p) => [ddmmaaaa(p.d), p.tent, p.cont, p.ag, p.real, p.ctr])];
    const demos = [["Administradora", "Cidade", "Sistema", "Agendada em", "Agendada por", "Data da demo", "Realizada em", "Apresenta", "Situação"], ...linhasDemos(M).map((d) => { const f = D.fichaPorId.get(d.ficha_id) || {}; return [f.nome || "", [f.cidade, f.uf].filter(Boolean).join(" - "), f.sistema || "", d.agDia ? ddmmaaaa(d.agDia) : "antes do sistema", primeiroNome(D.pessoas.find((p) => p.id === d.agendada_por)?.nome), d.dia ? ddmmaaaa(d.dia) : "", d.realizada_em ? ddmmaaaa(d.realizada_em) : "", d.apresentador, { realizada: "Realizada", nao_realizada: "Não aconteceu", reagendada: "Reagendada", agendada: d.dia && d.dia < hojeISO() ? "Aguardando resultado" : "Agendada" }[d.status]]; })];
    const wb = XLSX.utils.book_new();
    for (const [nome, dados, larg] of [["Resumo", resumo, [30, 16, 22, 30, 12]], ["Funil", funil, [30, 12, 20]], ["Por responsável", resp, [16, 14, 12, 12, 16, 16, 12, 12]], ["Evolução", serie, [14, 12, 12, 16, 16, 12]], ["Demonstrações", demos, [34, 22, 20, 14, 14, 14, 14, 12, 20]]]) {
      const ws = XLSX.utils.aoa_to_sheet(dados); ws["!cols"] = larg.map((w) => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, nome);
    }
    XLSX.writeFile(wb, `Indicadores Comerciais - ${P.nome.replace(/\//g, "-")} - ${quem}.xlsx`);
  }
  function baixarPdfInd() {
    const P = indPeriodo(), Q = indQuem(), antes = document.title;
    document.title = `Indicadores Comerciais - ${P.nome.replace(/\//g, "-")} - ${Q.todos ? "Equipe" : Q.curto}`;
    document.body.classList.add("imprimindo-ind");
    const volta = () => { document.title = antes; document.body.classList.remove("imprimindo-ind"); window.removeEventListener("afterprint", volta); };
    window.addEventListener("afterprint", volta);
    setTimeout(() => window.print(), 60);
  }
  async function salvarMetas(form) {
    const I = S.ind; if (I.salvando) return; I.salvando = true;
    const fd = new FormData(form), linhas = [], apagar = [];
    for (const [k] of IND_METAS) { const v = String(fd.get(k) ?? "").trim().replace(",", "."); if (v === "") apagar.push(k); else if (isFinite(+v) && +v >= 0) linhas.push({ chave: k, valor: +v, atualizado_por: S.user.id, atualizado_em: new Date().toISOString() }); }
    try {
      if (linhas.length) { const { error } = await sb.from("metas_comerciais").upsert(linhas); if (error) throw error; }
      if (apagar.length) { const { error } = await sb.from("metas_comerciais").delete().in("chave", apagar); if (error) throw error; }
      I.metas = false; toast("Metas salvas. Os indicadores já usam os valores novos."); await carregarIndicadores(true);
    } catch (e) { console.error(e); toast("Não foi possível salvar as metas."); }
    finally { I.salvando = false; render(); }
  }
  function moverPeriodo(n) {
    const I = S.ind;
    if (I.per === "dia") { let d = somaDias(I.ref, n); while (!diaUtil(d)) d = somaDias(d, n); I.ref = d; }
    else if (I.per === "semana") I.ref = somaDias(I.ref, 7 * n);
    else if (I.per === "mes") I.ref = somaMeses(I.ref, n);
    else if (I.per === "ano") I.ref = (+I.ref.slice(0, 4) + n) + I.ref.slice(4);
  }
  app.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b || b.tagName === "FORM" || !b.dataset.acao.startsWith("in-")) return;
    const I = S.ind, a = b.dataset.acao;
    switch (a) {
      case "in-per": I.per = b.dataset.v; if (I.per !== "custom") I.ref = hojeISO(); render(); break;
      case "in-ant": moverPeriodo(-1); render(); break;
      case "in-prox": moverPeriodo(1); render(); break;
      case "in-hoje": I.ref = hojeISO(); render(); break;
      case "in-graf": I.graf = b.dataset.v; renderDados(); break;
      case "in-bar": I.bar = b.dataset.v; renderDados(); break;
      case "in-tab": I.tab = b.dataset.v; renderDados(); break;
      case "in-recarregar": carregarIndicadores(); break;
      case "in-drill": I.drill = { tipo: b.dataset.tipo, cat: b.dataset.cat || null }; render(); break;
      case "in-fechar": I.drill = null; I.metas = false; render(); break;
      case "in-metas": if (ehGestao()) { I.metas = true; I.drill = null; render(); } break;
      case "in-pdf": baixarPdfInd(); break;
      case "in-excel": baixarExcelInd(); break;
      case "in-ficha": { const id = b.dataset.id, f = I.d?.fichaPorId.get(id), dono = f && f.usuario_id !== S.user.id && S.perfil?.papel === "admin" ? "todos" : null; I.drill = null; S.voltarAtivo = true; S.view = "adms"; if ((S.lg.dono || null) !== dono) { S.lg.dono = dono; S.lg.carregado = false; } S.lg.sel = id; render(); window.scrollTo(0, 0); break; }
      case "in-naofeita": {
        b.disabled = true;
        const { error } = await sb.from("demos").update({ status: "nao_realizada" }).eq("id", +b.dataset.id);
        if (error) { console.error(error); toast("Não foi possível salvar."); b.disabled = false; return; }
        toast("Marcada como não aconteceu."); carregarIndicadores(true); break;
      }
    }
  });
  app.addEventListener("change", async (ev) => {
    const t = ev.target;
    if (t.id === "in-resp") { S.ind.resp = t.value; render(); return; }
    if (t.id === "in-ini" || t.id === "in-fim") { S.ind[t.id === "in-ini" ? "ini" : "fim"] = t.value; if (S.ind.ini && S.ind.fim) render(); return; }
    if (t.classList.contains("in-apres")) {
      const { error } = await sb.from("demos").update({ apresentador: t.value }).eq("id", +t.dataset.id);
      if (error) { console.error(error); toast("Não foi possível salvar."); return; }
      toast(`Apresentação atribuída a ${t.value}.`); carregarIndicadores(true);
    }
  });
  app.addEventListener("submit", (ev) => { const f = ev.target; if (f.dataset.acao !== "in-metas-salvar") return; ev.preventDefault(); if (ehGestao()) salvarMetas(f); });
  // na tela de indicadores, confere os dados de novo a cada 2 minutos (quando a aba está aberta)
  setInterval(() => { if (S.view === "indicadores" && S.user && document.visibilityState === "visible" && !S.ind.drill && !S.ind.metas) carregarIndicadores(true); }, 120000);

  /* ------------------------------------------------------------- início */
  /* ---- rota: a tela atual fica no endereço (#/vendas?funil=SCC). F5 volta para o mesmo lugar e o Voltar do navegador funciona */
  const VIEWS = ["inicio", "mapeamento", "regiao", "adms", "vendas", "oportunidades", "clientes", "agenda", "relatorios", "indicadores", "concorrencia", "listas", "equipe"];
  const ROTA = {
    mapeamento: { emp: [() => S.sel, (v) => { S.rotaEmp = v; }] },
    adms: {
      ficha: [() => S.lg.sel, (v) => { S.lg.sel = v; }],
      dono: [() => S.lg.dono, () => {}], // aplicado em aplicarRota (troca de dono recarrega as fichas)
      etapa: [() => (S.lg.etapa !== "todas" ? S.lg.etapa : null), (v) => { S.lg.etapa = v; }],
      busca: [() => S.lg.busca || null, (v) => { S.lg.busca = v; }],
    },
    vendas: {
      funil: [() => S.vd.funis.find((f) => f.id === S.vd.funil)?.sigla || S.vd.funilRota || null, (v) => { S.vd.funilRota = v; aplicarFunilDaRota(); }],
      status: [() => (S.vd.status !== "em_andamento" ? S.vd.status : null), (v) => { S.vd.status = v; }],
      resp: [() => (S.vd.resp !== "todos" ? S.vd.resp : null), (v) => { S.vd.resp = v; }],
      busca: [() => S.vd.busca || null, (v) => { S.vd.busca = v; }],
    },
    oportunidades: {
      aba: [() => (S.op.aba !== "negociando" ? S.op.aba : null), (v) => { if (OP_ABAS.some(([k]) => k === v)) S.op.aba = v; }],
    },
    indicadores: {
      periodo: [() => (S.ind.per !== "mes" ? S.ind.per : null), (v) => { if (["dia", "semana", "mes", "ano", "custom"].includes(v)) S.ind.per = v; }],
      ref: [() => (S.ind.per !== "custom" && S.ind.ref !== hojeISO() ? S.ind.ref : null), (v) => { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) S.ind.ref = v; }],
      de: [() => (S.ind.per === "custom" ? S.ind.ini || null : null), (v) => { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) S.ind.ini = v; }],
      ate: [() => (S.ind.per === "custom" ? S.ind.fim || null : null), (v) => { if (/^\d{4}-\d{2}-\d{2}$/.test(v)) S.ind.fim = v; }],
      resp: [() => (S.ind.resp !== "todos" ? S.ind.resp : null), (v) => { S.ind.resp = v; }],
    },
    relatorios: {
      periodo: [() => (S.rl.periodo !== "dia" ? S.rl.periodo : null), (v) => { S.rl.periodo = v; }],
      ref: [() => (S.rl.ref !== hojeISO() ? S.rl.ref : null), (v) => { S.rl.ref = v; }],
    },
  };
  function rotaAtual() {
    const q = new URLSearchParams();
    for (const [k, [ler]] of Object.entries(ROTA[S.view] || {})) { const v = ler(); if (v != null && v !== "") q.set(k, v); }
    const t = q.toString(); return `#/${S.view}${t ? "?" + t : ""}`;
  }
  // o que muda de "lugar" (tela, ficha, empresa) entra no histórico; filtros só substituem o endereço
  const lugarDa = (h) => { const [v, q = ""] = h.replace(/^#\/?/, "").split("?"), p = new URLSearchParams(q); return [v, p.get("ficha"), p.get("emp")].join("|"); };
  let aplicandoRota = false;
  function sincronizarRota() {
    if (aplicandoRota || !S.user || !S.perfil?.aprovado) return;
    const h = rotaAtual(); if (h === location.hash) return;
    const url = location.pathname + location.search + h;
    const estado = { voltar: !!S.voltarAtivo };
    if (location.hash && lugarDa(h) !== lugarDa(location.hash)) history.pushState(estado, "", url); else history.replaceState({ voltar: !!history.state?.voltar || estado.voltar && !location.hash }, "", url);
  }
  function aplicarRota(h) {
    const [v, q = ""] = String(h || "").replace(/^#\/?/, "").split("?");
    if (!VIEWS.includes(v) || (v === "equipe" && S.perfil?.papel !== "admin")) return false;
    S.view = v; S.sel = null; S.selRow = null; S.rotaEmp = null;
    if (v === "adms") { S.lg.sel = null; S.lg.etapa = "todas"; S.lg.busca = ""; }
    const p = new URLSearchParams(q);
    for (const [k, [, escrever]] of Object.entries(ROTA[v] || {})) if (p.has(k)) escrever(p.get(k));
    if (v === "adms") {
      const dono = p.get("dono") || null;
      if (dono !== (S.lg.dono || null)) { S.lg.dono = dono; S.lg.carregado = false; }
    }
    return true;
  }
  function aplicarFunilDaRota() {
    const V = S.vd; if (!V.funilRota || !V.funis.length) return;
    const f = V.funis.find((x) => x.sigla === V.funilRota); if (f) V.funil = f.id; V.funilRota = null;
  }
  window.addEventListener("popstate", () => {
    if (!S.user || !S.perfil?.aprovado) return;
    aplicandoRota = true; S.voltarAtivo = !!history.state?.voltar;
    if (!aplicarRota(location.hash)) aplicarRota("#/inicio");
    render(); aplicandoRota = false;
    if (S.rotaEmp) { selecionar(S.rotaEmp); S.rotaEmp = null; }
    if (S.view === "adms" && !S.lg.carregado && !S.lg.carregando) carregarLig();
  });
  /* ---- versão nova no ar: o GitHub Pages deixa o index.html em cache por 10 minutos. O app confere a versão publicada
     (sem cache) ao abrir, ao voltar para a aba e a cada 30 minutos. Na abertura troca sozinho; depois mostra um aviso. */
  const VERSAO = +(document.querySelector('meta[name="versao"]')?.content || 0);
  let avisouVersao = false;
  async function conferirVersao(abrindo) {
    try {
      const r = await fetch(`index.html?nc=${Date.now()}`, { cache: "no-store" }); if (!r.ok) return;
      const nova = +((await r.text()).match(/name="versao" content="(\d+)"/)?.[1] || 0);
      if (!nova || nova <= VERSAO) return;
      const ir = () => location.replace(`${location.pathname}?v=${nova}${location.hash}`);
      // na abertura troca sozinho, mas só uma vez por versão (evita ficar recarregando se o servidor ainda mandar a antiga)
      let tentou; try { tentou = sessionStorage.getItem("mc-versao-tentada") === String(nova); sessionStorage.setItem("mc-versao-tentada", String(nova)); } catch { tentou = true; }
      if (abrindo && !tentou) return ir();
      if (avisouVersao) return; avisouVersao = true;
      const el = document.createElement("div"); el.className = "aviso-versao"; el.setAttribute("role", "status");
      el.innerHTML = `<span>Saiu uma versão nova do sistema.</span><button type="button">Atualizar agora</button>`;
      el.querySelector("button").addEventListener("click", ir); document.body.appendChild(el);
    } catch { /* sem rede: tenta de novo depois */ }
  }
  // tira o ?v= do endereço depois de abrir a versão nova
  if (/[?&]v=\d+/.test(location.search)) history.replaceState(null, "", location.pathname + location.search.replace(/[?&]v=\d+/, "").replace(/^&/, "?") + location.hash);
  conferirVersao(true);
  setInterval(() => conferirVersao(false), 30 * 60e3);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") conferirVersao(false); });
  function voltarTela() {
    const L = S.lg;
    if (L.registrar) { L.registrar = null; L.passo = null; render(); return; }
    if (S.voltarAtivo && history.state?.voltar) { history.back(); return; }
    if (S.view === "adms" && L.sel) { L.sel = null; L.novo = false; render(); return; }
    S.voltarAtivo = false; S.view = "inicio"; render();
  }
  let iniciando = null;
  function iniciar() { if (!iniciando) iniciando = iniciarAgora().finally(() => { iniciando = null; }); return iniciando; }
  async function iniciarAgora() {
    const { data } = await sb.auth.getSession();
    S.user = data.session?.user || null;
    if (!S.user) return render();
    S.inicio.t0 = performance.now();
    S.perfilP = carregarPerfil();
    carregarLig(); carregarVendas(); const mapeando = carregarMapeamento();
    await S.perfilP;
    if (S.perfil?.aprovado && location.hash) { aplicandoRota = true; aplicarRota(location.hash); S.voltarAtivo = !!history.state?.voltar; }
    render(); aplicandoRota = false;
    if (!S.perfil.aprovado) return;
    if (S.rotaEmp) { selecionar(S.rotaEmp); S.rotaEmp = null; }
    carregarLig(); carregarAgenda();
    if (avisosStatus() === "granted") registrarSw();
    const abrir = new URLSearchParams(location.search).get("abrir");
    if (abrir) { history.replaceState(null, "", location.pathname); abrirFicha(abrir); }
    await mapeando;
    localizarPendentes(S.uf);
    identificarSistemas(S.uf);
  }
  sb.auth.onAuthStateChange((evento, sessao) => {
    if (evento === "PASSWORD_RECOVERY") { S.recuperando = true; S.user = sessao?.user || null; render(); return; }
    if (evento === "SIGNED_IN" && !S.user && !S.recuperando && !iniciando) { iniciar(); return; }
    if (evento === "SIGNED_OUT") { S.user = null; S.perfil = null; S.pendentes = 0; S.equipe = null; S.lg = { ...S.lg, dono: null, carregado: false, fichas: [], regs: [], base: [], rels: [], pessoas: null, sel: null, novo: false }; S.ag = { ...S.ag, fichas: [], carregado: false, cnpjs: new Set() }; S.rows = []; S.sel = null; S.selRow = null; S.menu = false; render(); }
  });
  iniciar();
})();
