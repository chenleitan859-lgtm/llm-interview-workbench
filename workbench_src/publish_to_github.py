# -*- coding: utf-8 -*-
"""重建后把工作台发布到 GitHub 仓库（用 Contents API，绕开 443 直连限制）。

用法: python workbench_src/publish_to_github.py
前置: 已安装 gh CLI 且已登录（gh auth status）。
"""
import base64, json, os, subprocess, tempfile, urllib.parse

OWNER = "chenleitan859-lgtm"
REPO = "llm-interview-workbench"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = [".gitignore", "deploy/README.md", "deploy/index.html", "qa_data.json",
         "workbench_src/app.js", "workbench_src/build.py", "workbench_src/template.html",
         "workbench_src/publish_to_github.py", "LLM面试题学习工作台.html"]


def gh(*args, check=False):
    r = subprocess.run(["gh", "api", *args], capture_output=True, text=True,
                       encoding="utf-8", timeout=120)
    if check and r.returncode != 0:
        raise RuntimeError((r.stdout or r.stderr)[:400])
    return r


def get_sha(enc):
    r = gh("repos/%s/%s/contents/%s" % (OWNER, REPO, enc), check=False)
    if r.returncode == 0:
        return json.loads(r.stdout).get("sha")
    return None


body_path = os.path.join(tempfile.gettempdir(), "gh_body.json")
for rel in FILES:
    p = os.path.join(ROOT, rel)
    if not os.path.isfile(p):
        print("SKIP (missing)", rel)
        continue
    enc = urllib.parse.quote(rel, safe="")
    sha = get_sha(enc)
    data = open(p, "rb").read()
    body = {"message": "Update " + rel, "content": base64.b64encode(data).decode()}
    if sha:
        body["sha"] = sha
    open(body_path, "w", encoding="utf-8").write(json.dumps(body, ensure_ascii=False))
    r = gh("-X", "PUT", "repos/%s/%s/contents/%s" % (OWNER, REPO, enc), "--input", body_path)
    print(("OK  " if r.returncode == 0 else "FAIL") + " " + rel)
    if r.returncode != 0:
        print((r.stdout or r.stderr)[:300])
