# karyacnc
July 2021: 

Manual book (Indonesia language). Work in progress: https://bit.ly/3BXBtTB

New Feature:
- Make user interface little easier
- Bitmap Heightmap engraving directly from inkscape 1.xx


New feature July 2020:

Manual cutting tab
![image](https://user-images.githubusercontent.com/11457832/87552342-c1d01b00-c6db-11ea-86a2-2b0d69c4205f.png)

Manual movement
![image](https://user-images.githubusercontent.com/11457832/87552592-17a4c300-c6dc-11ea-9578-623ce1e09c8b.png)


Profile load/save
It will save all the settings (all input, checkboxes, combo box)
![image](https://user-images.githubusercontent.com/11457832/87552910-7ff3a480-c6dc-11ea-9baf-0a8a7afbdb55.png)

New warning system, to inform if to much path is lost (for example small text using not to small end mill). it will inform and 
put red color around it

Engraving angle
![image](https://user-images.githubusercontent.com/11457832/87626474-963e4680-c756-11ea-9714-51fbcb09f945.png)

Multiple angle engrave. Angle is configured on the Stroke Green color. The Blue still FF or 80 (half DPI). if green is 0, it will be replaced with configuration on the karyacnc Inkscape Option.

Same angle will be combined, different angle will be overlayd.

![image](https://user-images.githubusercontent.com/11457832/87633729-1ddf8180-c766-11ea-8405-a9c3e7d67878.png)

Laser power (reality is depend on firmware)
![image](https://user-images.githubusercontent.com/11457832/87748344-cef62280-c81f-11ea-99e4-44584591d0d4.png)

Latest karyacontroller support Constant laser burn, its mean that each motor stepper step, it burn only for defined time (microseconds) if the power is less than 100%. Great for marking/ engraving which prevent overburn on corners (when the motor accelerate/decelerate)



New feature until March 2019
- Auto Level for current work area
- Upload GCODE to internal Flash and run it

Inkscape can send path data to karyaCNC

- Install multi karyaCNC on chrome using different path, and can be set to different port (8888,8889...)
- Interpret color stroke and fill as specific operation (raster/carve/engrave, outline, cutting, disable)
- Use stroke width as tool offset
- Path with yellow fill is Inside

Main feature
- Can be use for laser, cnc router, etc
- ToolPath gcode
- Control machine

Software to generate Gcode from Corel by copy selected object and paste on this web app (chrome apps).

![image](https://user-images.githubusercontent.com/11457832/53772382-d1045d80-3f18-11e9-9a1a-220b356dd7da.png)
