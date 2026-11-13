"""Run ODS's own model selector (ods/scripts/select-model.py) for many machines.

Usage: python3 select_batch.py <ods-checkout>  < jobs.json  > results.json

jobs.json is a list of argument lists, each passed to select-model.py's
main() exactly as the installer passes them on the command line. Each result
is {"code": exit code, "out": stdout, "err": stderr}. One Python process
answers every job, so the build doesn't start the selector hundreds of times.
"""

import contextlib
import importlib.util
import io
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
script = root / "ods" / "scripts" / "select-model.py"
spec = importlib.util.spec_from_file_location("ods_select_model", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

results = []
for argv in json.load(sys.stdin):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = module.main(argv)
    results.append({"code": code, "out": out.getvalue(), "err": err.getvalue()})
json.dump(results, sys.stdout)
