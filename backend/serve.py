from waitress import serve
from app import app

if __name__ == "__main__":
    print("=" * 52)
    print("  PT Flotech Controls Indonesia")
    print("  Management System — Production Server")
    print("  Running on http://0.0.0.0:5000")
    print("=" * 52)
    serve(app, host="0.0.0.0", port=5000, threads=8)