from PIL import Image, ImageFilter
import sys

def remove_bg(src, dst, tolerance=34):
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()

    # Background color sampled from the 4 corners
    corners = [px[0, 0], px[w-1, 0], px[0, h-1], px[w-1, h-1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    visited = [[False]*w for _ in range(h)]
    stack = []

    def close(c1, c2, tol):
        return all(abs(c1[i] - c2[i]) <= tol for i in range(3))

    # Seed all edge pixels
    for x in range(w):
        for y in (0, h-1):
            if not visited[y][x]:
                stack.append((x, y)); visited[y][x] = True
    for y in range(h):
        for x in (0, w-1):
            if not visited[y][x]:
                stack.append((x, y)); visited[y][x] = True

    # Flood fill from edges — only pixels matching bg become transparent
    while stack:
        x, y = stack.pop()
        if not close(px[x, y][:3], bg, tolerance):
            continue
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                visited[ny][nx] = True
                stack.append((nx, ny))

    # Soften cutout edges (anti-alias alpha halo)
    alpha = img.getchannel("A").filter(ImageFilter.GaussianBlur(1.2))
    img.putalpha(alpha)

    # Trim fully-transparent margins
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(dst)
    print(f"OK {dst} size={img.size}")

if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    tol = int(sys.argv[3]) if len(sys.argv) > 3 else 34
    remove_bg(src, dst, tol)