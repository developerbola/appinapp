# Get today's date
TODAY="$(date +%Y-%m-%d 2>/dev/null || date -v 0d +%Y-%m-%d 2>/dev/null)"

if [ -z "$TODAY" ]; then
    echo "Error: Failed to get today's date." >&2
    exit 1
fi

# Build array of dates (today + 7 previous days)
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

# Initialize arrays for storing results
RATES=()
DIFFS=()
ACTUAL_DATES=()

# Fetch data for each date
for DATE in "${DATES[@]}"; do
    MAX_RETRIES=3
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        URL="https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/$DATE/"
        
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
        
        RATE=$(echo "$RESPONSE" | grep -o '"Rate":"[0-9.]*"' | sed 's/"Rate":"\(.*\)"/\1/')
        
        if [ -z "$RATE" ]; then
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
        
        DIFF=$(echo "$RESPONSE" | grep -o '"Diff":"[-0-9.]*"' | sed 's/"Diff":"\(.*\)"/\1/')
        [ -z "$DIFF" ] && DIFF="0"
        
        API_DATE=$(echo "$RESPONSE" | grep -o '"Date":"[0-9-]*"' | sed 's/"Date":"\(.*\)"/\1/')
        [ -z "$API_DATE" ] && API_DATE="$DATE"
        
        RATES+=("$RATE")
        DIFFS+=("$DIFF")
        ACTUAL_DATES+=("$API_DATE")
        break
    done
done

# Build output state (single variable containing all data)
CURRENCY_DATA=""
for i in {0..7}; do
    DATE=${ACTUAL_DATES[$i]:-""}
    RATE=${RATES[$i]:-"N/A"}
    DIFF=${DIFFS[$i]:-"N/A"}
    
    [ -z "$DATE" ] && DATE="unknown"
    
    TRIPLET="$DATE:$RATE:$DIFF"
    if [ -z "$CURRENCY_DATA" ]; then
        CURRENCY_DATA="$TRIPLET"
    else
        CURRENCY_DATA="$CURRENCY_DATA!!$TRIPLET"
    fi
done

# Output the result
echo "$CURRENCY_DATA"