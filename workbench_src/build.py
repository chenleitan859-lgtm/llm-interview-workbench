# -*- coding: utf-8 -*-
import json, os
SRC = r"C:\Users\覃晨磊\methodology-clawbot\workbench_src"
ROOT = r"C:\Users\覃晨磊\methodology-clawbot"

tpl = open(os.path.join(SRC, "template.html"), encoding="utf-8").read()
js = open(os.path.join(SRC, "app.js"), encoding="utf-8").read()
data = open(os.path.join(ROOT, "qa_data.json"), encoding="utf-8").read()
data = data.replace("</", "<\\/")

out = tpl.replace("__DATA_JSON__", data).replace('<script src="app.js"></script>', "<script>\n" + js + "\n</script>")
path = os.path.join(ROOT, "LLM面试题学习工作台.html")
open(path, "w", encoding="utf-8").write(out)
print("written", path, len(out.encode('utf-8')), "bytes")

deploy_dir = os.path.join(ROOT, "deploy")
os.makedirs(deploy_dir, exist_ok=True)
deploy_path = os.path.join(deploy_dir, "index.html")
open(deploy_path, "w", encoding="utf-8").write(out)
print("written", deploy_path)
