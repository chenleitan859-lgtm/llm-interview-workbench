# -*- coding: utf-8 -*-
"""重建后把工作台发布到 GitHub 仓库（用 Contents API，绕开 443 直连限制）。
用法: python workbench_src\publish_to_github.py
前置: 已安装 gh CLI 且已登录（gh auth status）。
"""
import base64, json, os, subprocess, tempfile, urllib.parse

OWNER = "chenleitan859-lgtm"
REPO = "llm-interview-workbench"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = [".gitignore", "deploy/README.md", "deploy/index.html", "qa_data.json",
         "workbench_src/app.js", "workbench_src/build.py", "workbench_src/template.html",
         "workbench_src/publish_to_github.py", "LLM面试题学习工作台.html"]

body_path = os.path.join(tempfile.gettempdir(), "gh_body.json")
for rel in FILES:
    p = os.path.join(ROOT, rel)
    if not os.path.isfile(p):
        print("SKIP (missing)", rel)
        continue
    data = open(p, "rb").read()
    content = base64.b64encode(data).decode()
    body = {"message": "Update " + rel, "content": content}
    open(body_path, "w", encoding="utf-8").write(json.dumps(body, ensure_ascii=False))
    enc = urllib.parse.quote(rel, safe="")
    ep = "repos/%s/%s/contents/%s" % (OWNER, REPO, enc)
    r = subprocess.run(["gh", "api", "-X", "PUT", ep, "--input", body_path],
                       capture_output=True, text=True, encoding="utf-8", timeout=120)
    print(("OK  " if r.returncode == 0 else "FAIL") + " " + rel)
    if r.returncode != 0:
        print((r.stdout or r.stderr)[:300])
