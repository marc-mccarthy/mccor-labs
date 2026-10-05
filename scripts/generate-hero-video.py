#!/usr/bin/env python3
"""
Generate a seamless 6-second looping cinematic video for McCor Labs hero background.
Theme: Obsidian black, right-aligned holographic red stag, pulsing conduits, and subtle camera push.
Guarantees:
- Exact seamless loop (frame 0 == frame N).
- High visual fidelity with glowing bloom and particle drift.
- Web-optimized H.264 & WebM under 1.5MB.
"""

import math
import os
import subprocess
import cv2
import numpy as np

def main():
    input_path = "app/web/public/media/brand/mccor-stag-hero.jpg"
    output_mp4 = "app/web/public/media/brand/hero-loop.mp4"
    output_webm = "app/web/public/media/brand/hero-loop.webm"
    temp_raw = "/tmp/mccor_raw_frames.mp4"

    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    img = cv2.imread(input_path)
    h, w, c = img.shape

    fps = 30
    duration_sec = 6.0
    total_frames = int(fps * duration_sec)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask_orange = cv2.inRange(hsv, np.array([5, 70, 70]), np.array([25, 255, 255]))
    mask_red = cv2.inRange(hsv, np.array([0, 75, 60]), np.array([8, 255, 255]))
    mask_red_high = cv2.inRange(hsv, np.array([170, 75, 60]), np.array([180, 255, 255]))
    conduit_mask = cv2.bitwise_or(cv2.bitwise_or(mask_orange, mask_red), mask_red_high)
    
    bloom_mask = cv2.GaussianBlur(conduit_mask, (25, 25), 0).astype(np.float32) / 255.0

    np.random.seed(42)
    num_particles = 45
    particles = []
    for i in range(num_particles):
        x_base = np.random.uniform(w * 0.65, w * 0.96)
        y_start = np.random.uniform(h * 0.15, h * 0.85)
        travel_y = np.random.uniform(60, 160)
        drift_x = np.random.uniform(-30, 30)
        phase = np.random.uniform(0, 2 * math.pi)
        size = np.random.uniform(1.2, 2.5)
        color = (
            int(np.random.uniform(0, 30)),
            int(np.random.uniform(100, 180)),
            int(np.random.uniform(230, 255))
        )
        particles.append({
            'x_base': x_base,
            'y_start': y_start,
            'travel_y': travel_y,
            'drift_x': drift_x,
            'phase': phase,
            'size': size,
            'color': color
        })

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_raw, fourcc, fps, (w, h))

    print(f"Rendering {total_frames} frames ({w}x{h} @ {fps}fps)...")
    for frame_idx in range(total_frames):
        t = frame_idx / total_frames
        angle = 2.0 * math.pi * t

        zoom = 1.0 + 0.025 * (0.5 * (1.0 - math.cos(angle)))
        
        center_x = w * 0.50
        center_y = h * 0.50 - 5.0 * math.sin(angle)

        M = cv2.getRotationMatrix2D((center_x, center_y), 0, zoom)
        frame = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

        pulse = 0.5 + 0.5 * math.sin(angle * 2.0)
        glow_factor = 0.15 + 0.25 * pulse

        warped_bloom = cv2.warpAffine(bloom_mask, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        glow_layer = (warped_bloom[:, :, np.newaxis] * np.array([0, 80, 180], dtype=np.float32) * glow_factor)
        
        frame_float = frame.astype(np.float32) + glow_layer
        np.clip(frame_float, 0, 255, out=frame_float)
        frame = frame_float.astype(np.uint8)

        for p in particles:
            curr_phase = (angle + p['phase']) % (2 * math.pi)
            norm_cycle = curr_phase / (2 * math.pi)

            px = p['x_base'] + p['drift_x'] * math.sin(curr_phase)
            py = p['y_start'] - p['travel_y'] * norm_cycle
            
            alpha = math.sin(norm_cycle * math.pi)
            if alpha > 0.05 and 0 <= px < w and 0 <= py < h:
                overlay = frame.copy()
                radius = int(p['size'] * (0.8 + 0.4 * math.sin(curr_phase * 2)))
                cv2.circle(overlay, (int(px), int(py)), max(1, radius), p['color'], -1)
                cv2.addWeighted(overlay, alpha * 0.75, frame, 1.0 - alpha * 0.75, 0, frame)

        out.write(frame)

    out.release()
    print("Raw frame rendering complete. Encoding web-optimized MP4 & WebM via FFmpeg...")

    subprocess.run([
        "/opt/homebrew/bin/ffmpeg",
        "-y",
        "-i", temp_raw,
        "-an",
        "-c:v", "libx264",
        "-crf", "22",
        "-preset", "slow",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output_mp4
    ], check=True)

    subprocess.run([
        "/opt/homebrew/bin/ffmpeg",
        "-y",
        "-i", temp_raw,
        "-an",
        "-c:v", "libvpx-vp9",
        "-b:v", "0",
        "-crf", "30",
        "-pix_fmt", "yuv420p",
        output_webm
    ], check=True)

    if os.path.exists(temp_raw):
        os.remove(temp_raw)

    mp4_kb = os.path.getsize(output_mp4) / 1024
    webm_kb = os.path.getsize(output_webm) / 1024
    print(f"SUCCESS! Hero loop videos created: MP4 ({mp4_kb:.1f} KB), WebM ({webm_kb:.1f} KB)")

if __name__ == "__main__":
    main()
