import os
import re

def fix_css_loading(directory):
    # Regular expression to find the problematic preload tags
    # Handle both single and double quotes, and potential line breaks within the tag
    pattern = re.compile(r'<link([^>]+)rel="preload"([^>]+)as="style"([^>]+)onload="this\.onload=null;this\.rel=\'stylesheet\'"([^>]*?)>', re.IGNORECASE | re.DOTALL)
    
    # Another variation found in grep
    pattern2 = re.compile(r'<link([^>]+)rel=\"preload\"([^>]+)as=\"style\"([^>]+)onload=\"this\.onload=null;this\.rel=\'stylesheet\'\"([^>]*?)>', re.IGNORECASE | re.DOTALL)

    for root, dirs, files in os.walk(directory):
        if '.git' in dirs:
            dirs.remove('.git')
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
            
        for file in files:
            if file.endswith('.html'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    # Replace pattern 1
                    new_content = pattern.sub(r'<link\1rel="stylesheet"\2\3\4>', new_content)
                    # Replace pattern 2
                    new_content = pattern2.sub(r'<link\1rel="stylesheet"\2\3\4>', new_content)
                    
                    # Also handle the noscript tag if it exists right after
                    new_content = re.sub(r'<link([^>]+)rel="stylesheet"([^>]+)>\s*<noscript><link rel="stylesheet"([^>]+)></noscript>', r'<link\1rel="stylesheet"\2>', new_content)

                    if new_content != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed: {path}")
                except Exception as e:
                    print(f"Error processing {path}: {e}")

if __name__ == "__main__":
    base_dir = r'c:\Users\pavel\OneDrive\Desktop\MystickaHvezda'
    fix_css_loading(base_dir)
