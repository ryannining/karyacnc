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
            realupload(blob, fn + ".jpg", 0);
        }, "image/jpeg", 0.2);
    }
    realupload(new Blob([new Int8Array(compress).buffer], {
        type: "text/plain"
    }), fn, uploadjpg);
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
    segmentation = function (path, rev) {
        PL = path.length / 2;
        var x1, y1, x2, y2, i, dx, dy, L, vx, vy, px, py;
        for (var p = 0; p < PL; p++) {
            i = p;

            if (rev) {
                i = PL - i - 1;
            }
            x2 = path[i * 2 + 0];
            y2 = path[i * 2 + 1];

            if (p > 0) {

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
        segmentation(path[i], sc);
    }
    // create toolpath
    // s= number of line
    var n = 0;
    var gc = "M3\nG0 F6000 Z4\nG1 F2000\n";
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
            seg2[9] = sqr(seg1[0] - seg2[0]) + sqr(seg1[1] - seg2[1]);
        }
        var r = 0;
        for (; r < maxr; r += dstep2) {
            cx = seg1[0] - r * seg1[8];
            cy = seg1[1] + r * seg1[7];
            k2 = sqr(r);
            k3 = sqr(r * 2);
            for (var j = 0; j < segsv.length; j++) {
                seg2 = segsv[j];
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
            if (r > 1) fs = ffeed / (r);
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
            gc += "G0 F" + ftrav + " X" + mround(seg1[3]) + " Y" + mround(seg1[4]) + "\n";
            gc += "G0 Z0\n";
            continue;
        }
        // F is depend on 2*phi*radius
        // 
        var fs = seg1[10];
        //if (r>1)fs=ffeed/(2*Math.PI*seg1[6]);
        if (r > dstep) gc += "G1 F" + mround(fs) + " X" + mround(seg1[3]) + " Y" + mround(seg1[4]) + " Z" + mround(seg1[5]) + "\n";
        carvetime += rdis / (fs * 0.0167);
        //r=1;
        //ctx.moveTo(cx+r,cy);
        //ctx.arc(cx,cy,r,0,2*Math.PI);
    }
    gc += "G0 Z4\n";
    gcodecarve = gc;
    gcode_verify();
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
    if (cmd == CMD_CNC) tofs = tofs * getvalue("clstep");
    if (tofs < 0.2) tofs = 0.2;
    if (ofs1 < 0.2) ofs1 = 0.2;
    realofs=tofs;
    var paths = [];
    cglines = [];
    var glines = [];
    var scale = 1000;
    var detail = getvalue("curveseg") * scale * 0.5;
    var paths = [];
    for (var ci in clines) {
        var path = [];
        var lines = clines[ci][0];
        var deep = clines[ci][1]

        for (var i = 0; i < lines.length / 2; i++) {
            x = lines[i * 2] * scale;
            y = lines[i * 2 + 1] * scale;
            path.push({
                X: x,
                Y: y
            });
        }
        paths.push(path);
    }
    {
        var clk = 1;//isClockwise(path, "X", "Y");
        //}
        //  var paths = [[{X:30,Y:30},{X:130,Y:30},{X:130,Y:130},{X:30,Y:130}],[{X:60,Y:60},{X:60,Y:100},{X:100,Y:100},{X:100,Y:60}]]; 

        var ofs = -(tofs);
        var maxx = 50;
        var last=0;
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
            co.Execute(offsetted_paths, -Math.abs(delta));
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
				glines[k][6]=0;
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
                    glines.push([newline, s * 0.02, cx / path.length, cy / path.length, deep,delta,1]);
                }
            }
        }
    }
    cglines = glines;


}
// draw and together convert to gcode
var pockettime = 0;

function pocketgcode() {
    pockettime = 0;
    if (cglines.length == 0) return;
    var carvedeep = getvalue('carved') * 1;
    var f2 = getvalue('vcarvefeed') * 60;
    var f1 = f2;
    if (cmd == CMD_CNC) {
        f2 = getvalue('vcarvefeed') * 60;
        var f1 = getvalue('trav') * 60;
    }
    var fs=f2/60;
    var pdn = getvalue('pdn') + "\n";
    var overs = getvalue('overshoot') * 1;
    if (cmd == CMD_CNC) overs = 0;

    var re = 1*((carvesty["repeat"] != undefined) ? carvesty["repeat"] : getvalue("carverep"));
    var re1 = 1*(getvalue("firstrep"));
    if (re1<re)re1=re/getnumber("clstep"); // try to auto the repeat number
    if (cmd==CMD_LASER)re1=re;
    var rz = carvedeep / re;
    var rz1 = carvedeep / re1;
    var zup=Math.min(getvalue('safez')*1,zretract);
    var pup = "G0 F"+speedretract+" Z" + zup + "\n";
    var pup2 = "G0 F"+speedretract+" Z" + mround(-rz) + "\n";
    if (cmd==CMD_LASER){
        pup=getvalue('pdn') + "\n";
        pup2=pup;
    }
    pw = parseInt(getvalue('vcarvepw') * 255*0.01);
    var gc = "M3 S"+pw+"\nG0 F" + f1 + "\nG1 F" + f2 + "\n";
    gc += pup;

    e1 = 0;
    var sortit = 1;
    var lx = 0;
    var ly = 0;
    var sglines = [];
    for (var j = 0; j < cglines.length; j++) {
        var cs = -1;
        var bg = 10000000;
        for (var i = 0; i < cglines.length; i++) {

            var dx = cglines[i][2] - lx;
            var dy = cglines[i][3] - ly;
            var dis = -cglines[i][5]+(dx * dx + dy * dy)*10; // distance + area size
            //var dis = sqrt(dx * dx + dy * dy); // distance + if outside, give area number so it will become last

            if ((cglines[i][1] > 0) && (dis < bg)) {
                cs = i;
                bg = dis;
            }
        }
        // smalles in cs
        if (cs >= 0) {
            // find the closest point
			var lines=cglines[cs][0];
			var shift=0;
			var dmax=10000000;
            for (var i=0;i<lines.length-1;i+=10){
				var d=(sqr(lx - lines[i][0]) + sqr(ly - lines[i][1]));
				if (d<dmax){
					shift=i;
					dmax=d;
				}
			}
            sglines.push([arrayRotate(lines,shift), cs + 1, cglines[cs][4],cglines[cs][6]]);
            cglines[cs][1] = -cglines[cs][1];
            lx = lines[0][0];
            ly = lines[0][1];
        }
    }

    var ox=-1000;
    var oy=0;
    var lz=0;
    var climbcut=$("cutclimb").checked;
    for (var j = 0; j < sglines.length; j++) {
        gline = sglines[j][0];
        var _re = Math.ceil(sglines[j][2] / (j==0?rz1:rz));
        var _rz = sglines[j][2] / (_re);
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
                    var dd=((r==0) && (sqr(ox-cx)+sqr(oy-cy)>sqr(realofs*2))); // decide we need to move up z or not
                    if (sglines[j][3]){
                        // recalculate repeat and rz only for last/ inner most
                        _re = Math.ceil(sglines[j][2] / rz1);
                        _rz = sglines[j][2] / (_re);
                        zz = -(r + 1) * _rz;

                    }
					gc += dd?pup:(r==0?pup2:"");
                    gc += "G1 F" + (dd?f1:f2) + " X" + mround(cx) + " Y" + mround(cy) + "\n";
                    if (dd)gc += "G0 Z0 F"+speedretract+"\n";
                    gc += pdn.replace("=cncz", mround(zz));
                } else {
                    gc += "G1 F" + f2 + " X" + mround(cx) + " Y" + mround(cy) + "\n";
                }
                if (ox!=-1000){
                    pockettime += Math.sqrt(sqr(cx - ox) + sqr(cy - oy)) / fs;
                }
                ox=cx;
                oy=cy;
            }
            lz=zz;
        }
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
    ctx.strokeStyle = "#800080";
    for (var j = 0; j < cglines.length; j++) {
        gline = cglines[j][0];
        ctx.beginPath();
        ctx.setLineDash([]);
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
