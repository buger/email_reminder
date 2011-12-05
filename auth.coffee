EVENT_FEED_URL = "https://www.google.com/calendar/feeds/default/private/full";

handleError = (e) ->
    if (e instanceof Error)    
        console.error('Error at line ' + e.lineNumber +
        ' in ' + e.fileName + '\n' +
        'Message: ' + e.message)    

        if e.cause
          errorStatus = e.cause.status
          statusText = e.cause.statusText

          console.error('Root cause: HTTP error ' + errorStatus + ' with status text of: ' +
              statusText)        
    else
        console.error e.toString()
            

google.setOnLoadCallback ->
    google.gdata.client.init(handleError)

    token = google.accounts.user.checkLogin(EVENT_FEED_URL)
    console.log 'token:', token

    myService = new google.gdata.calendar.CalendarService("Email Reminder")

    if google.accounts.user.checkLogin(EVENT_FEED_URL)          
        true
    else
        #token = google.accounts.user.login(EVENT_FEED_URL)
        console.log token