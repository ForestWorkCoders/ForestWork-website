

set /a "x = 1"
set /a "y = 1"
cd Round_1

:more_to_process
    if %x% leq 6 (
        :rename
        cd assets
        if %y% leq 20 (
            cd %y%
            del /Q *
            set /a "y = y + 1"
            cd ..
            goto :rename
        )
        set /a "y = 0"
        cd Round_%x%
        set /a "x = x + 1"
        goto :more_to_process
    )

pause