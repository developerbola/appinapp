#!/bin/bash

# Enable debugging - remove this line in production
# set -x

LOG_FILE="./log.txt"
LOG_DIR=$(dirname "$LOG_FILE")

mkdir -p "$LOG_DIR"

TODAY="$(date +%Y-%m-%d 2>/dev/null || date -v 0d +%Y-%m-%d 2>/dev/null)"

if [ -z "$TODAY" ]; then
    echo "Error: Failed to get today's date." >&2
    exit 1
fi

# Check if log file exists and is from today
if [ -f "$LOG_FILE" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        FILE_DATE=$(stat -f "%Sm" -t "%Y-%m-%d" "$LOG_FILE" 2>/dev/null)
    else
        FILE_DATE=$(date -r "$LOG_FILE" +%Y-%m-%d 2>/dev/null)
    fi
    
    if [ "$FILE_DATE" = "$TODAY" ]; then
        # Check if file has valid content
        if [ -s "$LOG_FILE" ] && grep -q ":" "$LOG_FILE"; then
            cat "$LOG_FILE"
            exit 0
        fi
    fi
fi

# Generate array of dates
DATES=()
DATES+=("$TODAY")
for i in {1..7}; do
    if [[ "$OSTYPE" == "darwin"* ]]; then
        PREV_DATE=$(date -v-${i}d +%Y-%m-%d 2>/dev/null)
    else
        PREV_DATE=$(date -d "$TODAY - $i days" +%Y-%m-%d 2>/dev/null)
    fi
    
    if [ -z "$PREV_DATE" ]; then
        echo "Error: Failed to calculate date for $i days ago." >&2
        exit 1
    fi
    DATES+=("$PREV_DATE")
done

RATES=()
DIFFS=()
ACTUAL_DATES=()

# Fetch currency data
for DATE in "${DATES[@]}"; do
    MAX_RETRIES=3
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        URL="https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/$DATE/"
        
        # Fetch with timeout
        RESPONSE=$(curl -s --connect-timeout 10 --max-time 30 "$URL" 2>/dev/null)
        
        if [ -z "$RESPONSE" ]; then
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                sleep 1
                continue
            fi
            echo "Warning: Failed to fetch data for $DATE after $MAX_RETRIES attempts" >&2
            RATES+=("N/A")
            DIFFS+=("N/A")
            ACTUAL_DATES+=("$DATE")
            break
        fi
        
        # Parse rate
        RATE=$(echo "$RESPONSE" | grep -o '"Rate":"[0-9.]*"' | sed 's/"Rate":"\(.*\)"/\1/')
        
        if [ -z "$RATE" ]; then
            # Try going back one day if no rate found
            if [[ "$OSTYPE" == "darwin"* ]]; then
                DATE=$(date -v-1d -j -f "%Y-%m-%d" "$DATE" +%Y-%m-%d 2>/dev/null)
            else
                DATE=$(date -d "$DATE - 1 day" +%Y-%m-%d 2>/dev/null)
            fi
            
            if [ -z "$DATE" ]; then
                RATES+=("N/A")
                DIFFS+=("N/A")
                ACTUAL_DATES+=("$DATE")
                break
            fi
            continue
        fi
        
        # Check if rate is duplicate (weekend/holiday)
        if [[ " ${RATES[@]} " =~ " $RATE " ]]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                DATE=$(date -v-1d -j -f "%Y-%m-%d" "$DATE" +%Y-%m-%d 2>/dev/null)
            else
                DATE=$(date -d "$DATE - 1 day" +%Y-%m-%d 2>/dev/null)
            fi
            
            if [ -z "$DATE" ]; then
                RATES+=("N/A")
                DIFFS+=("N/A")
                ACTUAL_DATES+=("$DATE")
                break
            fi
            continue
        fi
        
        # Parse diff
        DIFF=$(echo "$RESPONSE" | grep -o '"Diff":"[-0-9.]*"' | sed 's/"Diff":"\(.*\)"/\1/')
        [ -z "$DIFF" ] && DIFF="0"
        
        # Parse actual date from API
        API_DATE=$(echo "$RESPONSE" | grep -o '"Date":"[0-9-]*"' | sed 's/"Date":"\(.*\)"/\1/')
        [ -z "$API_DATE" ] && API_DATE="$DATE"
        
        RATES+=("$RATE")
        DIFFS+=("$DIFF")
        ACTUAL_DATES+=("$API_DATE")
        break
    done
done

# Build output string
OUTPUT=""
for i in {0..7}; do
    DATE=${ACTUAL_DATES[$i]:-""}
    RATE=${RATES[$i]:-"N/A"}
    DIFF=${DIFFS[$i]:-"N/A"}
    
    [ -z "$DATE" ] && DATE="unknown"
    
    TRIPLET="$DATE:$RATE:$DIFF"
    if [ -z "$OUTPUT" ]; then
        OUTPUT="$TRIPLET"
    else
        OUTPUT="$OUTPUT!!$TRIPLET"
    fi
done

# Save to log file
echo "$OUTPUT" > "$LOG_FILE"

# Output result
echo "$OUTPUT"