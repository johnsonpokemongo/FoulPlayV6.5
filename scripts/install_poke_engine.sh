#!/usr/bin/env bash
set -euo pipefail
. .venv/bin/activate
pip install "poke-engine==0.0.46" --config-settings=build-args="--features poke-engine/terastallization --no-default-features" || pip install "poke-engine==0.0.46"
python - <<'PY'
import importlib, sys
try:
    importlib.import_module("poke_engine")
    print("poke_engine: OK")
except Exception as e:
    print("poke_engine: FAIL", e)
    sys.exit(1)
PY
