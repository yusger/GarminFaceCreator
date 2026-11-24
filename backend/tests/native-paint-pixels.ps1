param([Parameter(Mandatory=$true)][string]$Screenshot,[Parameter(Mandatory=$true)][int]$OriginX,[Parameter(Mandatory=$true)][int]$OriginY)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$bitmap=[System.Drawing.Bitmap]::new($Screenshot)
try {
 $samples=@(@('opaque white',227,210,245,255,245,255,245,255),@('red half alpha',140,150,245,255,115,140,115,140),@('black half alpha',290,150,115,140,115,140,115,140),@('blue fill',150,275,0,12,55,80,245,255),@('independent white stroke',125,275,245,255,245,255,245,255),@('white meter lit',259,237,245,255,245,255,245,255),@('white meter dim',349,237,60,95,60,95,60,95))
 foreach($s in $samples){$pixel=$bitmap.GetPixel($OriginX+[int]$s[1],$OriginY+[int]$s[2]);if($pixel.R -lt $s[3] -or $pixel.R -gt $s[4] -or $pixel.G -lt $s[5] -or $pixel.G -gt $s[6] -or $pixel.B -lt $s[7] -or $pixel.B -gt $s[8]){throw ('Native pixel mismatch: '+$s[0]+' RGB='+$pixel.R+','+$pixel.G+','+$pixel.B)};Write-Output ('PASS '+$s[0]+' RGB='+$pixel.R+','+$pixel.G+','+$pixel.B)}
} finally {$bitmap.Dispose()}
