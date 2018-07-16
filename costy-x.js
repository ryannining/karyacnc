function $(id) {
  return document.getElementById(id);
}
sqrt=Math.sqrt;
sqr=function(x){return x*x;}

function log(text) {
  $('log').value += text + '\n';
}

function getvalue(el){
	return $(el).value;
}
function setvalue(el,val){
	$(el).value=val;
}
function setevent(ev,bt,act){
	$(bt).addEventListener(ev, act,false);
}

function setclick(bt,act){
	setevent("click",bt,act);
}
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}


var div = ""; //= $('mytext');
var area_dimension = $('area_dimension');
var div1; // = $('mytext1');

var text1;

function mround(x) {
    return Math.round(x * 100.0) / 100.0;
}
var X1 = 0;
var Y1 = 0;
var lenmm = 0;
var lastf = 0;
var x1 = 0;
var y1 = 0;
var xmin = 100000;
var ymin = 100000;
var xmax = 0;
var ymax = 0;
var sxmin = 100000;
var symin = 100000;
var sxmax = 0;
var symax = 0;
var calcmax=0;

var gcodes = [];
var harga=1000;
var cncz=0;


function gcoden(g, f, x2, y2) {
    div = div + 'G' + g + ' F' + (f) + ' X' + mround(x2) + ' Y' + mround(y2) + '\n';
    x1 = x2;
    y1 = y2;
    lastf = f;
    xmin = Math.min(xmin, x2);
    ymin = Math.min(ymin, y2);
    xmax = Math.max(xmax, x2);
    ymax = Math.max(ymax, y2);
}

function gcode0(f, x2, y2) {
    gcoden(0, f, x2, y2);
}

function gcode1(f, x2, y2) {
    x1 -= x2;
    y1 -= y2;
    lenmm = lenmm + sqrt(x1 * x1 + y1 * y1);
    gcoden(1, f, x2, y2);
}
var sgcodes = [];

/*

lines = [[f,x,y,len],...]

len is total length until this point

*/

function isClockwise(poly,px=1,py=2) {
    var sum = 0;
    for (var i=0; i<poly.length-1; i++) {
        var cur = poly[i];
        var next = poly[i+1];
        sum += (next[px] - cur[px]) * (next[py] + cur[py]);
    }
    return sum > 0;
}
function sharp(poly,px=1,py=2,idx=0,num=2) {
    var sum = 0;
	ci=idx;
	nci=ci+1;
	pci=ci-1;
	if (nci>=poly.length)nci-=poly.length;
	if (pci<0)pci+=poly.length;
	prev = poly[pci];
	cur = poly[ci];
	next = poly[nci];
	
	vec1=[prev[px]-cur[px],prev[py]-cur[py]];
	vec2=[next[px]-cur[px],next[py]-cur[py]];
	
	
	
	d1=sqrt(vec1[0]*vec1[0]+vec1[1]*vec1[1]);
	d2=sqrt(vec2[0]*vec2[0]+vec2[1]*vec2[1]);
	sum = (vec1[0]/d1 * vec2[0]/d2) + (vec1[1]/d1 * vec2[1]/d2);
    return (sum);
}
var jmltravel=0;
function draw_line(num, lcol, lines) {
   if (sxmax < sxmin);
   var dpm = 440.0 / (sxmax);
   dpm = Math.min(dpm, 440.0 / (symax));
   var x = lx / dpm;
   var y = ly / dpm;
   var cxmin = 100000;
   var cymin = 100000;
   var cxmax = 0;
   var cymax = 0;
   var n = 0;
   var sc=1;
   if ($("flipx").checked)sc=-1;
   var ro=1;
   if ($("rotate").checked)ro=-1;
   var c = $("myCanvas1");
   //alert(c);
   var ctx = c.getContext("2d");
   ctx.font = "8px Arial";
   var g = 0;
   var X1=0;
   var Y1=0;
   var srl=[];
   tl=0;
   
   seg=$("segment").checked;

   start=0;
   sharpv=$("sharp").value;
   lsx=-10;
   lsy=0;
   
   for (var ii=0;ii<lines.length;ii++){
      g = ii;
	  i=ii;+start;
	  if (i>=lines.length)i-=lines.length; 	
	  
	  tl=lines[i][3];
      x=lines[i][1];
      y=lines[i][2];
	  if (seg){
		  sr=sharp(lines,1,2,i);
		  if ((sr>sharpv)|| (ii==0)|| (ii==lines.length-1)) {
			  sx=x*dpm;
			  sy=y*dpm;
			  if (!srl.length || (sqrt(sqr(lsx-sx)+sqr(lsy-sy))>10)){
				  srl.push([x*dpm,y*dpm,sr,tl,i]);
				  lsx=sx;
				  lsy=sy;
			  }
			
		  }
      }
	  if (ro==-1){
         xx=x;
         x=y;
         y=xx;
      }
      if (sc==-1)x=sxmax-x;
      if (g >= 0) {
           ctx.beginPath();
           if (g == 0) {X1=x*dpm;Y1=y*dpm;jmltravel++;ctx.strokeStyle = "#88888888";}
           if (g > 0) ctx.strokeStyle = lcol;
           cxmin = Math.min(cxmin, x);
           cymin = Math.min(cymin, y);
           cxmax = Math.max(cxmax, x);
           cymax = Math.max(cymax, y);
           ctx.moveTo(lx, ly);
           lx = x * dpm;
           ly = y * dpm;
           ctx.lineTo(lx, ly);
		   //ctx.arc(lx,ly,2,0,2*Math.PI);
           ctx.stroke();
      }
      //ctx.endPath();
   }
   d1=sqrt(sqr(lx-X1)+sqr(ly-Y1))/dpm;
   ctx.beginPath();
   ctx.moveTo(lx, ly);
   ctx.lineTo(X1, Y1);
   ctx.stroke();
   //ctx.endPath();
   srl.push([X1,Y1,0,tl+d1,0]);
   if (seg) {
		ctx.font = "10px Arial";
		sg="[#"+num+"] ";
	   for (i=0;i<srl.length-1;i++){
		   if (i)sg+=",";
		   
		ctx.beginPath();
		ctx.strokeStyle = getRandomColor();
		ctx.arc(srl[i][0],srl[i][1],3,0,2*Math.PI);

		ctx.stroke();
		ctx.fillStyle = "#0000cc";
		ni=i+1;
		if (ni>=srl.length)ni=0;
		ti=Math.floor((srl[i][4]+srl[ni][4])/2);
		l=mround(srl[ni][3]-srl[i][3]);
		sg+=l;
		ctx.fillText(l,(lines[ti][1]*dpm)+10,(lines[ti][2]*dpm)+10);
	   }
	   $("segm").value+=sg+"\n";
	}
   //+" W:"+mround(cxmax-cxmin)+" H:"+mround(cymax-cymin)+" "
   if (cxmin < cxmax) ctx.fillText("#" + num,dpm*((cxmax-cxmin)/2+cxmin),dpm*cymax+10);
}
var lastz=0;
function lines2gcode(num,data,z,cuttabz) {
   // the idea is make a cutting tab in 4 posisiton,:
   //
   var len=Math.abs(data[0]);
   if (len<50)cuttabz=z;
   var lenc=0;
   var cuttablen=8;
   var cut=[];
   if (len>150) {
	lc=len/4;
   } else {
	lc=len/2;
   }
   slc=lc/2;
   cut[0]=lc-slc - cuttablen;
   cut[1]=lc*2-slc - cuttablen;
   cut[2]=lc*3-slc - cuttablen;
   cut[3]=lc*4-slc - cuttablen;
   
   
   cutat=0;
   var X1=data[2];
   var Y1=data[3];
   var lines=data[4];
   var sc=1;
   if ($("flipx").checked){
      sc=-1;
      X1=sxmax-X1;
   }
   var ro=1;
   if ($("rotate").checked){
      ro=-1;
      XX=X1;
      X1=Y1;
      Y1=XX;
   }

   var lx=X1;
   var ly=Y1;

   // turn off tool and move up if needed
  var cmd = getvalue('cmode');
  var pw1 = 1;
  var pw2 = 0;//getvalue('pwm');
  var pup = getvalue('pup');
  var pdn = getvalue('pdn');
  var f1 = getvalue('trav') * 60;
  var f2 =getvalue('feed') * 60;
  if (cmd == 2) {
       pw1 = pw2;
       f1 = f2;
  }

   div="";
   if (sxmax < sxmin) return cdiv;
   // deactivate tools and move to cut position
   div = div + "\n;SHAPE #"+num+"\n";
   if (pw2) div = div + "M106 S" + pw1 + "\n";
   div = div + pup + '\n';
   if (cmd==2){
      gcode0(f1,X1,0);
   }
   gcode0(f1,X1,Y1);

   if (cmode==3)div = div + "G0 Z"+lastz+"\n";
   lastz=z;

   // activate tools and prepare the speed
   if (pw2) div = div + "M106 S" + pw2 + "\n";
   div = div + pdn.replace("=cncz",mround(z)) + '\n';
   var incut=0;
   for (var i=0;i<lines.length;i++){
      x=lines[i][1];
      y=lines[i][2];
      if (sc==-1){
         x=sxmax-x;
      }
      if (ro==-1){
         xx=x;
         x=y;
         y=xx;
      }
      var iscut=0;
      if ((cuttabz>z) && (cutat<4)) {
         // if cut1 is in lenc and lencnext then cut the line
         // and dont increase the i counter
         if ((cut[cutat]>=lenc) && (cut[cutat]<=lines[i][3])){
            // split lines
            iscut=1;
            dx=x-lx;
            dy=y-ly;
            llen=lines[i][3]-lenc;
            lcut=cut[cutat]-lenc;
            x=lx+dx*(lcut/llen);
            y=ly+dy*(lcut/llen);
            lenc=cut[cutat];

            //lines[i][1]=x;
            //lines[i][2]=y;
            //lines[i][3]-=lcut;

            if ((incut==1)){
               incut=0;
               cutat++;
            } else {
               incut=1;
               cut[cutat]+=cuttablen;
            }
         }
      }
      gcode1(f2, x, y);
      lx=x;
      ly=y;
      if (iscut){
         if (incut==1){
            // move up
            div = div + pdn.replace("=cncz",mround(cuttabz)) + '\n';
         } else {
            // move back down
            div = div + pdn.replace("=cncz",mround(z)) + '\n';
         }
         i--;
      } else {
         lenc=lines[i][3];
      }
   }
   //close loop
   gcode1(f2, X1, Y1);
   if (cmd == 2) {
      // if foam mode must move up
        gcode0(f1,X1,0);
    }
    gcode0(f1,X1,Y1);

   return div;
}
function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function gcode_verify() {
    var c = $("myCanvas1");
    //alert(c);
    lx = 0;
    ly = 0;
    jmltravel=0;
    var ctx = c.getContext("2d");
    var sfinal = 0;
	$("segm").value="";
    ctx.clearRect(0, 0, c.width, c.height);
    for (var i = 0; i < sgcodes.length; i++) {
        draw_line(i + 1, getRandomColor(), sgcodes[i][4]);
        sfinal += Math.abs(sgcodes[i][0]);
    }
    //sfinal+=jmltravel*10;
    ctx.font = "12px Arial";
    w=mround((xmax - xmin)/10);
    h=mround((ymax - ymin)/10);
    ctx.fillText("W:" + w + " H:" + h + " Luas:"+mround(w*h)+" cm2", 0, c.height - 20);
    var menit=mround((sfinal+jmltravel*10) / getvalue('feed') / 60.0);
    var re = getvalue("repeat");
    menit=menit*re;
	text=$("material");
	mat=text.options[text.selectedIndex].innerText;
    area_dimension.innerHTML = 'Total Length =' + mround(sfinal) + "mm Time:" + menit + " menit <br>Biaya Cut:" + Math.round(menit*1500)+" bahan ("+mat+"):"+mround(w*h*harga)+" TOTAL:"+mround(menit*1500+w*h*harga);
}

function sortedgcode() {
    sgcodes = [];
    sxmax=xmax;
    symax=ymax;
    sxmin=xmin;
    symin=ymin;
    xmax=-10000;
    ymax=-10000;
    xmin=100000;
    ymin=100000;
    var sm = -1;
    var divs = '';
    var lx=0;
    var ly=0;
    for (var j = 0; j < gcodes.length; j++) {
        var cs = -1;
        var bg = 10000000;
        for (var i = 0; i < gcodes.length; i++) {

            var dx=gcodes[i][2]-lx;
            var dy=gcodes[i][3]-ly;
            var dis=sqrt(dx*dx+dy*dy)+gcodes[i][0];
            if ((gcodes[i][0] > 0) && (dis < bg)) {
                cs = i;
                bg = dis;
            }
        }
        // smalles in cs
        if (cs >= 0) {
            sgcodes.push(gcodes[cs]);
            gcodes[cs][0]=-gcodes[cs][0];
            lx=gcodes[cs][2];
            ly=gcodes[cs][3];
            divs = divs + gcodes[cs][1];
        }
    }
    var re = getvalue("repeat");
    s = "";//;Init machine\n;===============\nM206 P80 S20 ;x backlash\nM206 P84 S20 ;y backlash\nM206 P88 S20 ;z backlash\n;===============\n";
    cncdeep=- getvalue("zdown");
    cncz=cncdeep/re;
    var cuttab=0;
    lastz=0;

    var cmd = getvalue('cmode');
    cuttab=cncdeep+getvalue("tabc")*1;
    for (var i = 0; i < re; i++) {
      for (var j=0;j<sgcodes.length;j++){
        s += lines2gcode(j+1,sgcodes[j],cncz,cuttab);
     }
     cncz+=cncdeep/re;
    }
    s=s+getvalue("pup");
    s = s + '\nG00 F3000 Y0 \n G00 X0\n';
    setvalue("gcode",s);
    sc=1;
    if ($("flipx").checked) sc=-1;
    setvalue("pgcode",getvalue("pup")+"\nM3 S255 P10\nG0 F10000 X" + mround(sc*xmin) + " Y" + mround(ymin) + "\nM3 S255 P10\nG0 X" + mround(sc*xmax) + "\nM3 S255 P10\nG0 Y" + mround(ymax) + "\nM3 S255 P10\nG0 X" + mround(sc*xmin) + " \nM3 S255 P10\nG0 Y" + mround(ymin) + "\n");
}

////////////////////////////////////////////////////////////////////////////////////////////


function destroyClickedElement(event) {
    document.body.removeChild(event.target);
}

var lines=[];

function myFunction(scale1) {
    //text1=Potrace.getSVG(1);
    //alert(text1);
    var contor = 0;
    var xincep = 0;
    var yincep = 0;
    var p1x = 0;
    var p1y = 0;
    var p2x = 0;
    var p2y = 0;
    var xsfar = 0;
    var ysfar = 0;
    var n1 = 0;
    lines=[];
    var scale = 25.4 / getvalue('scale');
    if (scale1) scale = 1;
    //var division = $('division').value;

    //path d="M111.792 7.750 C 109.785 10.407,102.466 13.840,100.798 12.907 C
    //$("gsvg").value=text1;
    var cmd = getvalue('cmode');
    var pw1 = 1;
    var pw2 = 0;//getvalue('pwm');
    var pup = getvalue('pup');
    var pdn = getvalue('pdn');
    var f1 = getvalue('trav') * 60;
    var f2 =getvalue('feed') * 60;
	var det=getvalue('feed')/15.0; 
	var seg=$("segment").checked;
	if (seg) det*=4;
    if (cmd == 2) {
        pw1 = pw2;
        f1 = f2;
    }
    //alert(cmd);

    var n = text1.indexOf(' d="M');
    n = n + 5;
    var handleM = 1;
    var X1 = 0;
    var Y1 = 0;

    xmin = 100000;
    ymin = 100000;
    xmax = 0;
    ymax = 0;
    gcodes = [];
    x1 = 0;
    y1 = 0;
    x2 = 0;
    y2 = 0;
    div = "";
    lenmm = 0;
    var cnts = 0;
	var line=[];
    //alert(div.innerHTML);
    while (1) {
        if (handleM) {
            var mm = ' ';
            if (text1.charAt(n) == ' ') {
                mm = ',';
                n = n + 1;
            }
            var res = scale * parseFloat(text1.slice(n, n + 10)); // '111.792 7.'
            //res=res*scale;
            //alert(res);
            xincep = res;
            var n = text1.indexOf(mm, n + 1);
            n = n + 1; //7.750 C
            var res = scale * parseFloat(text1.slice(n, n + 10));
            //res=res*scale;
            //alert(res);
            yincep = res;
            cnts = cnts + 1;
            // close shape loop
            if (cnts > 1) {
               gcode1(f2, X1, Y1);
               line.push([f2,X1,Y1,lenmm]);
                if (cmd == 2) {
                   // if foam mode must move up
                    div = div + 'G00 Y0 \n';
                }
                gcodes.push([lenmm, div,X1,Y1,line]);
                lines.push(line);

            }
            line=[];
            div = "";
            lenmm = 0;

            // deactivate tools and move to cut position
            div = div + "\n;SHAPE\n";
            if (pw2) div = div + "M106 S" + pw1 + "\n";
            div = div + pup + '\n';

            X1 = xincep;
            Y1 = yincep;
            gcode0(f1, X1, Y1);
            // activate tools and prepare the speed
            if (pw2) div = div + "M106 S" + pw2 + "\n";
            div = div + pdn + '\n';
            div = div + 'G01 F' + f2 + '\n';

            lastf = f2;
            handleM = 0;
        }
        var n = text1.indexOf(' ', n + 1);
        cr = text1.charAt(n + 1);
        if ((cr >= '0') && (cr <= '9')) {
            var n2 = text1.indexOf(' ', n + 2);
            var xy = text1.slice(n + 1, n2).split(',');
            p1x = xy[0] * scale;
            p1y = xy[1] * scale;
            gcode1(f2, p1x, p1y);
			   line.push([f2,p1x,p1y,lenmm]);
        } else if (cr == 'H') {
            var n2 = text1.indexOf(' ', n + 3);
            var xy = text1.slice(n + 3, n2);
            p1x = xy * scale;

            gcode1(f2, p1x, y1);
			   line.push([f2,p1x,y1,lenmm]);
            n = n + 3;
        } else if (cr == 'V') {
            var n2 = text1.indexOf(' ', n + 3);
            var xy = text1.slice(n + 3, n2);
            p1y = xy * scale;

            gcode1(f2, y1, p1y);
            line.push([f2,y1,p1y,lenmm]);

            n = n + 3;
        } else if (cr == 'C') {
            //path d="M111.792 7.750 C 109.785 10.407,102.466 13.840,100.798 12.907 C
            var res = scale * parseFloat(text1.slice(n + 2, n + 10));
            //res=res*scale;
            //alert(res);
            p1x = res;

            var n = text1.indexOf(' ', n + 3);
            var res = scale * parseFloat(text1.slice(n + 1, n + 10));
            //res=res*scale;
            //alert(res);
            p1y = res;

            var n = text1.indexOf(',', n + 3);
            var res = scale * parseFloat(text1.slice(n + 1, n + 10));
            //res=res*scale;
            //alert(res);
            p2x = res;

            var n = text1.indexOf(' ', n + 3);
            var res = scale * parseFloat(text1.slice(n + 1, n + 10));
            //res=res*scale;
            //alert(res);
            p2y = res;

            var n = text1.indexOf(',', n + 3);
            var res = scale * parseFloat(text1.slice(n + 1, n + 10));
            //res=res*scale;
            //alert(res);
            xsfar = res;

            var n = text1.indexOf(' ', n + 3);
            var res = scale * parseFloat(text1.slice(n + 1, n + 10));
            //res=res*scale;
            //alert(res);
            ysfar = res;

            //*****************************

            var a = p1x - xincep
            var b = p1y - yincep
            var a = sqrt(a * a + b * b);

            var b = p2x - p1x
            var c = p2y - p1y
            var b = sqrt(b * b + c * c);

            var c = xsfar - p2x
            var d = ysfar - p2y
            var c = sqrt(c * c + d * d);

            //g=1/((a+b+c)*division);
            g = det / (a + b + c);
            a = a + b + c;
            //alert('dist ='+a+' pezzi='+g);
            //******************************
            for (i = 0; i < 1; i += g) {

                var x = bezierx(i, xincep, p1x, p2x, xsfar);
                var y = beziery(i, yincep, p1y, p2y, ysfar);
                gcode1(lastf, x, y);
                line.push([lastf,x, y,lenmm]);
            }

            //******************************************************************

            xincep = xsfar;
            yincep = ysfar;
        } else if (cr == 'L') { //alert("este L");

            //div.innerHTML = div.innerHTML +'(este linie) \n\n\n';
            var res = scale * parseFloat(text1.slice(n + 2, n + 10));
            //res=res*scale;
            p1x = res;
            //console.log(res);

            var n = text1.indexOf(' ', n + 3);
            var res = scale * parseFloat(text1.slice(n + 1, n + 10));
            //res=res*scale;
            //console.log(res);
            p1y = res;
            gcode1(lastf, p1x, p1y);
            line.push([lastf,p1x, p1y,lenmm]);

            var n = text1.indexOf(' ', n + 3);
            var res = scale * parseFloat(text1.slice(n + 1, n + 10));
            //res=res*scale;
            //console.log(res);
            p2x = res;

            var n = text1.indexOf(' ', n + 3);
            var res = scale * parseFloat(text1.slice(n + 1, n + 10));
            //res=res*scale;
            //console.log(res);

            p2y = res;
            gcode1(lastf, p2x, p2y);
            line.push([lastf,p2x, p2y,lenmm]);

            xincep = p2x;
            yincep = p2y;

        } else if (cr == 'M') {
            //console.log("este M");
            n = n + 2;
            handleM = 1;
        } else if (text1.slice(n + 1, n + 5) == ' d="M') {
            //console.log("este M");
            n = n + 5;
            handleM = 1;
        } else if (n < 1) {
            //console.log("lenght depasit");
            break;
        } else {
            console.log("unknown :"+text1.slice(n + 1, n + 10));
            var n = text1.indexOf(' d="M', n + 1);
            if (n < 1) break;
            n = n + 5;
            handleM = 1;
        }

    } //sfarsit while

    // close loop
    if (cnts > 0) {
        gcode1(f2, X1, Y1);
        line.push([lastf,X1, Y1,lenmm]);
        if (cmd == 2) {
           // for foam, must move up first
            div = div + 'G00 Y0 \n';
        }
        gcodes.push([lenmm, div,X1,Y1,line]);
        div = "";
    }

    sortedgcode();

} //sfarsit myFunction
//*****************************************************

function bezierx(t, p0, p1, p2, p3) {
    var s = 1 - t;
    var x = s * s * s * p0 + 3 * (s * s * t) * p1 + 3 * (t * t * s) * p2 + t * t * t * p3;
    return x;
}

function beziery(t, p0, p1, p2, p3) {
    var s = 1 - t;
    var y = s * s * s * p0 + 3 * (s * s * t) * p1 + 3 * (t * t * s) * p2 + t * t * t * p3;
    return y;
}
//***********************************************

var openFile = function(event) {
    var input = event.target;

    var reader = new FileReader();
    reader.onload = function() {
        var dataURL = reader.result;
        //var output = $('output');
        //output.src = dataURL;

    };
    reader.readAsDataURL(input.files[0]);
    Potrace.loadImageFromFile(input.files[0]);
    Potrace.process(function() {
        //displayImg();
        //displaySVG(scale);
        text1 = Potrace.getSVG(1);//.toUpperCase();
        refreshgcode();

    });

};

// handle paste image
// We start by checking if the browser supports the
// Clipboard object. If not, we need to create a
// contenteditable element that catches all pasted data
if (!window.Clipboard) {
    var pasteCatcher = document.createElement("div");

    // Firefox allows images to be pasted into contenteditable elements
    pasteCatcher.setAttribute("contenteditable", "");

    // We can hide the element and append it to the body,
    pasteCatcher.style.opacity = 0;
    document.body.appendChild(pasteCatcher);

    // as long as we make sure it is always in focus
    pasteCatcher.focus();
    document.addEventListener("click", function() {
        pasteCatcher.focus();
    });
}
// Add the paste event listener
window.addEventListener("paste", pasteHandler);

/* Handle paste events */
function pasteHandler(e) {
    // We need to check if event.clipboardData is supported (Chrome)
    if (e.clipboardData) {
        // Get the items from the clipboard
        var items = e.clipboardData.items;
        if (items) {
            // Loop through all items, looking for any kind of image

            for (var i = 0; i < items.length; i++) {

                if (items[i].type.indexOf("image") !== -1) {
                    // We need to represent the image as a file,
                    var blob = items[i].getAsFile();
                    // and use a URL or webkitURL (whichever is available to the browser)
                    // to create a temporary URL to the object
                    var URLObj = window.URL || window.webkitURL;
                    var source = URLObj.createObjectURL(blob);

                    // The URL can then be used as the source of an image
                    createImage(source, blob);
                }
            }
        }
        // If we can't handle clipboard data directly (Firefox),
        // we need to read what was pasted from the contenteditable element
    } else {
        // This is a cheap trick to make sure we read the data
        // AFTER it has been inserted.
        setTimeout(checkInput, 1);
    }
}
/*
window.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});
*/
window.addEventListener('Xdrop', function(e) {
    e.stopPropagation();
    e.preventDefault();
    var files = e.dataTransfer.files; // Array of all files

    for (var i = 0, file; file = files[i]; i++) {
        if (file.type.match(/image.*/)) {
            var reader = new FileReader();
            reader.tipe = file.type;
            reader.onload = function(event) {
                var dataURL = reader.result;
                //event.target.result;
                //var output = $('output');
                //output.src = dataURL;

                if (reader.tipe.indexOf("svg") !== -1) {
                    text1 = event.target.result;//.toUpperCase();
                    myFunction(1);
                    gcode_verify();
                } else {}
            };
            if (file.type.indexOf("svg") !== -1) {
                reader.readAsText(file);

            } else {
                reader.readAsDataURL(file);
                Potrace.loadImageFromFile(file);
                Potrace.process(function() {
                    //displayImg();
                    //displaySVG(scale);
                    text1 = Potrace.getSVG(1);//.toUpperCase();

                    refreshgcode();
                });
            }
        }
    }
});

/* Parse the input in the paste catcher element */
function checkInput() {
    // Store the pasted content in a variable
    var child = pasteCatcher.childNodes[0];

    // Clear the inner html to make sure we're always
    // getting the latest inserted content
    pasteCatcher.innerHTML = "";

    if (child) {
        // If the user pastes an image, the src attribute
        // will represent the image as a base64 encoded string.
        if (child.tagName === "IMG") {
            createImage(child.src);
        }
    }
}

/* Creates a new image from a given source */
function createImage(source, blob) {
    var pastedImage = new Image();
    //clear gcode
    pastedImage.onload = function() {
        Potrace.loadImageFromFile(blob);
        Potrace.info.alphamax = getvalue("smooth");
        Potrace.process(function() {
            //displayImg();
            //displaySVG(scale);
            text1 = Potrace.getSVG(1);//.toUpperCase();

            refreshgcode();

        });
    }
    pastedImage.src = source;
}

function createSVG(source, blob) {
    //displaySVG(scale);
    text1 = blob;

    refreshgcode();
}

function refreshgcode() {
    myFunction(0);
    gcode_verify();
    savesetting();
}

function copy_to_clipboard(id) {
    $(id).select();
    document.execCommand('copy');
}


// Web socket server to allow other karyacnc apps send gcode and task to this software