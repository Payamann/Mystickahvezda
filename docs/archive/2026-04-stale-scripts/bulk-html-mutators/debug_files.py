
import os

downloads_dir = r"c:\Users\pavel\Downloads"
print(f"Listing files in {downloads_dir}")

for filename in os.listdir(downloads_dir):
    if filename.endswith(".png") or filename.endswith(".jpg"):
        print(f"Found: {repr(filename)}")
