var ZValues; // must be 2D arrays
function InitMesh(w,x1,y1,x2,y2){
	if (w<2)w=2;
	dx=x2/(w-1);
	dy=y2/(w-1);
	var r0=[0];
	/* w= 3
	   x2= 10
	   dx = 10/(3-1) = 5
	   v = 0 5 10
	   
	*/
	for (var j=0;j<w;j++){
		r0.push(j*dy+y1);
	}
	ZValues=[r0];
	
	for (var i=0;i<w;i++){
		var r1=[i*dx+x1];
		for (var j=0;j<w;j++){
			r1.push(0);
		}
		ZValues.push(r1);
	}
}

function StoreMesh(x,y,v){
	ZValues[x+1][y+1]=v;
}

function Interpolizer(X, Y) {

	//Z Values Range
	var X0Y0 = 0;
	var X0Y1 =0;
	var X1Y0 =0;
	var X1Y1 =0;

	//X and Y Ranges
	var X0 =0;
	var X1=0;
	var Y0=0;
	var Y1=0;

	//Indexes
	var X0i =0;
	var X1i =0;
	var Y0i =0;
	var Y1i =0;
	var Xmax = ZValues.length;
	var Ymax = ZValues[0].length;


	//Interpolated values
	XMY0 = 0; //Interpolated Z from X at  Y0
	XMY1 = 0; //Interpolated Z from X at Y1
	XMYM = 0; //Interpolated Z from X and Y (result)

	//Check the boundary 
	if(X>ZValues[Xmax-1][0] || X<ZValues[1][0] || Y<ZValues[0][1] || Y>ZValues[0][Ymax-1]) return ZValues;
	//Load the table data into the variables
	for (var i=1; i<Xmax-1;i++) {
		
		if(ZValues[i][0] == X) X0i = i;
		else if(ZValues[i+1][0] == X) X1i = i+1;

		if(X>= ZValues[i][0] && X<= ZValues[i+1][0]) {
			X0i = i;
			X1i = i+1;
		}
	}

	for (var i=1; i<=Ymax-1;i++){
		
		if(ZValues[0][i] == Y) Y0i = i;
		else if(ZValues[0][i+1] == Y) Y1i = i+1;
		else if(Y>= ZValues[0][i] && Y<= ZValues[0][i+1]) {
			Y0i = i;
			Y1i = i+1;
		}		
	}
	

	X0 = ZValues[X0i][0];
	X1 = ZValues[X1i][0];
	Y0 = ZValues[0][Y0i];
	Y1 = ZValues[0][Y1i];
	X0Y0 = ZValues[X0i][Y0i];
	X0Y1 = ZValues[X0i][Y1i];
	X1Y0 = ZValues[X1i][Y0i];
	X1Y1 = ZValues[X1i][Y1i];
	
	//Performs the calculations

	//X is on the lower edge, no interpolation needed
	if(X==X0) {
		XMY0 = X0Y0; 
		XMY1 = X0Y1;
	}
	//X is on the higher edge, no interpolation needed
	else if(X==X1) {
		XMY0 = X1Y0;
		XMY1 = X1Y1;
	}
	//X is between the higher and lower edges, interpolation needed
	else {
		XMY0 = X0Y0 + (X-X0)*(X1Y0-X0Y0)/(X1-X0);
		XMY1 = X0Y1 + (X-X0)*(X1Y1-X0Y1)/(X1-X0);
	}

	//Y is on the lower edge, no interpolation needed
	if(Y==Y0) {
		return  XMY0;
	}
	//Y is on the higher edge, no interpolation needed
	else if(Y==Y1) {
		return  XMY1; 
		
	}
	//Y is between the higher and lower edges, interpolation needed
	else {
		return XMY0 + (Y-Y0)*(XMY1-XMY0)/(Y1-Y0);
	}

	//Not valid data was found for the proper interpolation
	if(isNaN(XMYM)) 
	{
		return ZValues;
	}
	else return XMYM;
}

