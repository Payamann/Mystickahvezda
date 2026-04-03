#!/usr/bin/env python3
"""
Seamless ping-pong loop video generator.
Vytvoří video: forward -> reverse -> forward -> reverse -> ... do cílové délky.

Usage:
    python loop.py input.mp4
    python loop.py input.mp4 output.mp4 --duration 60
"""

import subprocess
import sys
import os
import tempfile
import argparse
from pathlib import Path


def get_video_duration(path: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True
    )
    return float(result.stdout.strip())


def has_audio(path: str) -> bool:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a",
         "-show_entries", "stream=codec_type", "-of", "csv=p=0", path],
        capture_output=True, text=True
    )
    return bool(result.stdout.strip())


def run(cmd: list, label: str = ""):
    if label:
        print(f"[*] {label}...")
    subprocess.run(cmd, check=True, capture_output=True)


def create_pingpong_loop(input_file: str, output_file: str, target_duration: float = 60.0):
    input_path = Path(input_file)
    if not input_path.exists():
        raise FileNotFoundError(f"Soubor nenalezen: {input_file}")

    print(f"[*] Analyzuji vstupni video...")
    duration = get_video_duration(input_file)
    audio = has_audio(input_file)
    print(f"[OK] Delka: {duration:.2f}s | Audio: {'ano' if audio else 'ne'}")

    cycle_duration = duration * 2
    num_cycles = int(target_duration / cycle_duration) + 1
    print(f"[*] Cyklus (fwd+rev): {cycle_duration:.2f}s | Potreba cyklu: {num_cycles}")

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        fwd = tmp / "fwd.mp4"
        rev = tmp / "rev.mp4"
        cycle = tmp / "cycle.mp4"
        concat_txt = tmp / "concat.txt"

        # Krok 1: Re-encode original -> fwd.mp4 (konzistentni parametry)
        fwd_cmd = [
            "ffmpeg", "-i", input_file,
            "-c:v", "libx264", "-crf", "20", "-preset", "fast",
            "-pix_fmt", "yuv420p",
            "-r", "30",  # pevny fps pro konzistenci
        ]
        if audio:
            fwd_cmd += ["-c:a", "aac", "-b:a", "128k", "-ar", "44100"]
        else:
            fwd_cmd += ["-an"]
        fwd_cmd += ["-y", str(fwd)]
        run(fwd_cmd, "Re-encoduji forward verzi")

        # Krok 2: Reverse z fwd.mp4 (stejne parametry jako zdroj)
        rev_cmd = [
            "ffmpeg", "-i", str(fwd),
            "-vf", "reverse",
            "-c:v", "libx264", "-crf", "20", "-preset", "fast",
            "-pix_fmt", "yuv420p",
            "-r", "30",
        ]
        if audio:
            rev_cmd += ["-af", "areverse", "-c:a", "aac", "-b:a", "128k", "-ar", "44100"]
        else:
            rev_cmd += ["-an"]
        rev_cmd += ["-y", str(rev)]
        run(rev_cmd, "Generuji reverse verzi")

        # Krok 3: Spoj forward+reverse do jednoho cyklu
        cycle_txt = tmp / "cycle.txt"
        cycle_txt.write_text(f"file '{fwd}'\nfile '{rev}'\n")
        run([
            "ffmpeg",
            "-f", "concat", "-safe", "0", "-i", str(cycle_txt),
            "-c", "copy",
            "-y", str(cycle)
        ], "Spojuji forward+reverse do jednoho cyklu")

        # Krok 4: Opakuj cycle.mp4 do target_duration
        concat_content = ""
        for _ in range(num_cycles):
            concat_content += f"file '{cycle}'\n"
        concat_txt.write_text(concat_content)

        print(f"[*] Generuji finalni video ({num_cycles}x cyklus = {num_cycles * cycle_duration:.1f}s, oriznu na {target_duration}s)...")
        subprocess.run([
            "ffmpeg",
            "-f", "concat", "-safe", "0", "-i", str(concat_txt),
            "-t", str(target_duration),
            "-c", "copy",
            "-y", output_file
        ], check=True)

        final_duration = get_video_duration(output_file)
        print(f"[OK] Hotovo! -> {output_file}")
        print(f"[OK] Vysledna delka: {final_duration:.2f}s")


def main():
    parser = argparse.ArgumentParser(
        description="Ping-pong video loop: forward -> reverse -> forward -> ..."
    )
    parser.add_argument("input", help="Vstupni video")
    parser.add_argument("output", nargs="?", help="Vystupni video (default: <input>_loop.mp4)")
    parser.add_argument("--duration", type=float, default=60.0,
                        help="Cilova delka v sekundach (default: 60)")
    args = parser.parse_args()

    output = args.output or f"{Path(args.input).stem}_loop.mp4"

    try:
        create_pingpong_loop(args.input, output, args.duration)
    except Exception as e:
        print(f"[CHYBA] {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
