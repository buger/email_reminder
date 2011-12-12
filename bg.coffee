@oauth = ChromeExOAuth.initBackgroundPage
    'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken'
    'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken'
    'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken'
    'consumer_key': 'anonymous'
    'consumer_secret': 'anonymous'
    'scope': 'https://www.google.com/calendar/feeds/default/*'
    'app_name': 'Email Reminder'

dateToISO = (d) ->
    pad = (n) -> if n < 10 then '0'+ n else n

    [
        d.getUTCFullYear()+'-'
        pad(d.getUTCMonth() + 1) + '-'
        pad(d.getUTCDate()) + 'T'
        pad(d.getUTCHours()) + ':'
        pad(d.getUTCMinutes()) + ':'
        pad(d.getUTCSeconds()) + 'Z'
    ].join('')



chrome.extension.onRequest.addListener (request, sender, sendResponse) ->    
    switch request.method
        when 'auth'
            oauth.authorize (token, secret) ->                
                GC.initCalendar()

                chrome.tabs.sendRequest sender.tab.id, method: 'logged'

        when 'check_auth'
            if oauth.getToken() and GC.calendar_id
                chrome.tabs.sendRequest sender.tab.id, method: 'logged'

        when 'addEvent'
            GC.createEvent request

        when 'removeEvent'
            new_arr = []

            for event in GC.events
                if event.thread_id is request.thread_id
                    GC.deleteEvent event.event_id
                else
                    new_arr.push event

            GC.events = new_arr
                                    
                        

baseURL = "https://www.google.com/calendar/feeds"

@GC =
    events: []
     
    calendar_id: localStorage['gc_calendar_id']


    calendars: (callback) ->
        url = "#{baseURL}/default/allcalendars/full"
        request =
            'method': 'GET'
            'parameters': 
                'alt': 'json'

        oauth.sendSignedRequest url, request, (resp) -> 
            callback JSON.parse(resp)


    createCalendar: (callback) ->
        url = "#{baseURL}/default/owncalendars/full"

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
                    localStorage['gc_calendar_id'] = GC.calendar_id

                    return
            
            GC.createCalendar (r) -> 
                console.warn 'creating calendar', r

                GC.calendar_id = r.data.id
                localStorage['gc_calendar_id'] = GC.calendar_id

                GC.getEvents ->
            
            
    getEvents: (callback = ->) ->
        return unless GC.calendar_id

        cid = GC.calendar_id.substring(GC.calendar_id.lastIndexOf('/') + 1)

        url = "#{baseURL}/#{cid}/private/full"
        
        request =
            'method': 'GET'
            'parameters': 
                'alt': 'json'

        oauth.sendSignedRequest url, request, (resp) -> 
            resp = JSON.parse resp

            events = $.map resp.feed.entry ? [], (val) ->
                id = val.id['$t'].substring val.id['$t'].lastIndexOf('/') + 1

                {
                    event_id: id
                    date: Date.parse(val['gd$when'][0].endTime)
                    thread_id: val.title['$t'].match(/\#(.*)/)[1]
                }
            
            GC.events = events

            callback resp

    
    deleteEvent: (event_id) ->
        console.log 'deleting event'

        cid = GC.calendar_id.substring(GC.calendar_id.lastIndexOf('/') + 1)

        url = "#{baseURL}/#{cid}/private/full/#{event_id}"

        request =
            'method': 'DELETE'
            'headers':
                'GData-Version': '2.0' 
                'If-Match': '*'

        oauth.sendSignedRequest url, request, (resp) -> 
            callback JSON.parse(resp)            

    
    createEvent: (data, callback = ->) ->
        console.warn 'creating event', data

        for event in GC.events
            console.log event.thread_id, data.thread_id 

            if event.thread_id is data.thread_id                
                GC.deleteEvent event.event_id
            
        cid = GC.calendar_id.substring(GC.calendar_id.lastIndexOf('/') + 1)

        url = "#{baseURL}/#{cid}/private/full"

        time = (+new Date()) + (+data.time)*1000
        time = new Date(time)
        time = dateToISO(time)

        request =
            'method': 'POST'
            'headers':
                'GData-Version': '2.0'
                'Content-Type': 'application/json'
            'body': "{                
                \"data\": {
                    \"title\": \"Email Reminder: \##{data.thread_id}\",
                    \"details\": \"Remind to send mail: #{data.subject}\",
                    \"transparency\": \"opaque\",
                    \"status\": \"confirmed\",                    
                    \"when\": [
                        {
                            \"start\": \"#{time}\",
                            \"end\": \"#{time}\"
                        }
                    ]
                }
            }"

        oauth.sendSignedRequest url, request, (resp) -> 
            callback JSON.parse(resp)   

            GC.getEvents()

    
    pollEvents: ->
        console.log 'polling events'

        today = +(new Date())

        for event in GC.events            
            if event.date < today
                GC.notify event.thread_id

    
    notify: (thread_id) ->        
        chrome.tabs.getSelected null, (tab) ->
            chrome.tabs.sendRequest tab.id, 
                method: "notify"
                thread_id: thread_id

            
GC.getEvents()

setInterval ->
    GC.pollEvents()
,1000

setInterval ->
    GC.getEvents()
, 1000*60


chrome.windows.getAll null, (windows) ->
    for win in windows    
        chrome.tabs.getAllInWindow win.id, (tabs) ->
            for tab in tabs
                console.log tab.url
                unless tab.url.match(/mail\.google\.com\/mail/)
                    continue
                
                for file in ["lib/jquery.min.js","content_script.js"]
                    console.log 'executing in existing tabs'

                    chrome.tabs.executeScript tab.id, 
                        file: file
                        allFrames: true