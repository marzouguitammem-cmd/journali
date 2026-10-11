const fs=require('fs');const CFG=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const d=require('docx');
const {LevelFormat,Document,Packer,Paragraph,TextRun,ImageRun,Table,TableRow,TableCell,WidthType,AlignmentType,PageOrientation,Header,
 BorderStyle,ShadingType,VerticalAlign,HeightRule,VerticalMergeType,HorizontalPositionRelativeFrom,VerticalPositionRelativeFrom,TextWrappingType}=d;
const F={ascii:"Arial",hAnsi:"Arial",cs:"Arial",eastAsia:"Arial"};
const NAVY="1F3864",BLUE="2E75B6",ORANGE="C55A11",TEAL="00807F",PALE="EAF2FA",GRID="9DC3E6",GRAY="7F7F7F";
const R=(t,o={})=>new TextRun({text:t,font:F,rightToLeft:true,size:o.s||22,sizeComplexScript:o.s||22,bold:!!o.b,boldComplexScript:!!o.b,color:o.c||"262626"});
const P=(runs,o={})=>new Paragraph({bidirectional:true,alignment:o.a||AlignmentType.CENTER,spacing:{before:o.bf??20,after:o.af??20},children:runs});
const bd=(c,s=6)=>({style:BorderStyle.SINGLE,size:s,color:c});
const nb={style:BorderStyle.NONE,size:0,color:"FFFFFF"};
const box=(c,s)=>({top:bd(c,s),bottom:bd(c,s),left:bd(c,s),right:bd(c,s)});
const C=(children,w,o={})=>new TableCell({width:{size:w,type:WidthType.DXA},columnSpan:o.span,verticalMerge:o.vm,
 verticalAlign:VerticalAlign.CENTER,shading:{type:ShadingType.CLEAR,color:"auto",fill:o.fill||"FFFFFF"},
 borders:o.borders||box(GRID,6),margins:{top:20,bottom:20,left:80,right:80},children});
const img=(f,px)=>new ImageRun({type:"png",data:fs.readFileSync(__dirname+"/../assets/"+f),transformation:{width:px,height:px}});
const W=15478;

// ----- background (header, floating behind text) -----
const bg=new ImageRun({type:"png",data:fs.readFileSync(__dirname+"/../assets/bg.png"),transformation:{width:1123,height:794},
 floating:{horizontalPosition:{relative:HorizontalPositionRelativeFrom.PAGE,offset:0},verticalPosition:{relative:VerticalPositionRelativeFrom.PAGE,offset:0},
 behindDocument:true,allowOverlap:true,wrap:{type:TextWrappingType.NONE}}});
const header=new Header({children:[new Paragraph({children:[bg]})]});

// ----- info row: label / value pairs -----
const LW=1300, VW=[2100,2700,2100,3378];
const info=[["اليوم",CFG.day],["التاريخ",".......  /  .......  /  2026"],["القسم","س5   •   س6"],["التوقيت",CFG.times]];
const infoCells=[];
info.forEach((kv,i)=>{
 infoCells.push(C([P([R(kv[0],{b:true,c:"FFFFFF",s:20})])],LW,{fill:NAVY,borders:box(NAVY,6)}));
 infoCells.push(C([P([R(kv[1],{b:true,c:NAVY,s:i==3?20:24})])],VW[i],{fill:PALE,borders:{...box(GRID,6),top:bd(NAVY,6),bottom:bd(NAVY,6)}}));
});
const infoT=new Table({width:{size:W,type:WidthType.DXA},columnWidths:[LW,VW[0],LW,VW[1],LW,VW[2],LW,VW[3]],visuallyRightToLeft:true,
 rows:[new TableRow({height:{value:540,rule:HeightRule.ATLEAST},children:infoCells})]});

// ----- class strip: pill + الفترة / اليوم ; learning mode -----
const PW=900,FW=4300,MW=W-2*(PW+FW);
const fldf=(lv)=>{const p=(CFG.period||{})[lv];return [R("الفترة:  ",{b:true,s:20,c:GRAY}),p?R(p,{s:20,b:true,c:NAVY}):R("..............",{s:20,c:"A6A6A6"}),R("          اليوم:  ",{b:true,s:20,c:GRAY}),R("..............",{s:20,c:"A6A6A6"})];};
const strip=new Table({width:{size:W,type:WidthType.DXA},columnWidths:[PW,FW,PW,FW,MW],visuallyRightToLeft:true,rows:[
 new TableRow({height:{value:520,rule:HeightRule.ATLEAST},children:[
  C([P([R("س5",{b:true,c:"FFFFFF",s:26})])],PW,{fill:BLUE,borders:box(BLUE,6)}),
  C([P(fldf("س5"))],FW,{borders:{...box(BLUE,6),left:bd(BLUE,6)}}),
  C([P([R("س6",{b:true,c:"FFFFFF",s:26})])],PW,{fill:ORANGE,borders:box(ORANGE,6)}),
  C([P(fldf("س6"))],FW,{borders:box(ORANGE,6)}),
  C([P([R("نمط التعلّم:   ",{b:true,s:20,c:NAVY}),R("◯ منهجي    ◯ إدماجي    ◯ تقييمي    ◯ دعم وعلاج",{s:20,c:"404040"})])],MW,{fill:PALE,borders:box(NAVY,6)}),
 ]})]});

// ----- main table -----
const cw=[1350,2400,3376,3376,3376,1600];
const heads=["القسم","النشاط / التوقيت","الهدف المميّز","المحتوى","هدف الحصة","المهارات الحياتية"];
const th=new TableRow({tableHeader:true,height:{value:480,rule:HeightRule.EXACT},children:heads.map((h,i)=>
 C([P([R(h,{b:true,c:"FFFFFF",s:i==5?18:22})])],cw[i],{fill:NAVY,borders:{top:bd(NAVY,6),left:bd("FFFFFF",6),right:bd("FFFFFF",6),bottom:bd(ORANGE,24)}}))});
const SUB={"رياضيات":[BLUE,"EEF5FC","ic_math.png"],"تربية تشكيلية":[ORANGE,"FDF1E9","ic_art.png"],"تربية إسلامية":[TEAL,"E8F5F5","ic_isl.png"],
 "تاريخ":["8C6D1F","F8F2E3","ic_hist.png"],"جغرافيا":["1F8FB0","E6F4F9","ic_geo.png"],"تربية مدنية":["7030A0","F3EAF9","ic_civ.png"],
 "تربية موسيقية":["C0006F","FBE8F2","ic_mus.png"],"إيقاظ علمي":["548235","EFF6EA","ic_sci.png"]};
const LV={"س5":[BLUE,"DEEBF7",CFG.range["س5"]],"س6":[ORANGE,"FBE5D6",CFG.range["س6"]]};
const acts=CFG.acts;
const rows=acts.map((a,i)=>{
 const [sc,sf,ic]=SUB[a[0]];const [lc,lf,lt]=LV[a[1]];
 const first=i==0||acts[i-1][1]!==a[1];
 const top=(i>0&&first)?bd(NAVY,18):bd(GRID,6);
 const B={top,bottom:bd(GRID,6),left:bd(GRID,6),right:bd(GRID,6)};
 const cells=[C(first?[P([R(a[1],{b:true,s:36,c:lc})],{af:40}),P([R(lt,{s:16,c:lc,b:true})])]:[P([])],cw[0],
   {fill:lf,vm:first?VerticalMergeType.RESTART:VerticalMergeType.CONTINUE,borders:{...B,top:(i>0&&first)?bd(NAVY,18):B.top}}),
  C([P([img(ic,20),R("  "+a[0],{b:true,s:22,c:sc})],{bf:0,af:10}),
     P([R(a[2],{b:true,s:20})],{bf:0,af:0}),P([R(a[3],{s:16,c:GRAY})],{bf:0})],cw[1],{fill:sf,borders:B})];
 const L=a[4]||{};
 const bul=(arr,sz)=>arr.map(t=>new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,numbering:{reference:'b',level:0},spacing:{before:10,after:30},children:[R(t,{s:sz})]}));
 const fill=[L.goal?bul(L.goal,18):null, L.content?bul(L.content,18):null,
   L.aim?[P([R(L.aim,{s:18})],{a:AlignmentType.BOTH})]:null, L.skills?L.skills.map(t=>P([R(t,{s:16,b:true,c:sc})],{af:30})):null];
 for(let k=2;k<6;k++)cells.push(new TableCell({width:{size:cw[k],type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,borders:B,
   margins:{top:40,bottom:40,left:110,right:110},children:fill[k-2]||[P([])]}));
 return new TableRow({height:{value:Math.min(1840,Math.floor(7440/CFG.acts.length)),rule:HeightRule.EXACT},cantSplit:true,children:cells});
});
const main=new Table({width:{size:W,type:WidthType.DXA},columnWidths:cw,visuallyRightToLeft:true,
 borders:{...box(NAVY,14),insideHorizontal:bd(GRID,6),insideVertical:bd(GRID,6)},rows:[th,...rows]});

const sp=(n)=>new Paragraph({spacing:{before:0,after:n,line:120},children:[]});
const doc=new Document({numbering:{config:[{reference:'b',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.RIGHT,style:{paragraph:{indent:{left:220,hanging:170}},run:{color:'2E75B6'}}}]}]},styles:{default:{document:{run:{font:F,size:22}}}},sections:[{headers:{default:header},properties:{page:{
 size:{width:11906,height:16838,orientation:PageOrientation.LANDSCAPE},margin:{top:980,bottom:600,left:680,right:680,header:100,footer:100}}},
 children:[infoT,sp(60),strip,sp(100),main,new Paragraph({spacing:{before:0,after:0,line:40},children:[new TextRun({text:"",size:2})]})]}]});
Packer.toBuffer(doc).then(b=>fs.writeFileSync(CFG.out,b));
