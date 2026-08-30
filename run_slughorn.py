import subprocess
import sys
import os
import time

def main():
    print("=" * 65)
    print("  SLUGHORN'S HOURGLASS: AMBIENT MULTIMODAL CONVERSATION AI")
    print("=" * 65)
    print("\nStarting FastAPI Backend on http://127.0.0.1:8000 ...")
    
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    
    # 1. Start backend process
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=root_dir
    )
    
    time.sleep(2)
    print("\nStarting React + Vite Frontend on http://localhost:5173 ...")
    
    # 2. Start frontend dev process
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=frontend_dir,
        shell=True
    )
    
    print("\n" + "=" * 65)
    print("  System is live!")
    print("  • Frontend Studio & Widget: http://localhost:5173")
    print("  • Backend REST & WebSocket API: http://127.0.0.1:8000")
    print("  • API Documentation (Swagger): http://127.0.0.1:8000/docs")
    print("=" * 65)
    print("\nPress Ctrl+C to stop both servers.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
