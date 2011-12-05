(function() {
  var oauth;

  oauth = ChromeExOAuth.initBackgroundPage({
    'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
    'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
    'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
    'consumer_key': 'anonymous',
    'consumer_secret': 'anonymous',
    'scope': 'https://www.google.com/calendar/feeds/default/*',
    'app_name': 'Email Reminder'
  });

  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    console.warn(sender);
    switch (request.method) {
      case 'auth':
        return oauth.authorize(function(token, secret) {
          GC.initCalendar();
          return chrome.tabs.sendRequest(sender.tab.id, {
            method: 'logged'
          });
        });
      case 'check_auth':
        if (oauth.getToken()) {
          return chrome.tabs.sendRequest(sender.tab.id, {
            method: 'logged'
          });
        }
    }
  });

  this.GC = {
    calendars: function(callback) {
      var request, url;
      url = 'https://www.google.com/calendar/feeds/default/allcalendars/full';
      request = {
        'method': 'GET',
        'parameters': {
          'alt': 'json'
        }
      };
      return oauth.sendSignedRequest(url, request, function(resp) {
        return callback(JSON.parse(resp));
      });
    },
    createCalendar: function(callback) {
      var request, url;
      url = 'https://www.google.com/calendar/feeds/default/owncalendars/full';
      request = {
        'method': 'POST',
        'headers': {
          'GData-Version': '2.0',
          'Content-Type': 'application/json'
        },
        'body': '{\
                "data": {\
                    "title": "Email reminders",\
                    "details": "This calendar contains reminder for emails you chould check",\
                    "hidden": false,\
                    "color": "#2952A3"\
                }\
            }'
      };
      return oauth.sendSignedRequest(url, request, function(resp) {
        return callback(JSON.parse(resp));
      });
    },
    initCalendar: function() {
      return GC.calendars(function(resp) {
        var cal, entries, _i, _len, _ref, _ref2;
        entries = resp.feed.entry;
        for (_i = 0, _len = entries.length; _i < _len; _i++) {
          cal = entries[_i];
          console.log(cal != null ? (_ref = cal.author[0]) != null ? _ref.name["$t"] : void 0 : void 0);
          console.log(cal);
          if ((cal != null ? (_ref2 = cal.author[0]) != null ? _ref2.name["$t"] : void 0 : void 0) === "Email reminders") {
            GC.calendar_id = cal.id["$t"];
            console.log('calendar found', GC.calendar_id);
            return;
          }
        }
        console.log('creating calendar');
        return GC.createCalendar(function() {});
      });
    }
  };

}).call(this);
