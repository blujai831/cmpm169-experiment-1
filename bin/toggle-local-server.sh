#!/bin/bash

cd "$(dirname "$BASH_SOURCE")/.."

start-server() {
    local pid
    mkdir -p log.local
    nohup bash -c `
        `'cd ..; python3 -X cmpm169-experiment-1-server -m http.server'`
        ` > log.local/http.out`
        ` 2> log.local/http.err`
        ` & pid=$!
    disown $pid
    echo $pid > log.local/pid
    echo $pid
}

server-running() {
    grep cmpm169-experiment-1-server > /dev/null 2>&1 < <(
        ps a --pid $1 2>/dev/null | tail -n+2
    )
}

try-start-server() {
    local pid=$(start-server)
    sleep 1
    server-running $pid; return $?
}

try-stop-server() {
    if [[ ! -r log.local/pid ]]; then
        return 3
    else
        local pid=$(<log.local/pid)
        if server-running $pid; then
            kill $pid
            sleep 1
            if server-running $pid; then
                return 1
            else
                rm -f log.local/pid
                return 0
            fi
        else
            rm -f log.local/pid
            return 2
        fi
    fi
}

main() {
    if [[ -r log.local/pid ]]; then
        try-stop-server; local status=$?
        case $status in
        0)  echo "server stopped"
            return 0 ;;
        1)  echo>&2 "server failed to stop (pid $(<log.local/pid))"
            return 1 ;;
        2)  echo>&2 "pid file was stale; cleaned up, trying again"
            main; return $? ;;
        3)  echo>&2 "pid file snatched"
            return 3 ;;
        *)  echo>&2 "attempt to stop server gave unknown exit code $status"
            return $status ;;
        esac
    else
        try-start-server; local status=$?
        case $status in
        0)  echo "server started (pid $(<log.local/pid))"
            return 0 ;;
        1)  echo>&2 "server failed to start"
            rm -f log.local/pid
            if [[ -r log.local/http.err ]]; then
                cat>&2 log.local/http.err
            fi
            return 1 ;;
        *)  echo>&2 "attempt to start server gave unknown exit code $status"
            return $status ;;
        esac
    fi
}

main
