cd assets/1
for /l %%x in (1, 1, 12) do (
   cd ../%%x
   ffmpeg -i album.gif -vsync 0 album_%01d.png
)
pause