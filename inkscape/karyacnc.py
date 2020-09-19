#!/usr/bin/env python
"""
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

import inkex, simplestyle, simplepath, cspsubdiv
import cubicsuperpath, simpletransform, bezmisc
import httplib
import os
import math
import bezmisc
import re
import copy
import sys
import time
import cmath
import codecs
import random
import gettext
_ = gettext.gettext


### Check if inkex has errormsg (0.46 version doesnot have one.) Could be removed later.
if "errormsg" not in dir(inkex):
    inkex.errormsg = lambda msg: sys.stderr.write((unicode(msg) + "\n").encode("UTF-8"))

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
###    Some vector functions
################################################################################

def normalize((x,y)) :
    l = math.sqrt(x**2+y**2)
    if l == 0 : return [0.,0.]
    else :         return [x/l, y/l]


def cross(a,b) :
    return a[1] * b[0] - a[0] * b[1]


def dot(a,b) :
    return a[0] * b[0] + a[1] * b[1]


def rotate_ccw(d) :
    return [-d[1],d[0]]


def vectors_ccw(a,b):
    return a[0]*b[1]-b[0]*a[1] < 0


def vector_from_to_length(a,b):
    return math.sqrt((a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]))

################################################################################
###    Common functions
################################################################################

def matrix_mul(a,b) :
    return [ [ sum([a[i][k]*b[k][j] for k in range(len(a[0])) ])   for j in range(len(b[0]))]   for i in range(len(a))]
    try :
        return [ [ sum([a[i][k]*b[k][j] for k in range(len(a[0])) ])   for j in range(len(b[0]))]   for i in range(len(a))]
    except :
        return None


def transpose(a) :
    try :
        return [ [ a[i][j] for i in range(len(a)) ] for j in range(len(a[0])) ]
    except :
        return None


def det_3x3(a):
    return  float(
        a[0][0]*a[1][1]*a[2][2] + a[0][1]*a[1][2]*a[2][0] + a[1][0]*a[2][1]*a[0][2]
        - a[0][2]*a[1][1]*a[2][0] - a[0][0]*a[2][1]*a[1][2] - a[0][1]*a[2][2]*a[1][0]
        )


def inv_3x3(a): # invert matrix 3x3
    det = det_3x3(a)
    if det==0: return None
    return    [
        [  (a[1][1]*a[2][2] - a[2][1]*a[1][2])/det,  -(a[0][1]*a[2][2] - a[2][1]*a[0][2])/det,  (a[0][1]*a[1][2] - a[1][1]*a[0][2])/det ],
        [ -(a[1][0]*a[2][2] - a[2][0]*a[1][2])/det,   (a[0][0]*a[2][2] - a[2][0]*a[0][2])/det, -(a[0][0]*a[1][2] - a[1][0]*a[0][2])/det ],
        [  (a[1][0]*a[2][1] - a[2][0]*a[1][1])/det,  -(a[0][0]*a[2][1] - a[2][0]*a[0][1])/det,  (a[0][0]*a[1][1] - a[1][0]*a[0][1])/det ]
    ]


def inv_2x2(a): # invert matrix 2x2
    det = a[0][0]*a[1][1] - a[1][0]*a[0][1]
    if det==0: return None
    return [
            [a[1][1]/det, -a[0][1]/det],
            [-a[1][0]/det, a[0][0]/det]
            ]


def small(a) :
    global small_tolerance
    return abs(a)<small_tolerance


def atan2(*arg):
    if len(arg)==1 and ( type(arg[0]) == type([0.,0.]) or type(arg[0])==type((0.,0.)) ) :
        return (math.pi/2 - math.atan2(arg[0][0], arg[0][1]) ) % math.pi2
    elif len(arg)==2 :

        return (math.pi/2 - math.atan2(arg[0],arg[1]) ) % math.pi2
    else :
        raise ValueError, "Bad argumets for atan! (%s)" % arg


def draw_text(text,x,y,style = None, font_size = 20) :
    if style == None :
        style = "font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;fill:#000000;fill-opacity:1;stroke:none;deep:0"
    style += "font-size:%fpx;"%font_size
    t = inkex.etree.SubElement(    options.doc_root, inkex.addNS('text','svg'), {
                            'x':    str(x),
                            inkex.addNS("space","xml"):"preserve",
                            'y':    str(y)
                        })
    text = str(text).split("\n")
    for s in text :
        span = inkex.etree.SubElement( t, inkex.addNS('tspan','svg'),
                        {
                            'x':    str(x),
                            'y':    str(+y),
                            inkex.addNS("role","sodipodi"):"line",
                        })
        y += font_size
        span.text = s


def draw_pointer(x,color = "#f00", figure = "cross", comment = "", width = .1) :
    if figure ==  "line" :
        s = ""
        for i in range(1,len(x)/2) :
            s+= " %s, %s " %(x[i*2],x[i*2+1])
        inkex.etree.SubElement( options.doc_root, inkex.addNS('path','svg'), {"d": "M %s,%s L %s"%(x[0],x[1],s), "style":"fill:none;stroke:%s;stroke-width:%f;"%(color,width),"comment":str(comment)} )
    else :
        inkex.etree.SubElement( options.doc_root, inkex.addNS('path','svg'), {"d": "m %s,%s l 10,10 -20,-20 10,10 -10,10, 20,-20"%(x[0],x[1]), "style":"fill:none;stroke:%s;stroke-width:%f;"%(color,width),"comment":str(comment)} )



def isnan(x): return type(x) is float and x != x

def isinf(x): inf = 1e5000; return x == inf or x == -inf

def between(c,x,y):
        return x-straight_tolerance<=c<=y+straight_tolerance or y-straight_tolerance<=c<=x+straight_tolerance



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
###        Point (x,y) operations
################################################################################
class P:
    def __init__(self, x, y=None):
        if not y==None:
            self.x, self.y = float(x), float(y)
        else:
            self.x, self.y = float(x[0]), float(x[1])
    def __add__(self, other): return P(self.x + other.x, self.y + other.y)
    def __sub__(self, other): return P(self.x - other.x, self.y - other.y)
    def __neg__(self): return P(-self.x, -self.y)
    def __mul__(self, other):
        if isinstance(other, P):
            return self.x * other.x + self.y * other.y
        return P(self.x * other, self.y * other)
    __rmul__ = __mul__
    def __div__(self, other): return P(self.x / other, self.y / other)
    def mag(self): return math.hypot(self.x, self.y)
    def unit(self):
        h = self.mag()
        if h: return self / h
        else: return P(0,0)
    def dot(self, other): return self.x * other.x + self.y * other.y
    def rot(self, theta):
        c = math.cos(theta)
        s = math.sin(theta)
        return P(self.x * c - self.y * s,  self.x * s + self.y * c)
    def angle(self): return math.atan2(self.y, self.x)
    def __repr__(self): return '%f,%f' % (self.x, self.y)
    def pr(self): return "%.2f,%.2f" % (self.x, self.y)
    def to_list(self): return [self.x, self.y]
    def ccw(self): return P(-self.y,self.x)
    def l2(self): return self.x*self.x + self.y*self.y



################################################################################
###
###        Biarc function
###
###        Calculates biarc approximation of cubic super path segment
###        splits segment if needed or approximates it with straight line
###
################################################################################
def biarc(sp1, sp2, z1, z2, depth=0):
   return [ [sp1[1],'line', 0, 0, sp2[1], [z1,z2]] ]


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
                kip="localhost"
            else:
                kip=ip[0]+"."+ip[1]+"."+ip[2]+"."+kip
            ws = create_connection("ws://"+kip+":"+self.options.port+"/")
            for g in gcodes:
                ws.send(g)
            ws.send(">REVECTOR2");
            ws.close()        

    def __init__(self):
        inkex.Effect.__init__(self)
        self.karyacnc=""
        self.OptionParser.add_option("-d", "--directory",                       action="store", type="string",          dest="directory",                           default="",                             help="Output directory")
        self.OptionParser.add_option("-f", "--filename",                        action="store", type="string",          dest="file",                                default="output.gcode",                 help="File name")
        self.OptionParser.add_option("", "--karyaws",                         action="store", type="string",          dest="karyaws",                             default="localhost",                 help="File name")
        self.OptionParser.add_option("",   "--add-numeric-suffix-to-filename",  action="store", type="inkbool",         dest="add_numeric_suffix_to_filename",      default=False,                          help="Add numeric suffix to file name")
        self.OptionParser.add_option("",   "--laser-command",                   action="store", type="string",          dest="laser_command",                       default="M03",                          help="Laser gcode command")
        self.OptionParser.add_option("",   "--laser-off-command",               action="store", type="string",          dest="laser_off_command",                   default="M05",                          help="Laser gcode end command")
        self.OptionParser.add_option("",   "--laser-speed",                     action="store", type="int",             dest="laser_speed",                         default="750",                          help="Laser speed (mm/min)")
        self.OptionParser.add_option("",   "--karyacnc",                        action="store", type="inkbool",         dest="karyacnc",                            default=True,                           help="Send to karyacnc")        
        self.OptionParser.add_option("",   "--flatten",                         action="store", type="float",           dest="flatten",                             default="0.05",                            help="Flatten resolution")
        self.OptionParser.add_option("",   "--travel-speed",                    action="store", type="string",          dest="travel_speed",                        default="3000",                         help="Travel speed (mm/min)")
        self.OptionParser.add_option("",   "--laser-power",                     action="store", type="int",             dest="laser_power",                         default="255",                          help="S# is 256 or 10000 for full power")
        self.OptionParser.add_option("",   "--passes",                          action="store", type="int",             dest="passes",                              default="1",                            help="Quantity of passes")
        self.OptionParser.add_option("",   "--pass-depth",                      action="store", type="string",          dest="pass_depth",                          default="1",                            help="Depth of laser cut")
        self.OptionParser.add_option("",   "--power-delay",                     action="store", type="string",          dest="power_delay",                         default="0",                             help="Laser power-on delay (ms)")
        self.OptionParser.add_option("",   "--suppress-all-messages",           action="store", type="inkbool",         dest="suppress_all_messages",               default=True,                           help="Hide messages during g-code generation")
        self.OptionParser.add_option("",   "--create-log",                      action="store", type="inkbool",         dest="log_create_log",                      default=False,                          help="Create log files")
        self.OptionParser.add_option("",   "--log-filename",                    action="store", type="string",          dest="log_filename",                        default='',                             help="Create log files")
        self.OptionParser.add_option("",   "--engraving-draw-calculation-paths",action="store", type="inkbool",         dest="engraving_draw_calculation_paths",    default=False,                          help="Draw additional graphics to debug engraving path")
        self.OptionParser.add_option("",   "--unit",                            action="store", type="string",          dest="unit",                                default="G21 (All units in mm)",        help="Units either mm or inches")
        self.OptionParser.add_option("",   "--port",                            action="store", type="string",          dest="port",                                default="8888",        help="Websocket port")
        self.OptionParser.add_option("",   "--active-tab",                      action="store", type="string",          dest="active_tab",                          default="",                             help="Defines which tab is active")
        self.OptionParser.add_option("",   "--biarc-max-split-depth",           action="store", type="int",             dest="biarc_max_split_depth",               default="4",                            help="Defines maximum depth of splitting while approximating using biarcs.")
    
    def check_dir(self):
        if self.options.directory[-1] not in ["/","\\"]:
            if "\\" in self.options.directory :
                self.options.directory += "\\"
            else :
                self.options.directory += "/"
        print_("Checking direcrory: '%s'"%self.options.directory)
        if (os.path.isdir(self.options.directory)):
            if (os.path.isfile(self.options.directory+'header')):
                f = open(self.options.directory+'header', 'r')
                self.header = f.read()
                f.close()
            else:
                self.header = defaults['header']
            if (os.path.isfile(self.options.directory+'footer')):
                f = open(self.options.directory+'footer','r')
                self.footer = f.read()
                f.close()
            else:
                self.footer = defaults['footer']

            if self.options.unit == "G21 (All units in mm)" :
                self.header += "G21\n"
            elif self.options.unit == "G20 (All units in inches)" :
                self.header += "G20\n"
        else:
            self.error(_("Directory does not exist! Please specify existing directory at options tab!"),"error")
            return False

        if self.options.add_numeric_suffix_to_filename :
            dir_list = os.listdir(self.options.directory)
            if "." in self.options.file :
                r = re.match(r"^(.*)(\..*)$",self.options.file)
                ext = r.group(2)
                name = r.group(1)
            else:
                ext = ""
                name = self.options.file
            max_n = 0
            for s in dir_list :
                r = re.match(r"^%s_0*(\d+)%s$"%(re.escape(name),re.escape(ext) ), s)
                if r :
                    max_n = max(max_n,int(r.group(1)))
            filename = name + "_" + ( "0"*(4-len(str(max_n+1))) + str(max_n+1) ) + ext
            self.options.file = filename

        print_("Testing writing rights on '%s'"%(self.options.directory+self.options.file))
        try:
            f = open(self.options.directory+self.options.file, "w")
            f.close()
        except:
            self.error(_("Can not write to specified file!\n%s"%(self.options.directory+self.options.file)),"error")
            return False
        return True





    def get_transforms(self,g):
        root = self.document.getroot()
        trans = []
        while (g!=root):
            if 'transform' in g.keys():
                t = g.get('transform')
                t = simpletransform.parseTransform(t)
                trans = simpletransform.composeTransform(t,trans) if trans != [] else t
                print_(trans)
            g=g.getparent()
        return trans


    def apply_transforms(self,g,csp):
        trans = self.get_transforms(g)
        if trans != []:
            simpletransform.applyTransformToPath(trans, csp)
        return csp


    


################################################################################
###        Errors handling function, notes are just printed into Logfile,
###        warnings are printed into log file and warning message is displayed but
###        extension continues working, errors causes log and execution is halted
###        Notes, warnings adn errors could be assigned to space or comma or dot
###        sepparated strings (case is ignoreg).
################################################################################
    def error(self, s, type_= "Warning"):
        notes = "Note "
        warnings = """
                        Warning tools_warning
                        bad_orientation_points_in_some_layers
                        more_than_one_orientation_point_groups
                        more_than_one_tool
                        orientation_have_not_been_defined
                        tool_have_not_been_defined
                        selection_does_not_contain_paths
                        selection_does_not_contain_paths_will_take_all
                        selection_is_empty_will_comupe_drawing
                        selection_contains_objects_that_are_not_paths
                        """
        errors = """
                        Error
                        wrong_orientation_points
                        area_tools_diameter_error
                        no_tool_error
                        active_layer_already_has_tool
                        active_layer_already_has_orientation_points
                    """
        if type_.lower() in re.split("[\s\n,\.]+", errors.lower()) :
            print_(s)
            inkex.errormsg(s+"\n")
            sys.exit()
        elif type_.lower() in re.split("[\s\n,\.]+", warnings.lower()) :
            print_(s)
            if not self.options.suppress_all_messages :
                inkex.errormsg(s+"\n")
        elif type_.lower() in re.split("[\s\n,\.]+", notes.lower()) :
            print_(s)
        else :
            print_(s)
            inkex.errormsg(s)
            sys.exit()


################################################################################
###        Get defs from svg
################################################################################
    def get_defs(self) :
        self.defs = {}
        def recursive(g) :
            for i in g:
                if i.tag == inkex.addNS("defs","svg") :
                    for j in i:
                        self.defs[j.get("id")] = i
                if i.tag ==inkex.addNS("g",'svg') :
                    recursive(i)
        recursive(self.document.getroot())


################################################################################
###
###        Get Gcodetools info from the svg
###
################################################################################
    def get_info(self):
        self.selected_paths = {}
        self.paths = {}
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
                    self.selected[i.get("id")] = i
                if i.tag == inkex.addNS("g",'svg') and i.get(inkex.addNS('groupmode','inkscape')) == 'layer':
                    self.layers += [i]
                    recursive_search(i,i)
                    """ 
                elif i.get('gcodetools') == "Gcodetools orientation group" :
                    try:
                        points = self.get_orientation_points(i)
                    except:
                        points=None
                        pass
                    if points != None :
                        self.orientation_points[layer] = self.orientation_points[layer]+[points[:]] if layer in self.orientation_points else [points[:]]
                        print_("Found orientation points in '%s' layer: %s" % (layer.get(inkex.addNS('label','inkscape')), points))
                    else :
                        self.error(_("Warning! Found bad orientation points in '%s' layer. Resulting Gcode could be corrupt!") % layer.get(inkex.addNS('label','inkscape')), "bad_orientation_points_in_some_layers")
                    """    
                elif i.get("karyacnc") == "1":
                    #
                    if i.get("id") in self.selected :
                        if i.text:self.karyacnc=i.text
                        else:self.karyacnc=i.getchildren()[0].text
                elif i.tag == inkex.addNS('image','svg'):
                    # ryan if "gcodetools"  not in i.keys() :
                    if i.get("id") in self.selected :
                        self.images += [i];
                elif i.tag == inkex.addNS('path','svg'):
                    # ryan if "gcodetools"  not in i.keys() :
                    self.paths[layer] = self.paths[layer] + [i] if layer in self.paths else [i]
                    if i.get("id") in self.selected :
                        self.selected_paths[layer] = self.selected_paths[layer] + [i] if layer in self.selected_paths else [i]
                elif i.tag == inkex.addNS("g",'svg'):
                    recursive_search(i,layer, (i.get("id") in self.selected) )
                elif i.get("id") in self.selected :
                    self.error(_("This extension works with Paths and Dynamic Offsets and groups of them only! All other objects will be ignored!\nSolution 1: press Path->Object to path or Shift+Ctrl+C.\nSolution 2: Path->Dynamic offset or Ctrl+J.\nSolution 3: export all contours to PostScript level 2 (File->Save As->.ps) and File->Import this file."),"selection_contains_objects_that_are_not_paths")


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

        #self.check_dir()

        print_(("self.layers=",self.layers))
        print_(("paths=",paths))
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
                    print_(str(layer))
                    if "d" not in path.keys() :
                        self.error(_("Warning: One or more paths dont have 'd' parameter, try to Ungroup (Ctrl+Shift+G) and Object to Path (Ctrl+Shift+C)!"),"selection_contains_objects_that_are_not_paths")
                        continue
                    d = path.get('d')
                    pstyle=getStyles(path)
                    col=pstyle["fill:"]
                    csp1 = cubicsuperpath.parsePath(d)#new.get('d'))        
                    csp1 = self.apply_transforms(path, csp1)
                    #Ryan modification
                    # flatten if contain BICUBIC or ARC
                    if (d.find("A")>=0 or d.find("C")>=0 or d.find("Q")>=0 or d.find("a")>=0 or d.find("c")>=0 or d.find("q")>=0):
                        cspsubdiv.cspsubdiv(csp1, self.options.flatten*0.5)
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
        #inkex.errormsg("test")


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
        if self.options.log_create_log :
            try :
                if os.path.isfile(self.options.log_filename) : os.remove(self.options.log_filename)
                f = open(self.options.log_filename,"a")
                f.write("Gcodetools log file.\nStarted at %s.\n%s\n" % (time.strftime("%d.%m.%Y %H:%M:%S"),options.log_filename))
                f.write("%s tab is active.\n" % self.options.active_tab)
                f.close()
            except :
                print_  = lambda *x : None
        else : print_  = lambda *x : None
        self.get_info()
        """
        if self.orientation_points == {} :
            self.error(_("Orientation points have not been defined! A default set of orientation points has been automatically added."),"warning")
            self.orientation( self.layers[min(0,len(self.layers)-1)] )
            self.get_info()

        self.tools = {
            "name": "Laser Engraver",
            "id": "Laser Engraver",
            "penetration feed": self.options.laser_speed,
            "feed": self.options.laser_speed,
            "gcode before path": ("G4 P0 \n" + self.options.laser_command + " S" + str(int(self.options.laser_power)) + "\nG4 P" + self.options.power_delay),
            "gcode after path": ("G4 P0 \n" + self.options.laser_off_command + " S0" + "\n" + "G1 F" + self.options.travel_speed),
        }
        
        self.get_info()
        """
        self.laser()

e = laser_gcode()
e.affect()
