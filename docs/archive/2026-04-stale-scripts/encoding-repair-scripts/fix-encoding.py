import os
import glob

def get_mapping():
    chars = "áéíóúýčďěňřšťžůÁÉÍÓÚÝČĎĚŇŘŠŤŽŮ–—„“”’ 📖📚📻⚛→✨🌟🔮👼🌙📉"
    mapping = {}
    
    for c in chars:
        utf8_bytes = c.encode('utf-8')
        mangled = ""
        success = True
        for b in utf8_bytes:
            # try interpreting the byte as cp1250
            try:
                mchar = bytes([b]).decode('cp1250')
            except UnicodeDecodeError:
                # fallback to cp1252 for undefined bytes like 0x88
                try:
                    mchar = bytes([b]).decode('cp1252')
                except UnicodeDecodeError:
                    success = False
                    break
            mangled += mchar
        
        if success and mangled != c:
            mapping[mangled] = c
            
    # Add non-breaking space explicitly if needed
    mapping["Â\xa0".encode('utf-8').decode('utf-8')] = " "
    
    # Sort mapping by length of mangled string, descending
    sorted_mapping = {k: v for k, v in sorted(mapping.items(), key=lambda item: len(item[0]), reverse=True)}
    return sorted_mapping

def fix_file(path, mapping):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            
        original = content
        for mangled, correct in mapping.items():
            content = content.replace(mangled, correct)
            
        # specifically fix Â space
        content = content.replace("Â ", " ")
            
        if content != original:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Successfully fixed {path}")
            return True
        return False
    except Exception as e:
        print(f"Skipped {path}: {e}")
        return False

if __name__ == "__main__":
    count = 0
    start_dir = "C:\\Users\\pavel\\OneDrive\\Desktop\\MystickaHvezda"
    mapping = get_mapping()
    
    for root, dirs, files in os.walk(start_dir):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        if 'server' in dirs:
            dirs.remove('server')
            
        for file in files:
            if file.endswith(".html"):
                path = os.path.join(root, file)
                if fix_file(path, mapping):
                    count += 1
                    
    print(f"Processed and fixed {count} files.")
