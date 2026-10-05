#!/usr/bin/env python3
"""
Render seamless cinematic looping video assets for McCor Labs AI and Software Engineering showcase.
- Loops:
  1. ai-neural-loop: Synaptic pulse waves, floating data embers, glowing conduits.
  2. systems-pipeline-loop: High-throughput optical bus highway pulses, telemetry bloom.
  3. code-synthesis-loop: AST syntax tree laser scanline sweep, token highlight flares.
- Dual format export:
  - MP4 (H.264, +faststart, crf 22)
  - WebM (VP9, crf 30)
"""

import math
import os
import subprocess
import cv2
import numpy as np

FFMPEG_PATH = "/opt/homebrew/bin/ffmpeg"

def render_neural_loop():
    input_path = "app/web/public/media/brand/mccor-ai-neural.jpg"
    output_mp4 = "app/web/public/media/brand/ai-neural-loop.mp4"
    output_webm = "app/web/public/media/brand/ai-neural-loop.webm"
    temp_raw = "/tmp/mccor_neural_raw.mp4"

    if not os.path.exists(input_path):
        print(f"Error: {input_path} missing")
        return

    img = cv2.imread(input_path)
    h, w, c = img.shape
    fps = 30
    duration_sec = 6.0
    total_frames = int(fps * duration_sec)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask_orange = cv2.inRange(hsv, np.array([5, 80, 80]), np.array([25, 255, 255]))
    mask_red1 = cv2.inRange(hsv, np.array([0, 80, 70]), np.array([8, 255, 255]))
    mask_red2 = cv2.inRange(hsv, np.array([170, 80, 70]), np.array([180, 255, 255]))
    conduit_mask = cv2.bitwise_or(cv2.bitwise_or(mask_orange, mask_red1), mask_red2)
    bloom_mask = cv2.GaussianBlur(conduit_mask, (25, 25), 0).astype(np.float32) / 255.0

    np.random.seed(101)
    num_particles = 40
    particles = []
    for _ in range(num_particles):
        particles.append({
            'x_base': np.random.uniform(w * 0.15, w * 0.95),
            'y_start': np.random.uniform(h * 0.2, h * 0.85),
            'travel_y': np.random.uniform(50, 140),
            'drift_x': np.random.uniform(-25, 25),
            'phase': np.random.uniform(0, 2 * math.pi),
            'size': np.random.uniform(1.2, 2.4),
            'color': (int(np.random.uniform(10, 40)), int(np.random.uniform(110, 180)), int(np.random.uniform(240, 255)))
        })

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_raw, fourcc, fps, (w, h))

    print(f"Rendering AI Neural Loop ({total_frames} frames)...")
    for frame_idx in range(total_frames):
        t = frame_idx / total_frames
        angle = 2.0 * math.pi * t

        zoom = 1.0 + 0.02 * (0.5 * (1.0 - math.cos(angle)))
        cx, cy = w * 0.5, h * 0.5 - 4.0 * math.sin(angle)
        M = cv2.getRotationMatrix2D((cx, cy), 0, zoom)
        frame = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

        pulse = 0.5 + 0.5 * math.sin(angle * 2.0)
        pulse2 = 0.5 + 0.5 * math.sin(angle * 4.0)
        glow_factor = 0.12 + 0.22 * pulse + 0.08 * pulse2

        warped_bloom = cv2.warpAffine(bloom_mask, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        glow_layer = (warped_bloom[:, :, np.newaxis] * np.array([0, 95, 220], dtype=np.float32) * glow_factor)
        
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
                radius = max(1, int(p['size'] * (0.8 + 0.3 * math.sin(curr_phase * 2))))
                cv2.circle(overlay, (int(px), int(py)), radius, p['color'], -1)
                cv2.addWeighted(overlay, alpha * 0.7, frame, 1.0 - alpha * 0.7, 0, frame)

        out.write(frame)

    out.release()
    encode_video(temp_raw, output_mp4, output_webm)


def render_systems_pipeline_loop():
    input_path = "app/web/public/media/brand/mccor-systems-arch.jpg"
    output_mp4 = "app/web/public/media/brand/systems-pipeline-loop.mp4"
    output_webm = "app/web/public/media/brand/systems-pipeline-loop.webm"
    temp_raw = "/tmp/mccor_systems_raw.mp4"

    if not os.path.exists(input_path):
        print(f"Error: {input_path} missing")
        return

    img = cv2.imread(input_path)
    h, w, c = img.shape
    fps = 30
    duration_sec = 6.0
    total_frames = int(fps * duration_sec)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask_orange = cv2.inRange(hsv, np.array([5, 80, 80]), np.array([25, 255, 255]))
    mask_red1 = cv2.inRange(hsv, np.array([0, 80, 70]), np.array([8, 255, 255]))
    mask_red2 = cv2.inRange(hsv, np.array([170, 80, 70]), np.array([180, 255, 255]))
    conduit_mask = cv2.bitwise_or(cv2.bitwise_or(mask_orange, mask_red1), mask_red2)
    bloom_mask = cv2.GaussianBlur(conduit_mask, (21, 21), 0).astype(np.float32) / 255.0

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_raw, fourcc, fps, (w, h))

    print(f"Rendering Systems Pipeline Loop ({total_frames} frames)...")
    for frame_idx in range(total_frames):
        t = frame_idx / total_frames
        angle = 2.0 * math.pi * t

        zoom = 1.0 + 0.018 * (0.5 * (1.0 - math.cos(angle)))
        pan_x = 6.0 * math.sin(angle)
        pan_y = 3.0 * math.cos(angle)
        
        M = np.array([
            [zoom, 0, (1.0 - zoom) * (w * 0.5) + pan_x],
            [0, zoom, (1.0 - zoom) * (h * 0.5) + pan_y]
        ], dtype=np.float32)
        frame = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

        pulse = 0.5 + 0.5 * math.sin(angle * 3.0)
        glow_factor = 0.15 + 0.25 * pulse

        warped_bloom = cv2.warpAffine(bloom_mask, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        glow_layer = (warped_bloom[:, :, np.newaxis] * np.array([0, 85, 240], dtype=np.float32) * glow_factor)
        
        scan_t = (t * 2.0) % 1.0
        scan_x = int(w * scan_t)
        scan_overlay = np.zeros_like(frame, dtype=np.float32)
        if 0 <= scan_x < w:
            beam_width = 80
            x_min = max(0, scan_x - beam_width)
            x_max = min(w, scan_x + beam_width)
            alpha_profile = np.cos(np.linspace(-math.pi/2, math.pi/2, x_max - x_min)) ** 2
            scan_overlay[:, x_min:x_max, 1] += alpha_profile * 20.0
            scan_overlay[:, x_min:x_max, 2] += alpha_profile * 45.0

        frame_float = frame.astype(np.float32) + glow_layer + scan_overlay
        np.clip(frame_float, 0, 255, out=frame_float)
        frame = frame_float.astype(np.uint8)

        out.write(frame)

    out.release()
    encode_video(temp_raw, output_mp4, output_webm)


def render_code_synthesis_loop():
    input_path = "app/web/public/media/brand/mccor-code-synthesis.jpg"
    output_mp4 = "app/web/public/media/brand/code-synthesis-loop.mp4"
    output_webm = "app/web/public/media/brand/code-synthesis-loop.webm"
    temp_raw = "/tmp/mccor_code_raw.mp4"

    if not os.path.exists(input_path):
        print(f"Error: {input_path} missing")
        return

    img = cv2.imread(input_path)
    h, w, c = img.shape
    fps = 30
    duration_sec = 6.0
    total_frames = int(fps * duration_sec)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask_orange = cv2.inRange(hsv, np.array([8, 80, 90]), np.array([25, 255, 255]))
    mask_red = cv2.inRange(hsv, np.array([0, 80, 80]), np.array([8, 255, 255]))
    conduit_mask = cv2.bitwise_or(mask_orange, mask_red)
    bloom_mask = cv2.GaussianBlur(conduit_mask, (23, 23), 0).astype(np.float32) / 255.0

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_raw, fourcc, fps, (w, h))

    print(f"Rendering Code Synthesis Loop ({total_frames} frames)...")
    for frame_idx in range(total_frames):
        t = frame_idx / total_frames
        angle = 2.0 * math.pi * t

        zoom = 1.0 + 0.02 * (0.5 * (1.0 - math.cos(angle)))
        cx, cy = w * 0.55, h * 0.40 - 3.0 * math.sin(angle)
        M = cv2.getRotationMatrix2D((cx, cy), 0, zoom)
        frame = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

        pulse = 0.5 + 0.5 * math.sin(angle * 2.0)
        glow_factor = 0.14 + 0.26 * pulse
        warped_bloom = cv2.warpAffine(bloom_mask, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        glow_layer = (warped_bloom[:, :, np.newaxis] * np.array([0, 90, 230], dtype=np.float32) * glow_factor)

        beam_t = (t * 2.0) % 1.0
        beam_y = int(h * 0.12 + (h * 0.45) * (0.5 + 0.5 * math.sin(angle * 2.0)))
        laser_overlay = np.zeros_like(frame, dtype=np.float32)
        if 0 <= beam_y < h:
            y_min = max(0, beam_y - 6)
            y_max = min(h, beam_y + 6)
            laser_overlay[y_min:y_max, :, 1] += 30.0
            laser_overlay[y_min:y_max, :, 2] += 80.0

        frame_float = frame.astype(np.float32) + glow_layer + laser_overlay
        np.clip(frame_float, 0, 255, out=frame_float)
        frame = frame_float.astype(np.uint8)

        out.write(frame)

    out.release()
    encode_video(temp_raw, output_mp4, output_webm)


def encode_video(temp_raw, output_mp4, output_webm):
    print(f"Encoding {output_mp4} & {output_webm}...")
    subprocess.run([
        FFMPEG_PATH, "-y",
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
        FFMPEG_PATH, "-y",
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
    print(f"Finished encoding {output_mp4} & {output_webm}")


if __name__ == "__main__":
    render_neural_loop()
    render_systems_pipeline_loop()
    render_code_synthesis_loop()
    print("All video assets rendered successfully!")
