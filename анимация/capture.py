"""Сервер захвата кадров из окна Roblox Studio.

Скрипт в Studio выставляет кадр анимации и дёргает http://127.0.0.1:8791/shot?n=<номер>;
сервер снимает окно Studio через PrintWindow (работает, даже если окно перекрыто) и сохраняет PNG.
"""
import ctypes
import ctypes.wintypes as wt
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

from PIL import Image

ctypes.windll.shcore.SetProcessDpiAwareness(2)
user32, gdi32 = ctypes.windll.user32, ctypes.windll.gdi32
user32.GetDC.restype = wt.HDC
user32.GetDC.argtypes = [wt.HWND]
user32.ReleaseDC.argtypes = [wt.HWND, wt.HDC]
user32.PrintWindow.argtypes = [wt.HWND, wt.HDC, wt.UINT]
user32.GetClientRect.argtypes = [wt.HWND, ctypes.POINTER(wt.RECT)]
gdi32.CreateCompatibleDC.restype = wt.HDC
gdi32.CreateCompatibleDC.argtypes = [wt.HDC]
gdi32.CreateCompatibleBitmap.restype = wt.HBITMAP
gdi32.CreateCompatibleBitmap.argtypes = [wt.HDC, ctypes.c_int, ctypes.c_int]
gdi32.SelectObject.argtypes = [wt.HDC, wt.HGDIOBJ]
gdi32.DeleteObject.argtypes = [wt.HGDIOBJ]
gdi32.DeleteDC.argtypes = [wt.HDC]
gdi32.GetDIBits.argtypes = [wt.HDC, wt.HBITMAP, wt.UINT, wt.UINT, ctypes.c_void_p, ctypes.c_void_p, wt.UINT]


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [("biSize", wt.DWORD), ("biWidth", wt.LONG), ("biHeight", wt.LONG), ("biPlanes", wt.WORD),
                ("biBitCount", wt.WORD), ("biCompression", wt.DWORD), ("biSizeImage", wt.DWORD),
                ("biXPelsPerMeter", wt.LONG), ("biYPelsPerMeter", wt.LONG), ("biClrUsed", wt.DWORD),
                ("biClrImportant", wt.DWORD)]


def find_studio():
    found = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def cb(hwnd, _):
        if user32.IsWindowVisible(hwnd):
            n = user32.GetWindowTextLengthW(hwnd)
            buf = ctypes.create_unicode_buffer(n + 1)
            user32.GetWindowTextW(hwnd, buf, n + 1)
            if "Roblox Studio" in buf.value:
                found.append((hwnd, buf.value))
        return True

    user32.EnumWindows(cb, 0)
    return found


def grab(hwnd):
    rect = wt.RECT()
    user32.GetClientRect(hwnd, ctypes.byref(rect))
    w, h = rect.right, rect.bottom
    hdc = user32.GetDC(hwnd)
    mdc = gdi32.CreateCompatibleDC(hdc)
    bmp = gdi32.CreateCompatibleBitmap(hdc, w, h)
    gdi32.SelectObject(mdc, bmp)
    user32.PrintWindow(hwnd, mdc, 3)  # PW_CLIENTONLY | PW_RENDERFULLCONTENT
    bmi = BITMAPINFOHEADER()
    bmi.biSize, bmi.biWidth, bmi.biHeight, bmi.biPlanes, bmi.biBitCount = ctypes.sizeof(bmi), w, -h, 1, 32
    buf = ctypes.create_string_buffer(w * h * 4)
    gdi32.GetDIBits(mdc, bmp, 0, h, buf, ctypes.byref(bmi), 0)
    gdi32.DeleteObject(bmp)
    gdi32.DeleteDC(mdc)
    user32.ReleaseDC(hwnd, hdc)
    return Image.frombuffer("RGB", (w, h), buf, "raw", "BGRX", 0, 1)


def find_viewport(img):
    """Ищет прямоугольник, залитый калибровочным цветом (255, 0, 255)."""
    px = img.load()
    w, h = img.size
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if r > 240 and g < 20 and b > 240:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs) + 2, max(ys) + 2


class Handler(BaseHTTPRequestHandler):
    hwnd, out, box = None, None, None

    def log_message(self, *a):
        pass

    def do_GET(self):
        url = urlparse(self.path)
        q = parse_qs(url.query)
        body = "ok"
        if url.path == "/calibrate":
            Handler.box = find_viewport(grab(Handler.hwnd))
            body = "box=%s" % (Handler.box,)
        elif url.path == "/shot":
            img = grab(Handler.hwnd)  # окно целиком; область кадра вырезает build.sh
            img.save(os.path.join(Handler.out, "f%05d.png" % int(q["n"][0])), compress_level=1)
        elif url.path == "/file":
            # отдаёт исходник, чтобы Studio мог подтянуть модуль: сначала из папки ролика
            # (текущей), затем из корня проекта, где лежат общие модули
            name = os.path.basename(q["name"][0])
            path = name if os.path.exists(name) else os.path.join(os.path.dirname(os.path.abspath(__file__)), name)
            with open(path, encoding="utf-8") as f:
                body = f.read()
        elif url.path == "/quit":
            self.send_response(200); self.end_headers(); self.wfile.write(b"bye")
            os._exit(0)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(body.encode())


if __name__ == "__main__":
    wins = find_studio()
    if not wins:
        sys.exit("Окно Roblox Studio не найдено")
    Handler.hwnd = wins[0][0]
    if len(sys.argv) > 2 and sys.argv[1] == "test":
        grab(Handler.hwnd).save(sys.argv[2])
        print("saved", wins)
        sys.exit(0)
    Handler.out = sys.argv[1] if len(sys.argv) > 1 else os.path.join("сборка", "frames")
    os.makedirs(Handler.out, exist_ok=True)
    HTTPServer(("127.0.0.1", 8791), Handler).serve_forever()
