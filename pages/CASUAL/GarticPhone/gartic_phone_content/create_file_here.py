# importing os module
import os
import glob
from PIL import Image

# Directory
print('Enter the folder name')
directory = input()
  
# Parent Directory path
parent_dir = "./"

# Path
path = os.path.join(parent_dir, directory)

os.mkdir(path)
print("Directory '%s' created" % directory)

os.chdir(directory)
for i in range (1,6):
    os.mkdir("Round " + str(i))
    os.chdir("Round " + str(i))
    os.mkdir("assets")
    os.chdir("assets")
    print('Please input the first series of gifs into Round' + str(i) + 's assets')
    print('\nWhen you are ready, press any key to continue.')
    os.system("pause")
    # Count and create multiple folders
    count = 0
    for file in glob.glob("*.gif"):
        count += 1
        os.mkdir(str(count))

    # Rename gif
    count = 0
    for file in glob.glob("*.gif"):
        count += 1
        old_name = file
        new_name = str(count) + "/album.gif"
        os.rename(old_name, new_name)
        os.chdir(str(count))
        im = Image.open('album.gif')
        for frame in range (0, im.n_frames):
            im.seek(frame)
            im.save('frame_' + str("%02d" % (frame+1)) + '.png')
        os.chdir("../")
        
    os.chdir("../../")