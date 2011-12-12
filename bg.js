(function() {
  var baseURL, dateToISO;

  this.oauth = ChromeExOAuth.initBackgroundPage({
    'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
    'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
    'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
    'consumer_key': 'anonymous',
    'consumer_secret': 'anonymous',
    'scope': 'https://www.google.com/calendar/feeds/default/*',
    'app_name': 'Email Reminder'
  });

  dateToISO = function(d) {
    var pad;
    pad = function(n) {
      if (n < 10) {
        return '0' + n;
      } else {
        return n;
      }
    };
    return [d.getUTCFullYear() + '-', pad(d.getUTCMonth() + 1) + '-', pad(d.getUTCDate()) + 'T', pad(d.getUTCHours()) + ':', pad(d.getUTCMinutes()) + ':', pad(d.getUTCSeconds()) + 'Z'].join('');
  };

  chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    var event, new_arr, _i, _len, _ref;
    switch (request.method) {
      case 'auth':
        return oauth.authorize(function(token, secret) {
          GC.initCalendar();
          return chrome.tabs.sendRequest(sender.tab.id, {
            method: 'logged'
          });
        });
      case 'check_auth':
        if (oauth.getToken() && GC.calendar_id) {
          return chrome.tabs.sendRequest(sender.tab.id, {
            method: 'logged'
          });
        }
        break;
      case 'addEvent':
        return GC.createEvent(request);
      case 'removeEvent':
        new_arr = [];
        _ref = GC.events;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          event = _ref[_i];
          if (event.thread_id === request.thread_id) {
            GC.deleteEvent(event.event_id);
          } else {
            new_arr.push(event);
          }
        }
        return GC.events = new_arr;
    }
  });

  baseURL = "https://www.google.com/calendar/feeds";

  this.GC = {
    events: [],
    calendar_id: localStorage['gc_calendar_id'],
    calendars: function(callback) {
      var request, url;
      url = "" + baseURL + "/default/allcalendars/full";
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
      url = "" + baseURL + "/default/owncalendars/full";
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
            localStorage['gc_calendar_id'] = GC.calendar_id;
            return;
          }
        }
        return GC.createCalendar(function(r) {
          console.warn('creating calendar', r);
          GC.calendar_id = r.data.id;
          localStorage['gc_calendar_id'] = GC.calendar_id;
          return GC.getEvents(function() {});
        });
      });
    },
    getEvents: function(callback) {
      var cid, request, url;
      if (callback == null) callback = function() {};
      if (!GC.calendar_id) return;
      cid = GC.calendar_id.substring(GC.calendar_id.lastIndexOf('/') + 1);
      url = "" + baseURL + "/" + cid + "/private/full";
      request = {
        'method': 'GET',
        'parameters': {
          'alt': 'json'
        }
      };
      return oauth.sendSignedRequest(url, request, function(resp) {
        var events, _ref;
        resp = JSON.parse(resp);
        events = $.map((_ref = resp.feed.entry) != null ? _ref : [], function(val) {
          var id;
          id = val.id['$t'].substring(val.id['$t'].lastIndexOf('/') + 1);
          return {
            event_id: id,
            date: Date.parse(val['gd$when'][0].endTime),
            thread_id: val.title['$t'].match(/\#(.*)/)[1]
          };
        });
        GC.events = events;
        return callback(resp);
      });
    },
    deleteEvent: function(event_id) {
      var cid, request, url;
      console.log('deleting event');
      cid = GC.calendar_id.substring(GC.calendar_id.lastIndexOf('/') + 1);
      url = "" + baseURL + "/" + cid + "/private/full/" + event_id;
      request = {
        'method': 'DELETE',
        'headers': {
          'GData-Version': '2.0',
          'If-Match': '*'
        }
      };
      return oauth.sendSignedRequest(url, request, function(resp) {
        return callback(JSON.parse(resp));
      });
    },
    createEvent: function(data, callback) {
      var cid, event, request, time, url, _i, _len, _ref;
      if (callback == null) callback = function() {};
      console.warn('creating event', data);
      _ref = GC.events;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        event = _ref[_i];
        console.log(event.thread_id, data.thread_id);
        if (event.thread_id === data.thread_id) GC.deleteEvent(event.event_id);
      }
      cid = GC.calendar_id.substring(GC.calendar_id.lastIndexOf('/') + 1);
      url = "" + baseURL + "/" + cid + "/private/full";
      time = (+new Date()) + (+data.time) * 1000;
      time = new Date(time);
      time = dateToISO(time);
      request = {
        'method': 'POST',
        'headers': {
          'GData-Version': '2.0',
          'Content-Type': 'application/json'
        },
        'body': "{                                \"data\": {                    \"title\": \"Email Reminder: \#" + data.thread_id + "\",                    \"details\": \"Remind to send mail: " + data.subject + "\",                    \"transparency\": \"opaque\",                    \"status\": \"confirmed\",                                        \"when\": [                        {                            \"start\": \"" + time + "\",                            \"end\": \"" + time + "\"                        }                    ]                }            }"
      };
      return oauth.sendSignedRequest(url, request, function(resp) {
        callback(JSON.parse(resp));
        return GC.getEvents();
      });
    },
    pollEvents: function() {
      var event, today, _i, _len, _ref, _results;
      console.log('polling events');
      today = +(new Date());
      _ref = GC.events;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        event = _ref[_i];
        if (event.date < today) {
          _results.push(GC.notify(event.thread_id));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    notify: function(thread_id) {
      return chrome.tabs.getSelected(null, function(tab) {
        return chrome.tabs.sendRequest(tab.id, {
          method: "notify",
          thread_id: thread_id
        });
      });
    }
  };

  GC.getEvents();

  setInterval(function() {
    return GC.pollEvents();
  }, 1000);

  setInterval(function() {
    return GC.getEvents();
  }, 1000 * 60);

  chrome.windows.getAll(null, function(windows) {
    var win, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = windows.length; _i < _len; _i++) {
      win = windows[_i];
      _results.push(chrome.tabs.getAllInWindow(win.id, function(tabs) {
        var file, tab, _j, _len2, _results2;
        _results2 = [];
        for (_j = 0, _len2 = tabs.length; _j < _len2; _j++) {
          tab = tabs[_j];
          console.log(tab.url);
          if (!tab.url.match(/mail\.google\.com\/mail/)) continue;
          _results2.push((function() {
            var _k, _len3, _ref, _results3;
            _ref = ["lib/jquery.min.js", "content_script.js"];
            _results3 = [];
            for (_k = 0, _len3 = _ref.length; _k < _len3; _k++) {
              file = _ref[_k];
              console.log('executing in existing tabs');
              _results3.push(chrome.tabs.executeScript(tab.id, {
                file: file,
                allFrames: true
              }));
            }
            return _results3;
          })());
        }
        return _results2;
      }));
    }
    return _results;
  });

}).call(this);
