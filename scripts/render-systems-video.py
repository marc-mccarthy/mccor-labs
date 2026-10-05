#!/usr/bin/env python3
"""
Render a seamless 6-second looping cinematic video for McCor Labs neural systems architecture.
Theme: Floating crystalline nodes, surging optical energy channels, and subtle orbital camera movement.
"""

import math
import os
import subprocess
import cv2
import numpy as np

def main():
    input_path = "app/web/public/media/brand/mccor-stag-systems.jpg"
    output_mp4 = "app/web/public/media/brand/systems-loop.mp4"
    output_webm = "app/web/public/media/brand/systems-loop.webm"
    temp_raw = "/tmp/mccor_systems_raw.mp4"

    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    img = cv2.imread(input_path)
    h, w, c = img.shape

    fps = 30
    duration_sec = 6.0
    total_frames = int(fps * duration_sec)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array([5, 80, 100]), np.array([25, 255, 255]))
    bloom_mask = cv2.GaussianBlur(mask, (31, 31), 0).astype(np.float32) / 255.0

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_raw, fourcc, fps, (w, h))

    print(f"Rendering {total_frames} frames for systems video ({w}x{h} @ {fps}fps)...")
    for frame_idx in range(total_frames):
        t = frame_idx / total_frames
        angle = 2.0 * math.pi * t

        zoom = 1.0 + 0.025 * (0.5 * (1.0 - math.cos(angle)))
        cx = w * 0.5 + 6.0 * math.sin(angle)
        cy = h * 0.5 - 4.0 * math.cos(angle)

        M = cv2.getRotationMatrix2D((cx, cy), 0, zoom)
        frame = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

        pulse = 0.5 + 0.5 * math.sin(angle * 3.0)
        glow_layer = (cv2.warpAffine(bloom_mask, M, (w, h))[:, :, np.newaxis] * 
                      np.array([0, 90, 200], dtype=np.float32) * (0.15 + 0.25 * pulse))

        frame_float = frame.astype(np.float32) + glow_layer
        np.clip(frame_float, 0, 255, out=frame_float)
        frame = frame_float.astype(np.uint8)

        out.write(frame)

    out.release()
    print("Encoding MP4 & WebM with FFmpeg...")

    subprocess.run([
        "/opt/homebrew/bin/ffmpeg", "-y", "-i", temp_raw,
        "-an", "-c:v", "libx264", "-crf", "22", "-preset", "slow",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", output_mp4
    ], check=True)

    subprocess.run([
        "/opt/homebrew/bin/ffmpeg", "-y", "-i", temp_raw,
        "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30",
        "-pix_fmt", "yuv420p", output_webm
    ], check=True)

    if os.path.exists(temp_raw):
        os.remove(temp_raw)

    mp4_kb = os.path.getsize(output_mp4) / 1024
    webm_kb = os.path.getsize(output_webm) / 1024
    print(f"SUCCESS! Systems video: MP4 ({mp4_kb:.1f} KB), WebM ({webm_kb:.1f} KB)")

if __name__ == "__main__":
    main()
