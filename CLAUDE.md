# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Chinese-language research documentation repository** on Brain-Computer Interface (BCI) technology. There is no application code, build system, or test suite — the entire project consists of Markdown documents organized as a structured knowledge base.

The research supports a related project called **MindOctopus** (part of the OpenOctopus ecosystem), which is building a `channel-brainwave` adapter using BrainFlow + Muse 2 hardware on a Node.js/TypeScript stack.

## Document Architecture

Documents in `docs/` follow a numbered progression from foundational to applied:

- **01–07**: Foundation layer — BCI fundamentals, core technology, companies, applications, open-source resources, ethics/regulation, China landscape
- **08–09**: AI fusion layer — BCI+AI integration patterns, BCI Agent architecture design
- **10–11**: Implementation layer — SDK selection for MindOctopus, Neuralink full-stack deep dive

Each document is self-contained but builds on concepts from earlier documents. The numbering reflects reading order and conceptual dependency.

## Writing Conventions

- All research content is written in **Simplified Chinese** (标题、正文、表格均使用中文)
- English is used only for technical terms, product names, and abbreviations (e.g., EEG, BCI, Neuralink, LLM)
- Documents use extensive **ASCII art diagrams** (box-drawing characters) for architecture visualizations
- Data is presented in **Markdown tables** with Chinese headers
- Each document starts with a `# 标题` and uses numbered `## 1. 章节` sections
- Blockquote `>` is used for document-level abstracts or scope declarations

## BCI Agent MVP (`app/`)

Python application: BrainFlow (synthetic EEG) → band power extraction → brain state classification → LangGraph agent (Claude LLM).

### Commands

```bash
cd app
uv venv --python 3.13 && source .venv/bin/activate
uv pip install -e ".[dev]"

# Run tests
.venv/bin/python -m pytest tests/ -v

# Run the agent (needs ANTHROPIC_API_KEY in .env)
.venv/bin/python -m bci_agent.main
```

### Architecture

- `signal.py` — `SignalSource` (BrainFlow wrapper) + `extract_band_powers()` (bandpass filter → δθαβγ powers)
- `decoder.py` — `classify_state()` (frequency ratio rules) + `decode_intent()` → `BrainIntent`
- `tools.py` — LangChain `@tool` functions (time, notes, activity suggestions)
- `agent.py` — LangGraph `StateGraph`: interpret → llm → tools/respond loop
- `main.py` — Main loop: capture → process → decode → agent on state change

## References

`references/sources.md` contains all cited sources organized by category (综合报告、企业与产品、技术分类、前沿突破、开源资源、伦理与法规、中国政策、市场数据). New references should be added to the appropriate category section.
