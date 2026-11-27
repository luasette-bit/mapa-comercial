/* Propostas · lê a mensagem do Matheus e monta a proposta a partir do modelo em PowerPoint (usado pela página Propostas).
   Funciona no navegador (DOMParser/XMLSerializer nativos + JSZip) e no Node (passando @xmldom/xmldom).
   Só entra na proposta o que estiver na mensagem: item que não veio sai do slide; sem tarifas, o slide
   CondoConta/DirectBank sai inteiro; sem app personalizado, a customização sai do Investimento. */
(function (raiz) {
  const NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main";
  const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const EMU = 12700; // 1 ponto

  /* ------------------------------------------------------------ 1. ler a mensagem */
  const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function limpaValor(v) {
    let s = String(v || "").replace(/\s+/g, " ").replace(/\s+([.,;])/g, "$1").trim().replace(/[.;]+$/, "").trim();
    s = s.replace(/(\d+)\s*vezes\s+de/i, "$1x de");
    s = s.replace(/^isento\s*[-–—]?\s*black\s*friday/i, "Isento – Black Friday");
    s = s.replace(/^isenta?\b/i, "Isento").replace(/^inclu[ií]do\b/i, "Incluído");
    s = s.replace(/R\$\s*/g, "R$ ");
    return s ? s[0].toUpperCase() + s.slice(1) : s;
  }
  const num = (s) => +String(s).replace(/\./g, "").replace(",", ".");
  const milhar = (n) => n.toLocaleString("pt-BR");

  // Nomes bonitos para o que já conhecemos; o resto entra com o nome que o Matheus escreveu.
  function rotuloItem(k, original) {
    if (/check ?pay/.test(k)) return /comprovante/.test(k) ? "CheckPay + comprovantes:" : "CheckPay:";
    if (/whats/.test(k)) return "Envio de boletos WhatsApp:";
    if (/nfs|nota fiscal|nfse/.test(k)) return /condomin/.test(k) ? "Emissão NFS condôminos:" : /morador/.test(k) ? "NFS moradores:" : original.trim() + ":";
    const t = original.trim(); return t[0].toUpperCase() + t.slice(1) + ":";
  }

  function lerMensagem(texto) {
    const d = { titulo: "", adesao: "", mensal: "", limite: "", excedente: "", notaMensal: "", itens: [], appCustomizacao: "", condoconta: null, directbank: null, naoEntendi: [] };
    const linhas = String(texto || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let secao = "";
    linhas.forEach((l, i) => {
      const m = l.match(/^([^:]{2,70}):\s*(.*)$/);
      if (!m || /^R\$/.test(l)) { // linha só com valor: pertence ao título de cima (ex.: "Tarifa Condoconta:" ↵ "R$ 1,60")
        const v = limpaValor(l);
        if (i === 0 && !/^R\$/.test(l)) { d.titulo = l.replace(/[:.]$/, "").trim(); return; }
        if (secao === "condoconta" && !d.condoconta) d.condoconta = { tarifa: v };
        else if (secao === "directbank" && !d.directbank) d.directbank = { tarifa: v };
        else d.naoEntendi.push(l);
        return;
      }
      const k = semAcento(m[1]), v = limpaValor(m[2]);
      if (!v) { // título de bloco
        if (/condo ?conta/.test(k)) secao = "condoconta";
        else if (/direct ?bank/.test(k)) secao = "directbank";
        else if (/\bapp|aplicativo/.test(k)) secao = "app";
        else if (/scc/.test(k)) secao = "scc";
        else if (i === 0) { d.titulo = m[1].trim(); secao = ""; }
        else secao = k;
        return;
      }
      if (/condo ?conta/.test(k)) { d.condoconta = { tarifa: v }; return; }
      if (/direct ?bank/.test(k)) { d.directbank = { tarifa: v }; return; }
      if (/ades|implanta|migra/.test(k)) { d.adesao = v; return; }
      if (/custom/.test(k)) { d.appCustomizacao = v; return; }
      if (/manuten/.test(k) && (secao === "app" || /\bapp|aplicativo/.test(k))) { d.itens.push({ rotulo: "Aplicativo personalizado:", valor: v }); return; }
      if (/mensal/.test(k) && secao !== "app") {
        const valor = v.match(/R\$ ?[\d.]+,\d{2}/), lim = v.match(/at[eé]\s+(?:atingir\s+)?([\d.]+)\s*unidades/i), exc = v.match(/R\$ ?([\d.]*,\d{2})\s*por unidade/i);
        d.mensal = valor ? valor[0].replace(/R\$ ?/, "R$ ") : v;
        if (lim) d.limite = lim[1];
        if (exc) d.excedente = "R$ " + exc[1];
        d.notaMensal = lim && exc ? `Até ${milhar(num(lim[1]))} unidades. A partir de ${milhar(num(lim[1]) + 1)} unidades, o valor será de R$ ${exc[1]} por unidade.`
          : v.replace(/R\$ ?[\d.]+,\d{2}\.?/, "").trim();
        return;
      }
      d.itens.push({ rotulo: rotuloItem(k, m[1]), valor: v, novo: !/check ?pay|whats|nfs|nota fiscal|nfse/.test(k) });
    });
    return d;
  }

  /* ------------------------------------------------------------ 2. mexer no PowerPoint */
  const els = (n, ns, tag) => Array.from(n.getElementsByTagNameNS(ns, tag));
  const texto = (n) => els(n, NS_A, "t").map((t) => t.textContent).join("");
  const formas = (doc) => { const t = els(doc, NS_P, "spTree")[0]; return Array.from(t.childNodes).filter((n) => n.nodeType === 1 && /^(sp|cxnSp|pic|grpSp)$/.test(n.localName)); };
  const nomeForma = (f) => { const c = els(f, NS_P, "cNvPr")[0]; return c ? c.getAttribute("name") : ""; };
  const xfrmOff = (f) => els(f, NS_A, "off")[0];
  const pos = (f) => { const o = xfrmOff(f); return o ? { x: +o.getAttribute("x") / EMU, y: +o.getAttribute("y") / EMU } : { x: -1, y: -1 }; };
  const mover = (f, dx, dy) => { const o = xfrmOff(f); if (!o) return; if (dx) o.setAttribute("x", Math.round(+o.getAttribute("x") + dx * EMU)); if (dy) o.setAttribute("y", Math.round(+o.getAttribute("y") + dy * EMU)); };
  const tirar = (f) => f.parentNode.removeChild(f);
  const acha = (doc, fn) => formas(doc).find((f) => fn(semAcento(texto(f)), f));

  // troca o texto de uma caixa mantendo a fonte, a cor e o alinhamento do primeiro trecho
  function trocaTexto(f, linhas) {
    if (!Array.isArray(linhas)) linhas = [linhas];
    const body = els(f, NS_P, "txBody")[0]; const ps = els(body, NS_A, "p"); const p0 = ps[0];
    const r0 = els(body, NS_A, "r").find((r) => r.textContent.trim()) || els(body, NS_A, "r")[0];
    const rPr = r0 ? els(r0, NS_A, "rPr")[0] : null, pPr = els(p0, NS_A, "pPr")[0];
    ps.forEach(tirar);
    const doc = body.ownerDocument;
    for (const l of linhas) {
      const p = doc.createElementNS(NS_A, "a:p"); if (pPr) p.appendChild(pPr.cloneNode(true));
      if (l !== "") { const r = doc.createElementNS(NS_A, "a:r"); if (rPr) r.appendChild(rPr.cloneNode(true)); const t = doc.createElementNS(NS_A, "a:t"); t.textContent = l; r.appendChild(t); p.appendChild(r); }
      body.appendChild(p);
    }
  }
  // troca só um parágrafo (o que contém `antigo`), para não mexer no resto da caixa
  function trocaParagrafo(f, teste, novo) {
    const p = els(f, NS_A, "p").find((x) => teste(semAcento(texto(x)))); if (!p) return false;
    const rs = els(p, NS_A, "r"); if (!rs.length) return false;
    rs.slice(1).forEach(tirar); els(rs[0], NS_A, "t")[0].textContent = novo; return true;
  }
  // valores com destaque: o "R$ 0,00" no tamanho grande do modelo e o resto ("por condomínio", "fixo") no menor;
  // a caixa colorida acompanha o tamanho do texto para não quebrar linha.
  function trocaValor(f, valor, larguraMax) {
    const body = els(f, NS_P, "txBody")[0], rs = els(body, NS_A, "r");
    const rprs = rs.map((r) => els(r, NS_A, "rPr")[0]).filter(Boolean);
    const grande = rprs[0], pequeno = rprs.find((x) => !x.getAttribute("sz")) || rprs[1] || grande;
    const tamG = +(grande && grande.getAttribute("sz") || 1800) / 100, tamP = +(pequeno && pequeno.getAttribute("sz") || 1400) / 100;
    const m = String(valor).match(/^(R\$ ?[\d.]+,\d{2})(.*)$/);
    const partes = m ? [[m[1] + (m[2] ? " " : ""), grande], [m[2].trim(), pequeno]].filter((x) => x[0].trim()) : [[valor, pequeno]];
    const ps = els(body, NS_A, "p"), p0 = ps[0], pPr = els(p0, NS_A, "pPr")[0]; ps.forEach(tirar);
    const doc = body.ownerDocument, p = doc.createElementNS(NS_A, "a:p"); if (pPr) p.appendChild(pPr.cloneNode(true));
    for (const [t, rp] of partes) { const r = doc.createElementNS(NS_A, "a:r"); if (rp) r.appendChild(rp.cloneNode(true)); const tt = doc.createElementNS(NS_A, "a:t"); tt.textContent = t; r.appendChild(tt); p.appendChild(r); }
    body.appendChild(p);
    const est = partes.reduce((s, [t, rp]) => s + t.length * (rp === grande ? tamG : tamP) * 0.62, 0) + 16;
    const ext = els(f, NS_A, "ext").find((e) => e.parentNode.localName === "xfrm");
    if (ext) ext.setAttribute("cx", Math.round(Math.min(larguraMax || 258, Math.max(+ext.getAttribute("cx") / EMU, est)) * EMU));
  }
  function proximoId(doc) { return Math.max(0, ...els(doc, NS_P, "cNvPr").map((c) => +c.getAttribute("id") || 0)) + 1; }

  async function gerarProposta(modelo, dados, libs) {
    const JSZip = libs.JSZip, DP = libs.DOMParser || raiz.DOMParser, XS = libs.XMLSerializer || raiz.XMLSerializer;
    const zip = await JSZip.loadAsync(modelo);
    const ler = async (c) => new DP().parseFromString(await zip.file(c).async("string"), "application/xml");
    const gravar = (c, doc) => zip.file(c, new XS().serializeToString(doc));
    const pres = await ler("ppt/presentation.xml"), presRels = await ler("ppt/_rels/presentation.xml.rels");
    const ids = els(pres, NS_P, "sldId");
    const relAlvo = (rid) => els(presRels, "http://schemas.openxmlformats.org/package/2006/relationships", "Relationship").find((r) => r.getAttribute("Id") === rid);
    const slides = [];
    for (const s of ids) { const rid = s.getAttributeNS(NS_R, "id") || s.getAttribute("r:id"); const rel = relAlvo(rid); const caminho = "ppt/" + rel.getAttribute("Target").replace(/^\.?\//, ""); slides.push({ s, rel, caminho, doc: await ler(caminho) }); }
    const slideCom = (fn) => slides.find((x) => fn(semAcento(texto(x.doc))));
    const avisos = [];

    // capa: o nome da administradora é a última linha com texto da caixa "PRG Software: SCC Online"
    { const c = slides[0]; const f = acha(c.doc, (t) => t.includes("scc online")); if (f) { const ps = els(f, NS_A, "p").filter((p) => texto(p).trim()); const ult = ps[ps.length - 1]; if (ult && ps.length > 1) { const rs = els(ult, NS_A, "r"); rs.slice(1).forEach(tirar); els(rs[0], NS_A, "t")[0].textContent = dados.administradora; } } }

    // implementação (passo 2, conversão dos dados):
    //  - Superlógica: "Conversão de dados do sistema Superlógica;" + "(migração faseada; prédio a prédio);" (é o único que convertemos)
    //  - outro sistema: "Estudo de conversão de dados do sistema X;" sem observação
    //  - sem sistema: o passo 2 sai e os outros três se espalham pela largura (1, 2, 3)
    { const c = slideCom((t) => t.includes("procedimento de implementa")); if (c) {
      const sis = String(dados.sistema || "").trim(), ssa = semAcento(sis);
      const semSistema = /^(sem sistema|nenhum|nao tem|nao usa|planilha)/.test(ssa) || dados.semSistema;
      const ehSuper = /superl[oó]?gica/.test(ssa);
      const f = acha(c.doc, (t) => t.includes("conversao de dados"));
      const obs = acha(c.doc, (t) => /^\(.*\);?$/.test(t.trim()));
      if (semSistema) {
        const W = 12700, extX = (x) => els(x, NS_A, "ext").find((q) => q.parentNode.localName === "xfrm"), fundos = formas(c.doc).filter((x) => x.localName === "sp" && !texto(x).trim() && extX(x) && +extX(x).getAttribute("cy") / W > 200).sort((a, b) => pos(a).x - pos(b).x);
        if (fundos.length === 4 && f) {
          const larg = (x) => +els(x, NS_A, "ext").find((e) => e.parentNode.localName === "xfrm").getAttribute("cx") / W;
          const col = fundos.map((x) => ({ fundo: x, x0: pos(x).x, x1: pos(x).x + larg(x) }));
          const resto = formas(c.doc).filter((x) => !fundos.includes(x) && pos(x).y >= pos(fundos[0]).y - 5);
          const donoDe = new Map(resto.map((x) => [x, col.findIndex((k) => pos(x).x >= k.x0 - 1 && pos(x).x < k.x1 - 1)])); // antes de mexer em nada
          const dono = (x) => donoDe.get(x);
          const setas = resto.filter((x) => { const e = els(x, NS_A, "ext").find((q) => q.parentNode.localName === "xfrm"); return e && +e.getAttribute("cx") / W < 45 && +e.getAttribute("cy") / W > 60 && !texto(x).trim(); });
          const fill = (x) => { const sp = els(x, NS_P, "spPr")[0]; return Array.from(sp.childNodes).find((n) => n.nodeType === 1 && /Fill$/.test(n.localName)); };
          const trocaFill = (x, molde) => { const sp = els(x, NS_P, "spPr")[0], velho = fill(x), novo = molde && molde.cloneNode(true); if (!novo) return; if (velho) sp.replaceChild(novo, velho); else sp.appendChild(novo); };
          const f1 = fill(col[1].fundo), f2 = fill(col[2].fundo);
          // sai a coluna 2 inteira e a seta que fica entre a 3 e a 4
          resto.filter((x) => dono(x) === 1 && !setas.includes(x)).forEach(tirar); tirar(col[1].fundo);
          const setaSai = setas.find((x) => dono(x) === 2); if (setaSai) tirar(setaSai);
          const ini = col[0].x0, fim = col[3].x1, L = (fim - ini) / 3, fator = L / (col[0].x1 - col[0].x0);
          [[0, 0], [2, 1], [3, 2]].forEach(([de, para]) => {
            const k = col[de], nx = ini + para * L;
            for (const x of resto.filter((y) => y.parentNode && dono(y) === de)) {
              const e = els(x, NS_A, "ext").find((q) => q.parentNode.localName === "xfrm");
              if (setas.includes(x)) { mover(x, nx + L - (k.x1 - pos(x).x) - pos(x).x, 0); continue; }
              const rel = pos(x).x - k.x0; mover(x, nx + rel * fator - pos(x).x, 0);
              if (e && texto(x).trim().length > 2) e.setAttribute("cx", Math.round(Math.min(+e.getAttribute("cx") / W * fator, L - rel * fator - 34) * W)); // não encosta na seta
              if (/^\d$/.test(texto(x).trim())) trocaTexto(x, String(para + 1));
            }
            mover(k.fundo, nx - k.x0, 0); const e = els(k.fundo, NS_A, "ext").find((q) => q.parentNode.localName === "xfrm"); e.setAttribute("cx", Math.round(L * W));
          });
          // a seta que estava depois da coluna 2 (clara) passa a ficar depois da nova coluna 2
          const setaMeio = setas.find((x) => x.parentNode && dono(x) === 1);
          if (setaMeio) mover(setaMeio, ini + 2 * L - (col[1].x1 - pos(setaMeio).x) - pos(setaMeio).x, 0);
          trocaFill(col[2].fundo, f1); trocaFill(col[3].fundo, f2); // mantém as cores alternadas
        } else if (f) { trocaTexto(f, "Estudo de conversão dos dados;"); if (obs) tirar(obs); avisos.push("Não consegui tirar o passo 2 da implementação: confira o slide."); }
      } else {
        if (f) trocaTexto(f, ehSuper ? "Conversão de dados do sistema Superlógica;" : sis ? `Estudo de conversão de dados do sistema ${sis};` : "Estudo de conversão de dados do sistema atual;");
        const nota = dados.obsMigracao ? dados.obsMigracao : ehSuper ? "migração faseada; prédio a prédio" : "";
        if (obs) { if (nota) trocaTexto(obs, `(${nota.replace(/^\(|\)?;?$/g, "")});`); else tirar(obs); }
      }
    } }

    // investimento: adesão e, se tiver, a customização do app
    { const c = slideCom((t) => t.includes("investimento") && t.includes("validade")); if (c) {
      const rot = acha(c.doc, (t) => /(migracao|adesao|implantacao) scc online:/.test(t));
      const val = rot && formas(c.doc).find((f) => f !== rot && Math.abs(pos(f).x - pos(rot).x) < 20 && pos(f).y > pos(rot).y && pos(f).y - pos(rot).y < 45 && texto(f).trim());
      if (rot) trocaTexto(rot, dados.rotuloAdesao || "Adesão SCC Online:");
      if (val) trocaValor(val, dados.adesao || "A combinar", 300);
      const rotApp = acha(c.doc, (t, f) => f !== rot && /customiza|desenvolvimento|aplicativo|app personalizado/.test(t) && !/adesao|migracao|implantacao|licenca|projeto|validade/.test(t));
      const valApp = rotApp && formas(c.doc).find((f) => f !== rotApp && Math.abs(pos(f).x - pos(rotApp).x) < 20 && pos(f).y > pos(rotApp).y && pos(f).y - pos(rotApp).y < 70 && texto(f).trim());
      if (dados.appCustomizacao) { if (valApp) trocaValor(valApp, dados.appCustomizacao, 300); else avisos.push("O modelo não tem o campo da customização do app."); }
      else { if (rotApp) tirar(rotApp); if (valApp) tirar(valApp); }
      const v = acha(c.doc, (t) => t.includes("validade da proposta")); if (v && dados.validade) trocaTexto(v, `Validade da Proposta: ${dados.validade}`);
    } }

    // mensalidade: valor do SCC, regra de unidades e a lista de adicionais (só os que vieram)
    { const c = slideCom((t) => t.includes("valor mensal")); if (c) {
      const doc = c.doc, rotScc = acha(doc, (t) => t.trim() === "scc online:");
      const colX = rotScc ? pos(rotScc).x - 10 : 660;
      const valScc = rotScc && formas(doc).find((f) => f !== rotScc && pos(f).x >= colX && pos(f).y > pos(rotScc).y && pos(f).y - pos(rotScc).y < 45 && /r\$/.test(semAcento(texto(f))));
      const nota = acha(doc, (t, f) => pos(f).x >= colX && /unidade/.test(t));
      if (valScc) trocaValor(valScc, dados.mensal || "R$ —");
      if (nota) { if (dados.notaMensal) trocaTexto(nota, dados.notaMensal); else tirar(nota); }
      // os adicionais ficam abaixo da nota: linha + rótulo + valor, em grupos
      const yBase = nota ? pos(nota).y + 70 : 270;
      const add = formas(doc).filter((f) => pos(f).x >= colX && pos(f).y >= yBase - 2);
      const linhas = add.filter((f) => f.localName === "cxnSp").sort((a, b) => pos(a).y - pos(b).y);
      const textos = add.filter((f) => f.localName === "sp" && texto(f).trim()).sort((a, b) => pos(a).y - pos(b).y);
      if (linhas.length && textos.length >= 2) {
        const mLin = linhas[0], mRot = textos[0], mVal = textos[1];
        const y0 = pos(mLin).y, dRot = pos(mRot).y - y0, dVal = pos(mVal).y - y0;
        const pai = mLin.parentNode, depois = add[add.length - 1].nextSibling;
        const molde = [mLin.cloneNode(true), mRot.cloneNode(true), mVal.cloneNode(true)];
        add.forEach(tirar);
        const itens = dados.itens || [], fim = 542, passo = itens.length ? Math.min(70, (fim - y0) / itens.length) : 70;
        if (passo < 60) avisos.push("Muitos adicionais para o slide da mensalidade: confira se o texto coube.");
        let id = proximoId(doc);
        itens.forEach((it, i) => {
          const y = y0 + i * passo;
          const [l, r, v] = molde.map((m) => m.cloneNode(true));
          [l, r, v].forEach((n) => { const c0 = els(n, NS_P, "cNvPr")[0]; c0.setAttribute("id", id++); const ex = els(c0, NS_A, "extLst")[0]; if (ex) tirar(ex); });
          mover(l, 0, y - pos(l).y); mover(r, 0, y + dRot - pos(r).y); mover(v, 0, y + dVal - pos(v).y);
          trocaTexto(r, it.rotulo); trocaValor(v, it.valor);
          for (const n of [l, r, v]) pai.insertBefore(n, depois);
        });
      } else if ((dados.itens || []).length) avisos.push("Não achei no modelo onde ficam os adicionais da mensalidade.");
    } }

    // tarifas CondoConta / DirectBank: sai o slide inteiro se nenhuma veio; com uma só, ela vai para o meio
    { const c = slideCom((t) => t.includes("condoconta") && t.includes("directbank") && t.includes("tarifa")); if (c) {
      const tem = { condoconta: dados.condoconta, directbank: dados.directbank };
      if (!tem.condoconta && !tem.directbank) c.remover = true;
      else {
        for (const k of ["condoconta", "directbank"]) {
          const doDoCard = formas(c.doc).filter((f) => nomeForma(f).toLowerCase().endsWith("-" + k));
          if (!tem[k]) { doDoCard.forEach(tirar); continue; }
          const vt = doDoCard.find((f) => nomeForma(f).startsWith("valor-tarifa")); if (vt) trocaTexto(vt, tem[k].tarifa);
          const vr = doDoCard.find((f) => nomeForma(f).startsWith("valor-repasse")); if (vr && tem[k].repasse) trocaTexto(vr, tem[k].repasse);
          if (!(tem.condoconta && tem.directbank)) { const card = doDoCard.find((f) => nomeForma(f).startsWith("card-")); if (card) { const dx = 480 - (pos(card).x + 210); doDoCard.forEach((f) => mover(f, dx, 0)); } }
        }
        if (!(tem.condoconta && tem.directbank)) {
          const so = tem.condoconta ? "CondoConta" : "DirectBank";
          const t = formas(c.doc).find((f) => nomeForma(f) === "title"); if (t) trocaTexto(t, `Proposta ${so}`);
          const st = formas(c.doc).find((f) => nomeForma(f) === "subtitle"); if (st) trocaTexto(st, `Boletos emitidos para condomínios com conta digital ${so}`);
          const rod = formas(c.doc).find((f) => nomeForma(f) === "nota-rodape"); if (rod) trocaTexto(rod, "Valores acima da tarifa mencionada são repassados ao condomínio no percentual indicado.");
        }
      }
    } }

    // slides que explicam produtos: os do CheckPay só entram quando a proposta tem CheckPay
    const temCheck = (dados.itens || []).some((i) => /check ?pay/i.test(i.rotulo));
    if (!temCheck) for (const x of slides) { const t = semAcento(texto(x.doc)); if (/checkpay/.test(t) || /caixa de entrada para recebimento/.test(t)) { if (!/valor mensal|investimento/.test(t)) x.remover = true; } }
    // sobrou texto de exemplo do modelo ("R$ xxx")? avisa para conferir
    slides.forEach((x, i) => { if (!x.remover && /\bx{3,}\b/i.test(texto(x.doc))) avisos.push(`Ficou um "xxx" de exemplo no slide ${slides.slice(0, i + 1).filter((y) => !y.remover).length}: confira.`); });
    for (const x of slides) {
      if (x.remover) {
        x.s.parentNode.removeChild(x.s); x.rel.parentNode.removeChild(x.rel);
        zip.remove(x.caminho); zip.remove(x.caminho.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels"));
        const ct = await ler("[Content_Types].xml"); const o = Array.from(ct.getElementsByTagName("Override")).find((n) => n.getAttribute("PartName") === "/" + x.caminho); if (o) { o.parentNode.removeChild(o); gravar("[Content_Types].xml", ct); }
      } else gravar(x.caminho, x.doc);
    }
    gravar("ppt/presentation.xml", pres); gravar("ppt/_rels/presentation.xml.rels", presRels);
    const arquivo = await zip.generateAsync({ type: libs.tipo || "uint8array", compression: "DEFLATE" });
    return { arquivo, avisos, slides: slides.filter((x) => !x.remover).length, nome: `Proposta Comercial _ SCC Online - ${dados.administradora}` };
  }

  const API = { lerMensagem, gerarProposta };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else raiz.Propostas = API;
})(typeof window !== "undefined" ? window : globalThis);
