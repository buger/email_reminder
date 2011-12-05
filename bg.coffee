oauth = ChromeExOAuth.initBackgroundPage
    'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken'
    'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken'
    'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken'
    'consumer_key': 'anonymous'
    'consumer_secret': 'anonymous'
    'scope': 'https://www.google.com/calendar/feeds/default/*'
    'app_name': 'Email Reminder'


chrome.extension.onRequest.addListener (request, sender, sendResponse) ->    
    console.warn sender

    switch request.method
        when 'auth'
            oauth.authorize (token, secret) ->                
                GC.initCalendar()

                chrome.tabs.sendRequest sender.tab.id, method: 'logged'

        when 'check_auth'
            if oauth.getToken()
                chrome.tabs.sendRequest sender.tab.id, method: 'logged'


@GC =   
    calendars: (callback) ->
        url = 'https://www.google.com/calendar/feeds/default/allcalendars/full'
        request =
            'method': 'GET'
            'parameters': {'alt': 'json'}

        oauth.sendSignedRequest url, request, (resp) -> 
            callback JSON.parse(resp)

    createCalendar: (callback) ->
        url = 'https://www.google.com/calendar/feeds/default/owncalendars/full'
        request =
            'method': 'POST'
            'headers':
                'GData-Version': '2.0'
                'Content-Type': 'application/json'
            'body': '{
                "data": {
                    "title": "Email reminders",
                    "details": "This calendar contains reminder for emails you chould check",
                    "hidden": false,
                    "color": "#2952A3"
                }
            }'
        

        oauth.sendSignedRequest url, request, (resp) -> 
            callback JSON.parse(resp)


    initCalendar: ->
        GC.calendars (resp) ->
            entries = resp.feed.entry

            for cal in entries
                console.log cal?.author[0]?.name["$t"]
                console.log cal

                if cal?.author[0]?.name["$t"] is "Email reminders"
                    GC.calendar_id = cal.id["$t"]

                    console.log 'calendar found', GC.calendar_id
                    return

            console.log 'creating calendar'
            
            GC.createCalendar ->                                                
