#!/usr/bin/env python
"""
Modified by Ryan widi saputra 2019-2020, reduce lots of code and leave important in the karyacnc javascript
Modified by Jay Johnson 2015, J Tech Photonics, Inc., jtechphotonics.com
modified by Adam Polak 2014, polakiumengineering.org

based on Copyright (C) 2009 Nick Drobchenko, nick@cnc-club.ru
based on gcode.py (C) 2007 hugomatic...
based on addnodes.py (C) 2005,2007 Aaron Spike, aaron@ekips.org
based on dots.py (C) 2005 Aaron Spike, aaron@ekips.org
based on interp.py (C) 2005 Aaron Spike, aaron@ekips.org
based on bezmisc.py (C) 2005 Aaron Spike, aaron@ekips.org
based on cubicsuperpath.py (C) 2005 Aaron Spike, aaron@ekips.org

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
"""

import inkex, cspsubdiv
from inkex.transforms import Transform, BoundingBox, cubic_extrema
from inkex.paths import Path

import os
import math


################################################################################
###
###        Styles and additional parameters
###
################################################################################

math.pi2 = math.pi*2
straight_tolerance = 0.0001
straight_distance_tolerance = 0.0001
engraving_tolerance = 0.0001
loft_lengths_tolerance = 0.0000001
options = {}
defaults = {
'header': """
G90
""",
'footer': """;G1 X0 Y0

"""
}

intersection_recursion_depth = 10
intersection_tolerance = 0.00001




################################################################################
###        print_ prints any arguments into specified log file
################################################################################

def print_(*arg):
    f = open(options.log_filename,"a")
    for s in arg :
        s = str(unicode(s).encode('unicode_escape'))+" "
        f.write( s )
    f.write("\n")
    f.close()



################################################################################
###
###        Gcodetools class
###
################################################################################

class laser_gcode(inkex.Effect):

      
    def export_path(self,paths,xmin,ymin):
        f=0
        if (self.options.directory!="") :
            f = open(self.options.directory+self.options.file, "w")
        gcodes=[]
        for pp in paths:
            style=pp[0]
            ss="P:"+style["fill:"]+":"+style["stroke:"]+":"+style["stroke-width:"]+"\n"
            #f.write(ss)
            for p in pp[1]:
                s=str(p[0]-xmin)+","+str(p[1]-ymin)+"\n"
                ss+=s
            ss+="\n"
            gcodes.append(ss)    
            if (f):f.write(ss)
        if (f):f.close()
        #return
        if self.options.karyacnc:
            import socket
            def get_ip():
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                try:
                    # doesn't even have to be reachable
                    s.connect(('10.255.255.255', 1))
                    IP = s.getsockname()[0]
                except Exception:
                    IP = '127.0.0.1'
                finally:
                    s.close()
                return IP                    
            # make connection attempt
            from websocket import create_connection
            kip=self.options.karyaws
            ip=get_ip().split('.');
            if (kip[0]==';' or kip==''):
                kip="127.0.0.1"
            else:
                kip=ip[0]+"."+ip[1]+"."+ip[2]+"."+kip
            try:    
                ws = create_connection("ws://"+kip+":"+self.options.port+"/",3000)
                for g in gcodes:
                    ws.send(g)
                ws.send(">REVECTOR2")
            finally:
                ws.close() 
                del ws       

    def __init__(self):
        inkex.Effect.__init__(self)
        self.karyacnc=""
        self.arg_parser.add_argument("--directory",type=str,default="",help="Output directory")
        self.arg_parser.add_argument("--filename",type=str,default="output.gcode",help="File name")
        self.arg_parser.add_argument("--karyaws",type=str,default=";a",help="File name")
        self.arg_parser.add_argument("--karyacnc",type=inkex.Boolean,default=True,help="Send to karyacnc")        
        self.arg_parser.add_argument("--flatten",type=float,default="0.1",help="Flatten resolution")
        self.arg_parser.add_argument("--port",type=str,default="8888",help="Karyacnc port")


    def get_transforms(self,g):
        root = self.document.getroot()
        trans = None
        while (g!=root):
            if 'transform' in g.keys():
                t = Transform(g.get('transform'))
                trans = (t*trans) if trans else t
            g=g.getparent()
        return trans


    def apply_transforms(self,g,csp):
        trans = self.get_transforms(g)
        return Path(csp).transform(trans).to_superpath() if trans else csp


    


################################################################################
###        Errors handling function, notes are just printed into Logfile,
###        warnings are printed into log file and warning message is displayed but
###        extension continues working, errors causes log and execution is halted
###        Notes, warnings adn errors could be assigned to space or comma or dot
###        sepparated strings (case is ignoreg).
################################################################################
    def error(self, s, type_= "Warning"):
        ## do nothing
        return



################################################################################
###
###        Get Gcodetools info from the svg
###
################################################################################
    def get_info(self):
        self.selected_paths = {}
        #self.paths = {}
        self.images= {}
        self.orientation_points = {}
        self.layers = [self.document.getroot()]
        self.Zcoordinates = {}
        self.transform_matrix = {}
        self.transform_matrix_reverse = {}
        self.Zauto_scale = {}

        def recursive_search(g, layer, selected=False):
            items = g.getchildren()
            items.reverse()
            for i in items:
                if selected:
                    self.svg.selected[i.get("id")] = i
                    
                if i.tag == inkex.addNS("g",'svg') and i.get(inkex.addNS('groupmode','inkscape')) == 'layer':
                    self.layers += [i]
                    recursive_search(i,i)
                elif i.get("karyacnc") == "1":
                    #
                    if i.get("id") in self.svg.selected :
                        if i.text:self.karyacnc=i.text
                        else:self.karyacnc=i.getchildren()[0].text
                elif i.tag == inkex.addNS('image','svg'):
                    # ryan if "gcodetools"  not in i.keys() :
                    if i.get("id") in self.svg.selected :
                        self.images += [i];
                elif i.tag == inkex.addNS('path','svg'):
                    # ryan if "gcodetools"  not in i.keys() :
                    #self.paths[layer] = self.paths[layer] + [i] if layer in self.paths else [i]
                    if i.get("id") in self.svg.selected :
                        self.selected_paths[layer] = self.selected_paths[layer] + [i] if layer in self.selected_paths else [i]
                elif i.tag == inkex.addNS("g",'svg'):
                    recursive_search(i,layer, (i.get("id") in self.svg.selected) )
                elif i.get("id") in self.svg.selected :
                    # try convert to path
                    if i.get("id") in self.svg.selected :
                        self.selected_paths[layer] = self.selected_paths[layer] + [i] if layer in self.selected_paths else [i]
                    #self.error(_("This extension works with Paths and Dynamic Offsets and groups of them only! All other objects will be ignored!\nSolution 1: press Path->Object to path or Shift+Ctrl+C.\nSolution 2: Path->Dynamic offset or Ctrl+J.\nSolution 3: export all contours to PostScript level 2 (File->Save As->.ps) and File->Import this file."),"selection_contains_objects_that_are_not_paths")


        recursive_search(self.document.getroot(),self.document.getroot())


################################################################################
###
###        Laser
###
################################################################################
    def laser(self) :
        gcode=""
        if (self.karyacnc):gcode = ";KARYACNC,"+self.karyacnc+"\n"
        
        getstyles=('fill:','stroke:','stroke-width:')
        def getStyles(node):
            res={"fill:":"#ffffff","stroke:":"#000000","stroke-width:":"0","deep:":0,"repeat:":0}
            #if 'deep' in node.attrib:
            res['deep:']=node.get('deep')
            res['repeat:']=node.get('repeat')
            if 'style' in node.attrib:
                style=node.get('style') # fixme: this will break for presentation attributes!
                if style!='':
                    #inkex.debug('old style:'+style)
                    styles=style.split(';')
                    for i in range(len(styles)):
                        for st in getstyles:
                            if styles[i].startswith(st):
                                res[st]=styles[i][len(st):]
            
            return res

        
        if self.selected_paths == {} :
            paths=[]
            self.error(_("No paths are selected! Trying to work on all available paths."),"warning")
        else :
            paths = self.selected_paths

        kpaths=[]
        xmin=100000
        ymin=100000
        for layer in self.layers :
            if layer in paths :
                print_(("layer",layer))
                p = []
                pc= []
                flips=[]
                for path in paths[layer] :
                    pstyle=getStyles(path)
                    col=pstyle["fill:"]
                    xpath=path.to_path_element()
                    if "d" not in xpath.keys() :
                        self.error(_("Warning: One or more paths dont have 'd' parameter, try to Ungroup (Ctrl+Shift+G) and Object to Path (Ctrl+Shift+C)!"),"selection_contains_objects_that_are_not_paths")
                        continue

                    from inkex.paths import CubicSuperPath
                    d = xpath.get('d')
                    csp1 = CubicSuperPath(d)      
                    csp1 = self.apply_transforms(path, csp1)
                    #Ryan modification
                    # flatten if contain BICUBIC or ARC
                    if (d.find("A")>=0 or d.find("C")>=0 or d.find("Q")>=0 or d.find("a")>=0 or d.find("c")>=0 or d.find("q")>=0):
                        inkex.bezier.cspsubdiv(csp1, self.options.flatten*0.5)
                           
                    np = []

                    for sp in csp1:
                        first = True
                        num=len(sp)
                        #gcode+=";"+str(cw)+"\n"
                        sum=0
                        ln=0
                        kpath=[]
                        for icsp in range(num):
                            csp=sp[icsp]
                            kpath.append((csp[1][0],csp[1][1]))
                            xmin=min(xmin,csp[1][0])
                            ymin=min(ymin,csp[1][1])
                            
                        kpaths.append((pstyle,kpath))
                        
        self.export_path(kpaths,xmin,ymin)



################################################################################
###
###        Effect
###
###        Main function of Gcodetools class
###
################################################################################
    def effect(self) :
        global options
        options = self.options
        options.self = self
        options.doc_root = self.document.getroot()
        # define print_ function
        global print_
        print_  = lambda *x : None
        self.get_info()

        self.laser()

e = laser_gcode()
e.run()
