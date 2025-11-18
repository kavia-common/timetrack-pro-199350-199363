#!/bin/bash
cd /home/kavia/workspace/code-generation/timetrack-pro-199350-199363/chronose_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

