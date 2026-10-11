import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt, numpy as np, random
from matplotlib.patches import Ellipse, Circle, Polygon, Rectangle, FancyBboxPatch, Wedge, PathPatch
from matplotlib.path import Path
random.seed(7)
NAVY="#1F3864"; BLUE="#2E75B6"; ORANGE="#C55A11"; TEAL="#00807F"; GREEN="#548235"

# ---------- page background (A4 landscape, cm units) ----------
fig=plt.figure(figsize=(29.7/2.54,21/2.54),dpi=300); ax=fig.add_axes([0,0,1,1]); ax.set_xlim(0,29.7); ax.set_ylim(0,21); ax.axis("off")

def blob(pts,color,alpha):
    verts=pts+[pts[0]]; codes=[Path.MOVETO]+[Path.CURVE3]*(len(pts)-1)+[Path.CURVE3]
    ax.add_patch(Polygon(pts,closed=True,fc=color,ec="none",alpha=alpha))
# corner waves (smooth via many points)
def wave_corner(cx,cy,sx,sy,color,alphas):
    for i,a in enumerate(alphas):
        r=4.2-i*1.1
        t=np.linspace(0,np.pi/2,80)
        xs=cx+sx*(r*np.cos(t)*1.6); ys=cy+sy*(r*np.sin(t))
        pts=[(cx,cy)]+list(zip(xs,ys))
        ax.add_patch(Polygon(pts,closed=True,fc=color,ec="none",alpha=a))
wave_corner(29.7,21,-1,-1,BLUE,[0.10,0.16,0.30])
wave_corner(0,0,1,1,ORANGE,[0.10,0.16,0.28])
# dot grids in other corners
for (x0,y0,sx,sy,c) in [(0.5,20.5,1,-1,BLUE),(29.2,0.5,-1,1,ORANGE)]:
    for i in range(6):
        for j in range(4):
            ax.add_patch(Circle((x0+sx*i*0.32,y0+sy*j*0.32),0.045,fc=c,alpha=0.35))

def atom(x,y,s,c,a):
    for ang in (0,60,120): ax.add_patch(Ellipse((x,y),s,s*0.36,angle=ang,fc="none",ec=c,lw=1.3,alpha=a))
    ax.add_patch(Circle((x,y),s*0.08,fc=c,alpha=a))
def flask(x,y,s,c,a):
    p=[(x-s*0.12,y+s*0.5),(x+s*0.12,y+s*0.5),(x+s*0.12,y+s*0.15),(x+s*0.45,y-s*0.45),(x-s*0.45,y-s*0.45),(x-s*0.12,y+s*0.15)]
    ax.add_patch(Polygon(p,closed=True,fc="none",ec=c,lw=1.3,alpha=a))
    ax.add_patch(Polygon([(x-s*0.3,y-s*0.2),(x+s*0.3,y-s*0.2),(x+s*0.45,y-s*0.45),(x-s*0.45,y-s*0.45)],fc=c,ec="none",alpha=a*0.5))
    for dx,dy,r in [(0.05,0.3,0.05),(-0.04,0.45,0.035),(0.08,0.62,0.03)]: ax.add_patch(Circle((x+s*dx,y+s*dy),s*r,fc="none",ec=c,lw=1,alpha=a))
def dna(x,y,s,c,a):
    t=np.linspace(0,2*np.pi,60); xs=x-s/2+s*t/(2*np.pi)
    y1=y+s*0.18*np.sin(t*1.5); y2=y-s*0.18*np.sin(t*1.5)
    ax.plot(xs,y1,c=c,lw=1.3,alpha=a); ax.plot(xs,y2,c=c,lw=1.3,alpha=a)
    for k in range(0,60,6): ax.plot([xs[k],xs[k]],[y1[k],y2[k]],c=c,lw=0.9,alpha=a)
def bulb(x,y,s,c,a):
    ax.add_patch(Circle((x,y+s*0.1),s*0.3,fc="none",ec=c,lw=1.3,alpha=a))
    ax.add_patch(Rectangle((x-s*0.13,y-s*0.38),s*0.26,s*0.2,fc="none",ec=c,lw=1.2,alpha=a))
    for ang in np.linspace(20,160,5):
        r=np.radians(ang); ax.plot([x+s*0.4*np.cos(r),x+s*0.52*np.cos(r)],[y+s*0.1+s*0.4*np.sin(r),y+s*0.1+s*0.52*np.sin(r)],c=c,lw=1.1,alpha=a)
def book(x,y,s,c,a):
    ax.add_patch(Polygon([(x,y-s*0.25),(x-s*0.5,y-s*0.15),(x-s*0.5,y+s*0.3),(x,y+s*0.2)],fc="none",ec=c,lw=1.3,alpha=a))
    ax.add_patch(Polygon([(x,y-s*0.25),(x+s*0.5,y-s*0.15),(x+s*0.5,y+s*0.3),(x,y+s*0.2)],fc="none",ec=c,lw=1.3,alpha=a))
    for k in (0.0,0.12):
        ax.plot([x-s*0.4,x-s*0.1],[y+s*(0.05+k)-0.02,y+s*(0.0+k)],c=c,lw=0.8,alpha=a)
        ax.plot([x+s*0.1,x+s*0.4],[y+s*(0.0+k),y+s*(0.05+k)-0.02],c=c,lw=0.8,alpha=a)
def magnifier(x,y,s,c,a):
    ax.add_patch(Circle((x-s*0.08,y+s*0.08),s*0.25,fc="none",ec=c,lw=1.4,alpha=a))
    ax.plot([x+s*0.1,x+s*0.38],[y-s*0.1,y-s*0.38],c=c,lw=2.4,alpha=a,solid_capstyle="round")
def setsq(x,y,s,c,a):
    ax.add_patch(Polygon([(x-s*0.45,y-s*0.35),(x+s*0.45,y-s*0.35),(x-s*0.45,y+s*0.45)],fc="none",ec=c,lw=1.3,alpha=a))
    ax.add_patch(Polygon([(x-s*0.3,y-s*0.22),(x+s*0.05,y-s*0.22),(x-s*0.3,y+s*0.12)],fc="none",ec=c,lw=1,alpha=a))
def gear(x,y,s,c,a):
    n=8; pts=[]
    for i in range(n*2):
        ang=np.pi*i/n; r=s*(0.42 if i%2==0 else 0.32)
        for d in (-0.18,0.18): pts.append((x+r*np.cos(ang+d*np.pi/n*2.2),y+r*np.sin(ang+d*np.pi/n*2.2)))
    ax.add_patch(Polygon(pts,closed=True,fc="none",ec=c,lw=1.2,alpha=a)); ax.add_patch(Circle((x,y),s*0.12,fc="none",ec=c,lw=1.1,alpha=a))
def txt(x,y,t,s,c,a,rot): ax.text(x,y,t,fontsize=s,color=c,alpha=a,rotation=rot,ha="center",va="center",family="DejaVu Sans",fontweight="bold")

icons=[atom,flask,dna,bulb,book,magnifier,setsq,gear]
formulas=["π","√x","E=mc²","a²+b²=c²","∑","H₂O","∞","÷","×","∫","Δ","%"]
cols=[BLUE,NAVY,TEAL,ORANGE,GREEN]
# top band items (y 19.6 - 20.6), avoid corners
xs=np.linspace(5.0,24.8,14)
for i,x in enumerate(xs):
    y=20.05+random.uniform(-0.3,0.3); c=cols[i%len(cols)]
    if i%2==0: icons[(i//2)%len(icons)](x,y,0.9,c,0.42)
    else: txt(x,y,formulas[(i//2)%len(formulas)],12,c,0.40,random.uniform(-15,15))
# bottom band (y 0.35-0.75)
for i,x in enumerate(np.linspace(5.5,24,14)):
    y=0.6+random.uniform(-0.12,0.12); c=cols[(i+2)%len(cols)]
    if i%2==1: icons[(i//2+3)%len(icons)](x,y,0.6,c,0.35)
    else: txt(x,y,formulas[(i//2+5)%len(formulas)],9,c,0.35,random.uniform(-15,15))
# thin accent lines
ax.plot([4.5,25.2],[19.35,19.35],c=BLUE,lw=0.8,alpha=0.35)
ax.plot([4.5,25.2],[1.05,1.05],c=ORANGE,lw=0.8,alpha=0.35)
fig.savefig("bg.png",dpi=300); plt.close(fig)

# ---------- subject badges ----------
def badge(name,color,draw):
    f=plt.figure(figsize=(1,1),dpi=160); a=f.add_axes([0,0,1,1]); a.set_xlim(0,1); a.set_ylim(0,1); a.axis("off")
    a.add_patch(Circle((0.5,0.5),0.48,fc=color)); a.add_patch(Circle((0.5,0.5),0.43,fc="none",ec="white",lw=1.2,alpha=0.6))
    draw(a); f.savefig(name,dpi=160,transparent=True); plt.close(f)
def math_draw(a):
    w=dict(c="white",lw=4,solid_capstyle="round")
    a.plot([0.24,0.42],[0.66,0.66],**w); a.plot([0.33,0.33],[0.57,0.75],**w)
    a.plot([0.58,0.76],[0.66,0.66],**w)
    a.plot([0.26,0.40],[0.27,0.41],**w); a.plot([0.26,0.40],[0.41,0.27],**w)
    a.plot([0.58,0.76],[0.34,0.34],**w); a.add_patch(Circle((0.67,0.43),0.03,fc="white")); a.add_patch(Circle((0.67,0.25),0.03,fc="white"))
def art_draw(a):
    a.add_patch(Ellipse((0.5,0.5),0.62,0.5,angle=15,fc="white"))
    a.add_patch(Circle((0.62,0.4),0.06,fc=ORANGE))
    for (x,y,c) in [(0.36,0.58,BLUE),(0.5,0.65,GREEN),(0.65,0.58,"#E2B100"),(0.36,0.42,"#C00000")]: a.add_patch(Circle((x,y),0.05,fc=c))
def isl_draw(a):
    a.add_patch(Circle((0.45,0.5),0.24,fc="white")); a.add_patch(Circle((0.53,0.54),0.21,fc=TEAL))
    t=np.linspace(0,2*np.pi,11)[:-1]+np.pi/2; r=np.where(np.arange(10)%2==0,0.11,0.045)
    a.add_patch(Polygon(list(zip(0.66+r*np.cos(t),0.52+r*np.sin(t))),fc="white"))
badge("ic_math.png",BLUE,math_draw); badge("ic_art.png",ORANGE,art_draw); badge("ic_isl.png",TEAL,isl_draw)

# ---- extra subject badges ----
HIST="#8C6D1F"; GEO="#1F8FB0"; CIV="#7030A0"; MUS="#C0006F"; SCI="#548235"
def hist_draw(a):  # hourglass
    a.add_patch(Polygon([(0.32,0.74),(0.68,0.74),(0.5,0.5),(0.68,0.26),(0.32,0.26),(0.5,0.5)],fc="none",ec="white",lw=2.5))
    a.plot([0.28,0.72],[0.76,0.76],c="white",lw=3.5); a.plot([0.28,0.72],[0.24,0.24],c="white",lw=3.5)
    a.add_patch(Polygon([(0.38,0.30),(0.62,0.30),(0.5,0.42)],fc="white"))
def geo_draw(a):   # globe
    a.add_patch(Circle((0.5,0.5),0.26,fc="none",ec="white",lw=2.5))
    a.add_patch(Ellipse((0.5,0.5),0.22,0.52,fc="none",ec="white",lw=1.8))
    a.plot([0.24,0.76],[0.5,0.5],c="white",lw=1.8); a.plot([0.29,0.71],[0.63,0.63],c="white",lw=1.4); a.plot([0.29,0.71],[0.37,0.37],c="white",lw=1.4)
def civ_draw(a):   # balance scale
    w=dict(c="white",lw=2.6,solid_capstyle="round")
    a.plot([0.5,0.5],[0.26,0.74],**w); a.plot([0.26,0.74],[0.66,0.66],**w); a.plot([0.38,0.62],[0.26,0.26],**w)
    for x in (0.3,0.7):
        a.plot([x,x-0.08],[0.66,0.48],c="white",lw=1.4); a.plot([x,x+0.08],[0.66,0.48],c="white",lw=1.4)
        a.add_patch(Wedge((x,0.48),0.1,180,360,fc="white"))
def mus_draw(a):   # double note
    a.add_patch(Ellipse((0.36,0.32),0.17,0.12,angle=20,fc="white")); a.add_patch(Ellipse((0.64,0.38),0.17,0.12,angle=20,fc="white"))
    a.plot([0.435,0.435],[0.34,0.72],c="white",lw=3); a.plot([0.715,0.715],[0.40,0.78],c="white",lw=3)
    a.add_patch(Polygon([(0.425,0.72),(0.725,0.78),(0.725,0.70),(0.425,0.64)],fc="white"))
def sci_draw(a):   # flask
    a.add_patch(Polygon([(0.44,0.76),(0.56,0.76),(0.56,0.56),(0.72,0.28),(0.28,0.28),(0.44,0.56)],fc="none",ec="white",lw=2.4))
    a.add_patch(Polygon([(0.36,0.42),(0.64,0.42),(0.72,0.28),(0.28,0.28)],fc="white"))
    a.add_patch(Circle((0.47,0.5),0.025,fc="white")); a.add_patch(Circle((0.54,0.6),0.02,fc="white"))
badge("ic_hist.png",HIST,hist_draw); badge("ic_geo.png",GEO,geo_draw); badge("ic_civ.png",CIV,civ_draw)
badge("ic_mus.png",MUS,mus_draw); badge("ic_sci.png",SCI,sci_draw)
