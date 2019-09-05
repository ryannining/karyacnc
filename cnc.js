
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
var xyscale=100;
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
    urlopen("startprint");
	hideId("btuploadstart");
	hideId("btuploadresume");
	showId2("btuploadstop");
	showId2("btuploadpause");
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


function upload(){
	realupload(new Blob([new Int8Array(compress).buffer],{type:"text/plain"}));
}

function realupload(gcode) {
    var xhr = new XMLHttpRequest();
    form = new FormData();
    form.append("file1", gcode, "gcode");


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
	if(!warnoverflow)upload();
});
setclick("btjob5", function() {
    begincompress(jobs.join("\n"));
	if(!warnoverflow)upload();
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


var segs=[];
var carvetime=0;
// Path are in pair of x and y -> [x,y,x,y,x,y,x,y,...]
function vcarve(maxr,angle,step,path,dstep,dstep2){
	sqrt=Math.sqrt;
	sqr=function(x){return x*x;}
	// segmentation
	segs=[];
	var s=0;
	carvetime=0;
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
						segs.push([px,py,s,0,0,0,0,vx,vy,0,0]); // last 3 is to store data
					}
					s++;
					x1=x2;
					y1=y2;
				}
			} else { 
				x1=x2;
				y1=y2;
				segs.push([x1,y1,-1,x1,y1,0,0,0,0,0,0]); // last 3 is to store data
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
	for (var i=0;i<segs.length;i++){
		mr2=0; // d squared
		seg1=segs[i];
		if (seg1[2]==-1){
			// move
			continue;
		}
		if (seg1[6]>0)continue;
		var cx,cy,cz,ox,oy;
		for (var j=0;j<segs.length;j++){
			seg2=segs[j];
			if (seg1[2]==seg2[2])continue; // if on same line dont do it
			seg2[9]=sqr(seg1[0]-seg2[0])+sqr(seg1[1]-seg2[1]);
		}
		var r=0;
		for (;r<maxr;r+=dstep2){
			cx=seg1[0]-r*seg1[8];
			cy=seg1[1]+r*seg1[7];
			k2=sqr(r);
			k3=sqr(r*2);
			for (var j=0;j<segs.length;j++){
				seg2=segs[j];
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
	for (var i=0;i<segs.length;i++){
		seg1=segs[i];
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
	gc+="G0 Z4\nG0 X0 Y0\ng0 Z0\nm3 s0\nm5";
	setvalue("engcode",gc);
	gcode_verify();
}

function drawvcarve(){
	var c = $("myCanvas1");
	var ctx = c.getContext("2d");
	ctx.strokeStyle = "#0000ff";
	ctx.setLineDash([]);
	ctx.beginPath();
	ctx.strokeStyle = "#aaaaaa";
	for (var i=0;i<segs.length;i++){
		var seg1=segs[i];
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
	for (var i=0;i<segs.length;i++){
		var seg1=segs[i];
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
	for (var i=0;i<segs.length;i++){
		var seg1=segs[i];
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

