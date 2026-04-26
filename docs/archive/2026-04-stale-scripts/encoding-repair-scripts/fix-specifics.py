import os

def fix_specifics():
    start_dir = "C:\\Users\\pavel\\OneDrive\\Desktop\\MystickaHvezda"
    
    replacements = {
        "đź“ť": "📝",
        "đźŚŚ": "🌌",
        "đź”˘": "🔢",
        "đźƒŹ": "🃏",
        "Â°": "°"
    }
    
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
                        
                    original = content
                    for bad, good in replacements.items():
                        content = content.replace(bad, good)
                        
                    if content != original:
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(content)
                        print(f"Fixed {path}")
                        count += 1
                except Exception as e:
                    pass
                    
    print(f"Fixed {count} files with specific replacements.")

if __name__ == "__main__":
    fix_specifics()
