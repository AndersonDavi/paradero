#!/bin/zsh
# usage: capture.sh <lang-tag> <locale> <work-nick> <home-nick> <outdir>
D=${SIM_UDID:?set SIM_UDID to the booted simulator}
OUT=$5; mkdir -p $OUT
xcrun simctl terminate $D co.usecroma.paradero 2>/dev/null
xcrun simctl spawn $D defaults write -g AppleLanguages -array $1; xcrun simctl spawn $D defaults write -g AppleLocale $2
C=$(xcrun simctl get_app_container $D co.usecroma.paradero data); DB="$C/Documents/SQLite/ExpoSQLiteStorage"
V='[{"type":"stop","id":"9122","name":"Calle 72 - Areandina","nickname":"'$3'","lat":4.658444160925242,"lon":-74.06206208574395,"codes":["6","8","A52","A60","B18","B23"]},{"type":"stop","id":"10009","name":"Museo Nacional","nickname":"'$4'","lat":4.615377050772202,"lon":-74.06912730740493,"codes":["2","D81","F51","G47","H83","L81"]},{"type":"route","id":"10075","code":"B10","name":"Portal Norte","system":"troncal"},{"type":"route","id":"12429","code":"K635 · H635","name":"Montevideo – Arborizadora Alta","system":"zonal_urbano"},{"type":"route","id":"C_1","code":"CABLE","name":"Tunal – Mirador del Paraiso","system":"transmicable"}]'
sqlite3 "$DB" "insert or replace into storage values('saved.v1', '$V')"
xcrun simctl shutdown $D; xcrun simctl boot $D
xcrun simctl status_bar $D override --time "9:41" --dataNetwork 5g --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState discharging --batteryLevel 100
xcrun simctl privacy $D grant location co.usecroma.paradero; xcrun simctl location $D set 4.6590,-74.0598
xcrun simctl launch $D co.usecroma.paradero >/dev/null; sleep 35
shot(){ xcrun simctl io $D screenshot $OUT/$1.png >/dev/null 2>&1; }
shot home
xcrun simctl openurl $D "paradero://stop/9122"; sleep 14; shot stop
xcrun simctl openurl $D "paradero://route/${ROUTE:-10075}"; sleep 9; shot route
xcrun simctl openurl $D "paradero://saved"; sleep 6; shot saved
xcrun simctl openurl $D "paradero://search?q=calle%2072"; sleep 12; shot search
cd $5; magick home.png stop.png route.png saved.png search.png -resize 20% +append check.png
