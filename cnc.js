
function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}
var packages = [];
var compress = [];

function write(w, s) {
    if (s > 0) compress.push(w & 255);
    if (s > 1) compress.push((w >> 8) & 255);
    if (s > 2) compress.push((w >> 16) & 255);
}

var holdpos = 0;

function hold() {
    holdpos = compress.length - 1;
}

var sendg1 = "";



var cntg28 = 0;
var totalgcode = 0;

function endcompress() {}
var lx = -10.0;
var ly = -10.0;
var lz = -10.0;
var le = -10.0;
var lf = -10.0;
var lh = 0;
var ole = 0;
var oxmin = 0;
var oxmax = 0;
var oymin = 0;
var oymax = 0;
var ozmin = 0;
var ozmax = 0;
var eE = 0;
var E = 0;
var F0 = 0;
var F1 = 0;
var isRel = 0;
var overtex = []; // will hold x,y,z
var lines = []; // will hold n1,n2 that index point to vertex

var zdeg = 45;
var xdeg = 35;
var sinz = 0.707;
var cosz = 0.707;
var sinx = 0.707;
var cosx = 0.707;
var filament = 0;
var printtime = 0;

var eMul = 50;
var xyscale=25;
var eBound = 127;
var eSize = 1;

var ln=0;
var warnoverflow=0;
function addgcode(g) {
    // read gcode
	ln++;
    totalgcode += g.length;
    gd = {};
    lv = "";
    lk = "";
    gk = "";
    g = g.toUpperCase();
    for (var i = 0; i < g.length; i++) {
        c = g[i];

        if (".0123456789-".indexOf(c) >= 0) {
            lv += c;
        }
        if ((" ;MGXYZEFST".indexOf(c) >= 0) || (i == g.length - 1)) {
            if (lv) {
                gk += lk;
                gd[lk] = lv * 1;
                lv = "";
            }
            if ("MGXYZEFST".indexOf(c) >= 0) lk = c;
        }
        if (c == ';') break;
    }

    var h = 0;
    var f = 0;
    var s = 0;
    var x = 0;
    // generic Gcode motion process before compress

    if (gk.indexOf('G') + 1) {
        switch (gd['G']) {
            case 90: // absolute
                isRel = 0;
                break;
            case 91:
                isRel = 1;
                break;
        }
    }

    //


    if (gk.indexOf('M') + 1) {
        h = 1;
        switch (gd['M']) {
            case 3: // spindle on
                h |= 0;
                break;
            case 109:
                h |= 1 << 1;
                break;
            case 2:
                h |= 2 << 1;
                break; // final
            default:
                return; // not implemented
        }
        s = gd['S'];
		if (s==undefined)s=255;
        h |= 1 << 3;
        write(h, 1);
        write(s, 1);
        console.log(ln+" M"+gd['M']+" S"+s);
    }
    if (gk.indexOf('G') + 1) {
        h = 0;
        var G = gd['G'];
        switch (G) {
            case 0:
                h |= 0;
                break; // we need bit 1 as identify a repeat header
            case 1:
                h |= 1 << 1;
                break;
            case 28:
                h |= 2 << 1;
                cntg28--;
                break;
            case 92:
                h |= 3 << 1;
                ole = 0;
                E = 0;
                eE = 0;
                console.log("W" + E);
                break;
            default:
                return; // not implemented
        }
        var isF = gk.indexOf('F') + 1;
        var isX = gk.indexOf('X') + 1;
        var isY = gk.indexOf('Y') + 1;
        var isZ = gk.indexOf('Z') + 1;
        var isE = gk.indexOf('E') + 1;
        X = Y = Z = F = S = 0;
        dx = dy = dz = de = 0;
        if (isF) {

            if (G == 1) lf = F1;
            else lf = F0;
            F = Math.min(gd['F'] * 0.0167, 250);
            if (F != lf) lf = F;
            else isF = 0;
            if (G == 1) F1 = lf;
            else F0 = lf;
        }
        if (isX) {
            X = gd['X'] * xyscale;
            if (isRel) X += lx;
            dx = X - lx;
            if (X != lx) lx = X;
            else isX = 0;
			if (Math.abs(X)>31000)warnoverflow=1;
        }
        if (isY) {
            Y = gd['Y'] * xyscale;
            if (isRel) Y += ly;
            dy = Y - ly;
            if (Y != ly) ly = Y;
            else isY = 0;
			if (Math.abs(Y)>31000)warnoverflow=1;
        }
        if (isZ) {
            Z = gd['Z'] * 100;
            if (isRel) Z += lz;
            dz = Z - lz;
            if (Z != lz) lz = Z; // else isZ=0;
        }
        if (isE) {
            E = gd['E'] * eMul;
            if (isRel) E += le;
            le = E;
            //if (E!=le)le=E; else isE=0;
            filament = Math.max(le, filament);
        }

        if (isF) h |= 1 << 3;
        if (isX) h |= 1 << 4;
        if (isY) h |= 1 << 5;
        if (isZ) h |= 1 << 6;
        if (isE) h |= 1 << 7;
        write(h, 1);
        lh = h;

        if (isF) {
            lf = F;
            write(F, 1);
        }
        if (isX) {
            write(X + 30000, 2);
            //log(x);
        }
        if (isY) {
            write(Y + 30000, 2);
        }
        if (isZ) {
            write(Z + 5000, 2);
        }
        if (isE) {
            var de = Math.floor(E - eE);
            //	  if (de<-120) de=-120;
            //	  if (de>120)de=120;
            if (de < -eBound) de = -eBound;
            if (de > eBound) de = eBound;
            //	  de=de;//&0xFFFF;	
            //      ole=E;
            //	  if (de<0)de=0;
            eE = eE + (de);
            write(de + eBound, eSize);
        }
        // save the vertex
        if ((gd['G'] <= 1)) {
            // 3d XYZ to 2D transform
            overtex.push([lx, ly, lz, isE]);
            // add printtime
            printtime += Math.sqrt((dx * dx + dy * dy + dz * dz) * 0.0001) / lf;
        }
        //console.log("G"+gd['G']+" X"+X);
    }
    if (!cntg28) {
        endcompress();
        cntg28 = 2;
    }
}
var cpos = 0;

function read(n) {
    var ac = 0;
    for (var i = 0; i < n; i++) {
        ac += (compress[cpos + i]) << (i * 8);
    }
    cpos += n;
    return ac;
}
var decoding = 0;
var cntg28 = 0;
var rE = 0;



var main_r = 0.5;
var main_g = 1;
var main_b = 0.2;

function randomcolor() {
    main_r = mround(Math.random());
    main_g = mround(Math.random());
    main_b = mround(Math.random());
    var m = Math.max(main_b, Math.max(main_r, main_g));
    main_r /= m;
    main_g /= m;
    main_b /= m;
}
randomcolor();
var letters = '0123456789ABCDEF';

function tohex(v) {
    if (v > 255) v = 255;
    v = Math.floor(v);
    return letters[(v >> 4) & 15] + letters[v & 15];
}

function getColor(v) {
    if (v < 0) v = 0;
    return "#" + tohex(main_r * v) + tohex(main_g * v) + tohex(main_b * v);
}

var sp = 0;
var pv = 0;

function showProgress() {}

function begincompress(paste) {
    oxmax = -100000;
    oxmin = 100000;
    oymax = -100000;
    oymin = 100000;
    ozmax = -100000;
    ozmin = 100000;
    eE = ole = lx = ly = lz = le = lf = 0;

    printtime = 0;
    //init2d(0);

    overtex = []; // will hold x,y,z
    lines = []; // will hold n1,n2 that index point to vertex
    compress = [];
    packages = [];
    isRel = 0;
    totalgcode = 0;
    if (paste) texts = paste.split("\n");
    else texts = getvalue("gcode").split("\n");
    cntg28 = 2;
	ln=0;
	warnoverflow=0;
    for (var i = 0; i < texts.length; i++) {
        addgcode(texts[i]);
        if (i & 31 == 0) pv = i * 100.0 / texts.length;
    }
    h = 1;
    h |= 2 << 1;
    write(h, 1);
	var w="";
	if (warnoverflow) w="Overflow";
	$("alert1").innerHTML=w;
}

function urlopen(s) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://"+getvalue("wsip")+"/" + s, true);
    xhr.onload = function(e) {
        //alert(xhr.response);
		$("alert1").innerHTML=w;
    };
    xhr.send();
}

function startprint() {
    //urlopen("startprint");
    urlopen("startjob?jobname="+getvalue("jobname")+".gcode");
	hideId("btuploadstart");
	hideId("btuploadresume");
	showId2("btuploadstop");
	showId2("btuploadpause");
    stopinfo = 1;
    etime = new Date();
    console.log("Start " + etime);
	setvalue("applog",getvalue("applog")+"Start "+etime+"\n");
	
}
function pauseprint() {
    urlopen("pauseprint");
	hideId("btuploadpause");
	showId2("btuploadresume");
}
function resumeprint() {
    urlopen("resumeprint");
	hideId("btuploadresume");
	showId2("btuploadpause");
}
function resetflashbutton(){
	hideId("btuploadstop");
	hideId("btuploadpause");
	hideId("btuploadresume");
	showId2("btuploadstart");
}
function stopprint() {
    urlopen("stopprint");
}

var mbody = document.getElementById("body");
var gcode = "";

var wemosd1 = 1;
var uploadimage=1;
function upload(fn){
	function uploadjpg(){
		if (!uploadimage)return;
		c=$("myCanvas1");
		c.toBlob(function(blob){
			realupload(blob,fn+".jpg",0);
			},"image/jpeg",0.2);
	}
	realupload(new Blob([new Int8Array(compress).buffer],{type:"text/plain"}),fn,uploadjpg);
}

function realupload(gcode,fname,callback) {
    var xhr = new XMLHttpRequest();
    form = new FormData();
    form.append("file1", gcode, fname);


    xhr.open(
        "POST",
        "http://"+getvalue("wsip")+"/upload",
        true
    );

	//xhr.setRequestHeader('Access-Control-Allow-Headers', '*');
    //xhr.setRequestHeader('Content-type', 'application/ecmascript');
    //xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
	
    var progressBar = $('progress1');
    xhr.onload = function(e) {
        progressBar.value = 0;
        if (!wemosd1) alert(xhr.response);
		resetflashbutton();
		if (callback)callback();
    };
    // Listen to the upload progress.
    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            progressBar.value = (e.loaded / e.total) * 100;
            progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
        }
    };
    xhr.send(form);
}


setclick("btupload", function() {
    begincompress(getvalue("engcode")+"\n"+getvalue("gcode"));
	if(!warnoverflow)upload(getvalue("jobname")+".gcode");
});
setclick("btjob5", function() {
    begincompress(jobs.join("\n"));
	if(!warnoverflow)upload(getvalue("jobname")+".gcode");
});

setclick("btuploadstart",startprint);
setclick("btuploadstop",stopprint);
setclick("btuploadpause",pauseprint);
setclick("btuploadresume",resumeprint);

function Canvas2Clipboard(cid){
    var canvas = $(cid);
    //alert(c);
	canvas.toBlob(function(blob) { 
		const item = new ClipboardItem({ "image/png": blob });
		navigator.clipboard.write([item]); 
	})
}
setclick("btcopycanvas",function(){Canvas2Clipboard("myCanvas1");});


var segsv=[];
var carvetime=0;
var gcodecarve="";
// Path are in pair of x and y -> [x,y,x,y,x,y,x,y,...]
function vcarve(maxr,angle,step,path,dstep,dstep2){
	sqrt=Math.sqrt;
	sqr=function(x){return x*x;}
	// segmentation
	segsv=[];
	var s=0;
	carvetime=0;
	gcodecarve="";
	segmentation=function (path,rev){
		PL=path.length/2;
		var x1,y1,x2,y2,i,dx,dy,L,vx,vy,px,py;
		for (var p=0;p<PL;p++){
			i=p;

			if (rev){
				i=PL-i-1;
			}
			x2=path[i*2+0];
			y2=path[i*2+1];
			
			if (p>0){

				L=(sqrt(sqr(x2-x1)+sqr(y2-y1)));
				if (L>0)
				{
					vx=(x2-x1)/L;
					vy=(y2-y1)/L;
					L=Math.floor(L/step)+1;
					dx=(x2-x1)/L;
					dy=(y2-y1)/L;
					
					for (var j=0;j<L;j++){
						px=x1+(j+.5)*dx;
						py=y1+(j+.5)*dy;
						segsv.push([px,py,s,0,0,0,0,vx,vy,0,0]); // last 3 is to store data
					}
					s++;
					x1=x2;
					y1=y2;
				}
			} else { 
				x1=x2;
				y1=y2;
				segsv.push([x1,y1,-1,x1,y1,0,0,0,0,0,0]); // last 3 is to store data
			}
		}
	}
	var sc=1;
    if ($("flipx").checked) sc = 0;
    if ($("flipve").checked) sc = !sc;
	
	for (var i=0;i<path.length;i++){
		segmentation(path[i],sc);
	}
	// create toolpath
	// s= number of line
	var n=0;
	var gc="M3\nG0 F6000 Z4\nG1 F2000\n";
	ve=1/Math.tan(angle*Math.PI/360);
	var jj,seg2,seg1,mr2;
	var maxz=-maxr*ve;
	var ftrav=getvalue("trav")*60;
	var ffeed=getvalue("feed")*60;
	for (var i=0;i<segsv.length;i++){
		mr2=0; // d squared
		seg1=segsv[i];
		if (seg1[2]==-1){
			// move
			continue;
		}
		if (seg1[6]>0)continue;
		var cx,cy,cz,ox,oy;
		for (var j=0;j<segsv.length;j++){
			seg2=segsv[j];
			if (seg1[2]==seg2[2])continue; // if on same line dont do it
			seg2[9]=sqr(seg1[0]-seg2[0])+sqr(seg1[1]-seg2[1]);
		}
		var r=0;
		for (;r<maxr;r+=dstep2){
			cx=seg1[0]-r*seg1[8];
			cy=seg1[1]+r*seg1[7];
			k2=sqr(r);
			k3=sqr(r*2);
			for (var j=0;j<segsv.length;j++){
				seg2=segsv[j];
				if ((seg1[2]==-1) || (seg1[2]==seg2[2]) ||  (seg2[9]>k3))continue; // if on same line dont do it
				n++;
				r3=sqr(cx-seg2[0])+sqr(cy-seg2[1]);
				if (r3<k2){
					mr2=r;
					break;
				}
			}
			if (mr2)break;
		}
		var r1=r;
		var r2=r;
		var fs=ffeed;
		if (r>1)fs=ffeed/(r);	
		if (!mr2){
			cz=maxz;
		} else {
			// recalculate to get more precission
			for (var r=mr2;r>mr2-dstep2;r-=dstep){
				cx=seg1[0]-r*seg1[8];
				cy=seg1[1]+r*seg1[7];
				r3=sqr(cx-seg2[0])+sqr(cy-seg2[1]);
				//r3=Math.min(r3,sqr(cx-seg2[0]-seg2[7]*step)+sqr(cy-seg2[1]-seg2[8]*step));
				
				if (r3>=sqr(r)){
					break;
				}
			}
			//r1=r;
			//r2=r;
					
			// for other type bit must be different
			cz=-r*ve;
			if (r>1)fs=ffeed/(r);	
			///*
			seg2[3]=cx;
			seg2[4]=cy;
			seg2[5]=cz;
			
			//if (i<jj)r1=r1/2;else r2=r2/2;
			seg2[6]=r;
			seg2[10]=fs;
			//fs=fs*2;
			//*/
			
		}
		seg1[3]=cx;
		seg1[4]=cy;
		seg1[5]=cz;
		seg1[6]=r1;
		seg1[10]=fs;
		
	}	

	var rdis;
	var lx=0;
	var ly=0;
	for (var i=0;i<segsv.length;i++){
		seg1=segsv[i];
		rdis=sqrt(sqr(lx-seg1[3])+sqr(ly-seg1[4]));
		cx=(seg1[3]+maxofs)*dpm;
		cy=(seg1[4]+maxofs)*dpm;
		lx=seg1[3];
		ly=seg1[4];
		r=seg1[6]*dpm;
		if (seg1[2]==-1){
			gc+="G0 Z4\n";
			gc+="G0 F"+ftrav+" X"+mround(seg1[3])+" Y"+mround(seg1[4])+"\n";
			gc+="G0 Z0\n";
			continue;
		}
		// F is depend on 2*phi*radius
		// 
		var fs=seg1[10];
		//if (r>1)fs=ffeed/(2*Math.PI*seg1[6]);
		if (r>dstep)gc+="G1 F"+mround(fs)+" X"+mround(seg1[3])+" Y"+mround(seg1[4])+" Z"+mround(seg1[5])+"\n";
		carvetime+=rdis/(fs*0.0167);
		//r=1;
		//ctx.moveTo(cx+r,cy);
		//ctx.arc(cx,cy,r,0,2*Math.PI);
	}
	gc+="G0 Z4\n";
	gcodecarve=gc;
	gcode_verify();
}

function drawvcarve(){
	var c = $("myCanvas1");
	var ctx = c.getContext("2d");
	ctx.strokeStyle = "#0000ff";
	ctx.setLineDash([]);
	ctx.beginPath();
	ctx.strokeStyle = "#aaaaaa";
	for (var i=0;i<segsv.length;i++){
		var seg1=segsv[i];
		cx=(seg1[3]+maxofs)*dpm;
		cy=(seg1[4]+maxofs)*dpm;
		r=seg1[6]*dpm;
		if (seg1[2]==-1){
			continue;
		}
		ctx.moveTo(cx+r,cy);
		ctx.arc(cx,cy,r,0,Math.PI*2);
		
	}
	ctx.stroke();
	ctx.beginPath();
	ctx.strokeStyle = "#ff0000";
	for (var i=0;i<segsv.length;i++){
		var seg1=segsv[i];
		cx=(seg1[3]+maxofs)*dpm;
		cy=(seg1[4]+maxofs)*dpm;
		r=seg1[6]*dpm;
		if (seg1[2]==-1){
			ctx.moveTo(cx,cy);
			continue;
		}
		ctx.lineTo(cx,cy);
		
	}
	ctx.stroke();
	ctx.beginPath();
	ctx.strokeStyle = "#00ffff";
	for (var i=0;i<segsv.length;i++){
		var seg1=segsv[i];
		cx=(seg1[0]+maxofs)*dpm;
		cy=(seg1[1]+maxofs)*dpm;
		r=seg1[6]*dpm;
		if (seg1[2]==-1){
			ctx.moveTo(cx,cy);
			continue;
		}
		ctx.lineTo(cx,cy);
	}
	ctx.stroke();
}
var cglines=[];

function clcarve(tofs,ofs1,clines){
    if (cmd==CMD_CNC)tofs=tofs*0.8;
	if (tofs<0.2)tofs=0.2;
	if (ofs1<0.2)ofs1=0.2;
	var paths=[];
	cglines=[];
	var scale = 1000;
	var detail=getvalue("curveseg")*scale*0.5;
	for (var ci in clines){
		var path=[];
		var lines=clines[ci];
		
		for (var i = 0; i < lines.length/2; i++) {
			x = lines[i*2]*scale;
			y = lines[i*2+1]*scale;
			path.push({X:x,Y:y});
		}
		var clk=isClockwise(path,"X","Y");
		paths.push(path);
	}
			//  var paths = [[{X:30,Y:30},{X:130,Y:30},{X:130,Y:130},{X:30,Y:130}],[{X:60,Y:60},{X:60,Y:100},{X:100,Y:100},{X:100,Y:60}]]; 
			
		var glines=[];
		var ofs=-(tofs*2);
		var maxx=100;
		while (maxx-->0)
		{
			// increase tool offset
			ofs+=tofs;
			var co = new ClipperLib.ClipperOffset(); // constructor
			var offsetted_paths = new ClipperLib.Paths(); // empty solution		
			co.Clear();
			
			co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
			co.MiterLimit = 2;
			co.ArcTolerance = 20;
			var delta=ofs*scale;
			//if (!clk)delta=-delta;
			co.Execute(offsetted_paths, -Math.abs(delta));
			// if no more then break
			if (offsetted_paths.length<=0)break;
			
			var ox=0;
			var oy=0;
			for (var i = 0; i < offsetted_paths.length; i++) {
				var newline=[];
				var path=offsetted_paths[i];
				var path=ClipperLib.JS.Lighten(path,detail);
				var s=0;
				var ds=0;
				var cx=0;
				var cy=0;
				if (path.length){
					for (var j = 0; j < path.length; j++) {			
						var jj=j;
						if (clk)jj=path.length-1-j;
						var l= path[jj];
						x = l.X*1.0/scale;
						y = l.Y*1.0/scale;
						if (j>0){
							ds=sqrt(sqr(x-ox)+sqr(y-oy));
						}
						s+=ds;
						cx+=x;
						cy+=y;
						ox=x;
						oy=y;
						newline.push([x,y,ds]);
					}
					///*
					
					var l= path[0];
					if (clk)l= path[path.length-1];
					x = l.X*1.0/scale;
					y = l.Y*1.0/scale;
					newline.push([x,y,ds]);
					//*/
					glines.push([newline,s*0.02,cx/path.length,cy/path.length]);
				}
			}
		}
		cglines=glines;

		
}

// draw and together convert to gcode
var concentrictime=0;
function concentricgcode(){
	concentrictime=0;
	if (cglines.length==0) return;
	var carvedeep=getvalue('carved')*1;
    var f2 = getvalue('rasterfeed')*60;
    var f1 = f2;
    if (cmd==CMD_CNC){
		f2 = getvalue('feed')*60;
		var f1 = getvalue('trav')*60;
	}
	var pup = "G0 Z"+getvalue('safez')+"\n";
    var pdn = getvalue('pdn')+"\n";
	var overs=getvalue('overshoot')*1;
	if (cmd==CMD_CNC)overs=0;

	var re=(carvesty["repeat"]!=undefined)?carvesty["repeat"]:getvalue("carverep");
	re=(re*1);
	carvedeep = (carvesty["deep"]!=undefined)?carvesty["deep"]:getvalue("carved");
	carvedeep*=1;
	var rz=  carvedeep/re;
	
	var gc="M3 S255\nG0 F"+f1+"\nG1 F"+f2+"\n";
	gc+=pup;

    e1 = 0;
	var sortit=1;
	var lx=0;
	var ly=0;
	var sglines=[];
    for (var j = 0; j < cglines.length; j++) {
		var cs = -1;
		var bg = 10000000;
		for (var i = 0; i < cglines.length; i++) {

			var dx = cglines[i][2] - lx;
			var dy = cglines[i][3] - ly;
			var dis = sqrt(dx * dx + dy * dy)+cglines[i][1]; // distance + area size
			//var dis = sqrt(dx * dx + dy * dy); // distance + if outside, give area number so it will become last
			
			if ((cglines[i][1]>0) && (dis < bg)) {
				cs = i;
				bg = dis;
			}
		}
        // smalles in cs
        if (cs >= 0) {
            sglines.push([cglines[cs][0],cs+1]);
            cglines[cs][1] = -cglines[cs][1];
			lx = cglines[cs][2];
			ly = cglines[cs][3];
        }
    }
	
	
	for (var j=0;j<sglines.length;j++){
		gline=sglines[j][0];
		gc+=pup;
		for (var r=0;r<re;r++){
			var zz=-(r+1)*rz;
			for (var ni=0;ni<=gline.length;ni++){
				var i=ni;
				if (i==gline.length)i=0;
				var seg1=gline[i];
				cx=seg1[0];
				cy=seg1[1];
				if (ni==0){
					gc+="G0 F"+f1+" X"+mround(cx)+" Y"+mround(cy)+"\n"+pdn.replace("=cncz", mround(zz));
				} else {
					gc+="G1 F"+f2+" X"+mround(cx)+" Y"+mround(cy)+"\n";
				}
			}
		}
		gc+=pup;
		
	}

	

	gc+=pup;
	//if (ENGRAVE==1)
	gc=getvalue("engcode")+gc;
	setvalue("engcode",gc);

}
function drawconcentric(){
    var fs = getvalue('rasterfeed')*1;
	var c = $("myCanvas1");
	var ctx = c.getContext("2d");
	ctx.strokeStyle = "#800080";
	for (var j=0;j<cglines.length;j++){
		gline=cglines[j][0];
		ctx.beginPath();
		ctx.setLineDash([]);
		var ox,oy;
		for (var ni=-1;ni<gline.length;ni++){
			var i=ni;
			if (i<0)i=gline.length-1;
			var seg1=gline[i];
			cx=(seg1[0]+maxofs)*dpm;
			cy=(seg1[1]+maxofs)*dpm;
			if (ni>=0){
				ctx.moveTo(ox,oy);
				ctx.lineTo(cx,cy);
				concentrictime+=Math.sqrt(sqr(cx-ox)+sqr(cy-oy))/fs;
			}
			ox=cx;
			oy=cy;
		}
		ctx.stroke();
	}
}

setclick("btvcarve", function() {
	var r=Math.max(sxmax,symax)/getvalue("vres");
    vcarve(getvalue("vdia")/2,getvalue("vangle")*1,r,veeline,0.00002*getvalue("vdia"),0.01*getvalue("vdia"));
});
function doconcentricengrave(){
   clcarve(getoffset(),0,conline);
   concentricgcode();
   drawconcentric();
}
setclick("btconengrave", doconcentricengrave);
