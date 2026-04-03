#!/usr/bin/env python3
"""
Seamless ping-pong loop video generator.
Vytvoří video, které se přehraje: forward → reverse → forward → ... do 60s.

Usage:
    python loop.py input.mp4 output.mp4 --duration 60
"""

import subprocess
import sys
from pathlib import Path
import tempfile
import argparse


def get_video_duration(input_file: str) -> float:
    """Zjisti délku videa v sekundách pomocí ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=duration",
                "-of", "csv=p=0",
                input_file
            ],
            capture_output=True,
            text=True,
            check=True
        )
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError) as e:
        raise ValueError(f"Nelze zjistit délku videa: {e}")


def create_pingpong_loop(
    input_file: str,
    output_file: str,
    target_duration: float = 60.0
) -> None:
    """
    Vytvoří ping-pong loop video (forward → reverse → forward → ...).

    Args:
        input_file: Cesta k vstupnímu videu
        output_file: Cesta k výstupnímu videu
        target_duration: Cílová délka výsledného videa (sekund)
    """

    # Ověř vstupní soubor
    input_path = Path(input_file)
    if not input_path.exists():
        raise FileNotFoundError(f"Soubor nenalezen: {input_file}")

    output_path = Path(output_file)

    # Zjisti původní délku
    print("[*] Nacitam puvodni video...")
    original_duration = get_video_duration(input_file)
    print(f"[OK] Delka puvodni video: {original_duration:.2f}s")

    # Vypočítej počet opakování (forward + reverse = 1 cyklus)
    cycle_duration = original_duration * 2  # forward + reverse
    num_cycles = int(target_duration / cycle_duration) + 1

    print(f"[*] Cilova delka: {target_duration:.2f}s")
    print(f"[*] Jedna sekvence (forward+reverse): {cycle_duration:.2f}s")
    print(f"[*] Pocet cyklu: {num_cycles}")

    # Vytvoř reverse verzi jako dočasný soubor
    print("[*] Generuji reverse verzi...")
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        reverse_file = tmpdir / "reverse.mp4"

        subprocess.run(
            [
                "ffmpeg",
                "-i", input_file,
                "-vf", "reverse",
                "-af", "areverse",
                "-c:v", "libx264",
                "-crf", "23",
                "-preset", "fast",
                "-c:a", "aac",
                "-b:a", "128k",
                "-y",
                str(reverse_file)
            ],
            check=True,
            capture_output=True
        )

        # Vytvoř seznam souborů pro concat
        print("[*] Spojuji segmenty...")
        concat_list = tmpdir / "concat.txt"
        concat_content = ""
        for i in range(num_cycles):
            concat_content += f"file '{input_file}'\n"
            concat_content += f"file '{reverse_file}'\n"

        concat_list.write_text(concat_content)

        # Spoň segmenty
        subprocess.run(
            [
                "ffmpeg",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_list),
                "-c:v", "libx264",
                "-crf", "23",
                "-preset", "medium",
                "-c:a", "aac",
                "-b:a", "128k",
                "-t", str(target_duration),
                "-y",
                output_file
            ],
            check=True,
            capture_output=False
        )

        print(f"[OK] Hotovo! Video ulozeno: {output_file}")

        # Ověř výstup
        output_duration = get_video_duration(output_file)
        print(f"[OK] Vysledna delka: {output_duration:.2f}s")


def main():
    parser = argparse.ArgumentParser(
        description="Vytvoř ping-pong loop video (forward → reverse → forward → ...)"
    )
    parser.add_argument("input", help="Cesta k vstupnímu videu")
    parser.add_argument("output", nargs="?", help="Cesta k výstupnímu videu (default: input_loop.mp4)")
    parser.add_argument(
        "--duration",
        type=float,
        default=60.0,
        help="Cílová délka videa v sekundách (default: 60)"
    )

    args = parser.parse_args()

    output = args.output or f"{Path(args.input).stem}_loop.mp4"

    try:
        create_pingpong_loop(args.input, output, args.duration)
    except Exception as e:
        print(f"❌ Chyba: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
