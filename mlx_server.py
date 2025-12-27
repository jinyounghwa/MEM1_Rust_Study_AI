#!/usr/bin/env python3
"""
MLX LLM Server Startup Script
Initializes and runs the MLX server with Qwen 2.5 7B Instruct 4-bit model
"""

import subprocess
import sys
import time
import os
from pathlib import Path

def check_mlx_installed():
    """Check if mlx-lm is installed"""
    try:
        import mlx_lm
        return True
    except ImportError:
        print("❌ mlx-lm is not installed")
        print("Install it with: pip install mlx-lm")
        return False

def wait_for_server(port=8080, timeout=60):
    """Wait for MLX server to be ready"""
    import socket
    import time

    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('127.0.0.1', port))
            sock.close()
            if result == 0:
                print(f"✅ MLX Server is ready on port {port}")
                return True
        except:
            pass

        time.sleep(1)
        elapsed = int(time.time() - start_time)
        if elapsed % 10 == 0:
            print(f"⏳ Waiting for MLX server... ({elapsed}s)")

    return False

def start_mlx_server():
    """Start MLX server with Qwen model"""
    print("=" * 70)
    print("🚀 Starting MLX Server with Qwen 2.5 7B Instruct 4-bit")
    print("=" * 70)

    # Check if mlx-lm is installed
    if not check_mlx_installed():
        sys.exit(1)

    model_id = "mlx-community/Qwen2.5-7B-Instruct-4bit"

    print(f"\n📦 Model: {model_id}")
    print("🔧 Configuration:")
    print("   - Host: 127.0.0.1")
    print("   - Port: 8080")
    print("   - API: OpenAI Compatible")
    print("   - Type: Non-streaming (default)")

    # Start the server
    cmd = [
        sys.executable,
        "-m",
        "mlx_lm.server",
        "--model",
        model_id,
        "--host",
        "127.0.0.1",
        "--port",
        "8080",
        "--max-tokens",
        "800",
        "--temperature",
        "0.6"
    ]

    print(f"\n▶️ Command: {' '.join(cmd)}\n")

    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

        # Wait for server to be ready
        print("⏳ Loading model and starting server...")
        time.sleep(5)

        if wait_for_server(timeout=120):
            print("\n" + "=" * 70)
            print("✅ MLX Server is running successfully!")
            print("=" * 70)
            print("\n📍 Server Details:")
            print("   - URL: http://localhost:8080")
            print("   - API Endpoint: http://localhost:8080/v1/chat/completions")
            print("   - Docs: http://localhost:8080/docs")
            print("\n🔗 Backend Configuration:")
            print("   - Backend connects at: http://localhost:8080/v1")
            print("   - Check health: curl http://localhost:3001/api/rust-learn/health")
            print("\n💡 To stop the server, press Ctrl+C")
            print("=" * 70 + "\n")

            # Keep the process running
            process.wait()
        else:
            print("❌ Server failed to start within timeout")
            process.terminate()
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n\n⏹️ Stopping MLX server...")
        process.terminate()
        process.wait(timeout=5)
        print("✅ MLX server stopped")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting MLX server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_mlx_server()
