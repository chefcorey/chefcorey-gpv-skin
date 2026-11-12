"""Double-click this file to start the Chef Corey controller bridge.

It runs through the signed Python launcher, so Windows Smart App Control
doesn't block it the way it blocks downloaded .bat files. The window stays
open on errors so you can read what went wrong.
"""
import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "bridge"))

try:
    import xinput_bridge
    xinput_bridge.main()
except SystemExit as exc:
    if exc.code not in (None, 0):
        print(exc.code)
        input("\nPress Enter to close...")
except Exception:
    traceback.print_exc()
    input("\nSomething went wrong (details above). Press Enter to close...")
