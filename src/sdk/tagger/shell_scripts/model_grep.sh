#!/bin/bash
# requires jq, grep
#
# Usage: ./model_grep.sh [-p path] [-u utilpath] <extended regex>

# number of cpus to use by default or use -j to specify
ncpu=$(nproc --all)
[ $ncpu -gt 8 ] && ncpu=8

path=.
utilpath=.

while [ $# -gt 1 ]; do
    case "$1" in
      -h|--help)
        echo "Usage: $0 [ -j ncpu] [-p path] [-u utilpath] <extended regex>"
        echo "  -j ncpu      number of cpus to use (default: $ncpu)"
        echo "  -p path      path to directory containing safetensor models (default: ./)"
        echo "  -u utilpath  path to safetensors_util.py"
        echo "  <extended regex>  extended regex to match against model names"
        exit 0
        ;;
      -j) ncpu="$2"; shift 2;;
      -p) path="$2"; shift 2;;
      -u) utilpath="$2"; shift 2;;
    esac
done

if [ ! -d "${path}" ]; then
  echo "Error: ${path} does not exist (use -p to specify path)"
  exit 1
fi

if [ ! -e "${utilpath}/safetensors_util.py" ]; then
  echo "Error: ${utilpath}/safetensors_util.py does not exist (use -u to specify path)"
  exit 1
fi

if [ -n "$1" ]; then
    echo "reading from $1 with $ncpu cpus" 1>&2
    ls -1 ${path}/*.safetensors | parallel -n 1 -j $ncpu "python ${utilpath}/safetensors_util.py metadata {} -pm 2>/dev/null |
    sed -n '1b;p' | jq '.__metadata__.ss_tag_frequency' 2>/dev/null | grep -o -E '\"[^\"]*${1}[^\"]*\": [0-9]+'| sed 's~^~'{}':~'"
else
    echo "reading from stdin" 1>&2
    tmp=$(mktemp)
    sed 's/^/"[^\"]*/;s/$/[^\"]*": [0-9]+/' < /dev/stdin > $tmp
    ls -1 ${path}/*.safetensors | parallel -n 1 -j $ncpu "python ${utilpath}/safetensors_util.py metadata {} -pm 2>/dev/null |
    sed -n '1b;p' | jq '.__metadata__.ss_tag_frequency' 2>/dev/null | grep -oE -f $tmp | sed 's~^~'{}':~'"
    echo rm $tmp
fi


