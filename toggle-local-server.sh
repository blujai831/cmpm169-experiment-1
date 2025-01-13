#!/bin/bash
if [[ -e log.local/pid ]]; then
    pid=$(<log.local/pid)
    kill $pid
    rm -rf log.local
    sleep 1
    if ps --pid $pid > /dev/null 2>&1; then
        echo "server will not stop (pid $pid)"
    else
        echo "server stopped"
    fi
else
    mkdir -p log.local
    nohup python3 -m http.server`
        ` > log.local/http.out`
        ` 2> log.local/http.err`
        ` & pid=$!
    disown $pid
    echo $pid > log.local/pid
    sleep 1
    if ps --pid $pid > /dev/null 2>&1; then
        echo "server running (pid $pid)"
    else
        echo "server failed to start"
        if [[ -e log.local/http.err ]]; then
            cat log.local/http.err
        fi
        rm -rf log.local
    fi
fi
