
import os
from PIL import Image

def optimize_hero_image(input_path, output_path):
    try:
        if not os.path.exists(input_path):
            print(f"Error: Input file not found at {input_path}")
            return

        with Image.open(input_path) as img:
            print(f"Input image size: {img.size}")
            
            # Use 'LANCZOS' for high-quality downsampling if resizing is needed
            # Max width 800px is enough for hero image displayed at ~600px
            max_width = 800
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                print(f"Resized to: {img.size}")
            
            print(f"Saving optimized hero image to {output_path}...")
            # Save as WebP with high quality
            img.save(output_path, "WEBP", quality=95, method=6)
            print(f"Success! Saved to {output_path}")
            print(f"Final file size: {os.path.getsize(output_path):,} bytes")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Update paths as needed
    downloads_dir = r"c:\Users\pavel\Downloads"
    project_dir = r"c:\Users\pavel\OneDrive\Desktop\MystickaHvezda"
    
    # Input file name - matching by unique prefix to avoid encoding issues with special characters
    unique_prefix = "Gemini_Generated_Image_2c4m192c4m192c4m"
    input_file = None
    
    for filename in os.listdir(downloads_dir):
        if filename.startswith(unique_prefix) and filename.endswith(".png") and "removebg" not in filename:
            input_file = os.path.join(downloads_dir, filename)
            print(f"Found input file: {filename}")
            break
            
    if not input_file:
        print(f"Error: Could not find file starting with {unique_prefix} in {downloads_dir}")
        exit(1)
    
    # Output file path in project
    output_file = os.path.join(project_dir, "img", "hero-3d.webp")
    
    optimize_hero_image(input_file, output_file)
