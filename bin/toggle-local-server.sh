#!/bin/bash
if [[ -e log.local/pid ]]; then
    pid=$(<log.local/pid)
    if ps --pid $pid > /dev/null 2>&1; then
        kill $pid
        rm -rf log.local
        sleep 1
        if ps --pid $pid > /dev/null 2>&1; then
            echo>&2 "server will not stop (pid $pid)"
            exit 1
        else
            echo "server stopped"
        fi
    else
        echo "cleaning up stale server pid file"
        rm -f log.local/pid
        exec "$BASH_SOURCE"
    fi
else
    mkdir -p log.local
    nohup bash -c 'cd ..; python3 -m http.server'`
        ` > log.local/http.out`
        ` 2> log.local/http.err`
        ` & pid=$!
    disown $pid
    echo $pid > log.local/pid
    sleep 1
    if ps --pid $pid > /dev/null 2>&1; then
        echo "server running (pid $pid)"
    else
        echo>&2 "server failed to start"
        if [[ -e log.local/http.err ]]; then
            cat>&2 log.local/http.err
        fi
        rm -rf log.local
        exit 1
    fi
fi
