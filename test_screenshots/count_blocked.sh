#!/bin/zsh

TOTAL=$(identify "*.png" | grep -c ".png")
BLOCKED=$(identify "*.png" | grep -c "800x600")

if [ "$TOTAL" -eq "0" ]; then
  echo "No .png images present"
  return 0
fi

echo "Total searches: $TOTAL"
echo "Blocked searches: $BLOCKED"
echo "Success ratio: $(( 100 - (BLOCKED * 100 / TOTAL) ))%"
return 0
