#!/usr/bin/env python3
"""
Seamless ping-pong loop video generator.
Vytvoří video: forward -> reverse -> forward -> reverse -> ... do cílové délky.

Opravy oproti předchozí verzi:
  - Žádné duplikátní framy na spojích (select filter trimuje poslední frame každého segmentu)
  - Zachovává původní FPS místo hardcoded 30
  - Posix cesty v concat souborech (Windows kompatibilita)
  - Spolehlivější detekce délky (format > stream fallback)
  - --quality CLI argument (CRF)
  - -movflags +faststart pro web delivery

Usage:
    python loop.py input.mp4
    python loop.py input.mp4 output.mp4 --duration 60 --quality 20
"""

import subprocess
import sys
import tempfile
import argparse
from pathlib import Path

# Windows: vynutí UTF-8 výstup bez ohledu na nastavení konzole
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def get_video_info(path: str) -> tuple:
    """Vrátí (duration, fps_str, fps, frame_count, has_audio)."""

    # Duration: format je spolehlivější než stream (stream může vrátit N/A)
    duration = None
    for sel, entries in [(None, "format=duration"), ("v:0", "stream=duration")]:
        cmd = ["ffprobe", "-v", "error"]
        if sel:
            cmd += ["-select_streams", sel]
        cmd += ["-show_entries", entries, "-of", "csv=p=0", path]
        r = subprocess.run(cmd, capture_output=True, text=True, check=True)
        val = r.stdout.strip().split("\n")[0]
        if val and val != "N/A":
            duration = float(val)
            break
    if duration is None:
        raise RuntimeError("Nepodařilo se zjistit délku videa.")

    # FPS — zachováme originální hodnotu jako string pro -r flag
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True
    )
    fps_str = r.stdout.strip().split("\n")[0]
    if "/" in fps_str:
        num, den = fps_str.split("/")
        fps = float(num) / float(den)
    else:
        fps = float(fps_str)

    frame_count = round(duration * fps)

    # Audio
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a",
         "-show_entries", "stream=codec_type", "-of", "csv=p=0", path],
        capture_output=True, text=True
    )
    audio = bool(r.stdout.strip())

    return duration, fps_str, fps, frame_count, audio


def run_ff(cmd: list, label: str = ""):
    if label:
        print(f"[*] {label}...")
    subprocess.run(cmd, check=True, capture_output=True)


def create_pingpong_loop(
    input_file: str,
    output_file: str,
    target_duration: float = 60.0,
    crf: int = 20,
):
    input_path = Path(input_file)
    if not input_path.exists():
        raise FileNotFoundError(f"Soubor nenalezen: {input_file}")

    print("[*] Analyzuji vstupní video...")
    duration, fps_str, fps, frame_count, audio = get_video_info(input_file)
    print(
        f"[OK] Délka: {duration:.2f}s | FPS: {fps:.3f} ({fps_str}) "
        f"| Framy: {frame_count} | Audio: {'ano' if audio else 'ne'}"
    )

    if frame_count < 3:
        raise ValueError("Video musí mít alespoň 3 framy pro seamless smyčku.")

    # Každý segment = frame_count-1 framů.
    # Poslední frame je vynechán, aby na spoji nevznikl duplikát:
    #   fwd:   [F0, F1, ..., F(N-2)]          (bez F(N-1))
    #   rev:   [F(N-1), F(N-2), ..., F1]      (bez F0)
    #   cyklus:[F0, ..., F(N-2), F(N-1), ..., F1]  → bez jakékoliv duplicity
    seg_frames = frame_count - 1          # počet framů v jednom segmentu
    seg_duration = seg_frames / fps       # délka segmentu v sekundách
    cycle_duration = seg_duration * 2     # fwd + rev

    num_cycles = int(target_duration / cycle_duration) + 2
    print(
        f"[*] Segment: {seg_frames} framů ({seg_duration:.3f}s) "
        f"| Cyklus: {cycle_duration:.3f}s | Cyklů: {num_cycles}"
    )

    # select='lte(n,X)' vybere framy 0..X z výstupu předchozího filtru.
    # Po reverse je n=0 poslední frame originálu → lte(n, seg_frames-1) = framy 0..N-2.
    select_expr = f"lte(n,{seg_frames - 1})"

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir)
        fwd = tmp / "fwd.mp4"
        rev = tmp / "rev.mp4"
        cycle = tmp / "cycle.mp4"

        # === Krok 1: Forward — vyřadit poslední frame ===
        fwd_cmd = [
            "ffmpeg", "-i", input_file,
            "-vf", f"select='{select_expr}',setpts=PTS-STARTPTS",
            "-c:v", "libx264", "-crf", str(crf), "-preset", "fast",
            "-pix_fmt", "yuv420p", "-r", fps_str,
        ]
        if audio:
            fwd_cmd += [
                "-af", f"atrim=end={seg_duration:.6f},asetpts=PTS-STARTPTS",
                "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
            ]
        else:
            fwd_cmd += ["-an"]
        fwd_cmd += ["-y", str(fwd)]
        run_ff(fwd_cmd, "Encoduji forward (bez posledního framu)")

        # === Krok 2: Reverse — otočit, pak vyřadit poslední frame (= F0 originálu) ===
        rev_cmd = [
            "ffmpeg", "-i", input_file,
            "-vf", f"reverse,select='{select_expr}',setpts=PTS-STARTPTS",
            "-c:v", "libx264", "-crf", str(crf), "-preset", "fast",
            "-pix_fmt", "yuv420p", "-r", fps_str,
        ]
        if audio:
            rev_cmd += [
                "-af", f"areverse,atrim=end={seg_duration:.6f},asetpts=PTS-STARTPTS",
                "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
            ]
        else:
            rev_cmd += ["-an"]
        rev_cmd += ["-y", str(rev)]
        run_ff(rev_cmd, "Encoduji reverse (bez frame 0 originálu)")

        # === Krok 3: Concat fwd + rev → jeden cyklus (copy, bez re-encode) ===
        # Posix cesty — forward slashes, bezpečné na Windows i Linux
        cycle_list = tmp / "cycle_list.txt"
        cycle_list.write_text(
            f"file '{fwd.as_posix()}'\nfile '{rev.as_posix()}'\n",
            encoding="utf-8",
        )
        run_ff([
            "ffmpeg", "-f", "concat", "-safe", "0", "-i", str(cycle_list),
            "-c", "copy", "-y", str(cycle),
        ], "Spojuji forward + reverse do cyklu")

        # === Krok 4: Opakuj cyklus → finální video (copy + faststart) ===
        final_list = tmp / "final_list.txt"
        final_list.write_text(
            "".join(f"file '{cycle.as_posix()}'\n" for _ in range(num_cycles)),
            encoding="utf-8",
        )

        print(
            f"[*] Generuji finalni video "
            f"({num_cycles}x cyklus ~{num_cycles * cycle_duration:.1f}s -> orez na {target_duration}s)..."
        )
        final_cmd = [
            "ffmpeg",
            "-f", "concat", "-safe", "0", "-i", str(final_list),
            "-t", str(target_duration),
            "-c:v", "copy",
        ]
        if audio:
            final_cmd += ["-c:a", "copy"]
        else:
            final_cmd += ["-an"]
        final_cmd += ["-movflags", "+faststart", "-y", output_file]
        subprocess.run(final_cmd, check=True, capture_output=True)

        # Verifikace výstupu
        out_dur, _, _, out_frames, _ = get_video_info(output_file)
        print(f"[OK] Hotovo! → {output_file}")
        print(f"[OK] Výsledná délka: {out_dur:.2f}s ({out_frames} framů)")


def main():
    parser = argparse.ArgumentParser(
        description="Ping-pong video loop: forward → reverse → forward → ..."
    )
    parser.add_argument("input", help="Vstupní video")
    parser.add_argument("output", nargs="?", help="Výstupní video (default: <input>_loop.mp4)")
    parser.add_argument("--duration", type=float, default=60.0,
                        help="Cílová délka v sekundách (default: 60)")
    parser.add_argument("--quality", type=int, default=20,
                        help="CRF kvalita 0–51, nižší = lepší (default: 20)")
    args = parser.parse_args()

    output = args.output or f"{Path(args.input).stem}_loop.mp4"

    try:
        create_pingpong_loop(args.input, output, args.duration, args.quality)
    except Exception as e:
        print(f"[CHYBA] {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
