// gcodeoption used to determine: travel,feed,repeat, offset, [render mode 0:normal 1:plt mode 2:engrave]
// RED = PLT MODE for hershey text, offset =0
// BLUE = ENGRAVE
// BLACK = NORMAL
// GREEN = 
var ENGRAVE = 0;
var CMD_3D = 4;

var CMD_PLASMA = 5;
var CMD_CNC = 3;
var CMD_FOAM = 2;
var CMD_LASER = 1;
var OVC_MODE = 0; // 1 drill 0 path
var cuttabs=[];
var theme=1; // 0 white
var M3="M3";

function arrayRotate(arr, count) {
  count -= arr.length * Math.floor(count / arr.length);
  arr.push.apply(arr, arr.splice(0, count));
  return arr;
}

function $(id) {
    return document.getElementById(id);
}

function hideId(id) {
    $(id).style.display = 'none';
}

function showId(id) {
    $(id).style.display = 'block';
}

function showId2(id) {
    $(id).style.display = 'inline';
}

sqrt = Math.sqrt;
sqr = function(x) {
    return x * x;
}

function log(text) {
    $('log').value += text + '\n';
}

function getchecked(el) {
    return $(el).checked;
}

function getvalue(el) {
    if (el == "gcode") return editorgcode.getValue();
    else if (el == "engcode") return editorengcode.getValue();

    var v=$(el).value;
    
    if (el == "leadin") return v.split(",");
    else if (el == "pup") {
        
        if (v.trim()==""){
            if (cmd == CMD_CNC)v="G0 F4000 Z10";
        }
        return v.replaceAll(";","\n");
    }
    else if (el == "pdn") {
        if (v.trim()==""){
            if (cmd == CMD_CNC)v="G0 F1500 Z=cncz";
        }
        return $(el).value.replaceAll(";","\n");
    }
    else return v;
}
var speedvals=[];	
function getnumber(el){	
    var v=getvalue(el).split(",");	
    if (v.length==1)return parseFloat(v[0]);	
    	
    if (el=="speed"){	
        speedvals=v;	
    }	
	return parseFloat(v[v.length-1]);	
}

function getinteger(el){
	return parseInt(getvalue(el));
}


function setvalue(el, val) {
    if (el == "gcode") editorgcode.setValue(val, -1);
    else if (el == "engcode") editorengcode.setValue(val, -1);
    else $(el).value = val;
}

function setevent(ev, bt, act) {
    $(bt).addEventListener(ev, act, false);
}

function setclick(bt, act) {
    setevent("click", bt, act);
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}


var div = ""; //= $('mytext');
var area_dimension = $('area_dimension');
var div1; // = $('mytext1');

var text1;

function mround(x) {
    return parseFloat(x).toFixed(3);
}
function mround2(x) {
    return parseFloat(x).toFixed(2);
}
function mround1(x) {
    return parseFloat(x).toFixed(1);
}

var X1 = 0;
var Y1 = 0;
var lenmm = 0;
var lenn = 0;
var lastf = 0;
var x1 = 0;
var y1 = 0;
var z1 = 0;
var e1 = 0;
var cmd = 0;
var xmin = 100000;
var ymin = 100000;
var xmax = 0;
var ymax = 0;

var xmin2 = 100000;
var ymin2 = 100000;
var xmax2 = 0;
var ymax2 = 0;

var sxmin = 100000;
var symin = 100000;
var sxmax = 0;
var symax = 0;
var calcmax = 0;

var gcodes = [];
var harga = 1000;
var cncz = 0;

var layerheight = 0.35;
var filamentD = 1.75;
var filamentTemp = 180;
var retract = 0;
var overlap = 15;
var extrudeMul = 1;
var extrude = (layerheight * layerheight) / (filamentD * filamentD);

var fm = 0;
var gcntr = 0;

function gcoden(g, f, x2, y2, z2 = 10000, e2 = 1000000) {
    var xs = 1;
    if (z1 == z2) z2 = 10000;
    g = g * 1;
    f = mround(f);
    gcntr += 1;
    if (gcntr > 30) {
        gcntr = 0;
        fm = 0;
    }
    if (fm != f) {
        fm = f;
        f = " F" + f;
    } else f = "";
    if (cmd == 4) xs = -1;
    div = div + 'G' + g + f + ' X' + mround(x2 * xs) + ' Y' + mround(y2);
    if (z2 != 10000) div += " Z" + mround(z2);
    if (e2 != 1000000) div += " E" + mround(e2);
    div += '\n';
    x1 = x2;
    y1 = y2;
    if (z2 != 10000) z1 = z2;
    if (e2 != 1000000) e1 = e2;
    lastf = f;
    xmin = Math.min(xmin, x2);
    ymin = Math.min(ymin, y2);
    xmax = Math.max(xmax, x2);
    ymax = Math.max(ymax, y2);
    xmin2 = Math.min(xmin2, x2);
    ymin2 = Math.min(ymin2, y2);
    xmax2 = Math.max(xmax2, x2);
    ymax2 = Math.max(ymax2, y2);
}

var inretract = 0;

function gcode0(f, x2, y2, z2 = 10000, e2 = 1000000) {
    if (retract && (cmd == 4)) {
        if (!inretract) {
            inretract = 1;
            div += "G1 F60 E" + mround(e1 - 1) + "\n";
        }
    }
    gcoden(0, f, x2, y2);
}

function gcode1(f, x2, y2, z2 = 10000, e2 = 1000000) {
    x1 -= x2;
    y1 -= y2;
    // if 3d mode, then calculate the E
    lenn = sqrt(x1 * x1 + y1 * y1);
    if (cmd == 4) {
        if (inretract) {
            div += "G1 F60 E" + mround(e1) + "\n";
            inretract = 0;
        }
        e2 = e1 + lenn * extrude * extrudeMul;
    }
    lenmm += lenn;
    gcoden(1, f, x2, y2, z2, e2);
}
var sgcodes = [];
var detail = 1.0;
var opx = -1000;
var opy = -1000;
var line = [];

function linepush(f, x2, y2, fr = 0) {
    if (fr || (x2 != x1) || (y2 != y1)) {
        x1 -= x2;
        y1 -= y2;
        // if 3d mode, then calculate the E
        lenn = sqrt(x1 * x1 + y1 * y1);
        if (cmd == 4) {
            if (inretract) {
                div += "G1 F60 E" + mround(e1) + "\n";
                inretract = 0;
            }
            e2 = e1 + lenn * extrude * extrudeMul;
        }
        lenmm += lenn;
        xmin = Math.min(xmin, x2);
        ymin = Math.min(ymin, y2);
        xmax = Math.max(xmax, x2);
        ymax = Math.max(ymax, y2);

        xmin2 = Math.min(xmin2, x2);
        ymin2 = Math.min(ymin2, y2);
        xmax2 = Math.max(xmax2, x2);
        ymax2 = Math.max(ymax2, y2);

        line.push([f, x2, y2, lenmm, lenn]);
        x1 = x2;
        y1 = y2;
    }
}

/*

lines = [[f,x,y,len],...]

len is total length until this point

*/



function isClockwise(poly, px = 1, py = 2) {
    var sum = 0;
    for (var i = 0; i < poly.length; i++) {
        var cur = poly[i];
        ii = i + 1;
        if (ii == poly.length) ii = 0;
        var next = poly[ii];
        sum += (next[py] * cur[px]) - (next[px] * cur[py]);
    }
    return sum < 0;
}
var overcut = [0, 0];
var cross = 0;

function sharp(poly, px = 1, py = 2, idx = 0, num = 2) {
    var sum = 0;
    ci = idx;
    nci = ci;
    pci = ci;
    cur = poly[ci];
    d1 = 0;
    d2 = 0;
    while (d1 == 0) {
        pci--;
        if (pci < 0) pci += poly.length;
        prev = poly[pci];
        vec1 = [prev[px] - cur[px], prev[py] - cur[py]];
        d1 = sqrt(vec1[0] * vec1[0] + vec1[1] * vec1[1]);
    }
    while (d2 == 0) {
        nci++;
        if (nci >= poly.length) nci -= poly.length;
        next = poly[nci];
        vec2 = [next[px] - cur[px], next[py] - cur[py]];
        d2 = sqrt(vec2[0] * vec2[0] + vec2[1] * vec2[1]);
    }


    vec1 = [vec1[0] / d1, vec1[1] / d1];
    vec2 = [vec2[0] / d2, vec2[1] / d2];
    dot = (vec1[0] * vec2[0]) + (vec1[1] * vec2[1]);
    cross = (vec1[0] * vec2[1]) - (vec2[0] * vec1[1]);

    // corner overcut

    if (cross < 0)
        overcut = [vec1[0] + vec2[0], vec1[1] + vec2[1]];
    else overcut = [0, 0];
    //overcut=[cur[px]-vec3[0]/4,cur[py]-vec3[1]/4];


    return (dot);
}
var jmltravel = 0;


// hole inside always clockwise, outer path are counter clockwise
// to check if some hole belongs to which outer path, need to check bounding box each hole
var srl = [];
var disable_ovc = [];
var marking_cut = [];
var disable_tab = [];
var disable_cut = [];
var pause_at = [];
var shapectr = 0;
var collapsepoint = 7;
var noprocess = 14;
var oldlines = [];
var shapenum = 0;
var maxofs = 0;
var combinedpath = [];
var oshapenum = -1;

function getoffset() {
    if ($("pltmode").checked) return 0;
    var ofs = getnumber('offset');
    return ofs;
}
function RBcolor(stro) {
	return stro.substr(1, 2) + stro.substr(5, 2);
}
var cuttab_manual=[];
function prepare_line2(lenmm, lines, ofs1) {
    cuttab_manual=[];
    var detail = getnumber("curveseg") * 0.2;
    var ovmore = getnumber("ovcmore");
    var f2 = "F" + (getnumber('feed') * 60) + " ";
    var ofs = getoffset() + ofs1;
    var sty = gcstyle[shapenum];
    oshapenum = shapenum;
    if (sty == undefined) sty = defaultsty;
    if ($("strokeoffset").checked) ofs += sty["stroke-width"] * 1;

    if (sty.dopocket || sty.dovcarve) ofs = 0;
    ofs *= 0.5;
    maxofs = Math.max(ofs, maxofs);
    collapsepoint = cmd == CMD_CNC ? getnumber("drill")  : 0;
    noprocess = getnumber("overcutmin");
    shapectr++;
    var newlines = [];
    srl = [];
    lx = 0;
    ly = 0;
    sty.isPoint=0;
    // overcut, collapse only for CNC

    if ((cmd == CMD_CNC) && (lenmm < collapsepoint)) {
        var sx = 0;
        var sy = 0;
        for (var i = 0; i < lines.length; i++) {
            sx += lines[i][1];
            sy += lines[i][2];
        }
        sx /= lines.length;
        sy /= lines.length;
        newlines.push([
            [lines[0][0], sx, sy, 0, 0]
        ]);
        sty.isPoint=1;
        return [newlines, false];
    } else {
        var glines = [];
        var clk = isClockwise(lines);
        if (1){//(ofs != 0) { // cek disini
            // generate offset
            ///*
            var path = [];
            var paths = [];
            var scale = 1000;
            var S=0;
            for (var i = -1; i < lines.length; i++) {
                var l = lines[i<0?lines.length-1:i];
                if (i>=0)S+=sqrt(sqr(l[1]-x)+sqr(l[2]-y));
                x = l[1];
                y = l[2];
                if (i>=0){
                    path.push({
                        X: x*scale,
                        Y: y*scale
                    });
                }
            }
            sty.S0=S;
            paths.push(path);
            //  var paths = [[{X:30,Y:30},{X:130,Y:30},{X:130,Y:130},{X:30,Y:130}],[{X:60,Y:60},{X:60,Y:100},{X:100,Y:100},{X:100,Y:60}]]; 

            var co = new ClipperLib.ClipperOffset(); // constructor
            var offsetted_paths = new ClipperLib.Paths(); // empty solution		
            co.Clear();

            co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
            co.MiterLimit = 2;
            co.ArcTolerance = (sty.dovcarve ? 0.01 : 0.02) * scale;
            var delta = ofs * scale;
            if (!clk) delta = -delta;
            //if (sty.doEngrave || sty.dopocket) delta = -(delta); // engrave always inside, so swap it
            co.Execute(offsetted_paths, delta);
            var s = 0;
            var S = 0;
            var ds = 0;
            var ox = 0;
            var oy = 0;
            for (var i = 0; i < offsetted_paths.length; i++) {
                var newline = [];
                var path = offsetted_paths[i];
                var path = ClipperLib.JS.Lighten(offsetted_paths[i], detail * scale);
                if (sty.dovcarve) {
					if (clk)path=path.reverse();
                    combinedpath.push([path,sty.flip]);
                } else {
                    if (path.length) {
                        s=0;
                        var cuts=[];
                        for (var j = 0; j <= path.length; j++) {
                            var jj = j;
                            if (jj==path.length)jj=0;
                            if (clk) jj = path.length - 1 - jj;
                            var l = path[jj];
                            x = l.X * 1.0 / scale;
                            y = l.Y * 1.0 / scale;
                            
                            if (j > 0) {
                                ds = sqrt(sqr(x - ox) + sqr(y - oy));
                            // check if this line is intersect with cutting tab line
                            // function intersects(a,b,c,d,p,q,r,s)
                                for (var k=0;k<cuttabs.length;k++){
                                    var p1=cuttabs[k][0];
                                    var p2=cuttabs[k][1];
                                    var si=intersects_p(p1[0],p1[1],p2[0],p2[1],ox,oy,x,y);
                                    if (si!=null){
                                    	si=s+ds*(si);
                                        console.log("Intersect at" + (si));
                                        cuts.push(si);
                                    }
                                }
                            }
                            s += ds;
                            ox = x;
                            oy = y;
                            newline.push([f2, x, y, s, ds]);
                        }
                        S+=s;
                        //*/
                        glines.push(newline);
                        cuttab_manual.push(cuts);
                    }
                }
            }
            sty.S1=S;
            //if (newline.length>0)
            // keep old lines
            if (ofs > 0) oldlines.push([lines,sty.num])
            //
            //*/
        } else {
            glines.push(lines);
            //oldlines.push(lines);
        }
        if (sty.dovcarve) {
            // temporary save to combined and return empty			
            return [newlines, clk];
        }
        if ((disable_ovc.indexOf(shapectr + "") >= 0) || (lenmm < noprocess)) return [glines, clk];
        sharpv = $("sharp").value;
        ov = 0.01;
        if ((cmd == CMD_CNC) && getchecked("overcut")) {
            //ov+=$("overcut").value/10.0;
            var ro = $("offset").value / 2;
            ov += (sqrt(2 * sqr(ro)) - ro) + ovmore;
        }
        cxt = 0;
        cyt = 0;
        cnt = 0;
        var tl = 0;
        console.log(">>" + glines.length);
        for (var j = 0; j < glines.length; j++) {
            var gline = glines[j];
            var newline = [];
            for (var i = 0; i < gline.length; i++) {

                tl2 = gline[i][4];
                if (i < gline.length - 1)
                    tl += tl2; //gline[i][3];
                x = gline[i][1];
                y = gline[i][2];
                cxt += x;
                cyt += y;
                cnt += 1.0;

                //if (ov!=0)
                {
                    sr = sharp(gline, 1, 2, i);
                    if ((sr > sharpv)) {
                        //if (sqrt(sqr(x-lx)+sqr(y-ly))>20){
                        newline.push(gline[i]);
                        ox = overcut[0] * ov;
                        oy = overcut[1] * ov;
                        if ((OVC_MODE == 0) && ((ox != 0) || (oy != 0))) {
                            //newlines.push(lines[i]);
                            newline.push([gline[i][0], x - ox, y - oy, tl, 0]);
                            newline.push([gline[i][0], x, y, tl, 0]);
                            // double move on corner overcut, to make sure its cut
                            //newline.push([gline[i][0], x - ox, y - oy, tl, 0]);
                            //newline.push([gline[i][0], x, y, tl, 0]);
                        }
                        srl.push([x, y, sr, tl, i, [x - ox, y - oy], cross, cxt / cnt, cyt / cnt]);
                        cxt = 0;
                        cyt = 0;
                        cnt = 0;
                        lx = x;
                        ly = y;
                        //}
                    } else newline.push(gline[i]);
                }
            }
            newlines.push(newline);
        }
        return [newlines, clk];
    }
}
var warningpath=0;
function gcodepush(lenmm, X1, Y1, lenmm1, line, closed) {
    var area;
    if (closed)line.pop();
    if (closed) area = xarea();
    else area = 1;
    var lines;
    var sty=gcstyle[shapenum];
    if (!sty)return;
    var parent=sty.parent;
    //area-=sty.deep*1000;
    if (closed) {
        var ofs1 = 0;
        var linesx = prepare_line2(lenmm, line, 0)[0];
        if (!sty.greenskip && $("usefinish").checked) ofs1 = getnumber('finishline');
        lines2 = prepare_line2(lenmm, line, ofs1);
        var lines = lines2[0];
        var clk = lines2[1];
        if (lines.length==0){
            ofs1=0;
            lines=linesx;
        }
        if (sty.greenskip) area += 500000; // the outer still need to be the last
        for (var i = 0; i < lines.length; i++) {
            var line1 = lines[i];
            var ar = area;
            if (i > 0) ar = 1;
            var x1 = line1[0][1];
            var y1 = line1[0][2];
             
            gcodes.push([lenmm, ofs1?"D":"", x1, y1, lines[i], srl, ar, closed, shapenum,cuttab_manual[i]]);
        }
        var nc=lines.length-1;
        if (ofs1) {
            // if do finish line 
            for (var i = 0; i < linesx.length; i++) {
                var line1 = linesx[i];
                var ar = area;
                if (i > 0) ar = 1;
                var x1 = line1[0][1];
                var y1 = line1[0][2];
                gcodes.push([lenmm, "F", x1, y1, linesx[i], srl, ar + 1000, closed, shapenum,cuttab_manual[i]]);
                // need to add the childs count for the parent
            }
            nc+=linesx.length;
        }
        for (var pi in parent){
            gcstyle[parent[pi]].exchilds+=nc;
        }
        if (nc<0)warningpath-=nc;
    } else gcodes.push([lenmm, "", X1, Y1, line, srl, area, closed, shapenum,[]]);
    shapenum++;
}

function gcodepushcombined() {
    var f2 = "F" + (getvalue('feed') * 60) + " ";
    var X1;
    var Y1;
    var ox;
    var oy;
    var scale = 1000;
    var s = 0;
    var ds = 0;
    for (var ni=0;ni<2;ni++){
        var cpr = new ClipperLib.Clipper();
        var pp=[];
        for (var j=0;j<combinedpath.length;j++){
            if (combinedpath[j][1]==(ni==1)) continue;
            pp.push(combinedpath[j][0]);
        }
		cpr.AddPaths(pp, ClipperLib.PolyType.ptSubject, true);
        var solution_paths = [];
        var glines = [];
        var succeeded = cpr.Execute(ClipperLib.ClipType.ctUnion, solution_paths, 1, 1);
        if (!succeeded) continue;
        shapenum++;
        for (var i = 0; i < solution_paths.length; i++) {
            var newline = [];
            var path = solution_paths[i];
            if (path.length) {
                for (var j = 0; j < path.length; j++) {
                    var jj = j;
                    //if (clk)jj=path.length-1-j;
                    var l = path[jj];
                    x = l.X * 1.0 / scale;
                    y = l.Y * 1.0 / scale;
                    if (j > 0) {
                        ds = sqrt(sqr(x - ox) + sqr(y - oy));
                    }
                    s += ds;
                    ox = x;
                    oy = y;
                    newline.push([f2, x, y, s, ds]);
                }
                ///*
                var l = path[0];
                x = l.X * 1.0 / scale;
                y = l.Y * 1.0 / scale;
                if (i == 0) {
                    X1 = x;
                    Y1 = y;
                }
                newline.push([f2, x, y, s, ds]);
                //*/
                glines.push(newline);
            }
        }
        for (var i = 0; i < glines.length; i++) {
            var line1 = glines[i];
            gcodes.push([s, "", X1, Y1, glines[i],
                [], 1, 1, shapenum
            ]);
        }
        gcstyle[shapenum] = ni==0?carvestyIn:carvestyOut;
    }
}


var cutevery = 200;
var cutmax=6;
var engrave = {};
var engraveDPI = 50;

var carvedeep = 5;

function drawengrave() {
    //	if (cmd!=CMD_LASER)return;
    if (!$("enableraster").checked) return;
    var c = $("myCanvas1");
    var ctx = c.getContext("2d");
    ctx.setLineDash([]);
    $("ystep").innerHTML = mround(25.41 / engraveDPI) + "mm";
    for (var i = 0; i < engrave1.length; i++) {
        var e = engrave1[i];
        ctx.beginPath();
        if (e[4]*1>0) {
			var c=parseInt(255-e[4]).toString(16);
			if (c.length==1)c="0"+c;
			ctx.strokeStyle = "#"+c+c+c;
        } else ctx.strokeStyle="#0000ff";
        ctx.moveTo((e[0] + maxofs) * dpm, (e[1] + maxofs) * dpm);
        ctx.lineTo((e[2] + maxofs) * dpm, (e[3] + maxofs) * dpm);
        ctx.stroke();

    }
}
var engrave1 = [];
var engravetime = 0;
var bitmaptime =0;

var eangle=0;
var radians = (Math.PI / 180) * eangle;
var rcos = Math.cos(radians);
var rsin = Math.sin(radians);
var r1cos = Math.cos(-radians);
var r1sin = Math.sin(-radians);

var currPw=0;
function setup_rotate(angle){
    currPw=((angle >> 4) & 15) * 17; // 0 - 255
    eangle=angle;
	angle = (angle & 15)*12;
	if (angle==0)angle=getvalue("rasterangle") * 12;
    radians = (Math.PI / 180) * (angle);
    rcos = Math.cos(radians);
    rsin = Math.sin(radians);
    r1cos = Math.cos(-radians);
    r1sin = Math.sin(-radians);
}
function rotateV(cx, cy, x, y,angle) {
    var radians = (Math.PI / 180) * (angle);
    var rcos = Math.cos(radians);
    var rsin = Math.sin(radians);
    var r1cos = Math.cos(-radians);
    var r1sin = Math.sin(-radians);
	nx = (rcos * (x - cx)) + (rsin * (y - cy)) + cx,
	ny = (rcos * (y - cy)) - (rsin * (x - cx)) + cy;
	return [nx, ny];
}
function rotateCW(cx, cy, x, y) {
        nx = (rcos * (x - cx)) + (rsin * (y - cy)) + cx,
        ny = (rcos * (y - cy)) - (rsin * (x - cx)) + cy;
        return [nx, ny];
}
function rotateclimb(cx, cy, x, y) {
        nx = (r1cos * (x - cx)) + (r1sin * (y - cy)) + cx,
        ny = (r1cos * (y - cy)) - (r1sin * (x - cx)) + cy;
        return [nx, ny];
}


function doengrave() {

    //	if (cmd!=CMD_LASER)return;
    if (ENGRAVE == 0) engrave1 = [];
    // auto skip line treshold
    if (!$("enableraster").checked) return;
    if (!Object.keys(engrave).length)return;
    var c = $("myCanvas1");
    var ctx = c.getContext("2d");
    var ofs = getoffset();
    carvedeep = getnumber('carved');
    var f2 = getnumber('rasterfeed') * 60;
    var pw = getnumber('rasterpw') * 0.01*255;
    var cpwd = " S" + pw;
    var f1 = f2;
    if (cmd == CMD_CNC) {
        f2 = getnumber('rasterfeed') * 60;
        var f1 = speedtravel * 60;
    }
    var pup = "";
    if (cmd == CMD_CNC)pup="G0 Z" + getnumber('safez') + "\n";
    var pdn = getvalue('pdn') + "\n";
    var overs = getnumber('overshoot');
    var grayInvert=$('grayinvert').checked;
    var skiplen=0;
    if (cmd == CMD_CNC) overs = 0;
    if ($("enablesmartraster").checked) skiplen=getnumber('skiplength');
    nsortx = function(a, b) {
        return (a[0] * 1 - b[0] * 1);
    };
    msortx = function(a, b) {
        return (b[0] * 1 - a[0] * 1);
    };
    nsort = function(a, b) {
        return (a * 1 - b * 1);
    };
    msort = function(a, b) {
        return (b * 1 - a * 1);
    };
    
    var re = Math.ceil(getnumber("carved")/getnumber("carvedp"));
    var rep1 = Math.ceil(getnumber("carved")/getnumber("firstd"));
    if (cmd==CMD_LASER)re=rep1=1;
    carvedeep = getnumber("carved");
    var rz = carvedeep / re;
	gc="";
    for (ang in engrave){
        aengrave=engrave[ang];
        setup_rotate(ang); // 0 - 120 degree
        var pwa=((ang >> 4) & 15) * 17; // 0 - 255
        if (grayInvert)pwa=255-pwa;
        if (!pwa)pwa=pw; // back to default if 0
		gc += M3+ " S"+pwa+"\nG0 F" + f1 + "\nG1 F" + f2 + "\n";
		gc += pup;
        var ry = Object.keys(aengrave).sort(nsort);
        if (ry.length == 0) {
            continue;
        }
        var lry = -10000;
        ri = -1;
        var engr;
        var lengr;

        drwR = 0.2;
        var c1 = $("rasteroutline").checked;
        var dir=1; // 0 down 1 up
        // repeat until no more lines
        var run=1;
        var tx=0;var skipx=0;
        var maxrun=10;

		// fix the different burn array in one line
		for (var fi = 0; fi < ry.length; fi++) {
			var y= ry[fi];
			engr = aengrave[y];
			var pdata = engr.sort(nsortx);
			var cstack=[pdata[0][1]];
			var rdata=[];
			var pp = pdata.length / 2 - 1;
			var v3=null;
			for (fj=0;fj<=pp;fj++){
				var v1=pdata[fj*2];
				var v2=pdata[fj*2+1];
				if (v1[1]==v2[1]) {
					// if last time have v3
					rdata.push(v1);
					rdata.push(v2);
					v3=null;	
				} else {
					// if last time have v3
					if (fj<pp){ // if not last item
						v3=pdata[fj*2+2];
						rdata.push(v1);   
						var xb=v3[0];         // keep same intensity
						v3[1]=v2[1];
						v2[1]=v1[1];
						rdata.push([v2[0],v2[1]]);
					} else {
						rdata.push([v1[0],v2[1]]);
						rdata.push(v2);
					}
					// keep the last
				}
			}
			aengrave[y]=rdata;
		}
		var lpw="";
		var tlx=1000;
		var tly=1000;
        while (run && maxrun){
            run=0;
            maxrun--;
            dir=!dir;
            var first=1;
            for (var fi = 0; fi < ry.length; fi++) {
                var i=fi;
                first=1;
                if (dir)i=ry.length-1-i; 
                var _rz = rz;
                var _re = re;
                // on first line, cannot eat to much
                if (i == 0) {
                    _re = rep1;
                    _rz = carvedeep / _re;
                }
                if (cmd == CMD_LASER) _re = 1;
                var z = 0;
                var y = ry[i];
                engr = aengrave[y];
                if (engr.length==0)continue;

                //check if we need to slow down
                var slowdown = 0;
                var slowx = [];

                // if last engrave data have nocut data overlap with current cut data, then its mean need to slow down
                // because we cut more volume
                if ((cmd == CMD_CNC) && (i > 1)) {
                    var temp = [];
                    for (var c = 0; c < engr.length; c++) {
                        temp.push([engr[c], 0]);
                    }
                    for (var c = 0; c < lengr.length; c++) {
                        temp.push([lengr[c], 1]);
                    }
                    temp = temp.sort(nsortx);
                    var lc = [0, 0];

                    for (var c = 0; c < temp.length - 2; c++) {
                        var t = temp[c];
                        lc[t[1]] = !lc[t[1]];
                        // if current is cutting and prev is not then slowdown
                        //if (c>1 && t[1] && !t[2] && lc[0] && (Math.abs(t[0]-temp[c+1][0])>10)) {slowdown=1;break;} // half almost
                        if (c > 1 && t[1] && lc[0] && !lc[1] && (Math.abs(t[0] - temp[c + 1][0]) > 5)) {
                            slowdown = 1;
                            break;
                        } // half almost
                    }
                }
                var ctxstrokeStyle;
                if (slowdown) {
                    gc += ";Y:" + mround2(y) + " Slowdown .. \nG1 F" + (f2 * 0.5) + "\n";
                    ctxstrokeStyle = "#ff0000";
                } else {
                    gc += ";Y:" + mround2(y) + "\n";
                    ctxstrokeStyle = "#0000ff";
                }
                lengr = engr;
                var ogy = (y * 25.41 / engraveDPI);
                lx = -100;
                if (cmd==CMD_LASER) gc += pup;
                var ashift=0;
                var pdata = engr.sort(nsortx);
                /*
                    0 - 1
                    2 - 3
                    4 - 5
                */
                // go to overshoot
                var dx = (cmd == CMD_LASER) ? 0 : ox;
                if (!c1) dx = 0;
                dx = 0;
                var rdata=[];
                pp = pdata.length / 2 - 1;
                for (var j = 0; j <= pp; j++) {
                    var p1=pdata[j * 2 + 1];
                    
                    var p2=pdata[j * 2];
                    ox =  p1[0]* 1 + dx;
                    fx =  p2[0] * 1 - dx;
                    // if move to far skip it
                    ashift=j*2+2;
                    
                    if (skiplen>0 && Math.abs(ox-skipx)>skiplen){
                        if (!first){
                            ashift-=2;
                            run=1; // repeat the loop                        
                            break;
                        }
                    }
                    rdata.push([ox,p1[1]]);
                    rdata.push([fx,p2[1]]);
                    skipx=ox;
                    first=0;
                }                
                if (rdata.length>0){
                    pdata.splice(0,ashift);
                    // return the data
                    aengrave[y]=pdata;
                    for (var r = 0; r < _re; r++) {
                        ri++;
                        //if (ri>0)rdata = rdata.reverse();
                        rdata.sort(ri&1?msortx:nsortx);
                        tx = rdata[0][0];


                        var ox = tx + (((ri) & 1) ? overs : -overs);
                        oox = ox;
                        
                        var xy0=rotateclimb(0,0,ox,ogy);

                        //gc += "G0 Y" + mround(gy) + " X" + mround(ox) + "\n";
                        gy=xy0[1];
                        ox=xy0[0];
						var dd=sqrt(sqr(ox-tlx)+sqr(gy-tly))>(ofs*2);
						if (dd)gc+=pup;
                        gc += (dd?"G0":"G1")+" Y" + mround2(gy) + " X" + mround2(ox) + "\n";
                        var drw = 1;
                        //if (cmd==CMD_LASER)drw=Math.abs(gy-lry)>drwR;
                        if (drw) lry = gy;
                        var xy1=rotateclimb(0,0,rdata[0][0],ogy);
                        
                        xmin = Math.min(xmin, xy1[0]);
                        xmax = Math.max(xmax, xy1[0]);
                        ymin = Math.min(ymin, xy1[1]);
                        ymax = Math.max(ymax, xy1[1]);
                        z -= _rz;
                        //xmi=10000;
                        //xma=0;
                        pp = rdata.length / 2 - 1;
                        var xy2;
                        var oox1;
                        var LY=-10000;
                        var LPW=-100;
                        for (var j = 0; j <= pp; j++) {
                            oox1=rdata[j * 2 + 1][0] * 1;
                            oox2=rdata[j * 2][0] * 1;
                            cpw = parseInt(rdata[j * 2][1] * pw / 255);
                            if (cpw > 0)
                                cpw = " S" + cpw;
                            else
                                cpw = cpwd;

                            if (lpw == cpw)
                                cpw = "";
                            else
                                lpw = cpw;
                            xy1 = rotateclimb(0, 0, oox1, ogy);
                            xy2 = rotateclimb(0, 0, oox2, ogy);
                            ox = xy1[0];
                            fx = xy2[0];
                            if (cmd == CMD_LASER) {

                                //if (Math.abs(oox2-oox1)>0.1)
                                gc += "G0 X" + mround2(fx);
                                if (LY!=xy2[1]) gc += " Y" + mround2(xy2[1]) ;
                                LY=xy2[1];
                                if (cpw && LPW!=cpw){
                                    gc+= "\nM3 "+cpw+"\n";
                                    LPW=cpw;
                                }
                                gc += "\nG1 X" + mround2(ox);
                                if (LY!=xy1[1]) gc+=" Y" + mround2(xy1[1]) ;
                                //if (LPW!=cpw)gc+= cpw;
                                gc+= "\n";
                                LY=xy1[1];
                                // remove data from engr


                            } else {
                                // repeat until deep satisfied
                                if (Math.abs(ox - fx) >= ofs) {
                                    //else gc += "G1 Z"+mround(z)+" F"+speedretract+"\n";

                                    gc += "G0 X" + mround(fx) + " Y" + mround(xy2[1]) +"\n";
                                    if(j)gc += "G0 Z0 F"+speedretract+"\n";
                                    gc += "G1 Z" + mround(z) + "\n";
                                    gc += "G1 X" + mround(ox) + " Y" + mround(xy1[1]) +"\n";
                                    tlx=ox;
                                    tly=xy1[1];
                                    if (j < pp) gc += pup;
									engravetime += 0.8 * Math.abs(ox-fx) / (f2* 0.0167);
                                }
                            }
                            if (drw && !r) {
                                engrave1.push([fx, xy2[1],ox, xy1[1], rdata[j * 2][1],ctxstrokeStyle]);
                            }
                            
                        }
						xmin = Math.min(xmin, ox);
						xmax = Math.max(xmax, ox);
                        if (cmd == CMD_LASER) {
							ox = oox1 + (((ri) & 1) ? -overs : overs);
							xy1=rotateclimb(0,0,ox,ogy);

							gc += "G0 X" + mround2(xy1[0]);
							if (LY!=xy1[1])gc += " Y" + mround2(xy1[1]);
							gc+= "\n";
							engravetime += 1.3 * Math.sqrt(sqr(xy0[0]-xy1[0])+sqr(xy0[1]-xy1[1])) / (f2* 0.0167);
                        } else {
							ox = oox1;
						}
                    }
                    if (slowdown) gc += "G1 F" + (f2) + "\n";
                }
            }
        }
        if (cmd==CMD_LASER)gc += pup + "\n";
    }
    gc += pup + "\n";
    //if (ENGRAVE==1)
    gc = getvalue("engcode") + gc;
    setvalue("engcode", gc);
}
function addengrave(ang,pw,cx, cy) {
    if (engrave[ang]==undefined)engrave[ang]={};
    if (engrave[ang][cy] == undefined) engrave[ang][cy] = [];
    engrave[ang][cy].push([cx,pw]);
}


function newengraveline(x1, y1, x2, y2,half) {
    //if (cmd!=CMD_LASER)return;
    xy1=rotateCW(0,0,x1,y1);
    xy2=rotateCW(0,0,x2,y2);
    x1=xy1[0];
    y1=xy1[1];
    x2=xy2[0];
    y2=xy2[1];
    
    
    if (!$("enableraster").checked) return;
    if (y2 < y1) {
        // swap 1 and 2
        x3 = x1;
        x1 = x2;
        x2 = x3;

        y3 = y1;
        y1 = y2;
        y2 = y3;

    }
    // 
    var dy = y2 - y1;
    if (dy == 0) return;
    var dx = x2 - x1;
    var ratio = engraveDPI / 25.41;
    var ratiox = ratio*2;
    var sy1 = Math.ceil(y1 * ratio);
    var sy2 = Math.floor(y2 * ratio);
    var ts = (sy2 - sy1) + 1;
    if (ts > 0) {
        cy = sy1;
        // back to original ratio
        var srx = 1 / ratiox;
        var sr = 1 / ratio;
        var r = dx / dy;
        sx1 = (x1 + (sy1 * sr - y1) * r)*ratiox;
        sx2 = (x1 + (sy2 * sr - y1) * r)*ratiox;
        sdx = sx2 - sx1;
        sx = ts > 1 ? sdx / (ts - 1) : 0;
        for (var i = 0; i < ts; i++) {
            if (!half || (half && ((cy&1)==0)))addengrave(eangle,currPw,Math.floor(sx1)*srx, cy);
            sx1 += sx;
            cy += 1;
        }
    }
    //addengrave(cx,cy);
}
var engraveline = newengraveline;

var dpm;
var defaultsty = {
    "stroke": "#000000",
    "stroke-width": 0,
    "deep": undefined,
    "repeat": undefined
};
var carvesty = {
    "stroke": "#0000ff",
    "fill": "#ff00ff",
    "stroke-width": 0,
    "deep": undefined,
    "dovcarve":true,
    "repeat": undefined
};
var carvestyIn = {
    "stroke": "#0000ff",
    "fill": "#ff00ff",
    "stroke-width": 0,
    "deep": undefined,
    "dovcarve":true,
    "flip":false,
    "repeat": undefined
};
var carvestyOut = {
    "stroke": "#0000ff",
    "fill": "#ff00ff",
    "stroke-width": 0,
    "deep": undefined,
    "dovcarve":true,
    "flip":true,
    "repeat": undefined
};


var veeline;
var conline;
var oyct = 0;
function getRealIndex(ci,llen,climb,shift,closed){
		// if climb cut
		var i;
        if (climb) {
            i = (llen) - ci;
            if(!closed)i--;
        } else {
            i = ci;
        }
        
        i+=shift;
        // make sude index is 0 to lines.length-1
        while (i<0){i+=llen;}
        while (i>=llen){i-=llen;}
        return i;	
}

function draw_leads(){
    var cw = $("myCanvas1").width - 70;
    var ch = $("myCanvas1").height - 70;
    dpm = cw / (sxmax + maxofs * 2);
    dpm = Math.min(dpm, ch / (symax + maxofs * 2));
    var x = lx / dpm;
    var y = ly / dpm;
    var c = $("myCanvas1");
    var ctx = c.getContext("2d");
		ctx.font = "8px Arial";

    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle="blue";
    for (var i=0;i<leads.length;i++){
		var l=leads[i];
		ctx.moveTo((l[0] + maxofs) * dpm, (l[1] + maxofs) * dpm);
		ctx.lineTo((l[2] + maxofs) * dpm,(l[3] + maxofs) * dpm);
		if (l[4])ctx.lineTo((l[4] + maxofs) * dpm,(l[5] + maxofs) * dpm);
		
	}
	ctx.stroke();
}
var firstline=0;
function draw_line(num, lcol, lines, srl, dash, len, closed, snum,flip,shift,warn,cutpos) {
    //cmd = getvalue('cmode');
    cuttabz = getnumber("tabc");

    var olx=lx;
    var oly=ly;
    if (shift== undefined)shift=0;
    var dline = [];
    engraveDPI = getnumber("rasterdpi");    
    var sty = gcstyle[snum];
    
    setup_rotate(sty.angle);
    var stu=sty == undefined;
    if (stu) sty = defaultsty;
    if (warn){
        // oldlines
        warn=(sty.S1<=0 || (sty.S1/sty.S0<0.5));
        if (warn){
            lcol="#FF0000";
            warningpath++;
        }
        sty = defaultsty;
    }
    if (sty.greenskip || sty.doEngrave || sty.dovcarve || sty.dopocket || (!closed)){
        stu=1;
        cuttabz=0;        
    }

    plt =($("pltmode").checked) ;
    

    var cutindex=0;
    slc =cutpos[cutindex];
    
    var ofs = getoffset();
    var cw = $("myCanvas1").width - 70;
    var ch = $("myCanvas1").height - 70;
    dpm = cw / (sxmax + maxofs * 2);
    dpm = Math.min(dpm, ch / (symax + maxofs * 2));
    var x = lx / dpm;
    var y = ly / dpm;
    var cxmin = 100000;
    var cymin = 100000;
    var cxmax = 0;
    var cymax = 0;
    var n = 0;
    var sc = 1;

	// handle the cutting direction too
	// flipx change the direction of cutting too
    var climb = flip;
    if ($("cutclimb").checked) climb = !climb;
    if ($("flipx").checked) {climb=!climb;sc = -1;}

    var ro = $("rotate").checked?-1:1;
    var c = $("myCanvas1");
    var ctx = c.getContext("2d");
		ctx.font = "8px Arial";
    var g = 0;
    var X1 = 0;
    var Y1 = 0;

    tl = 0;

    seg = $("segment").checked;

    start = 0;
    sharpv = $("sharp").value;

    ov = 0;
    if ((cmd == CMD_CNC) && getchecked("overcut")) {
        var rr = $("offset").value / 2;
        ov = sqrt(2 * sqr(rr)) - rr;
    }
    lsx = -10;
    lsy = 0;
    var i = 0;
    var incut = 0;
    var lenctr = 0;
    var iscut = 0;
    ctx.beginPath();
    if (firstline){
        firstline=0;
        lx=(lx + maxofs) * dpm;
        ly=(ly + maxofs) * dpm;
        ctx.setLineDash([]);
        ctx.moveTo(lx-15, ly);
        ctx.lineTo(lx+15, ly);
        ctx.moveTo(lx, ly-15);
        ctx.lineTo(lx, ly+15);
        ctx.strokeStyle = "#FFFF00";
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.moveTo(lx, ly);
    lx2 = lx;
    ly2 = ly;
    nc = 2;
    var pocketdeep = 0;

    var carvedeep = getnumber('carved');
    stro = sty["stroke"];
    fil = sty["stroke"];

    if (sty.dopocket) {
        pocketdeep = sty.strokedeep > 0 ? sty.strokedeep : carvedeep;
    }

    var cll = false;
    if (closed && !plt) {
        cll = isClockwise(lines);
        if (!cll) lcol = "#00C800";else lcol = theme==0?"#000000":"#cceeee";
    } else {
        lcol = theme==0?"#000000":"#cceeee";	
    }
    if (sty.dovcarve) lcol = "#00ffff";
    if (sty.dopocket) lcol = "#800080";
    if (sty.domarking) lcol = "#FF0000";
    ox = 0;
    oy = 0;
    ll=lines.length;
    if (shift)ll++;

    var pdis=0;
    var lenc=0;
    pdis=0;
    for (var ci = -1; ci < ll; ci++) {

		i=getRealIndex(ci,lines.length,climb,shift,closed); 
        
        x = lines[i][1];
        y = lines[i][2];
        if (sc == -1) {
            x = sxmax - x;
        }
        if (ro == -1) {
            xx = x;
            x = y;
            y = sxmax - xx;
        }

		// ci = -1 is only to get the position 
        if (ci<0){
			lx2=x;
			ly2=y;
			continue;
		}
		
        nlenctr = lenctr;
        
        // the way we save distance data need to be handled on climb cut/climb
		pi=i+(climb?1:0);
		if (pi>=lines.length)pi-=lines.length;
        pdis=ci>0?lines[pi][4]:0;
        
        
        lenctr += pdis;
		if (ci>0 && closed && sty.doEngrave) {
            engraveline(lx2, ly2, x, y,sty.halfDPI);
        }
        xmax = Math.max(xmax, x);
        ymax = Math.max(ymax, y);
        xmin = Math.min(xmin, x);
        ymin = Math.min(ymin, y);

        dline.push(x);
        dline.push(y);
        if (cmd == CMD_CNC) {
            if (1) {
                iscut = 0;
                if (cuttabz) {
                    // if cut1 is in lenc and lencnext then cut the line
                    // and dont increase the i counter
                    if ((slc >= lenc) && (slc <= lenctr)) {
                        // split lines
                        iscut = 1;
                        dx = x - lx2;
                        dy = y - ly2;
                        llen = lenctr - lenc;

                        lcut = slc - lenctr;
                        x = x + dx * (lcut / llen);
                        y = y + dy * (lcut / llen);
                        lenc = slc;


                        if ((incut == 1)) {
                            incut = 0;
                            
                            // next cut pos
                            cutindex++;
                            slc =cutpos[cutindex];
                        } else {
                            incut = 1;
                            slc += cuttablen;
                        }
                    }

                }
            }
        }

        g = ci;
        if (g >= 0) {

            if (g > 0) ctx.strokeStyle = lcol;
            if (iscut) {
                if (incut == 1) {
                    // move up
                } else {
                    // move back down
                }
                ci--;
                lenctr -= pdis;
            } else {
                lenc = lenctr;
            }

            cxmin = Math.min(cxmin, x);
            cymin = Math.min(cymin, y);
            cxmax = Math.max(cxmax, x);
            cymax = Math.max(cymax, y);
            lx = (x + maxofs) * dpm;
            ly = (y + maxofs) * dpm;


            ctx.lineTo(lx, ly);

            lx2 = x;
            ly2 = y;
            if (g == 0) {
				
                X1 = lx;
                Y1 = ly;
                if (!stu) {
					// direct travel to here
                    jmltravel+=sqrt(sqr(olx-lx)+sqr(oly-ly))/dpm;
                    ctx.strokeStyle = "#FFFF00";
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.setLineDash(dash);
                ctx.moveTo(lx, ly);
            }
            if (iscut) {
                if (cuttabz)ctx.arc(lx, ly, 2, 0, 2 * Math.PI);
                nc += 2;
                ctx.moveTo(lx, ly);
            }
        }
    }


    //ctx.lineTo(X1, Y1);
    ctx.stroke();
    d1 = sqrt(sqr(lx - X1) + sqr(ly - Y1)) / dpm;
    if (num == "") return;

    //ctx.beginPath();

    //ctx.setLineDash([2]);
    if (closed){
        lx=X1;
        ly=Y1;
    }
    //ctx.moveTo(lx, ly);
    //ctx.lineTo(X1, Y1);
    //ctx.stroke();
    //ctx.endPath();
    //srl.push([X1, Y1, 0, tl + d1, 0,[0,0],0]);
    //if (seg) {
    var fs = (13 * $("zoom1").value);
    ctx.font = fs + "px Arial";
    sg = "[#" + num + "] ";
    for (i = 0; i < srl.length; i++) {
        if (i) sg += ",";

        ctx.strokeStyle = "red";
        ctx.beginPath();
        oc = srl[i][5];
        sx = srl[i][0];
        sy = srl[i][1];
        if (sc == -1) {
            sx = sxmax - sx;
        }
        if (ro == -1) {
            xx = sx;
            sx = sy;
            sy = sxmax - xx;
        }
        sx *= dpm;
        sy *= dpm;
        if (srl[i][6] < 0) {
            //				ctx.arc(sx, sy, 3, 0, 2 * Math.PI);
            //				ctx.moveTo(sx, sy);
            //				ctx.lineTo(oc[0]*dpm, oc[1]*dpm);
        }
        ctx.stroke();
        if (seg) {
            ctx.fillStyle = ctx.strokeStyle;
            ni = i + 1;
            if (ni >= srl.length) ni = 0;
            xt = srl[ni][0] * dpm;
            yt = srl[ni][1] * dpm;
            xt2 = srl[i][0] * dpm;
            yt2 = srl[i][1] * dpm;
            l = Math.round(10 * (srl[ni][3] - srl[i][3])) / 10.0;
            sg += l;
            if (l > 0.5) {
                //l=Math.round(l);
                ctx.beginPath();
                ctx.strokeStyle = "lime";
                ctx.fillStyle = ctx.strokeStyle;
                var xct = (xt + xt2) / 2 + Math.random() * 40;
                var yct = 0;
                var tt = 20;
                while (--tt > 0) {
                    yct = (yt + yt2) / 2 + Math.random() * 40;
                    if (Math.abs(yct - oyct) > (fs * 2)) break;
                }
                if (yct < 20) yct = 20;
                oyct = yct + fs;

                ctx.fillText(l, xct, yct);
                ctx.moveTo(xt, yt);
                ctx.lineTo(xct, yct);
                ctx.lineTo(xt2, yt2);
                ctx.stroke();
                ctx.beginPath();

                ctx.strokeStyle = theme==0?"#000000":"#cceeee";
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fillText(l, xct - 1, yct - 1);

                ctx.stroke();

            }
        }
    }
    if (seg) $("segm").value += sg + "\n";
    //}
    //+" W:"+mround(cxmax-cxmin)+" H:"+mround(cymax-cymin)+" "
    ctx.fillStyle = "#000000";
    if (climb) {
        clw = ">";
        if (cll) clw = "<";
    } else {
        clw = "<";
        if (cll) clw = ">";
    }
    if (sty.dovcarve) veeline.push([dline,sty.flip]);
    if (sty.dopocket) conline.push([dline, pocketdeep]);
    if (sty.greenskip){
        lx=olx;
        ly=oly;
    }
    // display climb and num 
    //if (cxmin < cxmax) ctx.fillText("#" + num+clw, dpm * ((cxmax - cxmin) / 2 + cxmin), dpm * cymax + 10);
}
var lastz = 0;
var lasee = 0;
var lx;
var ly;
var cuttablen = 5.5;
var lastspeed = 1;
var tabcutspeed = 1;
var totaltime = 0;
var skipz = 0;
function uptosafe(f){
}
function movetofast(x,y,f){
}
var cachedcutpos=[];
function getcutpos(index,shift,flip){
    if (cachedcutpos[index]==undefined){
        var rcutpos=sgcodes[index][0][9];
        if (rcutpos==undefined)rcutpos=[];
        lines=sgcodes[index][0][4];
        var climb = flip;
        if ($("cutclimb").checked) climb = !climb;
        if ($("flipx").checked) climb = !climb;
        var lshift=0;
        var len=0;

        for (var ci = 0; ci <lines.length; ci++) {
            if (climb) {
                i = (lines.length-0) - ci;
            } else {
                i = ci;
            }
            while (i>=lines.length){i-=lines.length;}
            len+=lines[i][4];
			pi=i+(climb?1:0);
			if (pi>=lines.length)pi-=lines.length;
			pdis=lines[pi][4];
            if ((i<=shift))lshift+=pdis;
            
           
        }
                
        if (rcutpos.length==0){
            if (len < Math.min(50, cutevery * 2)) cuttabz = 0;
            //if (disable_tab.indexOf(num + "") >= 0) cuttabz = 0;
            var lenc = 0;
            

            dv = Math.min(cutmax,Math.round(len / cutevery));
            if (dv<2)dv=0;
            if (dv>8) dv=4;
            lc = len / dv;
            slc = lc / 2;
            rcutpos=[];
            for (var k=0;k<dv;k++){
                rcutpos.push(slc);
                slc+=lc;
            }    
        }
       

        // shift the cutpos
        var cutpos=[];
        for (var k=0;k<rcutpos.length;k++){
            var p=rcutpos[k]-lshift;
            if (p<0)p=len+p;
            if (climb) p=len-p;
            cutpos.push(Math.max(Math.min(p-cuttablen/2,len-cuttablen/2),cuttablen/2));
        }
        
        nsort = function(a, b) {
            return (a * 1 - b * 1);
        };
       
        cachedcutpos[index]=cutpos.sort(nsort);
    }
    return cachedcutpos[index];
}
var X9=null;
var Y9;
var X0=null;
var Y0;
var leads=[];
var rampmoves=[]; // save the ramp moves to make a finish move
function getspindleoff(){
    return M3+" S"+Math.floor(getnumber("spindleoffval")*2.55)+"\n";
}
function getspindleon(){
    if (cmd == CMD_LASER) return M3+" S"+cutpw+"\n";
    var P=" P"+parseInt(getnumber("dwelltime")*1000);
    if (P==" P0")P="";
    return M3+" S"+cutpw+P+"\n";
}
var fnl=0;
var hasfnl=0;
function lines2gcode(num, data, z, z2, cuttabz, srl, lastlayer = 0, firstlayer = 1, snum, f2, flip,shift,cutpos) {
    // the idea is make a cutting tab in 4 posisiton,:
    //
    addz=getvalue("addz");
    if (lastlayer && addz>0) {
    	z2-=addz;
        //z-=addz;
        cuttabz-=addz;
    }    
    
    if (z2 > skipz) {
        lastz = z;
        return "";
    }
    if (cmd == CMD_LASER) {
        z = 0;
        z2 = 0;
    }
    var dz = z2 - z;
    
    fm = 0;
    var lines = data[4];
    if (lines.length == 0) return;
    var isnotpoint=lines.length>1;
    var closed=data[7] && isnotpoint;


    
/////
    var len = Math.abs(data[0]);
    var _ramp=_rampdown;
    if (!closed)_ramp=0;
    if (_ramp){
        dz=Math.min(z2-z,-len*0.3);
    } else {
        dz=0;
        z=z2;
    }
    var climb = flip;
    if ($("cutclimb").checked) climb = !climb;
                
        var cutindex=0;
        slc =cutpos[cutindex];

	var p=getRealIndex(0,lines.length,climb,shift,closed);

    var X1 = lines[p][1];
    var Y1 = lines[p][2];
	var l1=getvalue("leadin"); // 2mm
	
	var leadmm=parseFloat(l1[0]);
	var uselead=closed && $("useleadin").checked && (leadmm<len);
    
    if (uselead && firstlayer){
		// get the vector of the first point
        X0=null;
		var dx=0;
		var dy=0;
		var pp=p;
		var d=0;
		var ang1=parseFloat(l1[1])|| 40;
		var ang2=parseFloat(l1[2]);
		var p2=sqr(leadmm);
		var nn=10;
        X9=null;
		while (d<p2){
			pp--;
			nn--;
			if (!nn)break;
			if (pp<0){pp+=lines.length;}
			var dx=lines[pp][1]-X1;
			var dy=lines[pp][2]-Y1;
			d=sqr(dx)+sqr(dy);
		}
		if (nn){
			d=sqrt(d);
			dx/=d; // get the vector
			dy/=d;
			// lead in
			var p=rotateV(0,0,leadmm*dx,leadmm*dy,ang1);
			X0=p[0]+X1; // start
			Y0=p[1]+Y1;
            XLEAD=X0;
            YLEAD=Y0;
			// lead out
			if (ang2){
				var p=rotateV(0,0,leadmm*dx,leadmm*dy,ang2);
				X9=p[0]+X1;  // stop
				Y9=p[1]+Y1;
			}
			leads.push([X0,Y0,X1,Y1,X9,Y9]);
		}
	}
    var sc = 1;
    if ($("flipx").checked) {
        sc = -1;
        X1 = sxmax - X1;
        if (X0!=null)X0 = sxmax - X0;
        climb=!climb;
    }
    var ro = 1;
    if ($("rotate").checked) {
        ro = -1;
        XX = X1;
        X1 = Y1;
        Y1 = sxmax - XX;
        if (X0!=null){
			XX = X0;
			X1 = Y0;
			Y0 = sxmax - XX;
		}
     }
    drillf = 0;//$("drillfirst").checked;

	// for 3D, additional extrude on start
	var edis=0;
    if (!(lx === undefined)) {
        edis = sqrt(sqr(lx - X1) + sqr(ly - Y1));
    };

    lx = X1;
    ly = Y1;
    lz = z;

    // turn off tool and move up if needed
    //cmd = getvalue('cmode');
    var pw1 = 1;
    var pw2 = 0; //getvalue('pwm');
    var pup = getvalue("pup");
    if (fnl)pup="";//G0 Z0\n";
    var pdn = getvalue('pdn');
    if ($("spindleoff").checked){
        pup=(hasfnl?"":getspindleoff())+pup;
        pdn=((!closed || (firstlayer && !fnl ))?getspindleon():"")+pdn;        
    }
    var f1 = speedtravel * 60;
    var rep = getinteger('repeat');
    if (rep > 1) {
        if (lastlayer) {
            f1 *= lastspeed;
            f2 *= lastspeed;
        } else {
            if (cuttabz > z) {
                f1 *= tabcutspeed;
                f2 *= tabcutspeed;
            }
        }
    }
    if (cmd == CMD_FOAM) {
        pw1 = pw2;
        f1 = f2;
    }
    div = "";
    if (sxmax < sxmin) return cdiv;
    // deactivate tools and move to cut position
    div = div + "\n;SHAPE #" + num + "\n";
    if (!closed && isnotpoint)div+=pup+"\n";
    if (cmd == CMD_3D) {
        z = -z; // if 3D then move up
        if (z <= layerheight) {
            f2 = 800;
            extrude = 3 * (layerheight * layerheight) / (filamentD * filamentD);

        } else {
            extrude = 2 * (layerheight * layerheight) / (filamentD * filamentD);
        }
        // extra from after travel
        div += ";extra feed\nG92 E" + mround(e1 - (edis / 350.0)) + "\n";
    }
    var oextrude = extrude;


    if (pw2) div = div + "M106 S" + pw1 + "\n";
    //if (firstlayer)div = div + pup + '\n';
    if (cmd == CMD_FOAM) {
        gcode0(f1, X1, 0);
    }
	if (uselead && firstlayer && X0!=null) {
		gcode0(f1, X0, Y0);
		gcode0(f2, X1, Y1);
	} else gcode0(f1, X1, Y1);
    div+="G0 F"+f1+"\n";
    div+="G1 F"+f2+"\n";

    //if (cmd == 3) div = div + "G0 Z" + mround(lastz) + "\n";

    // activate tools and prepare the speed
    if (pw2) div = div + "M106 S" + pw2 + "\n";
    if (cmd == CMD_LASER) {
        //if (drillf)div = div + pdn.replace("=cncz", mround(z-1.5)) + '\n';
        //div = div + pdn.replace("=cncz", mround(z)) + '\n';
    } else
    if (cmd != CMD_3D && !fnl) {
        //if (drillf)div = div + pdn.replace("=cncz", mround(z-1.5)) + '\n';
        if (z<0 && firstlayer)div = div +"G0 Z0 F"+speedretract+"\n";
        if (firstlayer && uselead){
        	div += ";LEAD IN\n"
			div += "G1 F"+f2+" Z"+mround(z) + " X"+mround(X1)+" Y"+mround(Y1)+"\n";
		} else {
            if (getchecked("acpmode")) div += pdn.replace("=cncz", mround(z-2)) + '\n';
			div += pdn.replace("=cncz", mround(z)) + '\n'+"G1 F"+f2+"\n";
		}    
	}
    var incut = 0;
    var iscut=0;
    var lenctr = 0;
    var fm3 = 1;
    var zlast = 0;
    var pdis=0;
	var lx2=0;
	var ly2=0;
	var lenc=0;
    if (cmd == CMD_CNC) {
        // entry diagonally
        // ??

    }
    ll=lines.length;
    if (shift)ll++;
    var rampcut=0;
    rampmoves=[];
    for (var ci = -1; ci < ll; ci++) {
		// if climb cut
		i=getRealIndex(ci<0?0:ci,lines.length,climb,shift,closed);
        
        x = lines[i][1];
        y = lines[i][2];
        if (sc == -1) {
            x = sxmax - x;
        }
        if (ro == -1) {
            xx = x;
            x = y;
            y = sxmax - xx;
        }
		// ci = -1 is only to get the position 
        if (ci<0){
			lx2=x;
			ly2=y;
			continue;
		}
		
        //vary speed on first few mm
        if (cmd == CMD_3D) {
            nlenctr = (nlenctr + lenctr) / 2;
            extrude = oextrude;
            fm3 = 1;

            if (nlenctr <= 20) {
                fm3 = Math.ceil(100 * (nlenctr + 2) / 32.0) / 100.0;
                extrude *= (1.5 - fm3);
            } else if (len - nlenctr < 10) {
                // reduce extrude before few last mm
                if (!lastlayer) extrude *= 0.85;
            }
        }

        nlenctr = lenctr;
        // the way we save distance data need to be handled on climb cut/climb
		pi=i+(climb?1:0);
		if (pi>=lines.length)pi-=lines.length;
        pdis=ci>0?lines[pi][4]:0;

        lenctr += pdis;
        

        zz = z*1 + lenctr / len * dz;
        if (_ramp){
			if (zz<z2){
				// cut the lines and repeat
				if (rampcut==0){
					var lencut=(z2-lz)/(zz-lz);
					var x=lx2+(x-lx2)*lencut;
					var y=ly2+(y-ly2)*lencut;
					rampcut=1;
				}
				zz=z2;
			}
			if (rampcut<=1){
				rampmoves.push([x,y,zz]);
			}
		}

        if (cmd == CMD_CNC && rampcut!=1) {
            if (1){
                iscut = 0;
                if ((cuttabz > zz)) {
                    // if cut1 is in lenc and lencnext then cut the line
                    // and dont increase the i counter
                    if ((slc >= lenc) && (slc <= lenctr)) {
                        // split lines
                        iscut = 1;
                        dx = x - lx2;
                        dy = y - ly2;
                        llen = lenctr - lenc;

                        lcut = slc - lenctr;
                        x = x + dx * (lcut / llen);
                        y = y + dy * (lcut / llen);
                        lenc = slc;

                        //lines[i][1]=x;
                        //lines[i][2]=y;
                        //lines[i][3]-=lcut;

                        if ((incut == 1)) {
                            incut = 0;
                            cutindex++;
                            slc =cutpos[cutindex];
                        } else {
                            incut = 1;
                            slc += cuttablen;
                        }
                    }
                }
            }
        }

        if (ci == 0) {
            //if ( firstlayer)div+=";if you want to slow down first layer do it here\n";
            //if ( lastlayer)div+=";if you want to fast up last layer do it here\n";
        }

        totaltime += pdis / (f2 * fm3 * 0.0167);
        if (incut || iscut) gcode1(f2 * fm3, x, y);
        else gcode1(f2 * fm3, x, y, zz);
        
        if (iscut || rampcut==1) {
			if (rampcut!=1){
				if (incut == 1) {
					// move up fast
					zz = cuttabz;

					div = div + pdn.replace("=cncz", mround(cuttabz)) + '\nG1 F' + f2 + "\n";
				} else {
					// move back down
					//div = div + pdn.replace("=cncz", mround(zlast)) + ' F350 \nG1 F'+f2+"\n";
					div = div + pdn.replace("=cncz", mround(zz)) + '\nG1 F' + f2 + "\n";
					//gcode1(f2 * fm, x, y,zz);
				}
			} else rampcut=2;
            ci--;
            lenctr -= pdis;
        } else {
            lenc = lenctr;
        }
        
        lx2 = x;
        ly2 = y;
        lz = zz;
    }
    // close the loop
    if (closed)gcode1(f2 * fm3, X1, Y1, zz);
    if (_ramp && lastlayer){
		for (var i=0;i<rampmoves.length;i++){
			var rm=rampmoves[i];
			gcode1(f2 * fm3, rm[0], rm[1],zz);
		}
	}
    //close loop
    if (!lastlayer && (cmd == CMD_3D)) {
        // if 3d then move along some mm
        lenctr = 0;
        lenc = 0;
        cutat = overlap;
        var dz = z - lastz;
        div = div + "; move up and overlap " + cutat + "mm\n";
        var oe1 = e1;
        extrude = oextrude * 0.4;
        for (var i = 0; i < lines.length; i++) {
            //vary speed on first few mm
            x = lines[i][1];
            y = lines[i][2];
            if (sc == -1) {
                x = sxmax - x;
            }
            if (ro == -1) {
                xx = x;
                x = y;
                y = xx;
            }
            // if cut1 is in lenc and lencnext then cut the line
            // and dont increase the i counter
            var iscut = 0;
            if ((cutat >= lenc) && (cutat <= lenctr)) {
                // split lines
                iscut = 1;
                dx = x - lx2;
                dy = y - ly2;
                llen = lenctr - lenc;
                lcut = cutat - lenc;
                x = lx2 + dx * (lcut / llen);
                y = ly2 + dy * (lcut / llen);
                lenc = cutat;

            }
            zz = lastz + dz * (lenc / cutat);
            gcode1(f2 * fm3, x, y, zz);
            lx2 = x;
            ly2 = y;
            if (iscut) break;
            lenc = lenctr;
            if (lenc > cutat) break;
        }
        e1 = oe1;
        // if not 3d	
    } // else gcode1(f2 * fm, X1, Y1);

    
    if (cmd == CMD_FOAM) {
        // if foam mode must move up
        gcode0(f1, X1, 0);
    }
	if (uselead && lastlayer && X9!=null) {
		if (flip)gcode0(f2, X0, Y0); else gcode0(f2, X9, Y9) 
	}
    //gcode0(f1,X1,Y1);
    lastz = z;

    // if not closed loop then pen up
    //if ((lines[0][1] != lines[lines.length - 1][1]) ||
    //    (lines[0][2] != lines[lines.length - 1][2])) div += pup + "\n";

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
var cache_ink_img=[];
var cacheloaded=0;
var autoprobe = "";
function check_img_cache(){
	cacheloaded++;
	if (cacheloaded==ink_images.length) gcode_verify(1);
}
function gcode_verify(en = 0) {
	// wait until all image cache loaded
    if (cache_ink_img.length==0 && ink_images.length>0){
		cacheloaded=0;
		for (var i=0;i<ink_images.length;i++){
			var image = new Image();
			cache_ink_img.push([image,0]);
			image.src = 'data:image/png;base64,'+ink_images[i][4];
			image.onload=check_img_cache;
		}
		return;
	}
	
    veeline = [];
    conline = [];
    cglines = [];
    already = [];
    var c = $("myCanvas1");
    ENGRAVE = 0;//$("emode0").checked ? 0 : 1;
    //cmd = getvalue('cmode');
    harga = getvalue('matprice');
    var hargacut = getvalue('cutprice');
    //alert(c);
    lx = 0;
    ly = 0;
    var mz="";
    var fz="";
    var f1 = speedtravel * 60;
   
    if ($("usestart").checked){
        var ss=getvalue("startat").split(",");
        lx=ss[0]*1;
        ly=ss[1]*1;
        mz="G92 X"+mround2(lx)+" Y"+mround2(ly)+"\n";
        fz="G0 F"+mround(f1)+" X"+mround2(lx)+" Y"+mround2(ly)+"\n";
    }
    firstline=1;
    jmltravel = 0;
    var ctx = c.getContext("2d");
    var sfinal = 0;
    $("segm").value = "";
    ctx.fillStyle = theme==0?"#ffffff":"#000000";
    $("myCanvas1div").style.background=ctx.fillStyle;
    ctx.fillRect(0, 0, c.width, c.height);
    engravetime = 0;
    bitmaptime = 0;
    if (en) {
        if (ENGRAVE == 0) engrave = {};
        else {
            engrave1 = [];
            //setvalue("engcode","");	
        }
    }
	
    if (ink_images && ink_images.length>0){
		for (var i=0;i<ink_images.length;i++){
			if (cache_ink_img[i][0].complete){
                if (cmd==CMD_LASER) {
                    imagedither(cache_ink_img[i][0],$("dithercanv"),ink_images[i][0],ink_images[i][1],ink_images[i][2],ink_images[i][3]);
                }
                if (cmd==CMD_CNC){
                    cncengrave(cache_ink_img[i][0],$("engrcanv"),ink_images[i][0],ink_images[i][1],ink_images[i][2],ink_images[i][3]);
                }
            }
		}
	}
    

    var c1 = $("rasteroutline").checked;
    for (var i = 0; i < sgcodes.length; i++) {
        if (en && (ENGRAVE == 1)) engrave = {};
        col = getRandomColor();
        snum = sgcodes[i][0][8];
        sty = gcstyle[snum];
        //stro = sty["stroke"];

        if (sty == undefined) sty = defaultsty;
        nocut = sty.greenskip || sty.greentravel;
        if (sty.doEngrave  || (sty.dopocket)) nocut = !c1;
        if (nocut) {
            dash = [5, 5];
            col = "gray";
        } else {
            dash = [];
            sfinal += Math.abs(sgcodes[i][0][0]);
            col = sty["stroke"];
        }
        draw_line(sgcodes[i][1],    // num
                  col,              // lcol
                  sgcodes[i][0][4], // lines
                  sgcodes[i][0][5], // srl
                  dash,             // dash
                  sgcodes[i][0][0], // len
                  sgcodes[i][0][7], // closed
                  snum,             // snum
                  sgcodes[i][2],    // flip
                  sgcodes[i][3],    // shift
                  0,                //warn 
                  getcutpos(i)  // cuttab
                  );
                  
        if (en && (ENGRAVE == 1)) doengrave();
    }
    if (en) {
        if (ENGRAVE == 0) doengrave();
    }
    
    travtime=jmltravel / speedtravel;
    sfinal += jmltravel;
    for (var i = 0; i < oldlines.length; i++) {
//draw_line      (num, lcol,      lines,          srl, dash, len, closed, snum,         flip,shift,warn) {
 
        draw_line("",   "#CCCCCC", oldlines[i][0], [], [1, 2],  0, false,oldlines[i][1], 0, 0, true,[]);
    }
    $("alertpath").innerHTML=(warningpath==0)?"":"Lost some path !";

    ctx.font = "12px Arial";
    w = mround((xmax - xmin) / 10);
    h = mround((ymax - ymin) / 10);
    $("area_dimension2").innerHTML = "W:" + w + " H:" + h + " Area:" + mround(w * h) + " cm2";
    text = $("material");
    mat = text.options[text.selectedIndex].innerText;
    sc = 1;
    if ($("flipx").checked) sc = -1;
    pup1 = getvalue("pup") + '\n';
    startgcode="M3";
    finishgcode =getspindleoff();//($("spindleoff").checked)?getspindleoff():"";
    finishgcode += pup1+fz?fz:("\nG0 F"+mround(f1)+" X0 Y0\n");
    if (cmd==CMD_CNC)finishgcode+="G0 Z"+getvalue("finalz")+ '\nM5\n';
    if (cmd==CMD_LASER)finishgcode+=pup1;
    setvalue("pgcode", pup1 + M3+ " S255\nG0 F12000 X" + mround(sc * xmin) + " Y" + mround(ymin) + 
                              "\nG1 Z1\nG0 Z0\nG0 X" + mround(sc * xmax) +
                              "\nG1 Z1\nG0 Z0\nG0 Y" + mround(ymax) +
                              "\nG1 Z1\nG0 Z0\nG0 X" + mround(sc * xmin) +
                              "\nG1 Z1\nG0 Z0\n\nG0 Y" + mround(ymin) + "\n");
    autoprobe = "G30 S" + getvalue("alres") + " X" + mround(w * 10) + " Y" + mround(h * 10);
    drawengrave();
    dobtvcarve();
    dopocketengrave();
    drawvcarve();
    draw_leads();
    var menit = mround((pockettime + carvetime + totaltime + engravetime + travtime + bitmaptime) / 60.0);
	 if (cmd == CMD_CNC) {
	 	menit*=2; // realisticcally 1.5
	 } else {
	 }    
    //var menit = mround((sfinal + jmltravel * 10) / getvalue('feed') / 60.0);
    var re = getvalue("repeat");
    //menit = menit * re;
    var g = mz+getvalue("engcode") + gcodecarve;

    if (g) setvalue("engcode", g + pup1);//m3 s0\n");

    ctx.font = "30px Arial";
    ctx.fillStyle = theme==0?"#000000":"#ffffff";;
    td=getvalue('offset');
    if ($("pltmode").checked)td="PLT"
    ctx.fillText("X:" + w + "  Y:" + h + "cm  Z:" + getvalue("zdown") + "mm/" + getvalue('repeat') + "    T:" + mround(menit) + "min", 2, c.height - 10);
    ctx.fillText("Feed:" + getvalue("feed") + "mm/s   Tool \u2300 :" + td + "mm", 2, c.height - 42);

    if (cmd == CMD_3D) {
        gram = e1 / 333;

        area_dimension.innerHTML = 'Total filament =' + mround(gram) + "gram Time:" + mround(menit) + " menit <br>Total Cost:" + Math.round(gram * hargacut);
    } else {
        mat2=mat;
        if (getvalue("wmode")==1)mat2="";
        area_dimension.innerHTML = 'Total Length =' + mround2(sfinal) + "mm Time:" + mround2(menit) + " menit <br>CNC Cost:" + Math.ceil(menit * hargacut) + " | Material " + mat2 + ":" + Math.ceil(w * h * harga) + " | TOTAL:" + Math.ceil(menit * hargacut + w * h * harga);
    }
    area_dimension.innerHTML += "<br><b>Tool offset : " + getoffset() + "mm";
    area_dimension.innerHTML += " &nbsp; Start : " + getvalue("startat");

}
var acpengrave = 0;
var cutpw;
var _rampdown=0;
function sortedgcode() {
    cachedcutpos=[];
    totaltime = 0;
    carvetime = 0;
    gcodecarve = "";
    sgcodes = [];
    sxmax = xmax;
    symax = ymax;
    sxmin = xmin;
    symin = ymin;
    xmax = -10000;
    ymax = -10000;
    xmin = 100000;
    ymin = 100000;
    var sm = -1;
    var lx = 0;
    var ly = 0;
    if ($("usestart").checked){
        var ss=getvalue("startat").split(",");
        lx=ss[0]*1;
        ly=ss[1]*1;
    }
    e1 = 0;
    sortit = 1;
	var cs=-1;
	var sflip,sshift;
	xs=getnumber('xsort')
	ys=getnumber('ysort')
    
    if (cmd == 4) setvalue("repeat", Math.ceil(getvalue("zdown") / layerheight));
    var re = getvalue("repeat");
    var ov = getchecked("overcut");
	
    // gcodes.push([lenmm, "", x1, y1, lines[i], srl, ar, closed, shapenum]);    

    for (var kk=0;kk<2;kk++){
     for (var i = 0; i < gcodes.length; i++) {
         var sty=gcstyle[gcodes[i][8]];
         sty.lchilds=sty.childs=sty.ochilds+sty.exchilds; // reset child number counter
         
     }

     for (var j = 0; j < gcodes.length; j++) {
        if (sortit) {
            cs = -1;
            var bg = 10000000;
			sflip=0;
			sshift=0;
            var sty=gcstyle[gcodes[j][8]];
            var k1=sty.doEngrave ||sty.domarking || sty.dovcarve || sty.dopocket;
            var skip=kk==(k1?1:0)
            if (skip){
                for (var pi in sty.parent){
                    gcstyle[sty.parent[pi]].childs--;
                }
            }
            for (var i = 0; i < gcodes.length; i++) {
                var sty=gcstyle[gcodes[i][8]];
                k1=sty.doEngrave ||sty.domarking || sty.dovcarve || sty.dopocket;
                if (kk==(k1?1:0))continue;

                if (sty.childs>0) 
                    continue; // if still have child do not process
                var pts = gcodes[i][4];
                var shift=0;
                var flip=0;
                var dis=1000000-(sty.lchilds?(sty.lchilds-sty.childs)*10:0);
                
                var pstep=Math.floor(pts.length/100)+1;
                var newx=0;
                var newy=0;
                if (gcodes[i][7]) { // if closed loop we can check all the points
                    for (var p=0;p<pts.length;p+=pstep){
				        var dx = pts[p][1] - lx;
				        var dy = pts[p][2] - ly;
				        var dis2 = sqrt(dx * dx + dy * dy); // distance + area size
				        if (dis2<dis){
					        shift=p;
					        dis=dis2;
                            newx=pts[p][1];
                            newy=pts[p][2];
				        }
                    }
                    dis+=100;
                } else { // if segment then only check the corner
				        var dx = pts[0][1] - lx;
				        var dy = pts[0][2] - ly;
				        dis = sqrt(dx * dx + dy * dy); // distance + area size
				        dx = pts[pts.length - 1][1] - lx;
				        dy = pts[pts.length - 1][2] - ly;
				        var dis2 = sqrt(dx * dx + dy * dy); // distance + area size
                        if (dis2<dis){
                            flip=1;
                            dis=dis2;
                            newx=pts[pts.length - 1][1];
                            newy=pts[pts.length - 1][2];
                        }
                        
                   if (sty.greentravel)dis+=1;
                } 
                // we already use closest and the hierarchy , so no need area size
                //dis+=(gcodes[i][6] - 1);
                if (gcodes[i][1]=="F")dis+=10; // finish line must be the last
                dis+=newx*xs+newy*ys;

				//var dis = sqrt(dx * dx + dy * dy); // distance + if outside, give area number so it will become last

                if ((gcodes[i][6] > 0) && (dis < bg)) {
                    cs = i;
					sshift=shift;
					sflip=flip;
                    bg = dis;

                }
            }
        } else cs = j;
        // smalles in cs
        if (cs >= 0) {
			//sshift=0;
            sty=gcstyle[gcodes[cs][8]];
            for (var pi in sty.parent){
                gcstyle[sty.parent[pi]].childs--;
            }
            
            sgcodes.push([gcodes[cs], cs + 1,sflip,sshift]);
            gcodes[cs][6] = -gcodes[cs][6];
			var pts = gcodes[cs][4];
			// closed path back to first position
            lx = pts[sshift][1];
            ly = pts[sshift][2];
            if (!gcodes[cs][7]){
				// segment path back to last point depend on how many repeat
                var rep=re;

                //stro = sty["stroke"];
                var _rz = (getnumber("carvedp"));
                if (sty.domarking) {
                    zdown = getnumber("carved")
                    rep = Math.ceil(zdown / _rz);
                    rep = Math.max(rep,zdown / getnumber("firstd"));
                } else                
                if (sty.greenskip || sty.doEngrave || sty.dovcarve || sty.dopocket){
                    rep=0;       
                } else if (sty.greentravel) {
                    rep=1;
                } else {
                    if ($("burn1").checked)rep++;
                }                
                
				if (sflip)rep++;
				//rep=1;
				if (rep&1) {
                    lx = pts[pts.length - 1][1];
                    ly = pts[pts.length - 1][2];
                }
            }
        }
    }
    }


    pup1 = getvalue("pup");
    cutpw = getnumber('cutpw') * 255*0.01;

    if (cmd == CMD_LASER) {
        pup1 = "";
        s = getspindleon()+"G0 F3000\nG1 F3000\n"; //;Init machine\n;===============\nM206 P80 S20 ;x backlash\nM206 P84 S20 ;y backlash\nM206 P88 S20 ;z backlash\n;===============\n";
        se = getspindleon();
    } else {
        s = getspindleon()+"G1 F3000\n";
        se = getspindleon();
    }

    cncdeep0 = -getvalue("zdown");
    var sepcut=$("separatecut").checked;
    skipz = -getvalue("zdown0");
    if (skipz == undefined) skipz = 0;
    var oskipz=skipz;
    pdn1 = getvalue("pdn").replace("=cncz", mround(cncdeep0)) + '\n';
    cncdeep = cncdeep0;
    var cuttab = 0;
    lastz = 0;
    var tabz = getnumber("tabc");
    //cmd = getvalue('cmode');
    cuttab = cncdeep;
    if (cmd == CMD_CNC) {
        lastz = layerheight * 0.7;
        cncz -= lastz;
        //s += "g0 f350 z" + mround(lastz)+"\n";
        cuttab += tabz;
        _rampdown = $("rampdown").checked;
    } else {
        _rampdown = 0;
    }
    var empty = 1;
    cuttabinside = 0;//!$("smallfirst").checked;
    for (var j = 0; j < sgcodes.length; j++) {
        //cncz = cncdeep / re;
        vcuttab = cuttab;
        skipz=oskipz;
        if (pause_at.indexOf(sgcodes[j][1] + "") >= 0) {
            s += "\nG0 Z3 F350\n;PAUSE\nG0 Y-100 F500\n";
        }
        if (disable_cut.indexOf(sgcodes[j][1] + "") < 0) {
            srl = sgcodes[j][0][5];
            if ((Math.abs(sgcodes[j][0][6]) < 2) && (cuttabinside)) vcuttab = cncdeep;

            snum = sgcodes[j][0][8];
            hasfnl = sgcodes[j][0][1] == "D"; // "F" = finish line
            fnl = sgcodes[j][0][1] == "F"; // "F" = finish line
            
            sty = gcstyle[snum];
            if (!sty.closed)vcuttab=cncdeep;
            //stro = sty["stroke"];
            var f2 = getvalue('feed') * 60;
            if (sty == undefined) sty = defaultsty;
            if ((ov > 0) && (cmd == CMD_CNC)) {
                if (OVC_MODE == 1) {
                    // drill overcut
                    for (i = 0; i < srl.length - 1; i++) {
                        // drill at overcut position
                        if (srl[i][6] < 0) {
                            oc = srl[i][5];
                            ocxy = "X" + mround(oc[0]) + " Y" + mround(oc[1]);
                            s += "\n" + pup1 + "\nG0 " + ocxy + " F200\n";
                            s += pdn1 + pup1 + "\n";
                        }
                    }
                }
            }
            // first layer is divided by 2 to prevent deep cut
            var _re = re;
            var zdown = cncdeep / re;
            var ismark = marking_cut.indexOf(sgcodes[j][1] + "") >= 0;
            if (ismark) {
                zdown = -1;
                _re = 2;
            }
            var docarve = 0;
            var iscut = 1;
            var iseng = 0;
            var strokedeep = sty.strokedeep;

            //stro = sty["stroke"];

            var _rz = getnumber("firstd");

            if (sty.domarking) {
                f2 = getvalue('pltfeed') * 60;
                pw = getvalue('pltpw') * 255*0.01;
                pw=sty.markpower?sty.markpower:pw;
                zdown = strokedeep > 0 ? strokedeep : getvalue("carved");
                _re = Math.ceil(zdown / _rz);
                vcuttab = -1 * zdown; //+tabz;
                zdown *= -1 / _re;
                iscut = 0;
                iseng = 1;
                se+=M3+ " S"+parseInt(pw)+"\n";
            }
            if (sty.doEngrave || sty.dovcarve) { // blue and pink (v carve)
                if ($("rasteroutline").checked) {
                    pw = getvalue('rasteroutpw') * 255*0.01;
                    se+=M3+ " S"+parseInt(pw)+"\n";
                    if (cmd == CMD_LASER) _re = 1;
                    else {
                        zdown = strokedeep > 0 ? strokedeep : getvalue("carved");
                        _re = Math.ceil(zdown / _rz);
                        vcuttab = -1 * zdown; //+tabz;
                        zdown *= -1 / _re;
                        //zdown=cncz;
                    }
                } else _re = 0;
                f2 = getvalue('rasteroutfeed') * 60;
                iscut = 0;
                iseng = 1;
            }
            if (sty.greenskip) {
                _re = 0;
                iscut = 0;
            }
            if (sty.greentravel) {
                _re = 0;
                iscut = 0;
                skipz=20;
            }
            if (sty.dopocket) {
                _re = 0;
                iscut = 0;
            }
            if (sty.dovcarve) { // cyan == V carve
                _re = 1;
                docarve = 1;
                iscut = 0;
            }
            
            if (fnl) {
                _re = 1;
                var zdown = cncdeep;
                //f2 *= 0.7;
            }
            cncz = zdown;
            var cncz2 = 0;
            var len = 0.1;
            var lines = sgcodes[j][0][4];
            for (var ci = 0; ci < lines.length; ci++) {
                len += lines[ci][4];
            }
            sgcodes[j][0][0] = len;
            var shift = sgcodes[j][3];
            // do burn cutting
            var climb = sgcodes[j][2];
            //if (fnl)climb=!climb;
            rcutpos=getcutpos(j,shift,climb);
            if ((_re * iscut > 0) && (cmd == CMD_LASER) && $("burn1").checked) {
                s += lines2gcode(sgcodes[j][1], sgcodes[j][0], cncz2, cncz2,vcuttab, sgcodes[j][0][5], 1, 1, snum, getvalue("burnfeed") * 60, 0,shift,rcutpos);
            }

            // do pen up
            var ps = pup1 + "\n";
            if (fnl)ps="";//G0 Z0\n";
            // acp mode make first hole
            var acp="";
            if ($("spindleoff").checked && !fnl)acp=getspindleoff();
            acp += ps;
            var isacp = 0;
            
            
            if (sty.greentravel) {
                f2=speedtravel * 60;
                zdown=zretract;
                cncz=zdown;
                _re=1;
                iscut = 1;
            }             
            /*if (getchecked("acpmode")) {
                var zf = zdown * _re;
                if (!iseng) zf -= 1.5;
                else zf -= 0.5;
                var i=shift;
                acp = ps + "G0 X" + mround(lines[shift][1]) + " Y" + mround(lines[shift][2]) + " F" + (speedtravel * 60) + "\n";
                acp += "G1 Z" + mround(zf) + " F600\n";
                isacp = 1;
            }*/
            if (_re > 0) {
                empty = 0;
                if (iseng &&sepcut) {
                    se += acp;
                } else {
                    s += acp;
                }
            }

            // do burn cutting for CNC, first cut is half 
            if ((_re * iscut > 0) && (cmd == CMD_CNC) && $("burn1").checked) {
                s+=";Burn CNC \n";
                s += lines2gcode(sgcodes[j][1], sgcodes[j][0], zdown/2, zdown/2, vcuttab , sgcodes[j][0][5], 1, 1, snum, f2*1.25, 0,shift,rcutpos);
                cncz = Math.max(cncz+zdown/2,cncdeep);
                cncz2 =Math.max(cncz2+zdown/2,cncdeep);            
            }
			if (!sty.closed && ($("burn1").checked || $("flipx").checked)){
                climb = climb ? 0 : 1;
            }
            var of2=f2;	
            for (var i = 0; i < _re; i++) {
				if (_re>1 && hasfnl && i==_re-1)break;	
                var fff = 0;	
                f2=of2;	
                if ((i==0) && (cmd == CMD_CNC)){	
                    f2 *= getnumber('feed1x');	
                }
                if (isacp && (i > 0) && (i < _re - 1)) {
                    fff = 1000;
                }
                if ((_re * iscut > 0) && (cmd == CMD_CNC) && $("burn1").checked && (i==_re-1)) {
                    //fff=-0.25*f2; // if burn then the first and the last must be faster
                }
                //if (i<=1)cncz2 += zdown*0.5;else 
                if (_rampdown) z2 = cncz2;
                else z2 = cncz;
                if (acpengrave && iseng) cncz = z2 = _re * zdown;
                sr = lines2gcode(sgcodes[j][1], sgcodes[j][0], z2, cncz, vcuttab, sgcodes[j][0][5], i == _re - 1, i == 0, snum, f2 + fff, climb,shift,rcutpos);
                if (sgcodes[j][0][4].length==1)sr+="\nG0 F3000 Z"+(cncz-zdown)+"\n"; // drill pecking
                if (docarve) sr = '';

                if (iseng && sepcut) {
                    //climb = climb ? 0 : 1;
                    se += sr;
                } else s += sr;
                if ((!sty.closed) && (_re>1))climb = climb ? 0 : 1;
                cncz = Math.max(cncz+zdown,cncdeep);
                cncz2 =Math.max(cncz2+zdown,cncdeep);
                
            }
            // do last cutting
            //s+=pup1+"\n\n";
        }
    }
    xystart = [0, 0];
    if ($("usestart").checked) xystart = getvalue("startat").split(",");
    var mz = "G92 X" + xystart[0] + " Y" + xystart[1] + "\n";
    if (isgrbl) mz = machinezero;
    if ($("usestart").checked) s = mz + "\n" + s;
    s = s + getvalue("pup");
    var f1 = speedtravel * 60;
    //s = s + '\nG0 F' + f1 + ' Y' + xystart[1] + ' \n G0 X' + xystart[1] + '\n';
    //if (cmd == CMD_CNC) s += "G0 Z" + getvalue("finalz") + "\n";
    sc = 1;
    if ($("flipx").checked) sc = -1;
    if (cmd == CMD_3D) {
        // make it center
        s = "g28\ng0 z0 f350\nm109 s" + filamentTemp + "\nG92 X" + mround(-sc * xmax / 2) + " Y" + mround(ymax / 2) + " E-5\n" + s;
        s += "G92 X" + mround(sc * xmax / 2) + " Y" + mround(-ymax / 2) + "\ng28";
    }
    //s += "\nM3 S0\n";
    if (isgrbl)s += machinezero;

    //if (!empty)
    setvalue("gcode", s);
    setvalue("engcode", se);
}

////////////////////////////////////////////////////////////////////////////////////////////


function destroyClickedElement(event) {
    document.body.removeChild(event.target);
}

var lines = [];

function xarea() {
    dx = xmax2 - xmin2;
    dy = ymax2 - ymin2;
    v = dx * dy + 1;

    xmin2 = 100000;
    ymin2 = 100000;
    xmax2 = 0;
    ymax2 = 0;
    return v;
}


function svgPathToCommands(svg) {
    var getd = /(?<= d=").+?(?=")/g;

    var markerRegEx = /[MmLlSsQqLlHhVvCcSsQqTtAaZz]/g;
    var digitRegEx = /-?[0-9]*\.?\d+/g;
    var match = getd.exec(svg);
    if (match == null) return [];
    var str = match[0];

    var results = [];
    var match;
    while ((match = markerRegEx.exec(str)) !== null) {
        results.push(match);
    };
    return results
        .map(function(match) {
            return {
                marker: str[match.index],
                index: match.index
            };
        })
        .reduceRight(function(all, cur) {
            var chunk = str.substring(cur.index, all.length ? all[all.length - 1].index : str.length);
            return all.concat([{
                marker: cur.marker,
                index: cur.index,
                chunk: (chunk.length > 0) ? chunk.substr(1, chunk.length - 1) : chunk
            }]);
        }, [])
        .reverse()
        .map(function(command) {
            var values = command.chunk.match(digitRegEx);
            return {
                marker: command.marker,
                values: values ? values.map(parseFloat) : []
            };
        })
}

var svgdata = [];
var sflipx;
var sflipy;
var speedplunge=1000;
var speedretract=3000;
var speedfeed=5;
var speedtravel=100;
var zretract=15;

function myFunction(scale1) {
    if (text1 == undefined) return;
    svgdata = svgPathToCommands(text1);
    // clear vcarve
    segsv = [];
    oldlines = [];
    opx = -1000;
    opy = -1000;
    maxofs = 0;
    shapenum = 0;
    oshapenum = -1;
    combinedpath = [];
	leads=[];
    //text1=Potrace.getSVG(1);
    //alert(text1);
//    pause_at = getvalue('pauseat').split(",");

    speedplunge=getvalue('pdn');
    
	if (speedplunge.indexOf("F")>0)speedplunge=speedplunge.split(" F")[1].split(" ")[0];
    speedretract=getvalue("pup");
    speedtravel=getnumber("trav");	
    speedfeed=getnumber("feed");
	if (speedretract.indexOf("F")>0){
		zretract=speedretract.split(" Z")[1].split(" ")[0];
		speedretract=speedretract.split(" F")[1].split(" ")[0];		
    }
    shapectr = 0;
    var contor = 0;
    var xincep = 0;
    var yincep = 0;
    var p1x = 0;
    var p1y = 0;
    var p2x = 0;
    var p2y = 0;
    e1 = 0;
    var xsfar = 0;
    var ysfar = 0;
    var n1 = 0;
    lines = [];
    var scale = 25.4 / getvalue('scale');
    if (scale1) scale = 1;
    scalex = scale;
    scaley = scale;

    //cmd = getvalue('cmode');
    theme=$("isdarktheme").checked?1:0;
    cuttablen = getnumber("tablen") + getnumber("offset");
    cutevery = getnumber("tabevery");
    cutmax = getnumber("tabmax");
    detail = getnumber("curveseg") * 0.2;
    
    var pw1 = 1;
    var pw2 = 0; //getvalue('pwm');
    var pup = getvalue("pup");
    var pdn = getvalue("pdn");
    var f1 = speedtravel * 60;
    var f2 = speedfeed * 60;
    var det = 50 * detail * getnumber('feed') / (60.0 * getnumber("smooth"));
    var seg = $("segment").checked;
    if (seg) det *= 4;
    if (cmd == CMD_FOAM) {
        pw1 = pw2;
        f1 = f2;
    }
    //alert(cmd);

    var X1 = 0;
    var Y1 = 0;

    xarea();


    gcodes = [];
    x1 = 0;
    y1 = 0;
    x2 = 0;
    y2 = 0;
    div = "";
    lenmm = 0;
    lenn = 0;

    var cnts = 0;
    line = [];
    //scale=1;
    //alert(div.innerHTML);
    isvg = 0;
    for (var i=0;i<gcstyle.length;i++){
        gcstyle[i].exchilds=0;
    }
    warningpath=0;

    for (var isvg = 0; isvg < svgdata.length; isvg++) {
        var el = svgdata[isvg];
        var cr = el.marker;
        if (cr == 'M') {
            cnts = cnts + 1;
            // close shape loop
            if (cnts > 1) {
                ///
                //gcode1(f2, X1, Y1);
                // no close loop
                //linepush(f2, X1, Y1, lenmm,lenn);
                var closed = (sqr(xincep-X1) + sqr(yincep - Y1))<mind;
                gcodepush(lenmm, X1, Y1, lenmm, line, closed);
                //gcodes.push(lenmm, div, X1, Y1, prepare_line(lenmm,line),srl,xarea());

                //lines.push(line);

            }
            line = [];
            div = "";

            // deactivate tools and move to cut position
            xincep = el.values[0] * scalex;
            yincep = el.values[1] * scaley;
            X1 = xincep;
            Y1 = yincep;
            ///
            //gcode0(f1, X1, Y1);
            linepush(f1, X1, Y1, 1);
            lenmm = 0;
            lenn = 0;
            // activate tools and prepare the speed

            lastf = f2;
        } else if (cr == 'H') {
            var n2 = el.values[0] * scalex;
            var xy = el.values[1] * scaley;
            p1x = xy * scale;
            linepush(f2, p1x, y1);
        } else if (cr == 'V') {
            var n2 = el.values[0] * scalex;
            var xy = el.values[1] * scaley;
            p1y = xy * scale;
            linepush(f2, y1, p1y);
        } else if (cr == 'C') {
            //path d="M111.792 7.750 C 109.785 10.407,102.466 13.840,100.798 12.907 C
            p1x = el.values[0] * scalex;
            p1y = el.values[1] * scaley;
            p2x = el.values[2] * scalex;
            p2y = el.values[3] * scaley;

            xsfar = el.values[4] * scalex;
            ysfar = el.values[5] * scaley;

            //*****************************

            var a = p1x - xincep;
            var b = p1y - yincep;
            var a = sqrt(a * a + b * b);

            var b = p2x - p1x;
            var c = p2y - p1y;
            var b = sqrt(b * b + c * c);

            var c = xsfar - p2x;
            var d = ysfar - p2y;
            var c = sqrt(c * c + d * d);

            //g=1/((a+b+c)*division);
            g = det / (a + b + c);
            a = a + b + c;
            //alert('dist ='+a+' pezzi='+g);
            //******************************
            for (i = 0; i < 1; i += g) {

                var x = bezierx(i, xincep, p1x, p2x, xsfar);
                var y = beziery(i, yincep, p1y, p2y, ysfar);
                linepush(lastf, x, y);
            }

            //******************************************************************

            xincep = xsfar;
            yincep = ysfar;
        } else if (cr == 'L') { //alert("este L");
            for (var k = 0; k < el.values.length / 2; k++) {
                p2x = el.values[0 + k * 2] * scalex;
                p2y = el.values[1 + k * 2] * scaley;
                linepush(lastf, p2x, p2y);
                xincep = p2x;
                yincep = p2y;
            }

        }

    } //sfarsit while

    // close loop
    if (cnts > 0) {
        var closed = (sqr(xincep-X1) + sqr(yincep - Y1))<mind;
        gcodepush(lenmm, X1, Y1, lenmm, line, closed);
    }
    
    gcodepushcombined();
    sortedgcode();
    gcode_verify(1);


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

function preparestyle() {
    var sty = {
        "fill": "#000000",
        "stroke": "#000000",
        "stroke-width": 0,
        "deep": undefined,
        "repeat": undefined
    };
    as = getvalue("pasteas");
    if (as == 1) sty.fill = "#0000ff";
    if (as == 2) sty.fill = "#00ffff";
    sty.stroke = sty.fill;
    sty.num=0;
    gcstyle = [];
    for (var i = 0; i < 350; i++) {
        gcstyle.push(sty);
    }
}
var gc = "g0 x100 y0\ng1 x200\ng1 y100\ng1 x100\ng1 y0\n";

function gcodetoText1(gx) {
    // try to support G2 and G3
    gcstyle = [];
    gs = gx.split("\n");
    var scale = getvalue('scale') / 25.4;
    var cflipx = 1;
    var cflipy = 1;

    var c = 0;
    var sc = 0;
    var t1 = '<svg id="svg" version="1.1" width="142" height="142" xmlns="http://www.w3.org/2000/svg"><path d="';
    var tm = "";
    var wd = {
        'g': -1,
        'x': 0,
        'y': 0
    };
    var xy1 = '';
    // scan to get xmax xmin ymax ymin
    var xmax = -100000;
    var xmin = 100000;
    var ymax = -100000;
    var ymin = 100000;
    //	defaultsty=
    var sty = {
        "fill": "#000000",
        "stroke": "#000000",
        "stroke-width": 0,
        "deep": undefined,
        "repeat": undefined
    };
    for (i in gs) {
        if ((gs[i]) && (gs[i][0] != ';')) {
            var ws = gs[i].split(" ");
            wd['g'] = -1;
            hasxy = 0;
            for (j in ws) {
                if (ws[j]) {
                    cr = ws[j][0].toLowerCase();
                    if (cr == 'x' || cr == 'y') hasxy = 1;
                    wd[cr] = ws[j].substr(1);
                }
                //console.log(ws[j][0]+":"+ws[j].substr(1));
            }
            if (hasxy) {
                xmax = Math.max(xmax, wd['x'] * scale);
                ymax = Math.max(ymax, -wd['y'] * scale);
                xmin = Math.min(xmin, wd['x'] * scale);
                ymin = Math.min(ymin, -wd['y'] * scale);
            }
        }
    }

    for (i in gs) {
        if (gs[i].indexOf(';@') == 0) {
            var dd = gs[i].substr(2).split(":");
            sty[dd[0]] = dd[1];
        }
        if ((gs[i]) && (gs[i][0] != ';')) {
            ws = gs[i].split(" ");
            wd['g'] = -1;
            hasxy = 0;
            for (j in ws) {
                if (ws[j]) {
                    cr = ws[j][0].toLowerCase();
                    if (cr == 'x' || cr == 'y') hasxy = 1;
                    wd[cr] = parseFloat(ws[j].substr(1));
                }
                //console.log(ws[j][0]+":"+ws[j].substr(1));
            }
            if (hasxy) {
                xy = mround(wd['x'] * scale - xmin) + " " + mround(-wd['y'] * scale - ymin);
                if (wd['g'] == 0) {
                    // new shape
                    sc++;
                    if (sc > 1) {
                        t1 += " ";
                    }
                    sty.num=gcstyle.length;
                    gcstyle.push(sty);
                    sty = {
                        "fill": "#000000",
                        "stroke": "#000000",
                        "stroke-width": 0,
                        "deep": undefined,
                        "repeat": undefined
                    };
                    t1 += "M" + xy;
                    c = 0;
                }
                if (wd['g'] == 1) {
                    c++;
                    if (c == 1) t1 += " L";
                    t1 += " " + xy;
                    //}
                }
            }
        }
    }
    t1 += '" stroke="none" fill="black" fill-rule="evenodd"/></svg>';
    return t1;
}
// this new function try to handle things that usually on Python
// the data is not GCODE but a specific format:
// start with [P:fill:stroke:strikewidth\n]
// data is [X,Y\nX,Y\n....\n]
// ended with empty \n
// 
// this function must handle:
// - Inside and outside == WIP
// - Correct path winding when necessary == WIP
// - convert to TEXT1 SVG format so the rest can be handled by karyacnc core
//
// I hope this new method will significantly increase the performance of transfering datra
// from inkscape to karyacnc
// check inner or outside here
function isInside(x,y, path){
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    inside = 0
    j=path.length-1
    for (i in path){
        xi = path[i][0];
        yi = path[i][1];
        xj = path[j][0];
        yj = path[j][1];

        intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect)inside = !inside;
        j=i;
    }
    return inside
}

function computeH(a, b, c, d) {
			
			
			// E = B-A = ( Bx-Ax, By-Ay )
			const e = {x: b.x-a.x, y: b.y-a.y }
			// F = D-C = ( Dx-Cx, Dy-Cy ) 
			const f = {x: d.x-c.x, y: d.y-c.y }
			// P = ( -Ey, Ex )
			const p = {x: -e.y, y: e.x}
			
			// h = ( (A-C) * P ) / ( F * P )
			const intersection = f.x*p.x+f.y*p.y;
			if(intersection === 0) {
				// Paralel lines
				return NaN;
			}
			return ( (a.x - c.x) * p.x + (a.y - c.y) * p.y) / intersection;
}

function intersect_point(a, b, c, d) {
			const h1 = computeH(a, b, c, d);
			const h2 = computeH(c, d, a, b);
			const isParallel = isNaN(h1) || isNaN(h2);
			if (!isParallel & h1 >= 0 && h1 <= 1 && h2 >= 0 && h2 <= 1){
			    //const f = {x: d.x-c.x, y: d.y-c.y }
			    return h1;
			} 
			return null;
			
			/*return {
				intersection: h1 >= 0 && h1 <= 1 && h2 >= 0 && h2 <= 1,
				isParallel,
				point: isParallel ? undefined :
				// C + F*h
				 {
					x: c.x + f.x * h1,
					y: c.y + f.y * h1,
				},
			}*/
		}

function intersects_p(a,b,c,d,p,q,r,s) {
    var A={x:a,y:b};
    var B={x:c,y:d};
    var C={x:p,y:q};
    var D={x:r,y:s};
    return intersect_point(A,B,C,D);  
}
		
var mind=sqr(0.1);

var ink_images=[];
function pathstoText1(gx) {
    //cmd = getvalue('cmode');
	cache_ink_img=[];	

    // try to support G2 and G3
    var join=$("enablejoin").checked;
    gcstyle = [];
    gs = gx.split("\n");
    var scale = getvalue('scale') / 25.4;
    var cflipx = 1;
    var cflipy = 1;
    ink_images=[];

    var c = 0;
    var sc = 0;
    var t1 = '<svg id="svg" version="1.1" width="142" height="142" xmlns="http://www.w3.org/2000/svg"><path d="';
    var tm = "";
    var wd = {
        'g': -1,
        'x': 0,
        'y': 0
    };
    var xy1 = '';
    // scan to get xmax xmin ymax ymin
    var xmax = -100000;
    var xmin = 100000;
    var ymax = -100000;
    var ymin = 100000;
    //	defaultsty=
    var dangle = 0;
    var sty = {
        "fill": "#000000",
        "stroke": "#000000",
        "stroke-width": 0,
        "deep": undefined,
        "repeat": undefined,
        ratio:1,
        error:0,
        flip:false,
        halfDPI:0,
        cuttab:0,
        doEngrave : 0,
        domarking : 0,
        dovcarve : 0,
        dopocket : 0,
        greenskip : 0,
        greentravel : 0,
        angle:dangle
        
        

    };
    var inimg=0;
    var inpath = 0;
    var paths = [];
    var path = [];
    var ox=0;
    var oy=0;
    var fx=0;
    var fy=0;
    var cx,cy;
    var xzero=0;
    var yzero=0;
    var czero=0;
    var sum=0;
    var ln=0;
    var yellow,dyellow,outer;
    var flips=[];
    var xmi,xma,ymi,yma;
    for (var i in gs) {
        var lns = gs[i];
        if (lns[0] == "P") {
            var ss = lns.split(":");
            //[P:fill:stroke:strikewidth\n]
            inpath = 0;
            path = [];
            sty["fill"] = ss[1];
            yellow=(ss[1]=="#ffff00") || (ss[2]=="#ffff00") 
            dyellow=(ss[1]=="#808000") || (ss[2]=="#808000")
            outer=!yellow    
            sty["stroke"] = ss[2];
            sty["stroke-width"] = parseFloat(ss[3]);


        } else if (lns[0] == "I") {
            var ss = lns.split(",");
            //[P:fill:stroke:strikewidth\n]
            inimg = 1;
            imagex=ss[1];
            imagey=ss[2];
            imagew=ss[3];
            imageh=ss[4];
            


        } else {        
			if (lns == "") {
				if (inimg){
					//ink_images.push([imagex*1,imagey*1,imagew*1,imageh*1,imagedata]);
					inimg=0;
					
				} else if (inpath>1){
                    flip=yellow
                    

                    // closed loop ?
                    var closed=sqr(ox-fx)+sqr(oy-fy)<mind;
                    //if (closed)path.pop();
                    // no match found
                    // path,flip,cx,cy,ln,parent,width,height,closed
                    sty.childs=0;
                    sty.closed=closed;
                    paths.push([path,flip,0,0,0,0,0,0,closed,sty]);
                    sty.num=gcstyle.length;
                    gcstyle.push(sty);
                    inpath=0;
                    sty = {
                        "fill": "#000000",
                        "stroke": "#000000",
                        "stroke-width": 0,
                        "deep": undefined,
                        "repeat": undefined,
                        "angle":dangle
                    };                    
                }
            } else {
				if (inimg){
					// save the image data here
					inimg=0;
					ink_images.push([imagex*1,imagey*1,imagew*1,imageh*1,lns]);
					
				} else {
                // X,Y
					inpath++;
					var ss = lns.split(",");
					var x=parseFloat(ss[0]);
					var y=parseFloat(ss[1]);
					if (inpath==1){
						fx=x;
						fy=y;
					}
					path.push([x, y]);
					ox=x;
					oy=y;
				}
            }
		}

    }
    
    // make polylines from segmented
    if (join){
        for (var i in paths){
                        // if not closed then find previous paths that match the endpoint
            var pa=paths[i];
            if (pa[0].length==0)continue;
            if (!pa[8]){
                
                for(var ii in paths){
                    if (i==ii)continue;
                    var p=paths[ii];
                    if (p[0].length==0)continue;
                    if (p[9].stroke!=pa[9].stroke)continue;// if not same stroke color contonue
                    if (p[8])continue; // if already closed continue

                    var ox,oy,fx,fy;
                    fx=pa[0][0][0];
                    fy=pa[0][0][1];
                    ox=pa[0][pa[0].length-1][0];
                    oy=pa[0][pa[0].length-1][1];
                    
                    var p1=p[0][0]; // first point
                    var p2=p[0][p[0].length-1]; // last point
                    if (sqr(p1[0]-ox)+sqr(p1[1]-oy)<mind) { // path1 -> path2
                        pa[0]=pa[0].concat(p[0]);
                        p[0]=[];

                    }
                    if (sqr(p2[0]-ox)+sqr(p2[1]-oy)<mind) { // path1 -> <path2 
                        pa[0]=pa[0].concat(p[0].reverse());
                        p[0]=[];
                    }
                }
            }    
        }
    }
    // clear path from empty path
    var npaths=[];
    cuttabs=[];
    xma = -1000000;
    xmi = 1000000;
    yma = -1000000;
    ymi = 1000000;

    engravebounds=[];
    for (var i in paths){
        var sty=paths[i][9];
        var stro=sty["stroke"];
        var cuttab = (stro == "#800000");
        var centerpos = (stro == "#008080");
        var engravebound = (stro == "#ffff00");
        if (cuttab){
			var cp=paths[i][0];
			if (cp.length>=2) cuttabs.push([cp[0],cp[cp.length-1]]);
            continue;
        }
        if (engravebound){
            engravebounds.push(paths[i][0]);
            sty["stroke"]="#00FF00";
            sty.greenskip=1;
            continue;
        }
        if (centerpos){
            var ps=paths[i][0];
            var sx=0;
            var sy=0;
            
            for (j in ps){
                var p=ps[j];
                sx+=p[0];
                sy+=p[1];
            }
            if (ps.length>0){
                xzero+=sx;
                yzero+=sy;
                czero+=ps.length;                
            }
            continue;
        }        
        if (paths[i][0].length>0){
            var pa=paths[i];
            var ps=pa[0];
            // work area bounding box
            bx1=10000;
            bx2=-10000;
            by1=10000;
            by2=-10000;
            
            for (j in ps){
                var p=ps[j];
                var x=p[0];
                var y=p[1];
                xmi=Math.min(x,xmi);
                //xma=Math.max(x,xma);
                ymi=Math.min(y,ymi);
                //yma=Math.max(y,yma);
                bx1=Math.min(x,bx1);
                bx2=Math.max(x,bx2);
                by1=Math.min(y,by1);
                by2=Math.max(y,by2);
            }
            if (sqr(bx2-bx1)+sqr(by2-by1)>0.1) npaths.push(paths[i]);
        }   
    }
    paths=npaths;
    var xofs=xmi;
    var yofs=ymi;
    for (var i in cuttabs){
        var p=cuttabs[i];
        p[0][0]-=xofs;
        p[0][1]-=yofs;
        p[1][0]-=xofs;
        p[1][1]-=yofs;
        
    }
    // calculate bounding
        // fill the cx,cy,ln,width,height

    for (var i in paths){
                    // if not closed then find previous paths that match the endpoint
        var pa=paths[i];
        var ps=pa[0];
        //if (ps.length==0)continue;
        cx=0;
        cy=0;
        sum=0;
        xma = -1000000;
        xmi = 1000000;
        yma = -1000000;
        ymi = 1000000;
        var ox=ps[ps.length-1][0];
        var oy=ps[ps.length-1][1];
        var j=0;
        for (j in ps){
            var p=ps[j];
            p[0]-=xofs;
            p[1]-=yofs;
            var x=p[0];
            var y=p[1];
            xmi=Math.min(x,xmi);
            xma=Math.max(x,xma);
            ymi=Math.min(y,ymi);
            yma=Math.max(y,yma);
            if (j>0){
                cx+=x;
                cy+=y;
                sum -= (ox - x) * (oy + y);
                //ln += sqrt(sqr(ox-x)+sqr(oy-y));
            }
            ox=x;
            oy=y;
        }
        // update paths
        ln=sqrt(sqr(xma-xmi)+sqr(yma-ymi));
        if (sum<0)paths[i][1]=!paths[i][1];
        paths[i][2]=cx/j;
        paths[i][3]=cy/j;
        paths[i][4]=ln;
        paths[i][6]=xma-xmi;
        paths[i][7]=yma-ymi;
    }
	var etime = new Date();
    var ms = etime.getTime();    
    // check inside/ outside
    
     for (i in paths) {
        var path = paths[i][0];
        //if (path.length==0)continue;
        var sty=paths[i][9];
        var stro=sty["stroke"];
        var fill=sty["fill"];
        // modifier for grayscale engrave
		if (stro=="#ffff00"){
			stro="#000000";
			fill="#ffff00";
			sty["stroke"]=stro;
			sty["fill"]=fill;
		}
    }   
    for (i in paths) {
        var path = paths[i][0];
        //if (path.length==0)continue;
        var sty=paths[i][9];
        var stro=sty["stroke"];
        var fill=sty["fill"];
        // modifier for grayscale engrave

		if (stro == "#808000"){
            gray = (16*parseInt(15-parseInt("0x" + fill.substr(3, 2)) /17)).toString(16);
            if (gray.length==1)gray="0"+gray;
            stro = "#00"+gray+"ff";
            sty["stroke"]=stro;
		}
		sty.closed=  sqrt(sqr(path[0][0]-path[path.length-1][0])+sqr(path[0][1]-path[path.length-1][1]))<mind;
        sty.deep=paths[i][5].length; // parent deep, used for draw sorting
        sty.doEngrave = (RBcolor(stro) == "00ff") || (RBcolor(stro) == "0080");
        sty.halfDPI = (RBcolor(stro) == "0080");
        if (sty.doEngrave)
            sty.angle = parseInt("0x" + stro.substr(3, 2));
        sty.domarking = (RBcolor(stro) == "ff00");
        sty.markpower = 0;
        if (sty.domarking && (cmd==CMD_LASER)) 
            sty.markpower=parseInt("0x" + stro.substr(3, 2));  // if CNC, we dont need power, threat as deep instead
        sty.dovcarve = (stro == "#00ffff");
        sty.dopocket = (RBcolor(stro) == "8080");
        sty.cuttab = (paths[i][0].length==2) && (stro == "#800000");
        sty.isCuttab = 0;
        sty.flip=paths[i][1];
        

        sty.greenskip = sty.greenskip || sty.cuttab || (stro == "#00ff00") || (fill == "#00ff00");
        sty.greentravel = (stro == "#008000") || (fill == "#008000");
        sty.strokedee=0;
        if ((cmd==CMD_CNC)) 
            sty.strokedeep = parseInt("0x" + stro.substr(3, 2)) * 0.1;
        sty.ratio=0;
        sty.error=0;
        sty.issort=0;
        // skip checking if its engrave
        var parent=[];
        if (!(/*sty.doEngrave|| sty.domarking || sty.dovcarv ||*/  sty.greenskip  || (!sty.closed))){
			sty.issort=1;
            var flip = paths[i][1];
            cx=paths[i][2];
            cy=paths[i][3];
            var l1=paths[i][4];
            pocket1=sty.dopocket;
            for (ii in paths){
                psty=paths[ii][9];
                pocket2=psty.dopocket;
                if (pocket1 && !pocket2) continue;
                if (!pocket1 && pocket2) continue;
                //if (psty.doEngrave|| psty.domarking || psty.dovcarv)continue;
                if (i==ii || paths[ii][4]<l1 || (psty["stroke"]=="#00ff00" && psty["fill"]=="none") )continue;//|| (!psty.closed)) continue;
                var d=sqr(cx-paths[ii][2])+sqr(cy-paths[ii][3]);
                if (sqrt(d)>paths[ii][4]+l1)continue;
                for (var j=0;j<path.length;j+=10){
                    var p=path[j];
                    if ((paths[ii][4]>l1) && isInside(p[0],p[1],paths[ii][0])){
                        if (paths[i][9].closed && (psty["fill"]!="#ffff00"))flip=!flip;
                        parent.push(ii);
                        paths[ii][9].childs++;
                        break;
                    }
                }
            }
            paths[i][1]=flip; // update
        }
        paths[i][5]=parent;
        sty.parent=parent;
    }
	var etime = new Date();
	ms = etime.getTime() - ms;
	console.log("Process time " + ms);
    gcstyle = [];
    var pi=1;
    for (i in paths) {
        var path = paths[i][0];
        //if (path.length==0)continue;
        sty=paths[i][9];
        sty.ochilds=sty.childs;

        
        //for (var pi in paths[i][5]){
            
        //};
        sty.num=gcstyle.length;
        gcstyle.push(sty);
        if (paths[i][1])path=path.reverse();
        // new shape
        sc++;
        if (sc > 1) {
            t1 += " ";
        }

        for (j in path) {
            var p = path[j];
            x = p[0] * scale;
            y = p[1] * scale;
            xmax = Math.max(xmax, x);
            ymax = Math.max(ymax, y);
            xmin = Math.min(xmin, x);
            ymin = Math.min(ymin, y);
            xy = mround(x) + " " + mround(y);
            if (j == 0) {
                t1 += "M" + xy;
            } else {
                if (j == 1) t1 += " L";
                t1 += " " + xy;
            }
        }
    }

    if (czero>0){
        xzero/=czero;
        yzero/=czero;
    }
    setvalue("startat",mround2(xzero)+","+mround2(yzero));
    t1 += '" stroke="none" fill="black" fill-rule="evenodd"/></svg>';
    sty=defaultsty;
    sty.num=gcstyle.length;
    gcstyle.push(sty);
    gcstyle.push(sty);
    gcstyle.push(sty);
    gcstyle.push(sty);
    gcstyle.push(sty);
    gcstyle.push(sty);
    return t1;
    
}

// handle paste image
// We start by checking if the browser supports the
// Clipboard object. If not, we need to create a
// contenteditable element that catches all pasted data
/*
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
*/
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
                    text1 = event.target.result; //.toUpperCase();
                    myFunction(1);
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
                    text1 = Potrace.getSVG(1); //.toUpperCase();
                    preparestyle();

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
            text1 = Potrace.getSVG(1); //.toUpperCase();
            preparestyle();
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
    var d = 'none';
    if ($("segment").checked)
        d = 'block';

    $("segm").style.display = d;
    myFunction(0);
    savesetting();
}

function copy_to_clipboard(id) {
    $(id).select();
    document.execCommand('copy');
}



// Web socket server to allow other karyacnc apps send gcode and task to this software
