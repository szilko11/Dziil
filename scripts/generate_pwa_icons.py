#!/usr/bin/env python3
import os
import zlib
import struct
import math

os.makedirs('public', exist_ok=True)

def create_png(width, height, get_pixel):
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel(x, y, width, height)
            raw.extend([r, g, b, a])
    
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(raw), 9)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

def render_nexus_icon(x, y, w, h, maskable=False):
    # Normalized coords from -1.0 to 1.0
    nx = (x / w) * 2.0 - 1.0
    ny = (y / h) * 2.0 - 1.0

    # If maskable, safe zone is inner 80% (scale coords by 1.25)
    if maskable:
        nx *= 1.25
        ny *= 1.25

    dist = math.sqrt(nx * nx + ny * ny)

    # Background gradient: deep dark slate / navy
    # #030712 -> #0b1528
    bg_factor = (ny + 1.0) / 2.0
    br = int(3 + bg_factor * 8)
    bg = int(7 + bg_factor * 14)
    bb = int(18 + bg_factor * 30)

    # Shield shape: top horizontal with bevel, tapering down to a point at bottom
    # |nx| <= 0.65 and ny >= -0.7
    # For bottom part (ny > 0), taper linearly
    in_shield = False
    in_border = False
    in_core = False

    shield_width = 0.65
    if ny > -0.1:
        shield_width = max(0.0, 0.65 - (ny + 0.1) * 0.72)

    if -0.7 <= ny <= 0.8 and abs(nx) <= shield_width:
        in_shield = True

    # Shield border (3% border)
    inner_width = shield_width - 0.06
    if in_shield and (-0.64 <= ny <= 0.73 and abs(nx) <= max(0.0, inner_width)):
        # Inner shield
        pass
    elif in_shield:
        in_border = True

    # Central stylized "N" logo
    # 2 vertical bars and 1 diagonal bar
    if abs(ny) < 0.45:
        # Left bar
        if -0.32 <= nx <= -0.18:
            in_core = True
        # Right bar
        elif 0.18 <= nx <= 0.32:
            in_core = True
        # Diagonal bar connecting top-left to bottom-right
        # line from (-0.25, -0.4) to (0.25, 0.4) => ny = 1.6 * nx
        elif abs(ny - 1.6 * nx) < 0.13 and -0.22 <= nx <= 0.22:
            in_core = True

    # Glow effect around center
    glow = max(0.0, 1.0 - dist * 1.5)

    if in_core:
        # Glowing cyan / neon blue
        # Core: #00F0FF (0, 240, 255) to #3B82F6 (59, 130, 246)
        t = (ny + 0.45) / 0.9
        r = int(0 + t * 59)
        g = int(240 - t * 110)
        b = int(255)
        return (r, g, b, 255)
    elif in_border:
        # Cyan neon border
        return (6, 182, 212, 255)
    elif in_shield:
        # Dark inner shield with subtle cyber grid glow
        r = min(255, int(br + glow * 40))
        g = min(255, int(bg + glow * 80))
        b = min(255, int(bb + glow * 120))
        return (r, g, b, 255)
    else:
        # Outside shield: outer glow or dark background
        if maskable:
            # Maskable should fill entire canvas with background
            r = min(255, int(br + glow * 20))
            g = min(255, int(bg + glow * 40))
            b = min(255, int(bb + glow * 70))
            return (r, g, b, 255)
        else:
            # Rounded squircle for standard icon
            if dist <= 0.96:
                r = min(255, int(br + glow * 20))
                g = min(255, int(bg + glow * 40))
                b = min(255, int(bb + glow * 70))
                return (r, g, b, 255)
            elif dist <= 1.0:
                # Anti-alias edge
                alpha = int((1.0 - dist) / 0.04 * 255)
                return (br, bg, bb, alpha)
            else:
                return (0, 0, 0, 0)

print("Generating PWA icons...")
with open('public/pwa-192x192.png', 'wb') as f:
    f.write(create_png(192, 192, lambda x, y, w, h: render_nexus_icon(x, y, w, h, False)))

with open('public/pwa-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, lambda x, y, w, h: render_nexus_icon(x, y, w, h, False)))

with open('public/maskable-icon-512x512.png', 'wb') as f:
    f.write(create_png(512, 512, lambda x, y, w, h: render_nexus_icon(x, y, w, h, True)))

with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(create_png(180, 180, lambda x, y, w, h: render_nexus_icon(x, y, w, h, False)))

# Also generate favicon.svg
svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1329"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F0FF"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="#030712"/>
  <path d="M 50 15 L 82 22 L 76 68 L 50 88 L 24 68 L 18 22 Z" fill="url(#shieldGrad)" stroke="#06b6d4" stroke-width="2.5"/>
  <path d="M 36 34 L 43 34 L 43 66 L 36 66 Z" fill="url(#neonGrad)"/>
  <path d="M 57 34 L 64 34 L 64 66 L 57 66 Z" fill="url(#neonGrad)"/>
  <path d="M 40 34 L 61 66 L 55 66 L 35 34 Z" fill="url(#neonGrad)"/>
</svg>"""

with open('public/favicon.svg', 'w') as f:
    f.write(svg_content)

print("Icons created successfully in public/")
