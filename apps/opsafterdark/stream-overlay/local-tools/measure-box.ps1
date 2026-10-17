# Devuelve "x y w h" del rectángulo rojo (R>200,G<60,B<60) de un PNG.
param([string]$Path)
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class Box { public static string Find(string p){
  using(var b=new Bitmap(p)){ var d=b.LockBits(new Rectangle(0,0,b.Width,b.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
  var buf=new byte[d.Stride*b.Height]; Marshal.Copy(d.Scan0,buf,0,buf.Length); b.UnlockBits(d);
  int x0=b.Width,y0=b.Height,x1=-1,y1=-1;
  for(int y=0;y<b.Height;y++)for(int x=0;x<b.Width;x++){int i=y*d.Stride+x*4; if(buf[i+2]>200&&buf[i+1]<60&&buf[i]<60){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}
  return x1<0?"none":x0+" "+y0+" "+(x1-x0+1)+" "+(y1-y0+1);} } }
'@ -ReferencedAssemblies System.Drawing
[Box]::Find((Resolve-Path $Path).Path)
