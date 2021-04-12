function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

function urlopen(s) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://" + getvalue("wsip") + "/" + s, true);
    xhr.onload = function (e) {
        //alert(xhr.response);
        $("alert1").innerHTML = w;

    };
    xhr.send();
}

function startprint() {
    //urlopen("startprint");
    urlopen("startjob?jobname=/" + getvalue("jobname") + ".gcode");
    hideId("btuploadstart");
    hideId("btuploadresume");
    showId2("btuploadstop");
    showId2("btuploadpause");
    stopinfo = 1;
    etime = new Date();
    console.log("Start " + etime);
    setvalue("applog", getvalue("applog") + "Start " + etime + "\n");
    waitforwait=1;
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

function resetflashbutton() {
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
var uploadimage = 1;

function upload(fn) {
    if ($("pltmode") && $("pltmode").checked){
        $("alert1").innerHTML="<br>PLT MODE !";
        //return;
    }

    function uploadjpg() {
        if (!uploadimage) return;
        c = $("myCanvas1");
        c.toBlob(function (blob) {
            realupload(blob, fn + ".jpg", uploadpreview);
        }, "image/jpeg", 0.2);
    }
    realupload(new Blob([new Int8Array(compress).buffer], {
        type: "text/plain"
    }), fn, uploadjpg);
}
function uploadpreview() {
    if ($("uploadpreview").checked){
        begincompress(getvalue("pgcode"));
        realupload(new Blob([new Int8Array(compress).buffer], {
            type: "text/plain"
        }), "preview.gcode", 0);
    }
}


function realupload(gcode, fname, callback) {
    var xhr = new XMLHttpRequest();
    form = new FormData();
    form.append("file1", gcode, fname);


    xhr.open(
        "POST",
        "http://" + getvalue("wsip") + "/upload",
        true
    );

    //xhr.setRequestHeader('Access-Control-Allow-Headers', '*');
    //xhr.setRequestHeader('Content-type', 'application/ecmascript');
    //xhr.setRequestHeader('Access-Control-Allow-Origin', '*');

    var progressBar = $('progress1');
    xhr.onload = function (e) {
        progressBar.value = 0;
        if (!wemosd1) alert(xhr.response);
        resetflashbutton();
        if (callback) callback();
    };
    // Listen to the upload progress.
    xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
            progressBar.value = (e.loaded / e.total) * 100;
            progressBar.textContent = progressBar.value; // Fallback for unsupported browsers.
        }
    };
    xhr.send(form);
}


setclick("btupload", function () {
    begincompress(getvalue("engcode") + "\n" + getvalue("gcode")+finishgcode);
    upload(getvalue("jobname") + ".gcode");
});
setclick("btjob5", function () {
    begincompress(jobs.join("\n")+finishgcode);
    upload(getvalue("jobname") + ".gcode");
});

setclick("btuploadstart", startprint);
setclick("btuploadstop", stopprint);
setclick("btuploadpause", pauseprint);
setclick("btuploadresume", resumeprint);

function Canvas2Clipboard(cid) {
    var canvas = $(cid);
    //alert(c);
    canvas.toBlob(function (blob) {
        const item = new ClipboardItem({
            "image/png": blob
        });
        navigator.clipboard.write([item]);
    })
}
setclick("btcopycanvas", function () {
    Canvas2Clipboard("myCanvas1");
});


var segsv = [];
var carvetime = 0;
var gcodecarve = "";
// Path are in pair of x and y -> [x,y,x,y,x,y,x,y,...]
function vcarve(maxr, angle, step, path, dstep, dstep2) {
    sqrt = Math.sqrt;
    sqr = function (x) {
        return x * x;
    }
    // segmentation
    segsv = [];
    var s = 0;
    carvetime = 0;
    gcodecarve = "";
    var pw = parseInt(getvalue('vcarvepw') * 255*0.01);
    segmentation = function (path, rev) {
        PL = path.length / 2;
        var x1, y1, x2, y2, i, dx, dy, L, ovx,ovy,vx, vy, px, py;
        L=0;
        for (var p = 0; p <= PL; p++) {
            i = p;
			if (i==PL)i==0;
            if (rev) {
                i = PL - i - 1;
            }
            x2 = path[i * 2 + 0];
            y2 = path[i * 2 + 1];

            if (p > 0) {
				var OL=L;
				if (p>1){ // if last L ok, interpolate from previous vector, but on same position
					opx=px;
					opy=py;
				}
                L = (sqrt(sqr(x2 - x1) + sqr(y2 - y1)));
                if (L > 0) {
                    vx = (x2 - x1) / L;
                    vy = (y2 - y1) / L;
                    L = Math.floor(L / step) + 1;
                    dx = (x2 - x1) / L;
                    dy = (y2 - y1) / L;

                    for (var j = 0; j < L; j++) {
                        px = x1 + (j + .5) * dx;
                        py = y1 + (j + .5) * dy;
						if (OL>0){ // if last L ok, interpolate from previous vector, but on same position
							opx=(px-opx);
							opy=(py-opy);
							OL=sqrt(sqr(opx)+sqr(opy));
							NL = Math.floor(OL / step) + 1;
							ndx = (opx) / NL;
							ndy = (opy) / NL;
							opx/=OL;
							opy/=OL;
							
							//for (var nj = NL; nj >0; nj--) {
							nj=1;
							segsv.push([px-(nj-0.5)*ndx, py-(nj-0.5)*ndy, s-1, 0, 0, 0, 0, opx, opy, 0, 0]); //
							//}
							if (p==PL)return;
							OL=0; 						
						}
                        //           x   y  id cx cy cz r             fs
                        segsv.push([px, py, s, 0, 0, 0, 0, vx, vy, 0, 0]); // last 3 is to store data
                    }
                    s++;
                    x1 = x2;
                    y1 = y2;
                }
            } else {
                x1 = x2;
                y1 = y2;
                segsv.push([x1, y1, -1, x1, y1, 0, 0, 0, 0, 0, 0]); // last 3 is to store data
            }
        }
    }
    var sc = 1;
    if ($("flipx").checked) sc = 0;
    if ($("flipve").checked) sc = !sc;

    for (var i = 0; i < path.length; i++) {
        var sc = path[i][1];
        if ($("flipx").checked) sc = 0;
        if ($("flipve").checked) sc = !sc;
        segmentation(path[i][0], sc);
    }
    // create toolpath
    // s= number of line
    var n = 0;
    var gc = "M3 "+pw+"\nG0 F6000 Z4\nG1 F2000\n";
    ve = 1 / Math.tan(angle * Math.PI / 360);
    var jj, seg2, seg1, mr2;
    var maxz = -maxr * ve;
    var ftrav = getvalue("trav") * 60;
    var ffeed = getvalue("vcfeed") * 60;
    for (var i = 0; i < segsv.length; i++) {
        mr2 = 0; // d squared
        seg1 = segsv[i];
        if (seg1[2] == -1) {
            // move
            continue;
        }
        if (seg1[6] > 0) continue;
        var cx, cy, cz, ox, oy;
        for (var j = 0; j < segsv.length; j++) {
            seg2 = segsv[j];
            if (seg1[2] == seg2[2]) continue; // if on same line dont do it
            seg2[9] = sqr(seg1[0] - seg2[0]) + sqr(seg1[1] - seg2[1]); // store the distance to this segment
        }
        var r = 0;
        for (; r < maxr; r += dstep2) { // iterate from r =0 to maxr
            cx = seg1[0] - r * seg1[8]; // tool position based on the r and segment vector 
            cy = seg1[1] + r * seg1[7];
            k2 = sqr(r);
            k3 = sqr(r * 2);
            for (var j = 0; j < segsv.length; j++) {
                seg2 = segsv[j];
                //  
                if ((seg1[2] == -1) || (seg1[2] == seg2[2]) || (seg2[9] > k3)) continue; // if on same line dont do it
                n++;
                r3 = sqr(cx - seg2[0]) + sqr(cy - seg2[1]);
                if (r3 < k2) {
                    mr2 = r;
                    break;
                }
            }
            if (mr2) break;
        }
        var r1 = r;
        var r2 = r;
        var fs = ffeed;
        if (r > 1) fs = ffeed / (r);
        if (!mr2) {
            cz = maxz;
        } else {
            // recalculate to get more precission
            for (var r = mr2; r > mr2 - dstep2; r -= dstep) {
                cx = seg1[0] - r * seg1[8];
                cy = seg1[1] + r * seg1[7];
                r3 = sqr(cx - seg2[0]) + sqr(cy - seg2[1]);
                //r3=Math.min(r3,sqr(cx-seg2[0]-seg2[7]*step)+sqr(cy-seg2[1]-seg2[8]*step));

                if (r3 >= sqr(r)) {
                    break;
                }
            }
            //r1=r;
            //r2=r;

            // for other type bit must be different
            cz = -r * ve;
            if (r > 3) fs = 3*ffeed / (r);
            ///*
            seg2[3] = cx;
            seg2[4] = cy;
            seg2[5] = cz;

            //if (i<jj)r1=r1/2;else r2=r2/2;
            seg2[6] = r;
            seg2[10] = fs;
            //fs=fs*2;
            //*/

        }
        seg1[3] = cx;
        seg1[4] = cy;
        seg1[5] = cz;
        seg1[6] = r1;
        seg1[10] = fs;

    }

    var rdis;
    var lx = 0;
    var ly = 0;
    var oldz=-100;
    var oldf=-100;
    var oldx=-100;
    var oldy=-100;
    for (var i = 0; i < segsv.length; i++) {
        seg1 = segsv[i];
        rdis = sqrt(sqr(lx - seg1[3]) + sqr(ly - seg1[4]));
        cx = (seg1[3] + maxofs) * dpm;
        cy = (seg1[4] + maxofs) * dpm;
        lx = seg1[3];
        ly = seg1[4];
        r = seg1[6] * dpm;
        if (seg1[2] == -1) {
            gc += "G0 Z4\n";
            gc += "G0 F" + ftrav + " X" + mround2(seg1[3]) + " Y" + mround2(seg1[4]) + "\n";
            gc += "G0 Z0\n";
            continue;
        }
        // F is depend on 2*phi*radius
        // 
        var fs = seg1[10];
        //if (r>1)fs=ffeed/(2*Math.PI*seg1[6]);
        if (r > dstep) {
			fpart="F" + parseInt(fs);
			xpart=" X" + mround2(seg1[3]);
			ypart=" Y" + mround2(seg1[4]);
			zpart=" Z" + mround2(seg1[5]);
			if (oldx==seg1[3])xpart="";
			if (oldy==seg1[4])ypart="";
			if (oldz==seg1[5])zpart="";
			if (oldf==fs)fpart="";
			
			gc += "G1 "+fpart + xpart + ypart + zpart + "\n";
			oldx=seg1[3];
			oldy=seg1[4];
			oldz=seg1[5];
			oldf=fs;
        }
        carvetime += rdis / (fs * 0.0167);
        //r=1;
        //ctx.moveTo(cx+r,cy);
        //ctx.arc(cx,cy,r,0,2*Math.PI);
    }
    gc += "G0 Z4\n";
    gcodecarve = gc;
    //gcode_verify();
}

function drawvcarve() {
    var c = $("myCanvas1");
    var ctx = c.getContext("2d");
    ctx.strokeStyle = "#0000ff";
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.strokeStyle = "#aaaaaa";
    for (var i = 0; i < segsv.length; i++) {
        var seg1 = segsv[i];
        cx = (seg1[3] + maxofs) * dpm;
        cy = (seg1[4] + maxofs) * dpm;
        r = seg1[6] * dpm;
        if (seg1[2] == -1) {
            continue;
        }
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);

    }
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "#ff0000";
    for (var i = 0; i < segsv.length; i++) {
        var seg1 = segsv[i];
        cx = (seg1[3] + maxofs) * dpm;
        cy = (seg1[4] + maxofs) * dpm;
        r = seg1[6] * dpm;
        if (seg1[2] == -1) {
            ctx.moveTo(cx, cy);
            continue;
        }
        ctx.lineTo(cx, cy);

    }
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "#00ffff";
    for (var i = 0; i < segsv.length; i++) {
        var seg1 = segsv[i];
        cx = (seg1[0] + maxofs) * dpm;
        cy = (seg1[1] + maxofs) * dpm;
        r = seg1[6] * dpm;
        if (seg1[2] == -1) {
            ctx.moveTo(cx, cy);
            continue;
        }
        ctx.lineTo(cx, cy);
    }
    ctx.stroke();
}
var cglines = [];
var realofs=0;
function pocketcarve(tofs, ofs1, clines) {
    realofs=tofs;
    if (cmd == CMD_CNC) tofs = Math.min(tofs/2,getnumber("clstep"));
    if (tofs < 0.2) tofs = 0.2;
    if (ofs1 < 0.2) ofs1 = 0.2;
    var paths = [];
    cglines = [];
    var glines = [];
    var scale = 1000;
    var detail = getvalue("curveseg") * scale * 0.5;
    var pathsdeep = {};
    
    for (var ci in clines) {
        var path = [];
        var lines = clines[ci][0];
        var deep = clines[ci][1]
        if (!pathsdeep[deep]) pathsdeep[deep]= [];

        for (var i = 0; i < lines.length / 2; i++) {
            x = lines[i * 2] * scale;
            y = lines[i * 2 + 1] * scale;
            path.push({
                X: x,
                Y: y
            });
        }
        pathsdeep[deep].push(path);
    }
    {
        var clk = 1;//isClockwise(path, "X", "Y");
        //}
        //  var paths = [[{X:30,Y:30},{X:130,Y:30},{X:130,Y:130},{X:30,Y:130}],[{X:60,Y:60},{X:60,Y:100},{X:100,Y:100},{X:100,Y:60}]]; 

        for (var kd in pathsdeep) {
            var paths=pathsdeep[kd];
            deep=kd;
            var ofs = realofs/2 -tofs;
            var last=0;
            var first=1;
            var maxx = 100;
            while (maxx-- > 0) {
                // increase tool offset
                ofs += tofs;
                var co = new ClipperLib.ClipperOffset(); // constructor
                var offsetted_paths = new ClipperLib.Paths(); // empty solution		
                co.Clear();

                co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
                co.MiterLimit = 2;
                co.ArcTolerance = 20;
                var delta = ofs * scale;
                //if (!clk)delta=-delta;
                var r=co.Execute(offsetted_paths, -Math.abs(delta));
                // if no more then break
                if (offsetted_paths.length <= 0) {
                    break;
                    if (last)break;
                    last=1;
                    ofs -= tofs*1.5;
                    continue;
                }
                // mask as not last
                for (var k=0;k<glines.length;k++){
                    //glines[k][6]=0;
                }

                var ox = 0;
                var oy = 0;
                for (var i = 0; i < offsetted_paths.length; i++) {
                    var newline = [];
                    var path = offsetted_paths[i];
                    var path = ClipperLib.JS.Lighten(path, detail);
                    var s = 0;
                    var ds = 0;
                    var cx = 0;
                    var cy = 0;
                    if (path.length) {
                        for (var j = 0; j < path.length; j++) {
                            var jj = j;
                            if (clk) jj = path.length - 1 - j;
                            var l = path[jj];
                            x = l.X * 1.0 / scale;
                            y = l.Y * 1.0 / scale;
                            if (j > 0) {
                                ds = sqrt(sqr(x - ox) + sqr(y - oy));
                            }
                            s += ds;
                            cx += x;
                            cy += y;
                            ox = x;
                            oy = y;
                            newline.push([x, y, ds]);
                        }
                        ///*

                        var l = path[0];
                        if (clk) l = path[path.length - 1];
                        x = l.X * 1.0 / scale;
                        y = l.Y * 1.0 / scale;
                        newline.push([x, y, ds]);
                        //*/
                        glines.push([newline, s, cx / path.length, cy / path.length, deep,delta,first]);
                    }
                }
                first=0;
            }
        }
    }
    cglines = glines;


}
// draw and together convert to gcode
var slowthreshold;
function area_Maxdis(cx,cy,liness2){
    var mdis=100000;
    for (var j = 0; j < liness2.length; j++) {
        var olines=liness2[j];
        var mdis2=100000;
        for (var ni=0;ni<olines.length;ni++){
            var seg2 = olines[ni];
            var d = sqr(cx-seg2[0]);
            d += sqr(cy-seg2[1]);                            
            mdis2=Math.min(mdis2,d);                    
        }
        mdis=Math.min(mdis,mdis2);
    }
    if (mdis>slowthreshold){
            return 1;
    }
    return 0
}

var pockettime = 0;
var already=[];
function pocketgcode() {
    //return;
    pockettime = 0;
    if (cglines.length == 0) return;
    var carvedeep = getnumber('carved');
    var f2 = getnumber('vcarvefeed') * 60;
    var f3 = f2*0.7;//getnumber('vcarvefeed2') * 60;
    var f1 = f2;
    if (cmd == CMD_CNC) {
        f2 = getnumber('vcarvefeed') * 60;
        var f1 = getnumber('trav') * 60;
    }
    var fs=f2/60;
    var pdn = getvalue('pdn') + "\n";
    var overs = getvalue('overshoot') * 1;
    if (cmd == CMD_CNC) overs = 0;

    var rz = getnumber("carvedp");
    var rz1 = getnumber("firstd");
    var re = Math.ceil(carvedeep/rz);
    var re1 = Math.ceil(carvedeep/rz1);
    if (re1<re)re1=Math.ceil(carvedeep/getnumber("clstep")); // try to auto the repeat number
    if (cmd==CMD_LASER)re1=re;
    //var rz = carvedeep / re;
    //var rz1 = carvedeep / re1;
    var zup=Math.min(getvalue('safez')*1,zretract);
    var pup = "G0 F"+speedretract+" Z" + zup + "\n";
    var pup2 = "G0 F"+speedretract+" Z" + mround(-rz) + "\n";
    if (cmd==CMD_LASER){
        pup=getvalue('pup') + "\n";
        pup2=pup;
    }
    pw = parseInt(getvalue('vcarvepw') * 255*0.01);
    var gc = pup+"M3 S"+pw+"\nG0 F" + f1 + "\nG1 F" + f2 + "\n";
    gc += pup;

    e1 = 0;
    slowthreshold=(realofs*realofs*getvalue('slowth'));
    var sortit = 1;
    var lx = 0;
    var ly = 0;
    var clx =0;
    var cly=0;
    var sglines = [];
    var mins=[];
    var first=1;
    var lastlines=[];
    var lastcut=[];
    for (var j = 0; j < cglines.length; j++) {
        var cs = -1;
        var bg = 1000000000;
        var shifti=0;
        for (var i = 0; i < cglines.length; i++) {

            var isslow=0;
            if (cglines[i][5]>=0){
                var mind=1000000000;
                var pp=cglines[i][0];
                // find the real minimum distance
                var shift=0;
                //lastcut.push(lastlines);
                for (var ii=0;ii<pp.length;ii+=2){
                    cx=pp[ii][0];
                    cy=pp[ii][1];
                    if (!isslow)isslow=area_Maxdis(cx,cy,lastcut);
                    var disi = (sqr(cx - lx)+sqr(cy-ly));
                    if (disi<mind){
                        mind=disi;
                        shift=ii;
                        clx=pp[ii][0];
                        cly=pp[ii][1];
                        
                    }
                }
                //lastcut.pop();
                
                var dis = mind-cglines[i][5]*0.1; // distance - depth + area size
                if (first){
                    dis-=cglines[i][5]*5;
                    if (isslow)dis+= cglines[i][1]*10;
                }
                //if (first){
                //    dis-=cglines[i][5]*10;
                //}
                //var dis = sqrt(dx * dx + dy * dy); // distance + if outside, give area number so it will become last

                if ((dis < bg)) {
                    slow=isslow;
                    cs = i;
                    bg = dis;
                    shifti=shift;
                }
            }
        }
        // smalles in cs
        if (cs >= 0) {
            //slow=first;
            mins.push([first,cs,lx,ly,bg,shifti]);
			var lines=cglines[cs][0];

            lx = lines[shifti][0];
            ly = lines[shifti][1];


            //if (slow){
            lastcut.push(lines);
            //}
            sglines.push([lines, cglines[cs][1], cglines[cs][4],cglines[cs][6],shifti,first?f3:f2,slow,first]);
            first=cglines[cs][6];
            cglines[cs][5] = -1;
            lastlines=lines;
        }
    }
    
    var ox=-1000;
    var oy=0;
    var lz=0;
    var la=0;
    var climbcut=$("cutclimb").checked;
    already=[];
    for (var j = 0; j < sglines.length; j++) {
        gline = sglines[j][0];
        f2=sglines[j][5];
        gline=arrayRotate(gline,sglines[j][4]);
        var _re = Math.ceil(sglines[j][2] / (j==0?rz1:rz));
        if (CMD_CNC){
            pup2 = "G0 F"+speedretract+" Z" + mround(-sglines[j][2]) + "\n";
        }
        var _rz = sglines[j][2] / (_re);
        var a=sglines[j][1];
        // check if this line if need to thread as slow or fast
        var slow=sglines[j][6];
        //console.log(j+","+i+":"+mdis);
        if (slow){ //sglines[j][3]){
            // recalculate repeat and rz only for last/ inner most
            _re = Math.ceil(sglines[j][2] / rz1);
            _rz = sglines[j][2] / (_re);
            zz = -(r + 1) * _rz;

        }
        var lstF=0;
        var jump;
        for (var r = 0; r < _re; r++) {
            var zz = -(r + 1) * _rz;
            for (var ni = 0; ni <= gline.length; ni++) {
                var i = gline.length-ni; // flip the path (for smooth)
                if (climbcut)i=ni;
                if (i == gline.length) i = 0;
                var seg1 = gline[i];
                cx = seg1[0];
                cy = seg1[1];
                
                if (ni == 0) {
                    jump=((r==0) && (sqr(ox-cx)+sqr(oy-cy)>sqr(realofs*2))); // decide we need to move up z or not

					gc += jump?pup:(r==0?pup2:"");
                    gc += "G1 F" + (jump?f1:f2) + " X" + mround(cx) + " Y" + mround(cy) + "\n";
                    if (jump)gc += "G0 Z0 F"+speedretract+"\n";
                    gc += pdn.replace("=cncz", mround(zz));
                     lstF=0;
                } else {
                    gc += (lstF!=f2?("G1 F" + f2):"G1") + " X" + mround(cx) + " Y" + mround(cy) + "\n";
                    lstF=f2;
                }
                
                if (ox!=-1000){
                    pockettime += Math.sqrt(sqr(cx - ox) + sqr(cy - oy)) / fs;
                }
                ox=cx;
                oy=cy;
            }
            lz=zz;
        }
        already.push([gline,slow,sglines[j][6]]);

        la=a;
        //gc += pup;

    }



    gc += pup;
    //if (ENGRAVE==1)
    gc = getvalue("engcode") + gc;
    setvalue("engcode", gc);

}


function drawpocket() {
    var fs = getvalue('rasterfeed') * 1;
    var c = $("myCanvas1");
    var ctx = c.getContext("2d");
    for (var j = 0; j < already.length; j++) {
        gline = already[j][0];
        ctx.beginPath();
        ctx.setLineDash([]);
        if (already[j][1])ctx.setLineDash([]);else ctx.setLineDash([]);
        if (already[j][2])ctx.strokeStyle = "#C00080";else ctx.strokeStyle = "#C040C0";
        var ox, oy;
        for (var ni = -1; ni < gline.length; ni++) {
            var i = ni;
            if (i < 0) i = gline.length - 1;
            var seg1 = gline[i];
            cx = (seg1[0] + maxofs) * dpm;
            cy = (seg1[1] + maxofs) * dpm;
            if (ni >= 0) {
                ctx.moveTo(ox, oy);
                ctx.lineTo(cx, cy);
            }
            ox = cx;
            oy = cy;
        }
        ctx.stroke();
    }
}

function dobtvcarve () {
    var r = Math.max(sxmax, symax) / getvalue("vres");
    vcarve(getvalue("vdia") / 2, getvalue("vangle") * 1, r, veeline, 0.00002 * getvalue("vdia"), 0.01 * getvalue("vdia"));
}
setclick("btvcarve", dobtvcarve);

function dopocketengrave() {
    pocketcarve(getoffset(), 0, conline);
    pocketgcode();
    drawpocket();
}
setclick("btconengrave", dopocketengrave);

var bitmaptime=0;


function imagedata_to_image(imagedata) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = imagedata.width;
    canvas.height = imagedata.height;
    ctx.putImageData(imagedata, 0, 0);

    var image = new Image();
    image.src = canvas.toDataURL();
    return image;
}

function imagedither(imgpic,canv,ofx,ofy,rwidth,rheight) {
	var sierra2=[6,2 ,1,4,7,4,1 ,1,5,1];
	var sierra2=[5, 3, 2, 4, 5, 4, 2, 2, 3, 2];
	var floyd1=[7, 4,4,1];
    var c = canv;//document.getElementById("myCanvas");
    var img = imgpic;//document.getElementById("thepic");
	overshot=getvalue("overshoot");
    var maxpoint=getvalue("imgresmax");
	mwidth=rwidth/maxpoint;
	mheight=rheight/maxpoint;
     	
    c.width=mwidth;
    c.height=mheight;
    var ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0,c.width,c.height);
    var bm = ctx.getImageData(0, 0, c.width, c.height);
    // invert colors
    var i,j;
    var row=c.width*4;
    var speed1 = getnumber('rasterfeed');
    var speed = speed1 * 60;
    var pw = getnumber('rasterpw') * 0.01*255;
	var metode=getvalue("dithermode")*1;
	var dx,dy;
	var c4x4=[191.25, 95.625, 159.375, 63.75, 15.9375, 255, 223.125, 111.5625, 127.5, 207.1875, 239.0625, 31.875, 47.8125, 143.4375, 79.6875, 175.3125];
	dx=1;
	dy=1;
	if (metode==2){
		dx=2;
		dy=2;
	}
	if (metode==3){
		dx=0;
		dy=0;
	}
	// make it grayscale first
	var waktu=0;
	var w0=0;
	var w1=0;
	var inv=$("imginvert").checked;
	var gamma=getvalue("gamma")*1.0;
	var bright=getvalue("brightness")*1;
	var mw=rwidth;
	var mh=rheight;
	var dotscale=mw/c.width;
	
	var ystep=mh/c.height; // y machine step, each step will be lasered by ystep/0.2 zigzag,  
	var gcode="M3 S"+Math.round(pw)+"\nG0 F"+speed+"\nG1 F"+speed+"\n";
	bmd=[];
	for (j = 0; j < c.height; j += 1) {
    for (i = 0; i < c.width; i += 1) {
    	var a=j*row;
		a+=i*4;
        oldr=(0.3*bm.data[a] + 0.5*bm.data[a+1] +0.2*bm.data[a+2]);
		oldr=Math.min(255,oldr+bright)
		if (inv)oldr=255-oldr;
		oldr = Math.pow((oldr / 255.0) , (1.0 / gamma)) * 255;
		alp=(bm.data[a+3])/255;
		oldr=(oldr*(alp))+(255*(1-alp));

		var a=j*c.width+i;		
		bmd[a]=oldr;
	}}
	for (j = 0; j < c.height; j += 1) {
    for (i = 0; i < c.width; i += 1) {
		var a=j*c.width+i;		
        oldr=bmd[a];
        
    	a=j*row+i*4;
		bm.data[a]=oldr;
		bm.data[a+1]=oldr;
		bm.data[a+2]=oldr;
		bm.data[a+3]=255;
	}}
	// dither it
	if (metode<4){
		var num=3;
		var dv=num/256.0;
		var mul=(255.0/(num-1));
		var shf=1;//1.0*getvalue("shf");;
		var bp=10;
		var jk=0;
		for (j = 0; j < c.height-dy; j += 1) {
			gc="";
			var skip=1;
			
			var pxstart=c.width;
			var pxstop=0;
			for (var i = dx; i < c.width-dx; i += 1) {
				var a=j*row+i*4;
				oldr=bm.data[a];
				gr=0;
				//if (
				if (metode==0){
					rmax=255;
					newr=oldr+gr;
					if (newr<4)newr=4;
					if (newr>250)newr=250;
					
				} else if (metode<3){
					rmax=255;
					gr+=128;
					newr=oldr>gr?255:0;
					//newr=Math.floor(oldr*dv)*mul;
					//if (newr>255)newr=255;
				} else if (metode==3) {
					rmax=255;
					//newr=oldr+gr>=c4x4[(j%4*4+i%4)]?255:0;
					newr=oldr+gr>128?255:0;
				}
				err=oldr-newr;
				
				cc=String.fromCharCode((rmax-newr)/10+97);
				if (cc===undefined)cc='a';
				if (cc=='a') w0++; else {
					skip=0;w1++;
					pxstart=Math.min(pxstart,i);
					pxstop=Math.max(pxstop,i);
				}
				gc+=cc;
				bm.data[a+0]=newr;
				bm.data[a+1]=newr;
				bm.data[a+2]=newr;
				bm.data[a+3]=newr?0:255;
				if (metode==0){
					// 7 3 5 1 floyd
					err=err/16;
					a1=a+4; bm.data[a1]+=err*7;
					a+=row;
					a1=a-4; bm.data[a1]+=err*4;
					a1=a;   bm.data[a1]+=err*4;
					a1=a+4; bm.data[a1]+=err*1;
				}
				else if (metode==1){
					// 7 3 5 1 floyd
					em=floyd1;
					err=err/16;
					a1=a+4; bm.data[a1]+=err*em[0];
					a+=row;
					a1=a-4; bm.data[a1]+=err*em[1];
					a1=a;   bm.data[a1]+=err*em[2];
					a1=a+4; bm.data[a1]+=err*em[3];
				}
				else if (metode==2){
					// sierra 2 row
					err=err/32;
//					em=[5,2 ,2,4,5,4,2 ,2,3,2];
					
					em=sierra2;
					a1=a+4; bm.data[a1]+=err*em[0];
					a1=a+8; bm.data[a1]+=err*em[1];
					a+=row;
					a1=a-8; bm.data[a1]+=err*em[2];
					a1=a-4; bm.data[a1]+=err*em[3];
					a1=a;   bm.data[a1]+=err*em[4];
					a1=a+4; bm.data[a1]+=err*em[5];
					a1=a+8; bm.data[a1]+=err*em[6];
					a+=row;
					a1=a-4; bm.data[a1]+=err*em[7];
					a1=a;   bm.data[a1]+=err*em[8];
					a1=a+4; bm.data[a1]+=err*em[9];
					
				}
			}
			gc+="a";

			var farx=0;
			if (!skip){
                pxstart=Math.max(0,pxstart-6);
                pxstop=Math.min(gc.length-1,pxstop+6);
                 
				px1=mround(dotscale*pxstart+ofx);
				px2=mround(dotscale*pxstop+ofx);
				if (j &1){
					dir=-1;
					idx=pxstop;
				}else {
					dir=1;
					idx=pxstart;
				}
				xstep=mw/gc.length;
				zstep=zdown/25;
				lv="a";
				x=xstep*idx+ofx-dir*overshot;
				gcode+="G0 X"+mround(x)+" Y"+mround((j)*ystep+ofy)+"\n";
				gcodes="";
				gctr=0;
				lx=x;
				for (var i=pxstart;i<=pxstop;i++){
					v=gc[idx];
					x=xstep*idx+ofx;
					brk=Math.abs(lx-x)>150;
					if (v!=lv || brk){
						gctr++;
						if (lv=='a'){
							gcodes+="G0 X"+mround(x)+"\n";
							if (brk)gcodes+="G1 X"+mround(x)+"\n";
						} else {
							gcodes+="G1 X"+mround(x)+"\n";
							if (brk)gcodes+="G0 X"+mround(x)+"\n";
						}
						lv=v;
					}
					
					idx+=dir;
				}
				gcode+=";REP:"+gctr+"\n"+gcodes;
				waktu+=1.66*(px2-px1)/speed1;
				jk++;
			}
		}
	}
	pc=100*w1/(w1+w0);
	bitmaptime+=waktu;
	gcode+="G0 X0 Y0\nM3 S0\n";
	gc = getvalue("engcode") + gcode;
    setvalue("engcode", gc);
    ctx.putImageData(bm,0,0);
    // draw the engrave
	var img1 = new Image();
    img1.src = canv.toDataURL();
    img1.onload=function(){
		var c = $("myCanvas1");
		var ctx = c.getContext("2d");		
		ctx.drawImage(img1, (ofx+maxofs)*dpm, (ofy+maxofs)*dpm,rwidth*dpm,rheight*dpm);
	}
};
