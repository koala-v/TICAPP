@echo on
set target="\\192.168.0.230\wwwroot\app\wms\tic"
xcopy /y/e/s www %target%\www

pause

copy /y index.html %target%
copy /y update.json %target%
copy /y TIC.apk %target%\TIC.apk
del TIC.apk /f /q

pause 