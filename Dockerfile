# Hermetic benchmark runner for Low or Bust: node + the Claude Code CLI and
# nothing else. Sessions inside see ONLY the mounted sandbox and the auth
# volume — no host filesystem, no global CLAUDE.md, no project memory.
FROM node:22-slim
RUN npm install -g @anthropic-ai/claude-code
WORKDIR /work
ENTRYPOINT ["claude"]
