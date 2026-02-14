"""
Remove __pycache__ and other Python artifacts from the extension folder.
Chrome refuses to load extensions with files/dirs starting with _.

Run before loading the extension if you get "Failed to load extension":
    python clean_for_extension.py
"""
import os
import shutil

BASE = os.path.dirname(os.path.abspath(__file__))


def main():
    removed = []
    for root, dirs, _ in os.walk(BASE, topdown=False):
        for d in dirs:
            if d in ('__pycache__', '.pytest_cache'):
                path = os.path.join(root, d)
                if os.path.isdir(path):
                    shutil.rmtree(path, ignore_errors=True)
                    removed.append(os.path.relpath(path, BASE))
    # Also remove __pycache__ that Python may have created during this script's run
    pc = os.path.join(BASE, '__pycache__')
    if os.path.isdir(pc):
        shutil.rmtree(pc, ignore_errors=True)
        if '__pycache__' not in removed:
            removed.append('__pycache__')

    if removed:
        print(f"Removed: {', '.join(removed)}")
    else:
        print("No cache directories found.")
    print("Extension folder is clean. Reload in chrome://extensions")


if __name__ == '__main__':
    main()
