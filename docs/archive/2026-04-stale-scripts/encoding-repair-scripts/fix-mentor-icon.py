import os

def fix_mentor_icon():
    start_dir = "C:\\Users\\pavel\\OneDrive\\Desktop\\MystickaHvezda"
    
    # We are replacing "âšˇ" which represents the broken icon for Průvodce (Mentor)
    # We'll use 🧭 (Compass) since it fits Průvodce/Mentor
    bad_chars = "âšˇ"
    good_icon = "🧭"
    
    count = 0
    for root, dirs, files in os.walk(start_dir):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
            
        for file in files:
            if file.endswith(".html"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    if bad_chars in content:
                        content = content.replace(bad_chars, good_icon)
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(content)
                        print(f"Fixed {path}")
                        count += 1
                except Exception as e:
                    pass
                    
    print(f"Fixed the Průvodce icon in {count} files.")

if __name__ == "__main__":
    fix_mentor_icon()
