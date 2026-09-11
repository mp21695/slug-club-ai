import os
import sys
import time
import subprocess
import urllib.request

def is_server_running(url):
    try:
        with urllib.request.urlopen(url, timeout=1) as response:
            return response.status == 200
    except Exception:
        return False

def main():
    print("=" * 65)
    print("  ⏳ SLUGHORN'S HOURGLASS: NATIVE TRANSPARENT FLOATING WIDGET")
    print("=" * 65)

    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")

    backend_proc = None
    frontend_proc = None

    # 1. Start Backend if not already running
    if not is_server_running("http://127.0.0.1:8000/"):
        print("\nStarting FastAPI Backend on http://127.0.0.1:8000 ...")
        backend_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=root_dir
        )
        time.sleep(2)
    else:
        print("\nBackend is active on http://127.0.0.1:8000.")

    # 2. Start Frontend if not already running
    if not is_server_running("http://localhost:5173/"):
        print("Starting React Frontend on http://localhost:5173 ...")
        frontend_proc = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=frontend_dir,
            shell=True
        )
        time.sleep(3)
    else:
        print("Frontend is active on http://localhost:5173.")

    print("\nLaunching Native Transparent Desktop Pixel Hourglass...")
    print("• 100% Genuine OS Transparency (Only the hourglass floats on your screen)")
    print("• Stays on top of other windows (Zoom, Discord, YouTube, Games)")
    print("• Click and drag the hourglass anywhere to reposition")
    print("• Click or press Space to start/pause conversational sensing")
    print("• Global hotkey Ctrl+Shift+H to show/hide")
    print("=" * 65)

    # 3. Launch Electron Native Transparent Window
    local_electron_exe = os.path.join(frontend_dir, "node_modules", "electron", "dist", "electron.exe")
    main_cjs = os.path.join(root_dir, "electron", "main.cjs")

    if os.path.exists(local_electron_exe):
        electron_cmd = [local_electron_exe, main_cjs]
        electron_proc = subprocess.Popen(electron_cmd, cwd=frontend_dir)
    else:
        electron_proc = subprocess.Popen(
            ["npx", "electron", "../electron/main.cjs"],
            cwd=frontend_dir,
            shell=True
        )

    try:
        electron_proc.wait()
    finally:
        print("\nClosing desktop widget...")
        if backend_proc:
            backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()
        print("Done.")

if __name__ == "__main__":
    main()
