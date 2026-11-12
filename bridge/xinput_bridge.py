"""
Chef Corey XInput bridge (Windows, Python 3 standard library only).

Why this exists: since OBS 31, the OBS Browser Source stops receiving
Gamepad API input whenever OBS is not the focused window, so the overlay
freezes while a game is in focus. This bridge reads Xbox/XInput controllers
directly from Windows (no focus requirement) and streams their state to the
overlay over Server-Sent Events.

It also serves this repository's files, so the most reliable OBS URL is:
    http://127.0.0.1:27645/overlay.html?skin=v1

Run:  py bridge\\xinput_bridge.py      (or double-click "Start Controller Bridge.py")
"""
import ctypes
import json
import os
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
PORT = int(os.environ.get("CHEFCOREY_BRIDGE_PORT", "27645"))
POLL_HZ = 250
SEND_HZ = 120
KEEPALIVE_S = 0.5
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class XINPUT_GAMEPAD(ctypes.Structure):
    _fields_ = [
        ("wButtons", ctypes.c_ushort),
        ("bLeftTrigger", ctypes.c_ubyte),
        ("bRightTrigger", ctypes.c_ubyte),
        ("sThumbLX", ctypes.c_short),
        ("sThumbLY", ctypes.c_short),
        ("sThumbRX", ctypes.c_short),
        ("sThumbRY", ctypes.c_short),
    ]


class XINPUT_STATE(ctypes.Structure):
    _fields_ = [("dwPacketNumber", ctypes.c_uint), ("Gamepad", XINPUT_GAMEPAD)]


def load_xinput():
    for name in ("xinput1_4", "xinput1_3", "xinput9_1_0"):
        try:
            dll = ctypes.WinDLL(name)
        except OSError:
            continue
        # Ordinal 100 (XInputGetStateEx) also reports the Guide button.
        try:
            fn = dll[100]
            guide = True
        except (AttributeError, OSError):
            fn = dll.XInputGetState
            guide = False
        fn.argtypes = [ctypes.c_uint, ctypes.POINTER(XINPUT_STATE)]
        fn.restype = ctypes.c_uint
        return fn, name, guide
    sys.exit("No XInput DLL found. This bridge only runs on Windows.")


# Standard Gamepad API button order -> XInput bit (triggers handled separately).
BUTTON_BITS = {
    0: 0x1000, 1: 0x2000, 2: 0x4000, 3: 0x8000,   # A B X Y
    4: 0x0100, 5: 0x0200,                          # LB RB
    8: 0x0020, 9: 0x0010,                          # View Menu
    10: 0x0040, 11: 0x0080,                        # LS RS click
    12: 0x0001, 13: 0x0002, 14: 0x0004, 15: 0x0008,  # D-pad U D L R
    16: 0x0400,                                    # Guide (Ex only)
}


def norm_axis(value, invert=False):
    v = max(-1.0, min(1.0, value / 32767.0))
    return round(-v if invert else v, 4)


def to_pad(slot, state):
    g = state.Gamepad
    buttons = [0.0] * 17
    for index, bit in BUTTON_BITS.items():
        buttons[index] = 1.0 if g.wButtons & bit else 0.0
    buttons[6] = round(g.bLeftTrigger / 255.0, 4)
    buttons[7] = round(g.bRightTrigger / 255.0, 4)
    axes = [
        norm_axis(g.sThumbLX), norm_axis(g.sThumbLY, invert=True),
        norm_axis(g.sThumbRX), norm_axis(g.sThumbRY, invert=True),
    ]
    return {"index": slot, "id": f"XInput controller {slot + 1} (bridge)", "buttons": buttons, "axes": axes}


class Poller(threading.Thread):
    """Polls XInput slots. Empty slots are rechecked once a second because
    querying a disconnected slot is slow."""

    def __init__(self, get_state):
        super().__init__(daemon=True)
        self.get_state = get_state
        self.lock = threading.Lock()
        self.payload = json.dumps({"pads": []})
        self.connected = [False] * 4
        self.next_scan = [0.0] * 4

    def run(self):
        state = XINPUT_STATE()
        while True:
            now = time.monotonic()
            pads = []
            for slot in range(4):
                if not self.connected[slot] and now < self.next_scan[slot]:
                    continue
                ok = self.get_state(slot, ctypes.byref(state)) == 0
                if ok != self.connected[slot]:
                    print(f"[bridge] controller {slot + 1} {'connected' if ok else 'disconnected'}", flush=True)
                self.connected[slot] = ok
                if ok:
                    pads.append(to_pad(slot, state))
                else:
                    self.next_scan[slot] = now + 1.0
            with self.lock:
                self.payload = json.dumps({"pads": pads}, separators=(",", ":"))
            time.sleep(1.0 / POLL_HZ)

    def snapshot(self):
        with self.lock:
            return self.payload


class Handler(SimpleHTTPRequestHandler):
    poller = None

    def end_headers(self):
        # Lets the GitHub Pages overlay (https) reach this local bridge.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        if self.path.split("?")[0] != "/events":
            return super().do_GET()
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        last, last_sent = None, 0.0
        try:
            while True:
                payload = self.poller.snapshot()
                now = time.monotonic()
                if payload != last or now - last_sent >= KEEPALIVE_S:
                    self.wfile.write(f"data: {payload}\n\n".encode())
                    self.wfile.flush()
                    last, last_sent = payload, now
                time.sleep(1.0 / SEND_HZ)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def log_message(self, fmt, *args):
        if "/events" not in (args[0] if args else ""):
            super().log_message(fmt, *args)


def main():
    get_state, dll_name, guide = load_xinput()
    poller = Poller(get_state)
    poller.start()
    Handler.poller = poller
    server = ThreadingHTTPServer((HOST, PORT), partial(Handler, directory=REPO_ROOT))
    server.daemon_threads = True
    print(f"[bridge] using {dll_name} (guide button: {'yes' if guide else 'no'})")
    print(f"[bridge] OBS Browser Source URL: http://{HOST}:{PORT}/overlay.html?skin=v1")
    print("[bridge] leave this window open while streaming; Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
