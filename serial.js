//console.log("App Running");
//
var cmd = CMD_CNC;
var finishgcode = "";
var startgcode = "";

var machinezero = "G92";
var machinepos = "M114";
var wsconnected = 0;
var lastw = "";
var oktosend = 1;
var connectionId = null;
var eline = 0;
var okwait = 0;
var running = 0;
var px = 0;
var py = 0;
var pz = 0;
var pe = 0;
var etime = new Date();
var checktemp = 0;
var isgrbl = 0;
var gcstyle = [];
var preview = 0;
var waitok = 0;
var waitokH = 0;
var karya_ready = 0;
var hasCOM = 0;
var engravebounds = [];

function millis() {
	var date = new Date();
	return date.getTime();
}

function comconnect() {
	var bt = document.getElementById('btconnect');
	if (bt.innerHTML == "Connect") {
		connect(document.getElementById('comport').value);
		bt.innerHTML = 'Disconnect';
	} else {
		disconnect();
		bt.innerHTML = 'Connect';
	}
}

function testlaser() {
	sendgcode("M3 S255 P100");
	sendgcode("M3 S0");
}

function gcodemove(x, y, z) {
	var mm = document.getElementById('move').value;
	var mmz = document.getElementById('movez').value;
	px = px + x * mm;
	py = py + y * mm;
	pz = pz + z * mmz;
	sendgcode("G0 F5000 X" + (px) + " Y" + (py) + " Z" + (pz));
}

function gcoderight() {
	gcodemove(1, 0, 0);
}

function gcodeleft() {
	gcodemove(-1, 0, 0);
}

function gcodeup() {
	gcodemove(0, -1, 0);
}

function gcodedown() {
	gcodemove(0, 1, 0);
}

function gcodezup() {
	gcodemove(0, 0, 1);
}

function gcodezdown() {
	gcodemove(0, 0, -1);
}

function homing() {
	sendgcode("G28");
	px = 0;
	py = 0;
	pz = 0;
	pe = 0;
}

function setashome2() {
	sendgcode(machinezero);
	px = 0;
	py = 0;
	pz = 0;
	pe = 0;
}

function setashome3() {
	sendgcode("G0 Z2");
	pz = 2;
}

function setashome() {
	sendgcode("G0 Z0");
	pz = 0;
}

function hardstop() {
	sendgcode("M2");
	sendgcode("G0 Z2 F5000");
	sendgcode("G0 X0 Y0");
	px = 0;
	py = 0;
	pz = 2;
	stopit();
}

var comtype = 0;
// 0 serial, 1 websocket
var egcodes = [];
var debugs = 0;

function checkwaitok() {
	if (millis() - waitok > 700) sendgcode(machinepos);
}
var lasts = "";

function sendgcode(g) {
	g = g.replace(/(\r\n|\n|\r)/gm, "");
	// keep the last Svalue
	lasts = g.match(/S[+-]?\d+(?:\.\d+)?/);
	if (lasts != null) lasts = lasts[0];

	if (debugs & 1)
		console.log(g);
	try {
		if (comtype == 0)
			writeSerial(g + "\n");
		if (comtype == 1)
			ws.send(g + "\n");
		//waitok=millis();
		//if (waitokH)clearTimeout(waitokH);
		//waitokH=setTimeout(checkwaitok,1000);

	} catch (e) {
		console.log(e);
	}
}

var shapefinish = '';
var currentshape = 0;
var waitforwait = 0;

function on__wait() {
	if (waitforwait) {
		waitforwait = 0;
		sendgcode(machinepos);
		stopit();
		$("alert1").innerHTML = "IDLE";
		resetflashbutton();
		if (stopinfo) {
			var ms = etime.getTime();
			etime = new Date();
			console.log("Stop " + etime);
			ms = etime.getTime() - ms;
			mss = "Real time:" + mround(ms / 60000.0);
			setvalue("applog", getvalue("applog") + mss + "\n");
			console.log(mss);
			if (!preview) {
				setvalue("totaltime", mround(getvalue("totaltime") * 1 + ms / 60000.0));
				$("infolain").innerHTML = mss;
			}
			stopinfo = 0;
		} else sendgcode(machinepos);
		resetflashbutton();

		var bt = document.getElementById('btexecute');
		bt.innerHTML = "Execute";
		var bt = document.getElementById('btexecute2');
		bt.innerHTML = "Engrave";
	}
}

var pushedgcodes = [];
var buffsize = 128;

function nextgcode() {
	if (comtype == 1 && !wsconnected) {
		//setTimeout(nextgcode,1000);
		return;
	}; // wait until socket connected
	if (okwait > 0)
		return;
	if (!running)
		return;
	var nc = 0;
	while (eline < egcodes.length) {
		var g = egcodes[eline];
		if (g.indexOf(";SHAPE") == 0) {
			var sp = g.split("#")[1] * 1;
			if (currentshape && (sp != currentshape)) {
				if (shapefinish)
					shapefinish += ',';
				shapefinish += currentshape;
				$("shapes").value = shapefinish;
			}
			currentshape = sp;
		}
		eline++;
		if (g == ";PAUSE")
			pause();
		if ((g) && (g[0] != ';') && (g[0] != '(')) {
			okwait = 1;
			var rg = g.split(";")[0];
			// calculate total buffer
			buffl = pushedgcodes.reduce((a, b) => a + b, 0);
			if (buffsize - buffl > rg.length) {
				pushedgcodes.push(rg.length);
				sendgcode(rg);
				sendgcode("");
				$("progress1").value = eline * 100 / egcodes.length;
				var bt = document.getElementById('btresume2');
				bt.innerHTML = "Resume from " + eline;
				nc++;
			} else {
				//console.log(nc);
				eline--;
				return;
			}
		}
	}
	//sendgcode("G4");
	waitforwait = 1;
}

function next5gcode() {
	for (var i = 0; i < 6; i++) nextgcode();
	okwait = 0;
}

function idleloop() {

	if (wsconnected && checktemp) {
		if (!running)
			sendgcode("M105");
		checktemp = 0;
	}
	//if (isgrbl && running)sendgcode(machinepos);
	setTimeout(idleloop, 3000);
}

function stopit() {
	stopinfo = 1;
	//var bt = document.getElementById('btexecute');
	//bt.innerHTML = "Execute";
	var bt = document.getElementById('btpause');
	bt.innerHTML = "PAUSE";
	running = 0;
	okwait = 0;
	egcodes = [];
}

function execute(gcodes) {
	shapefinish = "";
	pushedgcodes = [];
	setvalue("shapes", "");
	currentshape = 0;
	etime = new Date();
	console.log("Start " + etime);
	setvalue("applog", getvalue("applog") + "Start " + etime + "\n");
	var bt = document.getElementById('btpause');
	bt.innerHTML = "PAUSE";
	egcodes = gcodes.split("\n");
	eline = 0;
	running = egcodes.length;
	okwait = 0;
	nextgcode();
	//sendgcode("M105");
}

function executegcodes(gcodes) {
	var bt = document.getElementById('btexecute');
	if (bt.innerHTML == "Execute") {
		preview = 0;
		execute(gcodes + finishgcode);
		bt.innerHTML = "Stop";
	} else {
		bt.innerHTML = "Execute";
		stopit();
		sendgcode("M2");
	}
}

function executegcodes2() {
	var bt = document.getElementById('btexecute2');
	if (bt.innerHTML == "Engrave") {
		preview = 0;
		if ($("engravecut").checked)
			execute(getvalue('engcode') + "\n" + getvalue('gcode') + finishgcode);
		else
			execute(getvalue('engcode') + finishgcode);
		bt.innerHTML = "Stop";
	} else {
		bt.innerHTML = "Engrave";
		stopit();
		sendgcode("M2");
	}
}

function executepgcodes() {
	preview = 1;
	execute(document.getElementById('pgcode').value);
	//    pz = 2;
}

function pause() {
	var bt = document.getElementById('btpause');
	if (bt.innerHTML == "PAUSE") {
		running = 0;
		pausing = 1;
		sendgcode("M2");
		bt.innerHTML = "RESUME";
	} else {
		running = 1;
		if (lasts) sendgcode("M3 " + lasts); // should be back to last power
		nextgcode();
		bt.innerHTML = "PAUSE";
	}
}
var ss = "";
var eeprom = {};
var eepromgcode = "";
var ineeprom = 0;
var eppos = 0;
var resp1 = "";
var totalwork = 0;
var stopinfo = 0;

function handleuserkey(n) {
	if (n == 1) {
		// do preview
		if (running) return;
		executepgcodes();
	}
	if (n == 2) {
		// do execute
		if (running) hardstop();
		else executegcodes(getvalue("gcode"));
	}
	if (n == 3) {
		// do engrave
	}
}
var pausing = 0;
var onReadCallback = function(s) {
	resp1 += s;
	var estr = "";
	for (var i = 0; i < s.length; i++) {
		if (s[i] == "\n") {

			if (ss.indexOf("USERKEY:") >= 0) {
				uk = Math.floor(parseFloat(ss.substr(ss.indexOf("USERKEY:") + 8)));
				handleuserkey(uk);
			}
			if (ss.indexOf("Z:") > 0) {
				px = parseFloat(ss.substr(ss.indexOf("X:") + 2));
				py = parseFloat(ss.substr(ss.indexOf("Y:") + 2));
				pz = parseFloat(ss.substr(ss.indexOf("Z:") + 2));
				pe = parseFloat(ss.substr(ss.indexOf("E:") + 2));
			}
			if (debugs & 2)
				console.log(ss);
			ss = "";
		} else
			ss += s[i];
		if ((s[i] == "\n") || (s[i] == " ") || (s[i] == "*")) {
			pushedgcodes.shift();
			nextgcode();
			if (ineeprom > 0) { //EPR:3 145 0.000 X Home Pos
				if (ineeprom == 20) eppos = lastw;
				else if (ineeprom == 19) eeprom[eppos] = lastw;
				else {
					estr += lastw + " ";
					if (s[i] == "\n") {
						var sel = document.getElementById("eepromid");
						sel.innerHTML += "<option value=\"" + eeprom[eppos] + ":" + eppos + "\">" + estr + "</option>";
						if (estr == "Lscale ") xyscale = 100.0 / (eeprom[eppos] * 1);
						ineeprom = 1;
					};
				}
				ineeprom--;
			}
			if (lastw.toUpperCase().indexOf("EPR:") >= 0) {
				ineeprom = 20;
				estr = "";
			}
			if (lastw.toUpperCase().indexOf("T:") >= 0) {
				document.getElementById("info3d").innerHTML = lastw;
				checktemp = lastw.toUpperCase() != "T:0.000";
			}

			if (lastw.toUpperCase().indexOf("MESH") >= 0) {
				//checktemp = 1;
			}
			if (lastw.toUpperCase().indexOf("STOPPED!") >= 0) {
				// STOPPED! BUFF:XX
				// we need to know which gcode is this coordinate belong to
				if (pausing) {
					try {
						ispausing = 0;
						var elinex = eline;
						elinex -= parseInt(lastw.split("BUFF:")[1]) + 3;
						sendgcode("G0 Z10 F1000");
						var gc = egcodes[elinex].toUpperCase();
						sendgcode(gc.replace("G1", "G0"));
						eline = elinex;
					} catch (e) {}
				}
			}
			if (!isgrbl && (lastw.toUpperCase().indexOf('GRBL') >= 0)) {
				isgrbl = 1;
				machinezero = "g10 p0 l20 x0 y0 z0";
				machinepos = "?";
				setashome2();
			}

			isok = 0; //(lastw.length == 2) && (lastw[0].toUpperCase() == 'O');
			lastwx = lastw;
			lastw = "";
			if (isok || (lastwx.toUpperCase().indexOf('OK') >= 0) || (lastwx.toUpperCase().indexOf('ERROR:') >= 0) || (lastwx.toUpperCase().indexOf('WAIT') >= 0)) {
				okwait = 0;
				if ((lastwx.toUpperCase().indexOf('WAIT') >= 0)) {
					on__wait();
				}

			}
		} else
			lastw = lastw + s[i];
	}
}

var listPorts = function() {
	chrome.serial.getDevices(onGotDevices);
};

var onGotDevices = function(ports) {
	var s = "";
	for (var i = 0; i < ports.length; i++) {
		if (ports[i].path.indexOf("ttyS") > -1) continue;
		if (ports[i].path.indexOf("\\\\.\\") > -1) continue;

		if (ports[i].path)
			s = s + "<option value=" + ports[i].path + ">" + ports[i].path + "</option>";
	}
	document.getElementById("comport").innerHTML = s;
};
var baud = 115200;
var connect = function(path) {
	try {
		baud = parseFloat(getvalue("baudrate"));
	} catch (e) {
		baud = 115200 * 2;
	}

	var options = {
		bitrate: baud
	};
	chrome.serial.connect(path, options, onConnect)
};

var onConnect = function(connectionInfo) {
	//console.log(connectionInfo);
	connectionId = connectionInfo.connectionId;
	isConnectedCSS.style.display = "";
};

var disconnect = function() {
	chrome.serial.disconnect(connectionId, onDisconnect);
};

var onDisconnect = function(result) {
	if (result) { //console.log("Disconnected from the serial port");
	} else { //console.log("Disconnect failed");
	}
	isConnectedCSS.style.display = "none";
};

//var setOnReadCallback = function(callback) {
//	onReadCallback = callback;
//	chrome.serial.onReceive.addListener(onReceiveCallback);
//};

var onReceiveCallback = function(info) {
	if (info.connectionId == connectionId && info.data) {
		var str = convertArrayBufferToString(info.data);
		//console.log(str);
		if (onReadCallback != null) {
			onReadCallback(str);
		}
	}
};
var onSend = function(sendInfo) {
	//console.log(sendInfo);
}

var writeSerial = function(str) {
	chrome.serial.send(connectionId, convertStringToArrayBuffer(str), onSend);
}
// Convert ArrayBuffer to string
var convertArrayBufferToString = function(buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}
// Convert string to ArrayBuffer
var convertStringToArrayBuffer = function(str) {
	var buf = new ArrayBuffer(str.length);
	var bufView = new Uint8Array(buf);
	for (var i = 0; i < str.length; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

function changematerial() {
	val = getvalue("material");
	val = val.split(",");
	setvalue("feed", val[0]);
	setvalue("repeat", val[1]);
	setvalue("matprice", val[2]);
	setvalue("cutprice", val[3]);
	harga = val[2];
	if (val.length == 5) {
		document.getElementById("cmode").value = 3;
		setvalue("zdown", val[4]);
		setvalue("tabc", 1.5);
	}
	if (val.length == 4) {
		document.getElementById("cmode").value = 1;
		setvalue("zdown", 0);
		setvalue("tabc", 0);

	}
	modechange();
}

function modechange(f = 0) {
	var oldmode = f ? -1 : cmd;
	cmd = getvalue("cmode");
	if (oldmode == cmd) return;

	notlaserCSS.style.display = "";
	notcncCSS.style.display = "";
	notplasmaCSS.style.display = "";

	if (cmd == CMD_LASER) {
		notlaserCSS.style.display = "none";
		setvalue("pup", "");
		setvalue("pdn", "M3 S255");
	}
	if (cmd == CMD_FOAM) {
		setvalue("pup", "");
		setvalue("pdn", "M3 S255");
	}
	if (cmd == CMD_CNC) {
		notcncCSS.style.display = "none";
		if ($("pup").value==""){
			setvalue("pup", "G0 F3000 Z15");
			setvalue("pdn", "G0 F1800 Z=cncz");
		}
		//setvalue("feed", "3");
		//setvalue("zdown", "10");
	}
	if (cmd == CMD_PLASMA) { // need to change !!
		notplasmaCSS.style.display = "none";
		if ($("pup").value==""){
			setvalue("pup", "G0 F3000 Z15");
			setvalue("pdn", "G0 F1800 Z=cncz");
		}
		//setvalue("feed", "3");
		//setvalue("zdown", "10");
	}
	if (cmd == 4) {
		setvalue("pup", "");
		setvalue("pdn", "");
		//setvalue("feed", "30");
		//setvalue("zdown", "10");
	}
}
//onclick="setashome();"
function initserial() {
	try {
		chrome.serial.onReceive.removeListener(onReceiveCallback);
		chrome.serial.onReceive.addListener(onReceiveCallback);
		listPorts();
		comtype = 0;
	} catch (e) {
		comtype = -1;
	}
}

function gcodefunc(s) {
	return function() {
		sendgcode(s);
	};
}

setclick("btcekpos", function() {
	sendgcode(machinepos);
});
setclick("btinitser", initserial);
setclick("btconnect", comconnect);
setclick("btsethome", setashome);
setclick("btsethome2", setashome2);
setclick("btsethome3", setashome3);
setclick("bthoming", homing);
setclick("bthardstop", hardstop);
setclick("btpreview", executepgcodes);
setclick("btexecute", function() {
	executegcodes(getvalue("gcode"));
});
setclick("btexecute2", executegcodes2);
setclick("btpause", pause);
setclick("bthit", testlaser);
setclick("btleft", gcodeleft);
setclick("btup", gcodeup);
setclick("btdn", gcodedown);
setclick("btright", gcoderight);
setclick("btzup", gcodezup);
setclick("btzdn", gcodezdown);
setclick("btrecode", refreshgcode);
setclick("btrecode2", refreshgcode);
setclick("btm3", gcodefunc("m3 s255"));
setclick("btm5", gcodefunc("m5"));

setclick("btsend", function() {
	sendgcode(getvalue("edgcode"));
})
setclick("btautolevel1", function() {
	sendgcode(autoprobe);
	checktemp = 0;
})
setclick("btautolevel2", gcodefunc("G29 S0"));
setclick("btmotoroff", gcodefunc("M84"));

setevent("change", "cmode", modechange);

function checkrep(e) {
	var a = getvalue("repeat");
	if (a.indexOf("mm") > 0) {
		setvalue("repeat", Math.ceil(getnumber("zdown") / parseFloat(a)));
	}

}
setevent("change", "repeat", checkrep);

setevent("change", "material", changematerial);
setevent("change", "profile", setprofile);
setclick("btsavep", saveprofile);
setclick("btdelp", delprofile);
setclick("btloadp", loadprofile);
setclick("btresume", function() {
	okwait = 0;
	sendgcode("m3 S255");
	nextgcode();
});
setclick("btsetcut", function() {
	//   setvalue("disablecut", getvalue("shapes"));
});

//setclick("btengrave", function() {
//window.open("http://localhost:" + port + "/engrave", 'prn', 'width=700,height=500');
//});
setclick("btresume2", function() {
	okwait = 0;
	var bt = document.getElementById('btresume2');
	ln = bt.innerHTML.split(" ")[2];
	eline = ln * 1;

	sendgcode("m3 S255");
	nextgcode();
});

// 3d printer

setclick("bt3home", function() {
	sendgcode("g28");
	pe = 0
});
setclick("bt3pla", function() {
	sendgcode("m104 s180");
});
setclick("bt3t0", function() {
	sendgcode("m104 s0");
});
setclick("bt3read", function() {
	sendgcode("m105");
});
setclick("bt3limit", function() {
	sendgcode("m119");
});
setclick("bt3eeprom", function() {
	document.getElementById("eepromid").innerHTML = "";
	sendgcode("m205");
});
setclick("bt3seteeprom", function() {
	sendgcode("M206 P" + eppos + " S" + getvalue("eepromval"));

});
setclick("bt3Eup", function() {
	pe -= 1 * getvalue("extmm");
	sendgcode("g0 E" + pe);
});
setclick("bt3Edn", function() {
	pe += 1 * getvalue("extmm");
	sendgcode("g0 E" + pe);
});
setevent("change", "eepromid", function() {
	var v = getvalue("eepromid").split(":");
	setvalue("eepromval", v[0]);
	eppos = v[1];
});

var hidd = true;
setclick("bthidden", function() {
	var d = 'none';
	if (hidd)
		d = 'block';
	hidd = !hidd;
	$("vars").style.display = d;
});
var hidd5 = true;
setclick("bthidden5", function() {
	var d = 'none';
	if (hidd5)
		d = 'block';
	hidd5 = !hidd5;
	$("vars3").style.display = d;
});
var hidd6 = true;
setclick("btengrave", function() {
	if (cmd == CMD_CNC) {
		//window.open("http://localhost:" + port + "/engrave", 'prn', 'width=700,height=500');
		var d = 'none';
		if (hidd6)
			d = 'block';
		hidd6 = !hidd6;
		$("vars5").style.display = d;
	} else {
		var d = 'none';
		if (hidd6)
			d = 'block';
		hidd6 = !hidd6;
		$("vars4").style.display = d;
	}
});
var hidd2 = true;
setclick("bthidden2", function() {
	var d = 'none';
	if (hidd2)
		d = 'block';
	hidd2 = !hidd2;
	$("vars2").style.display = d;
});
// gcode editor
var hidd3 = true;
setclick("bthidden3", function() {
	var d = 'none';
	if (hidd3)
		d = 'block';
	hidd3 = !hidd3;
	$("gcodepreview").style.display = d;
	resizedisplay();
});
// gcode editor

setclick("btcopy1", function() {
	copygcode();
});
setclick("btcopy2", function() {
	copygcode();
	//copy_to_clipboard('pgcode');
});

setclick("tracingbt", function() {
	tr = document.getElementById('title2');
	tb = document.getElementById('tracingbt');
	if (tb.innerHTML == "GCODE SENDER") {
		tb.innerHTML = "KARYACNC CAM";
		tr.hidden = true;
	} else {
		tb.innerHTML = "GCODE SENDER";
		tr.hidden = false;
	}

});
setclick("wsconnect", function() {
	connectwebsock();
});

var stotype = 0;
try {
	storage = chrome.storage.local;

} catch (e) {
	stotype = 1;
	storage = localStorage;
}

var jobsettings = {};

function savesetting(name) {
	if (name == undefined) name = "";
	var a = document.getElementsByClassName("saveit");
	sett = {};
	for (var i = 0; i < a.length; i++) {
		if (a[i].type == 'text')
			sett[a[i].id] = a[i].value;
		if (a[i].type == 'select-one')
			sett[a[i].id] = a[i].value;
		if (a[i].type == 'checkbox')
			sett[a[i].id] = a[i].checked;
	}
	updatestyle("wcolor", getvalue("wcolor"));
	updatestyle("wtitle", getvalue("wtitle"));
	if (name) {
		jobsettings[name] = sett;
	}
	if (stotype == 1) {
		storage.setItem("settings", JSON.stringify(sett));
		storage.setItem("text1", text1);
		storage.setItem("ink_images", JSON.stringify(ink_images));
		storage.setItem("gcstyle", JSON.stringify(gcstyle));
		storage.setItem("cuttabs", JSON.stringify(cuttabs));
		storage.setItem("ebounds", JSON.stringify(enrgavebounds));
	} else {
		storage.set({
			"settings": sett,
			"text1": text1,
			"ink_images": ink_images,
			"gcstyle": gcstyle,
			"cuttabs": cuttabs,
			"ebounds": engravebounds,
			"jobsettings": jobsettings
		});
	}
	updatedownloadprofile();
}

setclick("btsaveset", savesetting);
setclick("btgcode2vec", function() {
	text1 = gcodetoText1(getvalue("gcode"));
	refreshgcode();
});

function updatestyle(k, va) {
	if (k == 'wtitle') {
		$("title0").innerHTML = va;
	}
	if (k == 'wcolor') {
		$("title1").style.background = va;
		$("title2").style.background = va;
		color=getComputedStyle($("title1")).background;
		getFontColor("title2","title2_a","title2_b");
	}
}

function updatewmode() {
	dm = getvalue("wmode");
	if (dm == 1) {
		notsimpleCSS.style.display = "none";
		$("vars3").style.marginLeft = "230px";
	}
	if (dm == 2) {
		notsimpleCSS.style.display = "";
		$("vars3").style.marginLeft = "330px";
	}
}

function updateweb(sett) {
	var kl = document.getElementsByClassName("saveit");
	for (var i = 0; i < kl.length; i++) {
		var a=kl[i];
		var k=a.id;
		//var a = $(k);
		if (a != undefined) {
			if (a.type == 'checkbox')
				a.checked = sett[k];
			else
				setvalue(k, sett[k]);
			// custom
			updatestyle(k, sett[k]);
		}
	}
	modechange();
	updatewmode();
}


function updateprofile(newdata=null) {
	if (newdata!=null){
		for (var k in newdata) {
			if (typeof(jobsettings[k])=='undefined') jobsettings[k]=newdata[k]; else
			jobsettings[k+"_1"]=newdata[k];
		}
	}
	var p = "";
	for (var k in jobsettings) {
		p += "<option value='" + k + "'>" + k + "</option>";
	}
	$("profile").innerHTML = p;
}

function loadsettings(name) {
	if (name == undefined) name = "";
	if (name) {
		updateweb(jobsettings[name]);
		return;
	}

	try {
		if (stotype == 0) {
			storage.get("text1", function(r) {
				text1 = r.text1;
			})
			storage.get("gcstyle", function(r) {
				gcstyle = r.gcstyle;
			})
			storage.get("ink_images", function(r) {
				ink_images = r.ink_images;
				if (!ink_images) ink_images = [];
			})
			storage.get("cuttabs", function(r) {
				cuttabs = r.cuttabs;
				if (cuttabs == undefined) cuttabs = [];
			})
			storage.get("ebounds", function(r) {
				engravebounds = r.ebounds;
				if (engravebounds == undefined) engravebounds = [];
			})
			storage.get("settings", function(r) {
				updateweb(r.settings);
			});
			storage.get("jobsettings", function(r) {
				jobsettings = r.jobsettings;
				if (jobsettings == undefined) jobsettings = {};
				updateprofile();
			});
		} else {
			jobsettings = storage.jobsettings;
			text1 = storage.text1;
			if (text1 == undefined) text1 = "";
			if (storage.gcstyle != undefined) gcstyle = JSON.parse(storage.gcstyle);
			if (storage.ink_images != undefined) ink_images = JSON.parse(storage.ink_images);
			if (storage.cuttabs != undefined) cuttabs = JSON.parse(storage.cuttabs);
			if (storage.ebounds != undefined) engravebounds = JSON.parse(storage.ebounds);
			if (storage.settings != undefined) {
				updateweb(JSON.parse(storage.settings));
				if (jobsettings == undefined) jobsettings = {};
				if (!ink_images) ink_images = [];
				updateprofile();
			}
		}
		//connectwebsock();

	} catch (e) {}

}
loadsettings("");

function loadprofile() {
	name = getvalue("profilename");
	if (name == "") name = getvalue("profile");
	setvalue("profilename", name);
	loadsettings(name);
	//sendgcode("m220 s100"); // reset speed
}

function saveprofile() {
	name = getvalue("profilename");
	if (name == "") name = getvalue("profile");
	setvalue("profilename", name);
	savesetting(name);
	updateprofile();

}

function delprofile() {
	name = getvalue("profilename");
	if (name=="***") jobsettings={}; else {
		if (name == "") name = getvalue("profile");
		setvalue("profilename", "");
		delete jobsettings[name];
	}
	savesetting("");
	updateprofile();

}
function setprofile() {
	setvalue("profilename", getvalue("profile"));
}
// websocket
var websockOK = 0;

function reconnectwebsock() {
	if (websockOK) {
		//setTimeout(connectwebsock, 2000);
	}
}
var autoreconnect = 0;

function connectwebsock() {
	websockOK = 0;
	wsconnected = $("wsconnect").innerHTML == "Close";
	if (wsconnected) {
		autoreconnect = 0;
		ws.close();
		return;
	}
	h = getcncip();
	if (h) {
		var lastcomtype = comtype;
		comtype = 1;
		var a = document.getElementById("status");
		a.innerHTML = "Web socket:Connecting...";

		function handlemessage(m) {
			msg = m.data;
			onReadCallback(msg);
			//if (debugs & 2) console.log(msg);
		}

		ws = new WebSocket('ws://' + h + ':81/', ['arduino']);
		ws.onerror = function(e) {
			comtype = lastcomtype;
			a.innerHTML = "Web socket:Failed connect ! ";
			$("wsconnect").innerHTML = 'Connect';
			ws.close();
			autoreconnect = 0;
			wsconnected = 0;
			reconnectwebsock();
			//			hideId("machine_ws");
			isConnectedCSS.style.display = "none";

		}
		// back to serial if error.
		ws.onmessage = handlemessage;
		ws.onopen = function(e) {
			console.log('Ws Connected!');
			a.innerHTML = "Web socket:Connected";
			$("wsconnect").innerHTML = 'Close';
			wsconnected = 1;
			//nextgcode(); // 
			sendgcode(machinepos);
			websockOK = 1;
			//			showId("machine_ws");
			resetflashbutton();
			autoreconnect = 1;
			isConnectedCSS.style.display = "";
		};

		ws.onclose = function(e) {
			console.log('ws Disconnected!');
			a = document.getElementById("status");
			a.innerHTML = "Web socket:disconnected";
			$("wsconnect").innerHTML = 'Connect';
			wsconnected = 0;
			// disable autoreconnect
			if (autoreconnect) reconnectwebsock();
			//			hideId("machine_ws");
			isConnectedCSS.style.display = "none";
		};
		idleloop();
	}
}

function createCORSRequest(method, url) {
	var xhr = new XMLHttpRequest();
	xhr.withCredentials = false;
	if ("withCredentials" in xhr) {

		// Check if the XMLHttpRequest object has a "withCredentials" property.
		// "withCredentials" only exists on XMLHTTPRequest2 objects.
		xhr.open(method, url, true);

	} else if (typeof XDomainRequest != "undefined") {

		// Otherwise, check if XDomainRequest.
		// XDomainRequest only exists in IE, and is IE's way of making CORS requests.
		xhr = new XDomainRequest();
		xhr.open(method, url);

	} else {

		// Otherwise, CORS is not supported by the browser.
		xhr = null;

	}
	return xhr;
}

// web socket server, to receive gcode from other
var port = 8888;
var isServer = false;

function startserver() {
	if (http.Server && http.WebSocketServer) {
		// Listen for HTTP connections.
		port = getvalue("wsport") * 1;
		$("portnum").innerHTML = port;
		var server = new http.Server();
		var wsServer = new http.WebSocketServer(server);

		server.addEventListener('request', function(req) {
			var url = req.headers.url;
			if (url == '/')
				url = '/engrave';
			if (url == '/engrave') {
				if (getvalue("cmode") == 3) url = '/engrave.html';
				else url = '/graf.html';
			}
			// Serve the pages of this chrome application.
			req.serveUrl(url);
			return true;
		});
		// Listen for possible errors
		server.addEventListener('error', function(event) {
			$("title0").innerHTML = 'WebSocket error: ' + event;
		});

		// A list of connected websockets.
		var connectedSockets = [];

		wsServer.addEventListener('request', function(req) {
			console.log('Client connected');
			var socket = req.accept();
			connectedSockets.push(socket);

			// When a message is received on one socket, rebroadcast it on all
			// connected sockets.
			var buff = "";
			socket.addEventListener('message', function(e) {
				if (e.data == ">PAUSE") {
					socket.send("DATA");
					//setvalue("engcode",buff);
				} else
				if (e.data == ">FINISH") {
					socket.send("OK");
					setvalue("engcode", buff);
					buff = "";
				} else
				if (e.data == ">REVECTOR") {
					text1 = gcodetoText1(buff);
					refreshgcode();
					buff = "";
				} else
				if (e.data == ">REVECTOR2") {
					text1 = pathstoText1(buff);
					refreshgcode();
					buff = "";
				} else {

					buff += e.data;
				}
			});

			// When a socket is closed, remove it from the list of connected sockets.
			socket.addEventListener('close', function() {
				console.log('Client disconnected');
				for (var i = 0; i < connectedSockets.length; i++) {
					if (connectedSockets[i] == socket) {
						connectedSockets.splice(i, 1);
						break;
					}
				}
			});
			socket.send("DATA");
			return true;
		});
		server.listen(port);
		isServer = true;

	} else $("alert1").innerHTML = "ScServer Error";
}

function mixColor(rgb1,rgb2,ratio){
	return [ratio*rgb1[0]+(1-ratio)*rgb2[0],
			ratio*rgb1[1]+(1-ratio)*rgb2[1],
			ratio*rgb1[2]+(1-ratio)*rgb2[2]];
}
function rgbToHex(rgb){
	if (rgb[0]>1)rgb[0]=1;
	if (rgb[1]>1)rgb[1]=1;
	if (rgb[2]>1)rgb[2]=1;
	return "#"+parseInt(rgb[0]*255).toString(16).padStart(2,"0")+
				parseInt(rgb[1]*255).toString(16).padStart(2,"0")+
				parseInt(rgb[2]*255).toString(16).padStart(2,"0");
}

function bestFontColor(el){
	if (typeof(el)=="string"){
		var bcolor=getComputedStyle($(el)).background;
		var srgb=bcolor.match(/\d+/g);
		var rgb= [parseInt(srgb[0])/255.0,
				parseInt(srgb[1])/255.0,
				parseInt(srgb[2])/255.0];
	} else rgb=el;
  // Counting the perceptive luminance
  // human eye favors green color... 
  var a = 1 - (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
  return [a,(a > 0.5)?[1,1,1]:[0,0,0],rgb];
}
function getFontColor(el,el2,el3){
  var f1=bestFontColor(el);	
  var fh2=mixColor(f1[2],(f1[0] > 0.5)?[1,1,1]:[0,0,0],0.6);
  var f2=bestFontColor(fh2);	

  var fh3=mixColor(f1[2],[0.7,0.4,0.2],0.3);
  var f3=bestFontColor(fh3);	

  hdr1CSS.style.background=rgbToHex(fh2);
  hdr1CSS.style.color=rgbToHex(f2[1]);
  hdr2CSS.style.background=rgbToHex(fh3);
  hdr2CSS.style.color=rgbToHex(f3[1]);
  $(el2).style.color=rgbToHex(f1[1]);


  $(el3).style.background="lightblue"; 	
  f4=bestFontColor(el3);	
  var f42=mixColor(f4[2],[1,0.8,0.5],0.6);
  f4=bestFontColor(f42);

  smallWCSS.style.color=rgbToHex(f4[1]);
  smallWCSS.style.background=rgbToHex(f42);
  

  $(el3).style.color=rgbToHex(f1[1]);	
  $(el3).style.background=rgbToHex(f1[2]);	
  document.bgColor=rgbToHex(fh2);

  var fh5=mixColor(f1[2],(f1[0] > 0.5)?[0.3,0.7,1]:[0,0.4,0.6],0.3);
  var f5=bestFontColor(fh5);	

  buttonCSS.style.background=rgbToHex(fh5);
  buttonCSS.style.color=rgbToHex(f5[1]);
}


function resizedisplay(reload=1) {
	var sc = parseFloat(getvalue("zoom1"));
	var tw=parseInt(getComputedStyle($('maintable')).width);
	var gcw=hidd3?600:850;
	var nw = Math.max(100, tw - gcw);
	var v = $('myCanvas1');
	v.width = nw * sc;
	nh = window.innerHeight - 200;
	v.height = nh * sc;
	$('myCanvas1td').width = nw;
	$('myCanvas1div').style.width = nw;
	$('myCanvas1div').style.height = nh;
	if ($("regcodeX").checked) karya_ready = 1;
	if (karya_ready && reload) refreshgcode();
	karya_ready = 1;

}
window.onresize = function() {
	setTimeout(resizedisplay, 600);
}



setTimeout(function() {
	//var h=window.location.host;
	//a = document.activeElement;
	//if ((a.tagName == "DIV") && (stotype == 1)) a.remove();
	//if (h)setvalue("wsip",h);
	startserver();
	window.onresize();
	//if (text1) refreshgcode();

	hideId("gcodepreview");
	hideId("gcodeinit");
	karya_ready = 0;
}, 2000);

setclick("btzoom", window.onresize);

var jobcnt = 0;
var jobs = [];

function updatedownloadprofile() {
	var element = $("downloadprofile");
	element.setAttribute('download', "profiles.prf");
	element.href = window.URL.createObjectURL(new Blob([JSON.stringify(jobsettings)], {
		type: 'text/csv'
	}));	
}

function updatedownload() {
	var element = $("download");
	element.setAttribute('download', "gcode.nc");
	element.href = window.URL.createObjectURL(new Blob([startgcode+";JOB\n" + jobs.join("\n;JOB\n")+ finishgcode], {
		type: 'text/csv'
	}));	
}
function updatedownload2() {
	var element = $("download2");
	element.setAttribute('download', "gcode.nc");
	element.href = window.URL.createObjectURL(new Blob([startgcode+"\n"+getvalue("engcode") + "\n" + getvalue("gcode") + finishgcode], {
		type: 'text/csv'
	}));	
}
setclick("btjob1", function() {
	jobcnt++;
	jobs.push(getvalue("gcode"));
	$("jobinfo").innerHTML = jobcnt + " JOBS";
	updatedownload();
});
setclick("btjob2", function() {
	jobcnt++;
	jobs.push(getvalue("engcode"));
	$("jobinfo").innerHTML = jobcnt + " JOBS";
	updatedownload();
});
setclick("btjob3", function() {
	jobcnt = 0;
	jobs = [];
	$("jobinfo").innerHTML = jobcnt + " JOBS";
	updatedownload();
});
setclick("btjob4", function() {
	executegcodes(jobs.join("\n"));
});

window.addEventListener('DOMContentLoaded', (event) => {
	//karya_ready=1;
});

var editorgcode = ace.edit("gcode");
//editorgcode.setReadOnly(true);
editorgcode.session.setMode("ace/mode/gcode");
editorgcode.renderer.setShowGutter(false);
var editorengcode = ace.edit("engcode");
//editorengcode.setReadOnly(true);
editorengcode.session.setMode("ace/mode/gcode");
editorengcode.renderer.setShowGutter(false);
//idleloop();

var sheet = window.document.styleSheets[0];
i = sheet.insertRule('.notsimple { display: none; }', sheet.cssRules.length);
var notsimpleCSS = sheet.cssRules[i];
i = sheet.insertRule('.notlaser {  }', sheet.cssRules.length);
var notlaserCSS = sheet.cssRules[i];
i = sheet.insertRule('.notcnc {  }', sheet.cssRules.length);
var notcncCSS = sheet.cssRules[i];
i = sheet.insertRule('.notplasma {  }', sheet.cssRules.length);
var notplasmaCSS = sheet.cssRules[i];
i = sheet.insertRule('.isConnected {display:none  }', sheet.cssRules.length);
var isConnectedCSS = sheet.cssRules[i];
i = sheet.insertRule('.mustCOM {' + (hasCOM ? "" : "display:none") + '  }', sheet.cssRules.length);
var ismustCOMCSS = sheet.cssRules[i];
i = sheet.insertRule('.hdr1 { background:lime; }', sheet.cssRules.length);
var hdr1CSS = sheet.cssRules[i];
i = sheet.insertRule('.hdr2 { background:chocolate; }', sheet.cssRules.length);
var hdr2CSS = sheet.cssRules[i];
i = sheet.insertRule('button {border-radius:6px;margin:1px}', sheet.cssRules.length);
var buttonCSS = sheet.cssRules[i];

i = sheet.insertRule('.smallwindow {	text-align:  right;background: cyan;display:none;position:absolute;border:1px solid black;border-radius:5px;box-shadow: 2px 4px 10px rgba(0,0,0,0.5);padding:5px;z-index:1000;}', sheet.cssRules.length);
var smallWCSS = sheet.cssRules[i];

setevent("change", "wmode", updatewmode);
modechange(1);
